# API Documentation

Complete API reference for Agents of Empire.

## Base URL

```
Development: http://localhost:3000
Production: https://agents-of-empire.vercel.app
```

## Authentication

Currently, all endpoints are public. Future versions will include API key authentication.

---

## Deep Agents API

### Execute Checkpoint Task

Execute a checkpoint task with a Deep Agent using Server-Sent Events (SSE) streaming.

**Endpoint:** `POST /api/agents/execute`

**Content-Type:** `application/json`

**Request Body:**

```typescript
{
  agentId: string;        // The game agent ID
  checkpointId: string;   // The checkpoint to execute
  task: string;           // The task description
  estimatedTokens?: number; // Optional token estimate
}
```

**Example Request:**

```bash
curl -N -X POST http://localhost:3000/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-1",
    "checkpointId": "checkpoint-1",
    "task": "Analyze the React components and suggest performance optimizations",
    "estimatedTokens": 5000
  }'
```

**Response:** Server-Sent Events (text/event-stream)

The endpoint streams events in SSE format:

#### Event Types

1. **start** - Execution started
```
event: start
data: {"agentId":"agent-1","checkpointId":"checkpoint-1","task":"..."}
```

2. **thinking** - Agent is analyzing the task
```
event: thinking
data: {"message":"Analyzing React components..."}
```

3. **token** - LLM token streaming
```
event: token
data: {"token":"The"}
```

4. **tool_start** - Tool execution started
```
event: tool_start
data: {"tool":"tavily_search","input":"React performance optimization 2025"}
```

5. **tool_end** - Tool execution completed
```
event: tool_end
data: {"output":"Found 5 results about React performance..."}
```

6. **tool_error** - Tool execution failed
```
event: tool_error
data: {"error":"API key not configured"}
```

7. **complete** - Execution completed
```
event: complete
data: {
  "agentId": "agent-1",
  "checkpointId": "checkpoint-1",
  "output": "Based on my analysis...",
  "tokens": 4523,
  "todos": [
    {"content": "Implement React.memo", "status": "pending"}
  ]
}
```

8. **error** - Execution error
```
event: error
data: {"error":"Failed to execute task"}
```

**Example JavaScript Client:**

```typescript
const response = await fetch('/api/agents/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'agent-1',
    checkpointId: 'cp-1',
    task: 'Analyze codebase',
    estimatedTokens: 3000
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('event:')) {
      const eventType = line.substring(7).trim();
    } else if (line.startsWith('data:')) {
      const data = JSON.parse(line.substring(5));
      console.log(eventType, data);
    }
  }
}
```

---

## Quest Generation API

### Generate Quest

Generate a multi-step quest from natural language using AI.

**Endpoint:** `POST /api/quests/generate`

**Content-Type:** `application/json`

**Request Body:**

```typescript
{
  command: string;  // Natural language quest description
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/quests/generate \
  -H "Content-Type: application/json" \
  -d '{
    "command": "create a quest to add authentication to the app"
  }'
```

**Response:**

```typescript
{
  quest: {
    id: string;
    title: string;
    description: string;
    complexity: "easy" | "medium" | "hard";
    estimatedDuration: number;  // milliseconds
    status: "available";
    checkpointIds: string[];
    createdAt: number;
  };
  checkpoints: Array<{
    id: string;
    questId: string;
    title: string;
    description: string;
    position: [number, number, number];  // 3D coordinates
    status: "pending";
    estimatedTokens: number;
    order: number;
  }>;
}
```

**Example Response:**

```json
{
  "quest": {
    "id": "quest-1707756123456",
    "title": "Implement Authentication System",
    "description": "Add secure user authentication with JWT tokens and protected routes",
    "complexity": "hard",
    "estimatedDuration": 7200000,
    "status": "available",
    "checkpointIds": ["cp-1", "cp-2", "cp-3"],
    "createdAt": 1707756123456
  },
  "checkpoints": [
    {
      "id": "cp-1",
      "questId": "quest-1707756123456",
      "title": "Design Authentication Schema",
      "description": "Design the database schema for user authentication including users table, sessions, and tokens",
      "position": [10, 0, 10],
      "status": "pending",
      "estimatedTokens": 3000,
      "order": 1
    },
    {
      "id": "cp-2",
      "questId": "quest-1707756123456",
      "title": "Implement JWT Token System",
      "description": "Create JWT token generation, validation, and refresh logic",
      "position": [20, 0, 15],
      "status": "pending",
      "estimatedTokens": 4000,
      "order": 2
    },
    {
      "id": "cp-3",
      "questId": "quest-1707756123456",
      "title": "Add Protected Route Middleware",
      "description": "Implement middleware to protect API routes and verify authentication",
      "position": [30, 0, 10],
      "status": "pending",
      "estimatedTokens": 3500,
      "order": 3
    }
  ]
}
```

