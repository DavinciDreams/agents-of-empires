# DeepAgents × Microsoft Agent Framework Integration Design

## Executive Summary

This document outlines the architecture for achieving full interoperability between **deepagentsjs** (LangGraph-based agents) and **Microsoft Agent Framework** using the A2A (Agent-to-Agent) and A2UI (Agent-to-UI) protocols.

**Key Insight:** DeepAgents are LangGraph graphs, which means they already support streaming, state management, and can be wrapped with HTTP endpoints using standard LangGraph/LangChain patterns.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│              (Microsoft Agent Framework, Web, CLI)           │
└────────────────────┬───────────────┬────────────────────────┘
                     │               │
         ┌───────────▼──────┐   ┌───▼──────────┐
         │  A2A Protocol    │   │  A2UI        │
         │  (Agent Cards)   │   │  Streaming   │
         └───────────┬──────┘   └───┬──────────┘
                     │               │
              ┌──────▼───────────────▼──────┐
              │   HTTP/REST Endpoints        │
              │   (Next.js API Routes)       │
              └──────┬──────────────┬────────┘
                     │              │
         ┌───────────▼──────┐  ┌───▼─────────────┐
         │  A2A Wrapper     │  │  A2UI Adapter   │
         └───────────┬──────┘  └───┬─────────────┘
                     │              │
              ┌──────▼──────────────▼──────┐
              │    DeepAgent Instance      │
              │    (LangGraph Graph)       │
              └────────────────────────────┘
```

## Core Components

### 1. Agent Card Generator

**Purpose:** Generate A2A-compliant agent cards from deepagent configurations.

**Input:** DeepAgent configuration object
**Output:** JSON agent card at `/.well-known/agent-card.json`

**Agent Card Structure:**
```typescript
interface AgentCard {
  // Required fields (A2A spec)
  name: string;
  description: string;
  version: string;

  // Capabilities
  capabilities: {
    tools: ToolMetadata[];
    subagents: SubAgentMetadata[];
    skills: SkillMetadata[];
    planning: boolean;
    memory: boolean;
    streaming: boolean;
  };

  // Protocol support
  protocols: {
    a2a: {
      version: string;
      bindings: ["http", "jsonrpc"];
    };
    a2ui: {
      version: string;
      components: string[];
    };
  };

  // Endpoints
  endpoints: {
    invoke: string;        // POST /api/agents/{id}/invoke
    stream: string;        // POST /api/agents/{id}/stream
    status: string;        // GET /api/agents/{id}/status
    cancel: string;        // POST /api/agents/{id}/cancel
  };

  // Input/Output schemas
  input_schema: JSONSchema;
  output_schema: JSONSchema;
}
```

**Implementation Notes:**
- Extract tool metadata from middleware.tools
- Parse subagent definitions from createDeepAgent config
- Detect capabilities from middleware stack
- Generate JSON Schema from LangGraph state

### 2. A2A Protocol Wrapper

**Purpose:** Expose deepagents via A2A-compliant HTTP/REST API.

**Key Features:**
- HTTP/REST binding for A2A protocol
- JSON-RPC 2.0 support (optional)
- Request validation against agent card schemas
- Authentication & authorization
- Rate limiting & quotas

**Request Flow:**
```typescript
// A2A Request Structure
interface A2ARequest {
  task: string;              // User's task/query
  context?: Record<string, any>;  // Additional context
  config?: {
    recursionLimit?: number;
    streaming?: boolean;
    checkpointId?: string;   // Resume from checkpoint
  };
}

// A2A Response Structure
interface A2AResponse {
  status: "success" | "error" | "pending";
  result?: {
    messages: Message[];
    files?: Record<string, FileData>;
    todos?: TodoItem[];
    state?: Record<string, any>;
  };
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    executionTime: number;
    tokensUsed?: number;
    checkpointId?: string;
  };
}
```

**Mapping to LangGraph:**
```typescript
// A2A invoke → LangGraph invoke
const result = await deepAgent.invoke(
  {
    messages: [new HumanMessage(a2aRequest.task)],
    ...a2aRequest.context
  },
  {
    recursionLimit: a2aRequest.config?.recursionLimit || 50,
    configurable: {
      thread_id: generateThreadId(),
      checkpoint_id: a2aRequest.config?.checkpointId,
    }
  }
);
```

### 3. A2UI Streaming Adapter

**Purpose:** Transform deepagent streaming responses into A2UI declarative UI components.

**Key Concepts:**
- **Declarative UI**: Agents send JSON describing UI, not executable code
- **Component Catalog**: Pre-approved, trusted UI components
- **Streaming**: Incremental UI updates as agent works
- **Security**: No arbitrary code execution

**Component Catalog:**
```typescript
// Pre-approved A2UI components
const A2UI_CATALOG = {
  // Display components
  Card: { props: ["title", "description", "actions"] },
  Text: { props: ["content", "variant", "color"] },
  Code: { props: ["language", "content", "filename"] },

  // Input components
  Button: { props: ["label", "onClick", "variant"] },
  TextField: { props: ["label", "value", "onChange"] },
  Select: { props: ["label", "options", "value", "onChange"] },

  // Layout components
  Stack: { props: ["direction", "spacing", "children"] },
  Grid: { props: ["columns", "gap", "children"] },

  // Agent-specific components
  TaskList: { props: ["todos", "onUpdate"] },
  FileTree: { props: ["files", "onSelect"] },
  ToolResult: { props: ["tool", "result", "timestamp"] },
};
```

**Streaming Transformation:**
```typescript
// LangGraph stream event → A2UI message
interface A2UIMessage {
  type: "component" | "update" | "remove";
  id: string;
  component: keyof typeof A2UI_CATALOG;
  props: Record<string, any>;
  children?: A2UIMessage[];
}

