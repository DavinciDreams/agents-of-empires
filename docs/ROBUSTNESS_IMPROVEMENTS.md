# Phase F: Robustness Improvements

This document describes the robustness improvements implemented in the agent execution pipeline, including retry logic, timeout cancellation, error recovery, and checkpoint persistence.

## Overview

The robustness improvements add critical fault tolerance and recovery capabilities to agent execution:

1. **Retry Logic** - Automatic retry with exponential backoff for transient errors
2. **Timeout Cancellation** - Proper cancellation of agent execution on timeout
3. **Checkpoint Persistence** - Save execution state for recovery after failures
4. **Error Recovery** - Distinguish between recoverable and permanent failures

## Components

### 1. Retry Utility (`/app/lib/utils/retry.ts`)

Implements exponential backoff retry logic for handling transient errors.

#### Key Functions

**`retryWithBackoff<T>(fn, options): Promise<T>`**
- Executes a function with retry logic
- Uses exponential backoff: delay = baseDelay * 2^attempt
- Caps delay at maxDelay
- Only retries errors that pass `shouldRetry` check

**`isTransientError(error): boolean`**
- Identifies errors that should be retried
- Detects: network errors, timeouts, rate limits, 502/503/504

**`isPermanentError(error): boolean`**
- Identifies errors that should NOT be retried
- Detects: validation errors, auth errors, 400/401/403/404, recursion limits

#### Retry Options Presets

```typescript
// Conservative retry for general use
DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 10000,    // 10 seconds
  shouldRetry: isTransientError
}

// Aggressive retry for LLM calls (due to rate limits)
LLM_RETRY_OPTIONS = {
  maxRetries: 3,
  baseDelay: 2000,    // 2 seconds
  maxDelay: 30000,    // 30 seconds
  shouldRetry: isTransientError
}

// Conservative retry for network calls
NETWORK_RETRY_OPTIONS = {
  maxRetries: 2,
  baseDelay: 1000,    // 1 second
  maxDelay: 5000,     // 5 seconds
  shouldRetry: isTransientError
}
```

#### Usage Example

```typescript
import { retryWithBackoff, LLM_RETRY_OPTIONS } from '@/app/lib/utils/retry';

const result = await retryWithBackoff(
  async () => {
    // Your potentially failing operation
    return await llm.invoke(messages);
  },
  {
    ...LLM_RETRY_OPTIONS,
    onRetry: (attempt, error, nextDelay) => {
      console.log(`Retry attempt ${attempt} after error: ${error.message}`);
      console.log(`Waiting ${nextDelay}ms before next attempt`);
    }
  }
);
```

### 2. Persistence Service (`/app/lib/services/persistence.ts`)

Handles checkpoint state management for agent execution recovery.

#### Key Functions

**`saveCheckpoint(agentId, checkpointId, threadId, state): Promise<void>`**
- Saves checkpoint state to database
- Uses upsert to handle updates
- Stores complete execution state for recovery

**`loadCheckpoint(checkpointId): Promise<CheckpointData | null>`**
- Loads checkpoint state from database
- Returns null if not found

**`checkpointExists(checkpointId): Promise<boolean>`**
- Checks if checkpoint exists

**`saveExecutionResult(agentId, result, status, metadata, checkpointId?, questId?): Promise<string>`**
- Saves execution result with status
- Status types: `success`, `failed_recoverable`, `failed_permanent`, `timeout`, `cancelled`
- Returns result ID

#### Checkpoint Data Structure

```typescript
interface CheckpointData {
  step: number;                    // Current iteration/step
  task: string;                    // Task being executed
  partialResults: any[];           // Results accumulated so far
  toolOutputs: ToolOutput[];       // Tool execution history
  agentState: any;                 // Current agent state
  timestamp: string;               // ISO timestamp
  metadata?: Record<string, any>;  // Additional metadata
}

interface ToolOutput {
  toolName: string;
  input: any;
  output: any;
  timestamp: string;
  duration?: number;  // milliseconds
}
```

