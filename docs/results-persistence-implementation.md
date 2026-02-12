# Results Persistence Service Implementation

## Overview

This document describes the implementation of the Results Persistence Service (Phase C) which provides database persistence for agent execution results, logs, checkpoints, and traces with incremental saving and resume capability.

## Database Schema

The following database models are defined in `/home/ubuntu/Dev/agents-of-empire/prisma/schema.prisma`:

### AgentResult
Stores agent execution results and metadata.
- `id`: Unique identifier (UUID)
- `agentId`: ID of the agent that executed
- `checkpointId`: Optional checkpoint ID
- `questId`: Optional quest ID
- `result`: Execution result (text)
- `metadata`: Additional metadata (JSON)
- `status`: Execution status (running, completed, failed)
- `createdAt`: Creation timestamp
- `completedAt`: Completion timestamp

### ExecutionLog
Stores execution logs for debugging and monitoring.
- `id`: Unique identifier (UUID)
- `agentId`: Agent ID
- `executionId`: Execution ID
- `level`: Log level (info, warn, error)
- `message`: Log message
- `source`: Log source (e.g., 'agent-callback', 'execute-route')
- `timestamp`: Log timestamp

### CheckpointState
Stores checkpoint state for agent recovery and resumption.
- `id`: Unique identifier (UUID)
- `agentId`: Agent ID
- `checkpointId`: Unique checkpoint ID
- `state`: Checkpoint state (JSON)
- `threadId`: Thread ID
- `createdAt`: Creation timestamp

### AgentTrace
Stores execution traces for detailed profiling and debugging.
- `id`: Unique identifier (UUID)
- `agentId`: Agent ID
- `executionId`: Execution ID
- `type`: Trace type (tool_start, tool_end, tool_error)
- `content`: Trace content
- `metadata`: Additional metadata (JSON)
- `timestamp`: Trace timestamp
- `duration`: Duration in milliseconds

## Service Implementation

### Results Persistence Service
**Location:** `/home/ubuntu/Dev/agents-of-empire/app/lib/results-persistence/service.ts`

The service provides the following methods:

#### Result Management
- `saveResult(data)`: Create a new result record
- `updateResult(resultId, updates)`: Incrementally update an existing result
- `getResult(resultId)`: Get a specific result by ID
- `getAgentResults(agentId, limit)`: Get all results for an agent

#### Logging
- `saveLog(data)`: Save an execution log entry
- `getExecutionLogs(executionId, limit)`: Get logs for an execution

#### Checkpoint Management
- `saveCheckpointState(data)`: Save checkpoint state for resume
- `getCheckpointState(checkpointId)`: Get checkpoint state for resume

#### Tracing
- `saveTrace(data)`: Save a trace event
- `getExecutionTraces(executionId, limit)`: Get traces for an execution

#### Cleanup
- `cleanupOldResults(olderThan)`: Delete old completed/failed results
- `cleanupOldLogs(olderThan)`: Delete old logs
- `cleanupOldTraces(olderThan)`: Delete old traces

### Singleton Instance
The service is exported as a singleton:
```typescript
export const resultsPersistence = new ResultsPersistenceService()
```

## Integration Points

### 1. Agent Execution Route
**Location:** `/home/ubuntu/Dev/agents-of-empire/app/api/agents/execute/route.ts`

The execution route has been updated to:
- Create a result record at execution start
- Save logs incrementally during execution
- Save traces on tool start/end/error events
- Update result on completion with final output
- Save checkpoint state after each tool call
- Handle errors and persist failure information

**Key Features:**
- Generates unique execution ID for tracking
- Persists all execution events to database
- Saves partial progress for recovery
- Includes retry logic with checkpoint saving

### 2. Resume API Route
**Location:** `/home/ubuntu/Dev/agents-of-empire/app/api/agents/[agentId]/resume/route.ts`

New API endpoint for resuming agent execution from a checkpoint:
- Loads checkpoint state from database
- Builds message history from previous execution
- Continues execution from where it left off
- Saves new results and traces
- Updates checkpoint state

**Usage:**
```bash
POST /api/agents/{agentId}/resume
{
  "checkpointId": "checkpoint-001",
  "additionalInstructions": "Optional additional instructions",
  "recursionLimit": 100
}
```

### 3. Execution Tracker
**Location:** `/home/ubuntu/Dev/agents-of-empire/app/lib/deepagents-interop/a2a/execution-tracker.ts`

The execution tracker has been updated to:
- Persist execution start/completion/failure to database
- Log progress updates
- Integrate with checkpoint persistence

**Updated Methods:**
- `startExecution()`: Now async, persists execution start
- `updateProgress()`: Now async, persists progress updates
- `completeExecution()`: Now async, persists completion
- `failExecution()`: Now async, persists failure

## Database Configuration

### Prisma Setup
The project uses Prisma 7 with PostgreSQL adapter.

**Client:** `/home/ubuntu/Dev/agents-of-empire/app/lib/db/client.ts`
```typescript
import { PrismaClient } from '@/app/generated/prisma'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString })),
  log: ['query', 'error', 'warn'],
})
```

### Database Connection
The database URL is configured in `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/agents_of_empire"
```

Uses Supabase PostgreSQL instance running on port 54322.

### Migrations
Migration created: `20260212084158_init_results_persistence`

