# E2B Integration - Quick Start Guide

## Setup (1 minute)

1. **API Key is already configured** in `.env`:
   ```bash
   E2B_API_KEY=e2b_e4155276a945f18650dbeb9875c8007e08d657f9
   ```

2. **Dependency is already installed**:
   ```bash
   @e2b/code-interpreter: 2.3.3
   ```

3. **That's it!** The integration works automatically.

## How to Use

### Agents Automatically Use E2B

When you create game tools for an agent, they automatically use E2B:

```typescript
import { createGameTools } from "@/app/lib/deepagents-interop/tools/gameTools";

// Creates tools with E2B support automatically
const tools = createGameTools("my-agent-id", ["file_read", "file_write", "list_files"]);
```

The tools will:
- ✅ Use E2B remote sandbox if `E2B_API_KEY` is set
- ✅ Fall back to local filesystem if not set
- ✅ Log which mode they're using

### Manual Sandbox Management (Optional)

If you need direct sandbox access:

```typescript
import { getUnsandboxManager } from "@/app/lib/unsandbox/manager";

const manager = getUnsandboxManager();

// Create sandbox
const sandbox = await manager.getOrCreateSandbox("agent-123");

// Use sandbox
await sandbox.files.write("test.txt", "Hello!");
const content = await sandbox.files.read("test.txt");
const files = await sandbox.files.list(".");

// Execute Python code
const result = await sandbox.runCode("print('Hello from Python!')");

// Cleanup (automatic after 30min, but can manually trigger)
await manager.destroySandbox("agent-123");
```

## Testing

### Run Integration Tests

```bash
node scripts/test-e2b.cjs
```

Should output:
```
=== All Tests Passed! ===
```

### Check if E2B is Working

Look for these log messages when agents run:

**With E2B**:
```
[UnsandboxManager] Creating E2B sandbox for agent: xxx
[UnsandboxManager] Successfully created sandbox for agent: xxx (ID: ...)
```

**Without E2B** (fallback):
```
[FileReadTool] E2B_API_KEY not set, using local filesystem fallback for agent: xxx
```

## Common Operations

### Write a File

```typescript
const manager = getUnsandboxManager();
const sandbox = await manager.getOrCreateSandbox("my-agent");
await sandbox.files.write("data.json", JSON.stringify({ foo: "bar" }));
```

### Read a File

```typescript
const content = await sandbox.files.read("data.json");
console.log(JSON.parse(content));
```

### List Files

```typescript
const files = await sandbox.files.list(".");
files.forEach(file => {
  console.log(`${file.type}: ${file.name}`);
});
```

### Execute Python Code

```typescript
const result = await sandbox.runCode(`
import json
data = {"message": "Hello from Python"}
json.dumps(data)
`);
console.log(result.results[0]); // {"message": "Hello from Python"}
```

## Monitoring

### Check Active Sandboxes

```typescript
import { getUnsandboxManager } from "@/app/lib/unsandbox/manager";

const stats = getUnsandboxManager().getStats();
console.log(`Active: ${stats.total}`);
console.log(`Agents: ${stats.agentIds.join(", ")}`);
```

## Configuration

### Default Settings

- **Idle Timeout**: 30 minutes
- **Cleanup Interval**: 5 minutes
- **API Key**: From `process.env.E2B_API_KEY`

### Custom Settings

```typescript
import { UnsandboxManager } from "@/app/lib/unsandbox/manager";

const manager = new UnsandboxManager({
  apiKey: "your-key",
  maxIdleTime: 60 * 60 * 1000, // 1 hour
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
});
```

## Troubleshooting

### Problem: "E2B_API_KEY is not configured"
**Solution**: Add `E2B_API_KEY=your-key` to `.env` file

### Problem: Files don't persist between runs
**Solution**: Normal behavior. Each sandbox starts fresh. Reuse sandbox within 30min window or implement persistent storage.

### Problem: Slow first operation
**Solution**: First sandbox creation takes 2-5s. Subsequent operations are <100ms.

### Problem: Using local filesystem instead of E2B
**Solution**: Check that `.env` has `E2B_API_KEY` set and restart dev server.

## Key Files

- **Manager**: `/app/lib/unsandbox/manager.ts`
- **Tools**: `/app/lib/deepagents-interop/tools/gameTools.ts`
- **Tests**: `/scripts/test-e2b.cjs`
- **Docs**: `/docs/E2B_INTEGRATION_SUMMARY.md`

## Important Notes

1. **Automatic**: Tools use E2B automatically when API key is set
2. **Fallback**: Falls back to local filesystem without API key
3. **Isolated**: Each agent gets its own sandbox
4. **Auto-Cleanup**: Sandboxes cleaned up after 30 minutes idle
5. **Production Ready**: Tested and verified working

## Support

For issues or questions:
1. Check logs for error messages
2. Read `/docs/E2B_INTEGRATION_SUMMARY.md` for details
3. Run tests: `node scripts/test-e2b.cjs`
4. Check E2B docs: https://e2b.dev/docs
