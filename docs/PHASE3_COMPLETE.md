## Phase 3: A2UI Streaming Integration ✨

Phase 3 adds declarative UI streaming to agents! Agents can now render real-time UI components as they work.

## Features

### 1. **Component Catalog** 📦

Pre-approved UI components that agents can render safely.

**File**: [app/lib/deepagents-interop/a2ui/catalog.ts](app/lib/deepagents-interop/a2ui/catalog.ts)

**Components**:

#### Display Components
- `text` - Display text with variants (body, heading, caption, code)
- `markdown` - Render markdown content
- `code` - Code blocks with syntax highlighting

#### Feedback Components
- `progress` - Progress bar with percentage
- `spinner` - Loading spinner
- `status` - Status indicator (idle, working, success, error, warning)

#### Data Components
- `list` - Ordered or unordered lists
- `table` - Tabular data with columns
- `card` - Container with title and content

#### Layout Components
- `container` - Flexible layout container
- `divider` - Visual separator

#### Input Components (for future interactivity)
- `button` - Clickable button
- `input` - Text input field

**Validation**:
```typescript
import { validateComponent } from "@/lib/deepagents-interop/a2ui/catalog";

const validation = validateComponent("progress", {
  value: 75,
  label: "Processing...",
  status: "active",
});

if (!validation.valid) {
  console.error(validation.errors);
}
```

### 2. **A2UI Adapter** 🔄

Transforms LangGraph agent state to A2UI components.

**File**: [app/lib/deepagents-interop/a2ui/adapter.ts](app/lib/deepagents-interop/a2ui/adapter.ts)

**Features**:
- ✅ Transforms messages to text/markdown components
- ✅ Transforms todos to card with list
- ✅ Transforms files to card with file list
- ✅ Transforms status to status component
- ✅ Smart component selection (markdown vs text)

**Usage**:
```typescript
import { stateToA2UI, createComponent } from "@/lib/deepagents-interop/a2ui/adapter";

// Transform agent state
const components = stateToA2UI({
  messages: [...],
  todos: [...],
  files: [...],
});

// Create custom component
const progressBar = createComponent(
  "progress-1",
  "progress",
  {
    value: 50,
    label: "Processing...",
  }
);
```

### 3. **Event Transformer** ⚡

Transforms LangGraph streaming events to A2UI messages in real-time.

**File**: [app/lib/deepagents-interop/a2ui/event-transformer.ts](app/lib/deepagents-interop/a2ui/event-transformer.ts)

**Handles**:
- ✅ Chain start/end events → status components
- ✅ Tool execution → card components with status
- ✅ Message streams → markdown components
- ✅ Token streams → incremental updates
- ✅ Progress updates → progress bar

**Usage**:
```typescript
import { transformStreamEvent } from "@/lib/deepagents-interop/a2ui/event-transformer";

for await (const event of agentStream) {
  const uiMessages = transformStreamEvent(event);
  for (const msg of uiMessages) {
    // Render UI message
  }
}
```

### 4. **A2UI Wrapper** 🎁

Wraps LangGraph agents to provide A2UI streaming interface.

**File**: [app/lib/deepagents-interop/a2ui/wrapper.ts](app/lib/deepagents-interop/a2ui/wrapper.ts)

**Features**:
- ✅ Two streaming modes: `stream()` and `streamEvents()`
- ✅ Automatic state-to-UI transformation
- ✅ Progress tracking integration
- ✅ Error handling with error components
- ✅ Completion components
- ✅ Optional update batching

**Usage**:
```typescript
import { A2UIWrapper } from "@/lib/deepagents-interop/a2ui/wrapper";

const wrapper = new A2UIWrapper(agent, {
  agentId: "default",
  enableProgressTracking: true,
  batchUpdates: false,
});

// Stream UI components
for await (const message of wrapper.stream(request)) {
  console.log(message); // A2UI component message
}

// Get current state as UI
const stateUI = await wrapper.getStateUI(threadId);
```