**Complexity Calculation:**

- **easy**: 1-2 checkpoints, 2000-4000 tokens total
- **medium**: 3-4 checkpoints, 5000-10000 tokens total
- **hard**: 5+ checkpoints, 10000+ tokens total

---

## LangSmith Traces API

### Get Traces

Fetch execution traces from LangSmith for an agent.

**Endpoint:** `GET /api/agents/[agentId]/traces`

**Query Parameters:**

- `limit` (optional): Number of traces to return (default: 50)
- `since` (optional): ISO timestamp to filter traces after this time

**Example Request:**

```bash
curl "http://localhost:3000/api/agents/agent-1/traces?limit=10&since=2025-02-12T00:00:00Z"
```

**Response:**

```typescript
{
  traces: Array<{
    id: string;
    timestamp: number;
    type: "thought" | "tool" | "message" | "checkpoint" | "error";
    content: string;
    metadata?: {
      run_type: string;
      name: string;
      status: "running" | "completed" | "error";
      inputs?: any;
      outputs?: any;
      tags?: string[];
    };
    duration?: number;  // milliseconds
  }>;
  count: number;
  agent_id: string;
}
```

**Example Response:**

```json
{
  "traces": [
    {
      "id": "run-abc123",
      "timestamp": 1707756123456,
      "type": "tool",
      "content": "Searching web for React optimization techniques",
      "metadata": {
        "run_type": "tool",
        "name": "tavily_search",
        "status": "completed",
        "inputs": {
          "query": "React optimization techniques 2025"
        },
        "outputs": {
          "results": [...]
        },
        "tags": ["web-search"]
      },
      "duration": 1523
    },
    {
      "id": "run-def456",
      "timestamp": 1707756125000,
      "type": "thought",
      "content": "Analyzing search results to provide recommendations",
      "metadata": {
        "run_type": "chain",
        "name": "think",
        "status": "completed"
      },
      "duration": 2100
    }
  ],
  "count": 2,
  "agent_id": "agent-1"
}
```

**Configuration:**

Requires `LANGSMITH_API_KEY` environment variable. Returns empty array if not configured.

### Stream Traces

Stream real-time execution traces via SSE.

**Endpoint:** `POST /api/agents/[agentId]/traces`

**Response:** Server-Sent Events (text/event-stream)

Polls for new traces every 2 seconds and streams updates for ongoing runs.

**Example:**

```javascript
const eventSource = new EventSource('/api/agents/agent-1/traces', {
  method: 'POST'
});

eventSource.onmessage = (event) => {
  const trace = JSON.parse(event.data);
  console.log('New trace:', trace);
};

eventSource.onerror = () => {
  console.log('Connection closed');
  eventSource.close();
};
```

---

## A2A Protocol (Agent-to-Agent)

### Invoke Agent

Execute an agent task synchronously.

**Endpoint:** `POST /api/agents/[agentId]/invoke`

**Request Body:**

```typescript
{
  task: string;
  config?: {
    threadId?: string;
    temperature?: number;
  };
}
```

**Response:**

```typescript
{
  result: {
    messages: Array<{
      role: "assistant";
      content: string;
    }>;
    metadata: {
      tokens: number;
      duration: number;
    };
  };
}
```

### Stream Agent Response

Stream agent response with A2UI components.

**Endpoint:** `POST /api/agents/[agentId]/ui-stream`

**Response:** Server-Sent Events with A2UI components

### Check Agent Status

Get current agent execution status.

**Endpoint:** `GET /api/agents/[agentId]/status`

**Response:**

```typescript
{
  status: "idle" | "busy" | "error";
  currentTask?: string;
}
```

### Cancel Agent Execution

Cancel an ongoing agent execution.

**Endpoint:** `POST /api/agents/[agentId]/cancel`

---

## Results & Persistence API

### List Agent Results

Get all execution results for a specific agent with pagination and filtering.

**Endpoint:** `GET /api/agents/[agentId]/results`

**Query Parameters:**

```typescript
{
  limit?: number;      // Max results to return (default: 50, max: 100)
  offset?: number;     // Pagination offset (default: 0)
  status?: string;     // Filter by status (e.g., "completed", "failed", "running")
  questId?: string;    // Filter by quest ID
}
```

**Example Request:**

```bash
curl http://localhost:3000/api/agents/agent-1/results?limit=10&status=completed
```

**Response:**