**Run migrations:**
```bash
npx prisma migrate dev
```

**Generate client:**
```bash
npx prisma generate
```

## API Contracts

### Execute Endpoint
**POST** `/api/agents/execute`

**Request:**
```json
{
  "agentId": "agent-001",
  "checkpointId": "checkpoint-001",
  "task": "Task description",
  "estimatedTokens": 1000,
  "recursionLimit": 100
}
```

**Response (SSE Events):**
- `start`: Execution started with executionId and resultId
- `thinking`: Agent is analyzing the task
- `token`: LLM token stream
- `tool_start`: Tool execution started
- `tool_end`: Tool execution completed
- `tool_error`: Tool execution error
- `warning`: Warning about iteration limit
- `retry`: Retry attempt notification
- `complete`: Execution completed with output and resultId
- `error`: Execution error with resultId

### Resume Endpoint
**POST** `/api/agents/{agentId}/resume`

**Request:**
```json
{
  "checkpointId": "checkpoint-001",
  "additionalInstructions": "Optional instructions",
  "recursionLimit": 100
}
```

**Response:** Same SSE events as execute endpoint

## Testing

### Test Script
**Location:** `/home/ubuntu/Dev/agents-of-empire/scripts/test-persistence.ts`

The test script validates:
1. Creating a result
2. Saving execution logs
3. Saving execution traces
4. Incremental result updates
5. Checkpoint state persistence
6. Result completion
7. Result retrieval
8. Checkpoint retrieval
9. Agent results listing
10. Execution logs retrieval
11. Execution traces retrieval

### Manual Testing

**Test persistence via API:**
1. Start a task execution via `/api/agents/execute`
2. Monitor database for result creation and updates
3. Check logs and traces are being saved
4. Verify checkpoint state is persisted
5. Test resume from checkpoint via `/api/agents/{agentId}/resume`

**Database queries:**
```sql
-- View results
SELECT * FROM "AgentResult" ORDER BY "createdAt" DESC LIMIT 10;

-- View logs
SELECT * FROM "ExecutionLog" WHERE "executionId" = 'exec-id' ORDER BY "timestamp" ASC;

-- View traces
SELECT * FROM "AgentTrace" WHERE "executionId" = 'exec-id' ORDER BY "timestamp" ASC;

-- View checkpoints
SELECT * FROM "CheckpointState" WHERE "checkpointId" = 'checkpoint-id';
```

## Error Handling

The service includes comprehensive error handling:
- Database connection errors are logged but don't break execution
- Logging and tracing errors are caught and logged (non-blocking)
- Result save/update errors are thrown (blocking)
- Checkpoint errors are thrown (blocking)

## Security Considerations

1. **Input Validation**: All data is validated before database insertion
2. **SQL Injection**: Prisma ORM provides parameterized queries
3. **Data Sanitization**: Large outputs are truncated (1000 chars for traces)
4. **Access Control**: Resume endpoint verifies agent ownership of checkpoint

## Performance Considerations

1. **Indexes**: Database indexes on agentId, executionId, checkpointId, threadId
2. **Batch Operations**: Cleanup operations use batch deletes
3. **Connection Pooling**: Uses pg connection pool for efficient database access
4. **Non-blocking Logs**: Logging and tracing don't block execution flow
5. **Incremental Updates**: Results are updated incrementally to avoid large transactions

## Dependencies

New packages added:
- `pg@8.18.0`: PostgreSQL client
- `@prisma/adapter-pg@7.4.0`: Prisma PostgreSQL adapter

## Future Enhancements

1. **Result Pagination**: Add pagination for large result sets
2. **Search & Filtering**: Add full-text search on logs and traces
3. **Analytics**: Aggregate execution statistics
4. **Retention Policies**: Automated cleanup based on configured retention
5. **Compression**: Compress large results and traces
6. **Real-time Subscriptions**: WebSocket support for live execution monitoring

## Files Modified/Created

### Created
- `/home/ubuntu/Dev/agents-of-empire/app/lib/results-persistence/service.ts`
- `/home/ubuntu/Dev/agents-of-empire/app/lib/results-persistence/index.ts`
- `/home/ubuntu/Dev/agents-of-empire/app/api/agents/[agentId]/resume/route.ts`
- `/home/ubuntu/Dev/agents-of-empire/scripts/test-persistence.ts`
- `/home/ubuntu/Dev/agents-of-empire/prisma/migrations/20260212084158_init_results_persistence/`

### Modified
- `/home/ubuntu/Dev/agents-of-empire/prisma/schema.prisma` - Removed url from datasource
- `/home/ubuntu/Dev/agents-of-empire/app/lib/db/client.ts` - Updated for Prisma 7
- `/home/ubuntu/Dev/agents-of-empire/app/api/agents/execute/route.ts` - Added persistence integration
- `/home/ubuntu/Dev/agents-of-empire/app/lib/deepagents-interop/a2a/execution-tracker.ts` - Added DB persistence
- `/home/ubuntu/Dev/agents-of-empire/.env` - Updated DATABASE_URL

## Summary

The Results Persistence Service provides comprehensive database persistence for agent executions with:
- Durable result storage with incremental updates
- Detailed logging and tracing for debugging
- Checkpoint-based resume capability for failed executions
- Integration with existing execution and tracking systems
- Scalable architecture for production use