### 3. Timeout Cancellation (`/app/lib/deepagents-interop/a2a/wrapper.ts`)

Fixed timeout implementation to properly cancel agent execution.

#### Before (Broken)
```typescript
// Timeout rejects promise but doesn't cancel execution
private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeoutMs)
    )
  ]);
}
```

#### After (Fixed)
```typescript
// Timeout properly cancels execution via AbortController
private async executeWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fn(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Execution timeout - operation was cancelled");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
```

The AbortSignal is passed to LangGraph's invoke/stream methods to actually stop execution.

### 4. Agent Execution Route (`/app/api/agents/execute/route.ts`)

Updated with retry logic and checkpoint tracking.

#### Key Changes

1. **Retry Integration**
   - Wraps agent invocation in `retryWithBackoff()`
   - Configured with 2 retries for conservative behavior
   - Emits SSE events for retry attempts

2. **Checkpoint Tracking**
   - Creates checkpoint data structure at start
   - Updates after each tool call
   - Saves checkpoint state to database for recovery

3. **Error Classification**
   - Detects transient vs permanent errors
   - Saves partial state for recoverable failures
   - Marks results as `failed_recoverable` or `failed_permanent`

4. **SSE Event: `retry`**
   ```typescript
   {
     event: "retry",
     data: {
       attempt: 1,              // Retry attempt number
       error: "rate limit",     // Error message
       nextDelay: 2000,         // Delay before retry (ms)
       isTransient: true        // Whether error is transient
     }
   }
   ```

## Error Recovery Flow

### 1. Transient Error (Network, Timeout, Rate Limit)

```
1. Agent execution fails with network timeout
2. Retry logic detects transient error
3. SSE "retry" event sent to client
4. Wait with exponential backoff (1s, 2s, 4s)
5. Retry execution (up to 3 attempts)
6. If still failing, save partial checkpoint
7. Mark result as "failed_recoverable"
8. Return error with resume option
```

### 2. Permanent Error (Validation, Auth, Recursion Limit)

```
1. Agent execution fails with validation error
2. Error detected as permanent
3. No retry attempted (fail immediately)
4. No checkpoint saved (not recoverable)
5. Mark result as "failed_permanent"
6. Return error with suggestions
```

### 3. Timeout

```
1. Execution exceeds timeout threshold
2. AbortController cancels LangGraph execution
3. Partial state saved to checkpoint
4. Mark result as "timeout" / "failed_recoverable"
5. Return error with resume option
```

## Database Schema

The checkpoint state is stored in the `CheckpointState` table:

```prisma
model CheckpointState {
  id           String   @id @default(uuid())
  agentId      String
  checkpointId String   @unique
  state        Json      // CheckpointData structure
  threadId     String
  createdAt    DateTime @default(now())

  @@index([agentId])
  @@index([threadId])
}
```

## Testing

### Unit Tests

Run unit tests for retry logic and persistence:

```bash
npm test -- retry.test.ts
npm test -- persistence.test.ts
```

### Integration Tests

Run the robustness test suite:

```bash
npx tsx scripts/test-robustness.ts
```

Tests include:
- Retry logic with simulated failures
- Error detection (transient vs permanent)
- Exponential backoff calculation
- Checkpoint save/load/delete
- Data integrity verification

### Manual Testing

#### Test Retry Logic

Create a request that triggers a network error:

```bash
curl -X POST http://localhost:3000/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "test",
    "checkpointId": "checkpoint1",
    "task": "Search for information about retries"
  }'
```

Watch for `retry` events in SSE stream.

#### Test Timeout Cancellation

Create a long-running task that will timeout:

```bash
curl -X POST http://localhost:3000/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "test",
    "checkpointId": "checkpoint2",
    "task": "Perform 100 web searches and analyze all results in detail",
    "recursionLimit": 200
  }'
```

The execution should timeout and cancel properly (not continue in background).

#### Test Checkpoint Recovery

