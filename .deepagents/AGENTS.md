# Agents of Empire - Agent Memory

This file serves as persistent memory for AI agents working on this project.

## Project Overview

Agents of Empire is a Next.js application that provides interoperability between deepagentsjs and various agent protocols (A2A, A2UI, Microsoft Agent Framework).

## Build Commands

- **Install dependencies**: `pnpm install`
- **Development server**: `pnpm dev`
- **Build**: `pnpm build`
- **Start production**: `pnpm start`
- **Lint**: `pnpm lint`

## Project Structure

```
agents-of-empire/
├── app/                          # Next.js application
│   ├── lib/deepagents-interop/  # DeepAgents interop layer
│   │   ├── a2a/                 # Agent-to-Agent protocol
│   │   ├── a2ui/                # Agent-to-UI protocol
│   │   ├── backends/            # Storage backends
│   │   ├── sandbox/             # Sandbox implementations
│   │   └── agent-card/          # Agent card generation
│   ├── components/              # React components
│   └── api/                     # API routes
├── deepagentsjs/                # DeepAgents reference implementation
└── docs/                        # Documentation
```

## Architecture

The project uses a middleware-based architecture:

- **A2A Protocol**: Enables agent-to-agent communication with message routing
- **A2UI Protocol**: Converts agent state to UI components for rendering
- **Agent Cards**: Extracts and generates agent capabilities documentation
- **Backends**: Configurable storage backends (state, store, sandbox)
- **Registry**: Manages multiple agent configurations with caching

## Available Backends

1. **State Backend** (default): Ephemeral in-memory storage
2. **Store Backend**: Persistent storage using LangGraph's MemorySaver and InMemoryStore
3. **Sandbox Backend**: Local shell execution with file operations

## Memory Sources

Agents can load memory from these locations:
- `~/.deepagents/AGENTS.md` (user home directory)
- `.deepagents/AGENTS.md` (project root)

## Important Reminders

- Always check for existing implementations before creating new ones
- Write tests for new functionality
- Document public APIs with JSDoc comments
- Use TypeScript for all new code
- Follow ESLint rules in the project
- Prefer functional programming patterns

## Agent Types

- **Default Agent**: General-purpose AI assistant
- **Research Agent**: Specialized in research and analysis
- **Creative Agent**: Specialized in creative writing and ideation

## Development Notes

- The deepagents package is available as a workspace dependency
- LangChain packages are already installed (@langchain/langgraph, @langchain/langgraph-checkpoint, langchain)
- The project was migrated from deepagentsjs (https://github.com/DavinciDreams/deepagentsjs)
- Reference implementations are available in deepagentsjs/libs/deepagents/src/