// Example transformation
function transformAgentEvent(event: StreamEvent): A2UIMessage[] {
  if (event.event === "on_chat_model_stream") {
    // Token streaming → Text component update
    return [{
      type: "update",
      id: "agent-response",
      component: "Text",
      props: { content: event.data.chunk.content }
    }];
  }

  if (event.event === "on_tool_start") {
    // Tool execution → ToolResult component
    return [{
      type: "component",
      id: `tool-${event.run_id}`,
      component: "ToolResult",
      props: {
        tool: event.name,
        status: "running",
        timestamp: new Date().toISOString()
      }
    }];
  }

  if (event.metadata?.langgraph_node === "todos") {
    // Todo list update → TaskList component
    return [{
      type: "update",
      id: "task-list",
      component: "TaskList",
      props: { todos: event.data.todos }
    }];
  }

  return [];
}
```

### 4. HTTP Endpoints (Next.js API Routes)

**Endpoint Structure:**
```
/api/
├── agents/
│   ├── .well-known/
│   │   └── agent-card.json/       # GET - Agent card metadata
│   │       └── route.ts
│   ├── [agentId]/
│   │   ├── invoke/                # POST - Synchronous invocation
│   │   │   └── route.ts
│   │   ├── stream/                # POST - Streaming invocation
│   │   │   └── route.ts
│   │   ├── status/                # GET - Check execution status
│   │   │   └── route.ts
│   │   └── cancel/                # POST - Cancel execution
│   │       └── route.ts
│   └── list/                      # GET - List available agents
│       └── route.ts
```

**Example Implementation:**
```typescript
// app/api/agents/[agentId]/invoke/route.ts
import { createDeepAgent } from "deepagents";
import { A2AWrapper } from "@/lib/deepagents-interop/a2a/wrapper";