### 5. **API Endpoint** 🌐

Server-Sent Events endpoint for streaming UI components.

**File**: [app/api/agents/[agentId]/ui-stream/route.ts](app/api/agents/[agentId]/ui-stream/route.ts)

**Endpoint**: `POST /api/agents/[agentId]/ui-stream`

**Request**:
```json
{
  "task": "Explain React hooks",
  "context": {},
  "config": {
    "threadId": "optional-thread-id"
  }
}
```

**Response**: Server-Sent Events stream

```
data: {"type":"component","id":"message-1","component":"markdown","props":{"content":"Let me explain..."}}

data: {"type":"component","id":"progress","component":"progress","props":{"value":50,"label":"Step 1/2"}}

data: {"type":"complete","executionId":"exec_123","threadId":"thread_456"}
```

**Features**:
- ✅ Integrated with execution tracker
- ✅ Rate limiting and auth
- ✅ Cancellation support
- ✅ Headers: X-Execution-ID, X-Thread-ID

### 6. **React Renderer** ⚛️

React components for rendering A2UI messages.

**File**: [app/components/a2ui/A2UIRenderer.tsx](app/components/a2ui/A2UIRenderer.tsx)

**Components**:
- `A2UIRenderer` - Renders single A2UI message
- `A2UIStreamRenderer` - Manages stream state
- `useA2UIStream` - Hook for streaming

**Usage**:
```tsx
import { A2UIRenderer } from "@/components/a2ui/A2UIRenderer";

function MyComponent() {
  const message = {
    type: "component",
    id: "hello",
    component: "text",
    props: {
      content: "Hello World!",
      variant: "heading",
    },
  };

  return <A2UIRenderer message={message} />;
}
```

**With Streaming**:
```tsx
import { useA2UIStream } from "@/components/a2ui/A2UIRenderer";

function StreamingComponent() {
  const { components, isStreaming, error, connect } = useA2UIStream(
    "/api/agents/default/ui-stream",
    { task: "Explain AI" }
  );

  return (
    <div>
      <button onClick={connect} disabled={isStreaming}>
        {isStreaming ? "Streaming..." : "Start"}
      </button>

      {components.map((msg, i) => (
        <A2UIRenderer key={i} message={msg} />
      ))}
    </div>
  );
}
```

### 7. **Component Implementations** 🎨

Individual React components for each A2UI type.

**Files**: [app/components/a2ui/components/](app/components/a2ui/components/)

- `Text.tsx` - Text with variants and colors
- `Markdown.tsx` - Markdown rendering with syntax highlighting
- `Code.tsx` - Code blocks with language support
- `Card.tsx` - Card container with variants
- `Container.tsx` - Flexible layout container
- `Progress.tsx` - Progress bar with status
- `Status.tsx` - Status indicator with icons
- `Spinner.tsx` - Loading spinner
- `List.tsx` - Ordered/unordered lists
- `Table.tsx` - Data tables
- `Divider.tsx` - Visual separators
- `Button.tsx` - Interactive buttons
- `Input.tsx` - Text input fields

**Styling**: Uses Tailwind CSS with dark mode support

## Examples

See [examples/a2ui-example.tsx](examples/a2ui-example.tsx) for comprehensive examples:

### 1. Simple Streaming
```tsx
import { useA2UIStream, A2UIRenderer } from "@/components/a2ui/A2UIRenderer";

function SimpleExample() {
  const { components, isStreaming, connect } = useA2UIStream(
    "/api/agents/default/ui-stream",
    { task: "Tell me about AI" }
  );

  return (
    <div>
      <button onClick={connect}>Start</button>
      {components.map((msg, i) => (
        <A2UIRenderer key={i} message={msg} />
      ))}
    </div>
  );
}
```

### 2. Manual SSE Handling
```tsx
const response = await fetch("/api/agents/default/ui-stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ task: "Explain React" }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const message = JSON.parse(line.substring(6));
      // Handle message
    }
  }
}
```

