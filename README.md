# Agents of Empire

A Next.js application integrating **deepagentsjs** with the **Microsoft Agent Framework** through A2A and A2UI protocols.

## Features

🤖 **Agent-to-Agent (A2A) Protocol**
- REST API for agent invocation and streaming
- Status checking and cancellation
- Rate limiting and authentication
- Thread-based conversations

🎨 **Agent-to-UI (A2UI) Protocol**
- Real-time UI component streaming
- 13+ pre-built React components
- Markdown and code syntax highlighting
- Dark mode support

📋 **Agent Cards**
- Standardized agent metadata
- Capability discovery
- A2A-compliant JSON Schema

## Quick Links

- 📖 [Integration Complete](docs/INTEGRATION_COMPLETE.md) - Full overview
- 🎯 [Phase 1: Agent Cards](docs/PHASE1_COMPLETE.md)
- 🔄 [Phase 2: A2A Protocol](docs/PHASE2_ENHANCED.md)
- ✨ [Phase 3: A2UI Streaming](docs/PHASE3_COMPLETE.md)
- 🤝 [Contributing Guide](docs/CONTRIBUTING.md)

## Prerequisites

**IMPORTANT: This project uses pnpm workspaces. Do NOT use npm or yarn.**

1. Install pnpm globally if you haven't already:
   ```bash
   npm install -g pnpm
   # or
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   ```

2. Verify pnpm is installed:
   ```bash
   pnpm --version
   ```

## Project Structure

This is a pnpm workspace monorepo that includes:
- **Root**: Main Next.js application
- **deepagentsjs**: Git submodule with DeepAgents libraries

## Getting Started

1. Clone the repository with submodules:
   ```bash
   git clone --recurse-submodules <repository-url>
   # or if already cloned:
   git submodule update --init --recursive
   ```

2. Install all dependencies (this will install for both root and submodule):
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   # Required
   export ANTHROPIC_API_KEY="your-anthropic-key"

   # Optional
   export OPENAI_API_KEY="your-openai-key"
   export A2A_API_KEY="your-api-secret"
   ```

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Test the integration:
   ```bash
   # Get agent card
   curl http://localhost:3000/.well-known/agent-card.json

   # Invoke agent via A2A
   curl -X POST http://localhost:3000/api/agents/default/invoke \
     -H "Content-Type: application/json" \
     -d '{"task": "Explain quantum computing"}'

   # Stream UI components via A2UI
   curl -N -X POST http://localhost:3000/api/agents/default/ui-stream \
     -H "Content-Type: application/json" \
     -d '{"task": "Tell me about AI"}'
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage Examples

### A2A Protocol (Agent-to-Agent)

```typescript
// Invoke agent
const response = await fetch("/api/agents/default/invoke", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    task: "Explain React hooks",
    config: { threadId: "my-conversation" }
  })
});

const result = await response.json();
console.log(result.result.messages);
```

### A2UI Protocol (Agent-to-UI)

```tsx
import { useA2UIStream, A2UIRenderer } from "@/components/a2ui/A2UIRenderer";

function MyComponent() {
  const { components, isStreaming, connect } = useA2UIStream(
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

## Available Agents

Three pre-configured agents are available:

1. **Default Agent** (`/api/agents/default/*`)
   - General-purpose assistant
   - Claude Sonnet 4, Temperature: 0

2. **Research Agent** (`/api/agents/research/*`)
   - Deep research and analysis
   - Claude Sonnet 4, Temperature: 0

3. **Creative Agent** (`/api/agents/creative/*`)
   - Creative writing and ideation
   - Claude Sonnet 4, Temperature: 0.7

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