```typescript
{
  results: Array<{
    id: string;
    agentId: string;
    checkpointId?: string;
    questId?: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    metadata: any;
  }>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

### Get Single Result

Retrieve a specific execution result with multiple export formats.

**Endpoint:** `GET /api/agents/[agentId]/results/[resultId]`

**Query Parameters:**

```typescript
{
  format?: "json" | "md" | "csv" | "zip";  // Export format (default: json)
  includeTraces?: boolean;                  // Include trace data (default: false)
  includeLogs?: boolean;                    // Include log data (default: false)
}
```

**Example Requests:**

```bash
# Get as JSON
curl http://localhost:3000/api/agents/agent-1/results/result-123

# Download as Markdown
curl http://localhost:3000/api/agents/agent-1/results/result-123?format=md -o result.md

# Download as ZIP with all data
curl http://localhost:3000/api/agents/agent-1/results/result-123?format=zip -o result.zip
```

**JSON Response:**

```typescript
{
  id: string;
  agentId: string;
  checkpointId?: string;
  questId?: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  result: any;              // Parsed result data
  metadata: any;
  logs?: Array<LogEntry>;   // If includeLogs=true
  traces?: Array<TraceEvent>; // If includeTraces=true
}
```

### Get Execution Logs

Retrieve execution logs with filtering and multiple formats.

**Endpoint:** `GET /api/agents/[agentId]/logs`

**Query Parameters:**

```typescript
{
  executionId?: string;  // Filter by execution ID
  level?: string;        // Filter by log level (e.g., "info", "error", "debug")
  source?: string;       // Filter by log source
  limit?: number;        // Max logs to return (default: 100, max: 1000)
  offset?: number;       // Pagination offset (default: 0)
  format?: "json" | "csv" | "text";  // Export format (default: json)
}
```

**Example Requests:**

```bash
# Get logs as JSON
curl http://localhost:3000/api/agents/agent-1/logs?level=error

# Download logs as CSV
curl http://localhost:3000/api/agents/agent-1/logs?format=csv -o logs.csv

# Download logs as text
curl http://localhost:3000/api/agents/agent-1/logs?format=text -o logs.txt
```

**Response:**

```typescript
{
  logs: Array<{
    id: string;
    agentId: string;
    executionId: string;
    level: string;
    message: string;
    source?: string;
    timestamp: string;
  }>;
  count: number;
  limit: number;
  offset: number;
}
```

### Get Execution Traces

Retrieve detailed execution traces from database and/or LangSmith.

**Endpoint:** `GET /api/agents/[agentId]/traces`

**Query Parameters:**

```typescript
{
  executionId?: string;  // Filter by execution ID
  limit?: number;        // Max traces to return (default: 100)
  since?: string;        // ISO timestamp - only traces after this time
  source?: "database" | "langsmith" | "both";  // Data source (default: database)
  format?: "json" | "csv";  // Export format (default: json)
}
```

**Example Requests:**

```bash
# Get traces from database
curl http://localhost:3000/api/agents/agent-1/traces

# Get traces from both sources
curl http://localhost:3000/api/agents/agent-1/traces?source=both