### 3. Interactive Components
```tsx
function InteractiveExample() {
  const handleEvent = (eventId: string, data: unknown) => {
    console.log("Event:", eventId, data);
  };

  return (
    <A2UIRenderer
      message={buttonMessage}
      onEvent={handleEvent}
    />
  );
}
```

### 4. Multiple Agents
```tsx
function MultiAgentExample() {
  const [agent, setAgent] = useState("default");

  return (
    <div>
      <select value={agent} onChange={(e) => setAgent(e.target.value)}>
        <option value="default">Default</option>
        <option value="research">Research</option>
        <option value="creative">Creative</option>
      </select>

      {/* Stream from selected agent */}
      <StreamFromAgent agentId={agent} />
    </div>
  );
}
```

## Testing

### 1. Start Server
```bash
export ANTHROPIC_API_KEY="your-key"
pnpm dev
```

### 2. Test UI Streaming
```bash
curl -N -X POST http://localhost:3000/api/agents/default/ui-stream \
  -H "Content-Type: application/json" \
  -d '{"task": "Count to 5 slowly"}'
```

You'll see Server-Sent Events with component messages:
```
data: {"type":"component","id":"status-1","component":"status","props":{"state":"working","message":"Starting..."}}

data: {"type":"component","id":"message-1","component":"markdown","props":{"content":"1..."}}

data: {"type":"complete","executionId":"exec_123"}
```

### 3. Test in Browser
Create a test page in [app/test-a2ui/page.tsx](app/test-a2ui/page.tsx):

```tsx
import { SimpleA2UIExample } from "@/examples/a2ui-example";

export default function TestPage() {
  return <SimpleA2UIExample />;
}
```

Visit: http://localhost:3000/test-a2ui

## Architecture

```
Request
  ↓
API: /api/agents/[agentId]/ui-stream
  ↓
A2UIWrapper (wraps LangGraph agent)
  ↓
Stream LangGraph Events
  ↓
Event Transformer → A2UI Messages
  ↓
Server-Sent Events (SSE)
  ↓
React Client (useA2UIStream)
  ↓
A2UIRenderer → React Components
  ↓
Rendered UI
```

## Component Flow

```
LangGraph State:
{
  messages: [...],
  todos: [...],
  status: "working"
}
  ↓
A2UI Adapter
  ↓
A2UI Messages:
[
  {type: "component", component: "markdown", ...},
  {type: "component", component: "card", ...},
  {type: "component", component: "status", ...}
]
  ↓
A2UIRenderer
  ↓
React Components:
<MarkdownComponent />
<CardComponent />
<StatusComponent />
```

## Integration with A2A

A2UI works seamlessly with A2A protocol:

```typescript
// A2A invocation still works
const response = await fetch("/api/agents/default/invoke", {
  method: "POST",
  body: JSON.stringify({ task: "..." }),
});

// A2UI streaming adds visual feedback
const uiStream = fetch("/api/agents/default/ui-stream", {
  method: "POST",
  body: JSON.stringify({ task: "..." }),
});
```

## Performance

✅ **Efficient Streaming**: Components streamed incrementally
✅ **Optional Batching**: Reduce render frequency with batching
✅ **Component Validation**: Prevents invalid components
✅ **React Memoization**: Optimized re-renders
✅ **Dark Mode**: Built-in dark mode support

## Dependencies

Added packages:
- `react-markdown` - Markdown rendering
- `react-syntax-highlighter` - Code syntax highlighting
- `@types/react-syntax-highlighter` - TypeScript types

## What's Next?

Phase 3 is complete! 🎉

**Future Enhancements**:
- Interactive components (buttons, forms)
- Custom component registration
- Component animations
- Chart/graph components
- File upload components
- Video/audio components
- Real-time collaboration

---

**Status**: ✅ Phase 3 Complete - A2UI Streaming Integrated
**Previous**: [Phase 2 Enhanced](PHASE2_ENHANCED.md)