export async function POST(
  req: Request,
  { params }: { params: { agentId: string } }
) {
  const a2aRequest = await req.json();

  // Load agent configuration
  const agentConfig = await getAgentConfig(params.agentId);
  const agent = createDeepAgent(agentConfig);

  // Wrap with A2A protocol
  const wrapper = new A2AWrapper(agent);
  const response = await wrapper.invoke(a2aRequest);

  return Response.json(response);
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Deliverables:**
- [ ] Project structure setup
- [ ] TypeScript type definitions for A2A/A2UI protocols
- [ ] Agent Card generator implementation
- [ ] Basic HTTP endpoint for agent card retrieval

**Files to Create:**
```
app/lib/deepagents-interop/
├── types/
│   ├── a2a.ts              # A2A protocol types
│   ├── a2ui.ts             # A2UI protocol types
│   └── agent-card.ts       # Agent card types
├── agent-card/
│   ├── generator.ts        # Card generation logic
│   └── extractor.ts        # Extract metadata from deepagent
└── utils/
    └── schema.ts           # JSON Schema generation
```

### Phase 2: A2A Protocol Integration (Week 2)

**Deliverables:**
- [ ] A2A wrapper implementation
- [ ] HTTP/REST binding
- [ ] Request/response transformation
- [ ] Error handling & validation
- [ ] API endpoints for invoke/stream/status/cancel

**Files to Create:**
```
app/lib/deepagents-interop/
├── a2a/
│   ├── wrapper.ts          # Main A2A wrapper
│   ├── http-binding.ts     # HTTP/REST protocol
│   ├── jsonrpc-binding.ts  # JSON-RPC (optional)
│   ├── validator.ts        # Request validation
│   └── errors.ts           # Error handling
└── middleware/
    └── a2a-logger.ts       # Logging middleware
```

### Phase 3: A2UI Streaming (Week 3)

**Deliverables:**
- [ ] Component catalog definition
- [ ] Event transformer (LangGraph → A2UI)
- [ ] Streaming adapter implementation
- [ ] React renderer for A2UI components

**Files to Create:**
```
app/lib/deepagents-interop/
├── a2ui/
│   ├── adapter.ts          # Main A2UI adapter
│   ├── catalog.ts          # Component catalog
│   ├── transformer.ts      # Event transformation
│   └── stream.ts           # Streaming utilities
└── components/a2ui/
    ├── Renderer.tsx        # Main renderer component
    ├── catalog/
    │   ├── Card.tsx
    │   ├── TaskList.tsx
    │   ├── ToolResult.tsx
    │   └── ... (more components)
    └── hooks/
        └── useA2UIStream.ts # React hook for streaming
```

### Phase 4: Testing & Examples (Week 4)

**Deliverables:**
- [ ] Unit tests for all components
- [ ] Integration tests for A2A protocol
- [ ] Example multi-agent system
- [ ] Example A2UI web interface
- [ ] Documentation

**Files to Create:**
```
examples/
├── a2a-integration/
│   ├── research-agent.ts   # A2A-enabled research agent
│   ├── client.ts           # A2A client example
│   └── multi-agent.ts      # Multi-agent coordination
├── a2ui-demo/
│   ├── page.tsx            # Demo web interface
│   └── agent-chat.tsx      # Chat with A2UI streaming
└── microsoft-framework/
    └── interop-test.ts     # Test with MS Agent Framework
```

## Technical Considerations

### 1. State Management

**LangGraph Checkpointing:**
- Use LangGraph's built-in checkpointing for resumable executions
- Map checkpoint IDs to A2A conversation/thread IDs
- Support long-running tasks with status polling

```typescript
import { MemorySaver } from "@langchain/langgraph";

const agent = createDeepAgent({
  checkpointer: new MemorySaver(),
  // ... other config
});

// Resume from checkpoint
const result = await agent.invoke(
  { messages: [...] },
  {
    configurable: {
      thread_id: "conversation-123",
      checkpoint_id: "checkpoint-456"
    }
  }
);
```

### 2. Streaming

**LangGraph Streaming Modes:**
- `streamMode: "values"` - Stream full state updates
- `streamMode: "updates"` - Stream node outputs
- `streamMode: "messages"` - Stream messages only
- `streamMode: "events"` - Stream all events (best for A2UI)

**Recommendation:** Use `events` mode for maximum flexibility in A2UI transformation.

### 3. Authentication & Authorization

**A2A Security:**
- API key authentication for A2A clients
- OAuth 2.0 for user-facing applications
- Rate limiting per agent/client
- Audit logging for compliance

**Implementation:**
```typescript
// Middleware for API authentication
export async function authenticateA2A(req: Request) {
  const apiKey = req.headers.get("X-API-Key");
  const client = await validateApiKey(apiKey);

  if (!client) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return client;
}
```

### 4. Error Handling

**A2A Error Codes:**
```typescript
enum A2AErrorCode {
  INVALID_REQUEST = "invalid_request",
  AGENT_NOT_FOUND = "agent_not_found",
  EXECUTION_FAILED = "execution_failed",
  TIMEOUT = "timeout",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  INTERNAL_ERROR = "internal_error",
}
```

**Error Response Format:**
```typescript
interface A2AError {
  error: {
    code: A2AErrorCode;
    message: string;
    details?: Record<string, any>;
  };
}
```

### 5. Performance Optimization

**Caching:**
- Cache agent cards (1 hour TTL)
- Cache agent configurations
- Use LangSmith for tracing & debugging

**Connection Pooling:**
- Reuse LLM client connections
- Connection pooling for database (if using persistent storage)

## Dependencies

```json
{
  "dependencies": {
    // Core
    "deepagents": "^0.x.x",
    "langchain": "^0.x.x",
    "@langchain/langgraph": "^0.x.x",

    // Model providers
    "@langchain/anthropic": "^0.x.x",
    "@langchain/openai": "^0.x.x",

    // Tools
    "@langchain/tavily": "^0.x.x",

    // Utilities
    "zod": "^3.x.x",
    "json-schema": "^0.x.x",

    // Next.js (already installed)
    "next": "^16.x.x",
    "react": "^19.x.x"
  },
  "devDependencies": {
    "@types/json-schema": "^7.x.x",
    "vitest": "^1.x.x"
  }
}
```

## Success Criteria

### Functional Requirements
✅ DeepAgents can be discovered via A2A agent cards
✅ External A2A clients can invoke deepagents
✅ Deepagents can communicate with other A2A agents
✅ UI updates stream in real-time via A2UI
✅ Full interoperability with Microsoft Agent Framework

### Non-Functional Requirements
✅ Response time < 100ms for agent card retrieval
✅ Support 100+ concurrent agent executions
✅ 99.9% uptime for A2A endpoints
✅ Comprehensive error handling and logging
✅ Full TypeScript type safety

## Documentation Sources

- [DeepAgents README](https://github.com/langchain-ai/deepagentsjs)
- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [LangChain API Integration](https://towardsdatascience.com/integrating-an-external-api-with-a-chatbot-application-using-langchain-and-chainlit-b687bb1efe58)
- [A2A Protocol Specification](https://a2a-protocol.org/latest/specification/)
- [A2UI Protocol Guide](https://a2aprotocol.ai/blog/a2ui-guide)
- [Microsoft A2A Documentation](https://learn.microsoft.com/en-us/agent-framework/user-guide/hosting/agent-to-agent-integration)

---

**Version:** 1.0
**Last Updated:** 2026-02-01
**Status:** Design Phase
