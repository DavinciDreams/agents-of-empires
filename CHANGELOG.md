# Changelog

All notable changes to Agents of Empire will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-02-12

### 🎮 Major Features

#### Real Deep Agents Integration
- **LangChain Deep Agents** with actual task execution
- **Server-Sent Events (SSE)** streaming for real-time progress
- **Multi-provider support**: Anthropic, OpenAI, ZAI, Groq, Together, Perplexity, OpenRouter
- **Token usage tracking** and performance metrics
- **Live agent state** synchronization (IDLE, THINKING, WORKING, COMPLETED)

#### Quest System
- **Natural language quest generation** via Chat Commander
- **AI-powered checkpoint breakdown** into executable steps
- **Visual checkpoint markers** in 3D world
- **Progress tracking** with real-time HUD updates
- **Quest complexity detection** (easy, medium, hard)
- **Estimated duration** calculation

#### Live Logs Viewer
- **Real-time event streaming** with SSE
- **Color-coded log levels**: info (blue), warn (yellow), error (red), success (green), debug (gray)
- **Source tagging**: client, agent, system
- **Keyboard shortcut**: `Shift+L` to toggle
- **Auto-scroll** to latest logs
- **Log filtering** by level and source

#### Intelligence Bureau
- **LangSmith trace visualization** (optional integration)
- **Real-time thinking display** showing agent reasoning
- **Tool execution tracking** with inputs/outputs
- **Duration metrics** for each operation
- **Event type classification**: thought, tool, message, checkpoint, error

### 🛠️ New Tools & APIs

#### Tavily Web Search
- **Real-time web research** capability for agents
- **Configurable result count** (default: 5)
- **Search depth options**: basic, advanced
- **Domain filtering**: include/exclude specific domains
- **Image search support** with descriptions

#### API Endpoints
- `POST /api/agents/execute` - Execute checkpoint tasks with Deep Agents (SSE)
- `POST /api/quests/generate` - Generate quests from natural language
- `GET /api/agents/[agentId]/traces` - Fetch LangSmith execution traces
- `POST /api/agents/[agentId]/traces` - Stream traces in real-time (SSE)

### 🎨 UI/UX Enhancements

#### New Components
- **ChatCommander** - Natural language quest input
- **LogsViewer** - Live event log panel
- **IntelligenceBureau** - LangSmith trace viewer
- **AgentProgressHUD** - Token usage and step tracking
- **FleetCommand** - Agent management panel
- **CheckpointMarker** - 3D visual markers for quest steps
- **CheckpointManager** - Checkpoint lifecycle management

#### Improved Visuals
- **Enhanced terrain** with better textures and detail
- **Water planes** with reflection and transparency
- **Natural features**: trees, rocks, vegetation
- **Dynamic checkpoint colors**: blue (pending), gold (active), green (completed)
- **Pulsing animations** for active checkpoints
- **Victory celebration effects**

### 🏗️ Architecture Changes

#### Build System
- **Vercel deployment** ready with published npm packages
- **Production build** optimization (~6s build time)
- **TypeScript strict mode** with full type safety
- **Next.js 16.1.6** with Turbopack
- **Server external packages** for deepagents ESM module

#### Dependencies Updated
- `deepagents`: workspace → `^1.7.5` (published package)
- `@langchain/core`: `1.1.17` → `1.1.22`
- `@langchain/langgraph`: `1.1.2` → `1.1.4`
- `@langchain/openai`: `1.2.4` → `1.2.7`
- `langchain`: `1.2.16` → `1.2.21`
- `@langchain/tavily`: `^1.2.0` (new)

#### State Management
- **Zustand** with Immer for game state
- **Logs state**: centralized log management
- **Visibility toggles** for UI panels
- **Performance optimization** with shallow selectors

### 🐛 Bug Fixes

#### TypeScript Compilation
- Fixed provider config streaming parameter (removed invalid option)
- Fixed TavilySearch initialization (apiKey → tavilyApiKey)
- Fixed Deep Agents param name (llm → model)
- Fixed checkpoint status type (in_progress → active)
- Fixed material array type handling in CheckpointMarker
- Added null safety for quest.checkpointIds
- Exported LogLevel and LogEntry types