1. Start a task that will fail midway
2. Check database for saved checkpoint:
   ```sql
   SELECT * FROM "CheckpointState" WHERE "checkpointId" = 'checkpoint1';
   ```
3. Verify checkpoint contains partial results and tool outputs
4. Verify checkpoint can be loaded for resume

## Best Practices

### 1. When to Use Retry

**DO retry:**
- Network errors (ECONNREFUSED, ETIMEDOUT)
- Rate limit errors (429)
- Temporary server errors (502, 503, 504)
- LLM provider capacity errors

**DON'T retry:**
- Validation errors (400)
- Authentication errors (401, 403)
- Not found errors (404)
- Recursion limit errors
- Business logic errors

### 2. Retry Configuration

- Use **conservative retries** (2-3 max) for agent execution
- Use **longer delays** (2-30s) for LLM calls due to rate limits
- Use **shorter delays** (1-5s) for network calls
- Always implement **exponential backoff**

### 3. Checkpoint Strategy

- Save checkpoint **after each tool call** (not too frequently)
- Include **enough context** to resume execution
- Clean up **old checkpoints** (7-day retention recommended)
- Use checkpoints for **timeout and crash recovery**

### 4. Error Handling

- **Classify errors** as recoverable vs permanent
- **Save partial state** for recoverable errors
- **Provide clear suggestions** in error responses
- **Log retry attempts** for debugging

## Performance Considerations

### Retry Impact

- Each retry adds baseDelay * 2^attempt latency
- 3 retries with 2s base delay = up to 14s total delay (2s + 4s + 8s)
- Only retry transient errors to avoid unnecessary delays

### Checkpoint Impact

- Each checkpoint save = 1 database write
- Saved after each tool call (not every token)
- Minimal impact on execution speed
- Clean up old checkpoints to avoid storage bloat

### Timeout Cancellation

- No performance impact (just cancels execution)
- Prevents zombie processes
- Saves compute resources

## Future Enhancements

1. **Smart Retry** - Adjust retry strategy based on error type
2. **Resume from Checkpoint** - API endpoint to resume failed executions
3. **Checkpoint Cleanup Job** - Automated cleanup of old checkpoints
4. **Retry Metrics** - Track retry success rates and patterns
5. **Circuit Breaker** - Stop retrying if provider is consistently failing

## API Reference

### Retry Utility

```typescript
// Retry with custom options
import { retryWithBackoff } from '@/app/lib/utils/retry';

await retryWithBackoff(async () => {
  // Your operation
}, {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error) => error.message.includes('timeout'),
  onRetry: (attempt, error, nextDelay) => {
    console.log(`Retry ${attempt}: ${error.message}`);
  }
});
```

### Persistence Service

```typescript
import { saveCheckpoint, loadCheckpoint } from '@/app/lib/services/persistence';

// Save checkpoint
await saveCheckpoint('agent1', 'checkpoint1', 'thread1', {
  step: 5,
  task: 'Test task',
  partialResults: [],
  toolOutputs: [],
  agentState: {},
  timestamp: new Date().toISOString()
});

// Load checkpoint
const checkpoint = await loadCheckpoint('checkpoint1');
if (checkpoint) {
  console.log(`Resume from step ${checkpoint.step}`);
}
```

## Troubleshooting

### Retries Not Working

- Check if error is classified as transient (`isTransientError()`)
- Verify `shouldRetry` function in retry options
- Check logs for retry attempts

### Checkpoints Not Saving

- Verify database connection
- Check Prisma schema is up to date
- Look for errors in console logs
- Verify checkpoint ID is unique

### Timeout Not Cancelling

- Ensure AbortSignal is passed to LangGraph
- Check if LangGraph version supports AbortController
- Verify timeout threshold is being reached

## Related Documentation

- [Recursion Limit Prevention Guide](/docs/RECURSION_LIMIT_PREVENTION.md)
- [Intelligence Bureau (Execution Monitoring)](/docs/INTELLIGENCE_BUREAU.md)
- [A2A Protocol](/docs/A2A_PROTOCOL.md)