# Download traces as CSV
curl http://localhost:3000/api/agents/agent-1/traces?format=csv -o traces.csv
```

**Response:**

```typescript
{
  traces: Array<{
    id: string;
    timestamp: number;
    type: "thought" | "tool" | "message" | "checkpoint" | "error";
    content: string;
    metadata?: any;
    duration?: number;
  }>;
  count: number;
  agent_id: string;
}
```

### Access Workspace Files

List and download files from agent's E2B sandbox workspace.

**Endpoint:** `GET /api/agents/[agentId]/workspace`

**Query Parameters:**

```typescript
{
  path?: string;  // Directory path to list (default: /home/user)
}
```

**Example Request:**

```bash
curl http://localhost:3000/api/agents/agent-1/workspace?path=/home/user/project
```

**Response:**

```typescript
{
  path: string;
  files: Array<{
    name: string;
    path: string;
    type: "file" | "dir";
    size: number;
  }>;
  count: number;
}
```

### Download Workspace File

Download a specific file from agent's workspace.

**Endpoint:** `POST /api/agents/[agentId]/workspace`

**Request Body:**

```typescript
{
  filePath: string;  // Full path to file in sandbox
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/agents/agent-1/workspace \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/home/user/project/output.json"}' \
  -o output.json
```

**Response:** File content with appropriate Content-Type header

**Note:** Workspace endpoints require an active E2B sandbox for the agent.

---

## Agent Card

### Get Agent Metadata

Retrieve agent capabilities and metadata.

**Endpoint:** `GET /api/.well-known/agent-card.json`

**Response:**

```json
{
  "name": "Agents of Empire",
  "description": "AI-powered RTS game with real Deep Agents",
  "version": "0.2.0",
  "capabilities": {
    "taskExecution": true,
    "webSearch": true,
    "codeGeneration": true,
    "fileOperations": true
  },
  "endpoints": {
    "invoke": "/api/agents/{agentId}/invoke",
    "stream": "/api/agents/{agentId}/stream",
    "execute": "/api/agents/execute"
  },
  "providers": ["anthropic", "openai", "zai", "groq"]
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```typescript
{
  error: string;      // Error type
  message: string;    // Human-readable message
  details?: any;      // Additional error details
}
```

### Common Error Codes

- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid API key (future)
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Example Error Response

```json
{
  "error": "No LLM providers configured",
  "message": "Please set at least one API key: ANTHROPIC_API_KEY, OPENAI_API_KEY, or ZAI_API_KEY"
}
```

---

## Rate Limiting

Currently no rate limiting is enforced. Future versions will implement:

- 100 requests per minute per IP
- 1000 requests per hour per IP
- Exponential backoff for repeated errors

---

## Best Practices

### SSE Connections

1. **Always handle errors**
   ```javascript
   eventSource.onerror = (error) => {
     console.error('SSE error:', error);
     eventSource.close();
   };
   ```

2. **Close connections when done**
   ```javascript
   // Cleanup on component unmount
   useEffect(() => {
     return () => eventSource.close();
   }, []);
   ```

3. **Implement reconnection logic**
   ```javascript
   let reconnectAttempts = 0;
   const maxReconnects = 3;

   eventSource.onerror = () => {
     if (reconnectAttempts < maxReconnects) {
       setTimeout(() => connect(), 1000 * reconnectAttempts);
       reconnectAttempts++;
     }
   };
   ```

### Quest Generation

1. **Be specific** - Detailed commands generate better quests
   ```
   ❌ "add feature"
   ✅ "create a quest to add user authentication with JWT tokens and protected routes"
   ```

2. **Include context** - Mention technologies or constraints
   ```
   ✅ "build a REST API using Next.js API routes with TypeScript and Zod validation"
   ```

3. **Set complexity** - Indicate scope in your command
   ```
   ✅ "simple quest to add a dark mode toggle"
   ✅ "complex quest to implement full CRUD operations with database"
   ```

### Token Management

1. **Monitor usage** - Track tokens in complete events
2. **Set estimates** - Provide estimatedTokens for better planning
3. **Batch operations** - Group related tasks in single checkpoints

---

## SDK Examples

### TypeScript Client

```typescript
class AgentsOfEmpireClient {
  constructor(private baseUrl: string) {}

  async generateQuest(command: string) {
    const response = await fetch(`${this.baseUrl}/api/quests/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    return response.json();
  }

  async* executeCheckpoint(
    agentId: string,
    checkpointId: string,
    task: string
  ) {
    const response = await fetch(`${this.baseUrl}/api/agents/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, checkpointId, task })
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const events = this.parseSSE(chunk);

      for (const event of events) {
        yield event;
      }
    }
  }

  private parseSSE(chunk: string) {
    const events = [];
    let currentEvent = { type: '', data: '' };

    for (const line of chunk.split('\n')) {
      if (line.startsWith('event:')) {
        currentEvent.type = line.substring(7).trim();
      } else if (line.startsWith('data:')) {
        currentEvent.data = line.substring(5).trim();
        if (currentEvent.type && currentEvent.data) {
          events.push({
            type: currentEvent.type,
            data: JSON.parse(currentEvent.data)
          });
          currentEvent = { type: '', data: '' };
        }
      }
    }

    return events;
  }
}
```

### Python Client

```python
import requests
import json

class AgentsOfEmpireClient:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def generate_quest(self, command: str):
        response = requests.post(
            f"{self.base_url}/api/quests/generate",
            json={"command": command}
        )
        return response.json()

    def execute_checkpoint(self, agent_id: str, checkpoint_id: str, task: str):
        response = requests.post(
            f"{self.base_url}/api/agents/execute",
            json={
                "agentId": agent_id,
                "checkpointId": checkpoint_id,
                "task": task
            },
            stream=True
        )

        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('event:'):
                    event_type = line[7:].strip()
                elif line.startswith('data:'):
                    data = json.loads(line[5:])
                    yield {'type': event_type, 'data': data}
```

---

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for API version history and breaking changes.

---

**Last Updated:** 2025-02-12
**API Version:** 0.2.0
**Maintained by:** Agents of Empire Team
**Co-Authored-By:** Claude Sonnet 4.5 🤖