#### Runtime Issues
- Resolved module not found errors for deepagents
- Fixed LangChain version conflicts
- Corrected Next.js 15+ async params handling
- Fixed run.start_time null safety in traces API

### 📚 Documentation

#### New Documentation
- Comprehensive README with full feature overview
- API endpoint documentation with examples
- Environment variable reference
- Quick start guide
- How to play tutorial
- Controls reference
- Architecture diagrams
- Contribution guidelines

#### Updated Documentation
- PRD with complete feature specification
- Quest system implementation details
- GUI overhaul summary
- Integration completion docs

### 🔧 Configuration

#### Environment Variables
```env
# Required (choose at least one)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ZAI_API_KEY=...

# Optional - Enhanced features
TAVILY_API_KEY=tvly-...
LANGSMITH_API_KEY=...
LANGSMITH_WORKSPACE_ID=...
LANGSMITH_ENDPOINT=https://api.smith.langchain.com

# Optional - Other providers
GROQ_API_KEY=...
TOGETHER_API_KEY=...
PERPLEXITY_API_KEY=...
OPENROUTER_API_KEY=...

# Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

#### Next.js Config
- Added `serverExternalPackages: ['deepagents']`
- Configured Turbopack for faster builds
- Enabled strict TypeScript checking

### ⚡ Performance

- **Build time**: ~6 seconds
- **First load**: <3 seconds
- **Agent response**: 2-10 seconds (task-dependent)
- **60 FPS** gameplay on modern hardware
- **Optimized re-renders** with shallow Zustand selectors
- **Lazy loading** for non-critical components

### 🚀 Deployment

- ✅ **Vercel** deployment ready
- ✅ **Production build** successful
- ✅ **Environment validation** on startup
- ✅ **SSE streaming** supported on Vercel
- ✅ **Serverless API routes** optimized

### 🎯 Features Implemented

- [x] Real-time 3D RTS game
- [x] Deep Agents with live execution
- [x] Natural language quest generation
- [x] Checkpoint-based task system
- [x] Live logs viewer (Shift+L)
- [x] Intelligence Bureau (LangSmith traces)
- [x] Agent progress tracking
- [x] Tavily web search integration
- [x] Multi-agent selection
- [x] Dragon companions
- [x] Party formations
- [x] Structure buildings
- [x] Victory effects
- [x] Combat animations
- [x] Dark mode support
- [x] Vercel deployment ready

### 📊 Statistics

- **110 files changed**
- **+24,887 insertions**
- **-151 deletions**
- **38 new files** in main PR
- **59 commits** in deepagentsjs submodule update

---

## [0.1.0] - 2025-01-XX

### Initial Release

#### Core Features
- Next.js 16 application with React 19
- Three.js 3D game engine
- Basic agent entities
- A2A protocol implementation
- A2UI streaming components
- Agent card metadata
- Dragon companions
- Structure buildings
- Basic quest system

#### Integration
- DeepAgents framework integration
- Microsoft Agent Framework compatibility
- Multi-provider LLM support
- Thread-based conversations

#### UI Components
- Game HUD
- Agent info panels
- Structure info panels
- Party management
- Theme toggle (dark/light mode)
- Tutorial system
- Tooltips and controls

---

## Future Releases

### [0.3.0] - Planned

#### Agent Interaction UI
- [ ] VRM avatar rendering for agents
- [ ] 3D scene for agent interaction
- [ ] Generative canvas showing agent work
- [ ] Voice chat with text-to-speech
- [ ] Real-time conversation interface

#### Enhanced Features
- [ ] Multiplayer support
- [ ] Agent marketplace
- [ ] Custom tool builder
- [ ] Save/load game state
- [ ] Achievement system
- [ ] Leaderboards
- [ ] Replay system

#### Performance
- [ ] WebGL optimization
- [ ] Asset streaming
- [ ] Progressive loading
- [ ] Service worker caching

---

**Legend:**
- 🎮 Major Feature
- 🛠️ Tool/API
- 🎨 UI/UX
- 🏗️ Architecture
- 🐛 Bug Fix
- 📚 Documentation
- 🔧 Configuration
- ⚡ Performance
- 🚀 Deployment
- 🎯 Feature Complete
- 📊 Statistics

---

**Maintained by the Agents of Empire team**

**Co-Authored-By: Claude Sonnet 4.5** 🤖
