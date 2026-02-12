# Quest Generation & Checkpoint Progression System

## Implementation Summary

This implementation adds a complete chat-driven quest generation and agent-checkpoint progression system to the game.

## Components Implemented

### 1. Data Model Extensions (`gameStore.ts`)

**GameAgent Interface - Added Fields:**
- `currentQuestId?: string` - Current quest being worked on
- `currentCheckpointId?: string` - Current checkpoint in the quest
- `currentStepDescription?: string` - Description of current step
- `tokenUsage` - Tracks total tokens, per-step tokens, and estimated cost
- `executionProgress` - Tracks current step, total steps, percent complete, and timing

**Quest Interface - Added Fields:**
- `checkpointIds?: string[]` - List of checkpoint IDs for this quest
- `estimatedTokens?: number` - Total estimated tokens for quest
- `actualTokens?: number` - Total actual tokens used

**New Checkpoint Interface:**
```typescript
interface Checkpoint {
  id: string;
  questId: string;
  stepNumber: number;
  description: string;
  position: [number, number, number];
  status: "pending" | "active" | "completed" | "failed";
  estimatedTokens?: number;
  actualTokens?: number;
  completedAt?: number;
  result?: string;
}
```

**New Store Actions:**
- `addCheckpoint(checkpoint)` - Add new checkpoint
- `updateCheckpoint(id, updates)` - Update checkpoint data
- `completeCheckpoint(id, result, tokens)` - Mark checkpoint complete
- `setAgentCheckpoint(agentId, checkpointId)` - Assign checkpoint to agent
- `updateAgentProgress(agentId, progress)` - Update execution progress
- `updateTokenUsage(agentId, tokens)` - Update token tracking

### 2. Quest Generation API (`/api/quests/generate/route.ts`)

**POST /api/quests/generate**

Accepts:
```json
{
  "command": "Build a login page with OAuth",
  "agentIds": ["agent-1", "agent-2"]
}
```

Returns:
```json
{
  "quest": {
    "id": "quest-1234567890",
    "title": "Build OAuth Login Page",
    "description": "Create a login page with OAuth integration",
    "status": "pending",
    "checkpointIds": ["checkpoint-1", "checkpoint-2", ...],
    "estimatedTokens": 5000,
    ...
  },
  "checkpoints": [
    {
      "id": "checkpoint-1",
      "questId": "quest-1234567890",
      "stepNumber": 1,
      "description": "Research OAuth providers",
      "position": [10, 0, 25],
      "status": "pending",
      "estimatedTokens": 1000
    },
    ...
  ]
}
```

**Implementation:**
- Uses Claude via LangChain to generate structured quests
- Generates 3-7 checkpoints based on natural language command
- Estimates token usage for each checkpoint
- Places checkpoints visually on map in a path pattern

### 3. Chat Commander UI (`ChatCommander.tsx`)

**Location:** Bottom center of screen

**Features:**
- Natural language input for quest commands
- Shows number of selected agents
- Auto-assigns quest to selected agents
- Error handling with visual feedback
- "Deploy" button to submit command

**User Flow:**
1. Select agents (optional)
2. Type command: "Build a login page with OAuth"
3. Click "Deploy"
4. Quest is generated and appears on map
5. Agents assigned to quest (if selected)

### 4. Checkpoint Visualization (`CheckpointMarker.tsx`, `CheckpointManager.tsx`)

**Visual Features:**
- Glowing sphere marker at each checkpoint location
- Rotating ring around marker
- Checkpoint number displayed
- Status-based coloring:
  - Blue: Pending
  - Gold: Active (agent working on it)
  - Green: Completed
- Pulse effect for active checkpoints
- Hover text showing checkpoint description

**CheckpointManager:**
- Renders all checkpoints in the game state
- Tracks which checkpoints are active
- Updates visual state based on completion

### 5. Agent Bridge Enhancements (`AgentBridge.tsx`)

**New Event Types:**
- `agent:step_started` - Agent starts working on checkpoint
- `agent:step_completed` - Checkpoint completed
- `agent:progress_update` - Progress percentage update
- `agent:token_update` - Token usage update
- `agent:checkpoint_reached` - Agent reached checkpoint

**New Function:**
- `moveToNextCheckpoint(agentId)` - Moves agent to next checkpoint in sequence
  - Checks if current checkpoint is complete
  - Finds next checkpoint in quest
  - Sets agent target to next checkpoint position
  - Updates progress tracking
  - Marks quest complete when all checkpoints done

**Event Handling:**
```typescript
case "agent:step_completed":
  store.completeCheckpoint(checkpointId, result, tokens);
  moveToNextCheckpoint(agentId);
  break;

case "agent:token_update":
  store.updateTokenUsage(agentId, tokens);
  break;
```

### 6. Progress HUD (`AgentProgressHUD.tsx`)

**Location:** Top right, below minimap

**Displays:**
- Agent name and current state
- Current checkpoint description
- Progress bar showing completion percentage
- Step counter (e.g., "Step 3/7")
- Token usage and estimated cost
- Real-time updates as agent works

**Visual Design:**
- Gold-bordered card per agent
- Animated progress bar
- Token count with USD estimate ($0.009 per 1M tokens)

### 7. Quest Assignment Logic

**Updated `assignQuestToAgents`:**
- Detects checkpoint-based vs structure-based quests
- For checkpoint quests:
  - Assigns first checkpoint to agents
  - Sets agent target to checkpoint position
  - Initializes progress tracking
  - Initializes token tracking
  - Marks checkpoint as active
- For structure quests (legacy):
  - Maintains existing behavior

## User Flow

### Creating a Quest

1. **Select Agents (Optional)**
   - Click agents or drag-select multiple
   - Selected count shown in ChatCommander

2. **Enter Command**
   - Type natural language: "Build a user authentication system"
   - Command sent to LLM for quest generation

3. **Quest Generated**
   - LLM breaks task into 3-7 checkpoints
   - Checkpoints appear on map as glowing markers
   - Quest added to quest tracker

4. **Auto-Assignment**
   - If agents selected, quest auto-assigned
   - Agents move to first checkpoint
   - Progress tracking begins

### Agent Execution

1. **Movement**
   - Agent moves to checkpoint position
   - Checkpoint status: "active"
   - Visual: Gold glow, rotating ring

2. **Working**
   - Agent reaches checkpoint
   - Executes step (via LLM)
   - Token usage tracked
   - Progress updated in real-time

3. **Completion**
   - Step completes
   - Checkpoint marked complete (green)
   - Agent moves to next checkpoint
   - Progress bar updates

4. **Quest Complete**
   - All checkpoints completed
   - Quest status: "completed"
   - Agent state: "COMPLETING"
   - Visual celebration effect

## Integration Points

### Frontend
- **GameScene.tsx** - Renders CheckpointManager
- **HUD.tsx** - Includes ChatCommander and AgentProgressHUD
- **gameStore.ts** - Extended with checkpoint data model

### Backend
- **/api/quests/generate** - LLM-powered quest generation
- **/api/agents/[agentId]/stream** - SSE stream for agent events
  - Needs enhancement to emit progress events (see below)

### Bridge Layer
- **AgentBridge.tsx** - Maps backend events to visual state
- **syncVisualState** - Handles checkpoint events
- **moveToNextCheckpoint** - Progression logic

## Future Enhancements Needed

### Backend Stream API Enhancement

The `/api/agents/[agentId]/stream` endpoint needs to emit progress events during agent execution. Add middleware to emit:

```typescript
// In stream processing
controller.enqueue(encoder.encode(
  `data: ${JSON.stringify({
    type: "agent:step_started",
    agentId,
    data: { description: "Analyzing requirements..." }
  })}\n\n`
));

controller.enqueue(encoder.encode(
  `data: ${JSON.stringify({
    type: "agent:token_update",
    agentId,
    data: { tokens: 1500 }
  })}\n\n`
));

controller.enqueue(encoder.encode(
  `data: ${JSON.stringify({
    type: "agent:step_completed",
    agentId,
    data: {
      checkpointId: "checkpoint-1",
      result: "Requirements analyzed",
      tokens: 1500
    }
  })}\n\n`
));
```

### Retry Logic

Add exponential backoff retry on errors:

```typescript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

### Estimated Completion Time

Calculate ETA based on:
- Current token usage rate
- Estimated tokens remaining
- Historical completion times

```typescript
const tokensPerSecond = totalTokens / (Date.now() - startedAt) * 1000;
const remainingTokens = estimatedTokens - totalTokens;
const estimatedCompletion = Date.now() + (remainingTokens / tokensPerSecond) * 1000;
```

## Testing

### Manual Test Flow

1. **Start the game**
2. **Select 1-2 agents**
3. **Open ChatCommander** (bottom center)
4. **Enter command:** "Build a login page with OAuth"
5. **Click Deploy**
6. **Observe:**
   - Quest appears in quest tracker (top left)
   - 3-7 checkpoints appear on map (glowing markers)
   - Agents move to first checkpoint
   - Progress HUD appears (top right)
   - Token usage updates in real-time
   - Agents progress through checkpoints
   - Quest completes when all checkpoints done

### Example Commands

- "Build a login page with OAuth"
- "Create a REST API for user management"
- "Implement file upload with S3 integration"
- "Add real-time chat with WebSockets"
- "Build a dashboard with charts and graphs"

## Files Modified

- `/home/ubuntu/Dev/agents-of-empire/app/components/a2ui/game/store/gameStore.ts`
- `/home/ubuntu/Dev/agents-of-empire/app/components/a2ui/game/bridge/AgentBridge.tsx`
- `/home/ubuntu/Dev/agents-of-empire/app/components/a2ui/game/ui/HUD.tsx`
- `/home/ubuntu/Dev/agents-of-empire/app/components/a2ui/game/GameScene.tsx`

## Files Created

- `/home/ubuntu/Dev/agents-of-empire/app/api/quests/generate/route.ts`
- `/home/ubuntu/Dev/agents-of-empire/app/components/a2ui/game/ui/ChatCommander.tsx`
- `/home/ubuntu/Dev/agents-of-empire/app/components/a2ui/game/ui/AgentProgressHUD.tsx`
- `/home/ubuntu/Dev/agents-of-empire/app/components/a2ui/game/entities/CheckpointMarker.tsx`
- `/home/ubuntu/Dev/agents-of-empire/app/components/a2ui/game/entities/CheckpointManager.tsx`

## Success Criteria

✅ User can type natural language commands
✅ LLM generates structured quests with checkpoints
✅ Checkpoints stored in game state with positions
✅ Agents track current checkpoint, step, tokens, progress
✅ Checkpoints visualized on map
✅ Agents move between checkpoints as steps complete
✅ Progress UI shows real-time updates
✅ All data flows through Zustand store

**Pending:**
- ⏳ Backend SSE stream emits progress events (requires backend update)
- ⏳ Auto-retry with exponential backoff (requires error handling enhancement)
- ⏳ Real agent execution integration (requires LangGraph workflow)

## Architecture

```
User Input (ChatCommander)
  ↓
Quest Generation API (Claude LLM)
  ↓
Game Store (Zustand)
  ├── Quest with checkpoint IDs
  ├── Checkpoints with positions
  └── Agent assignments
  ↓
Visual Layer (Three.js)
  ├── CheckpointManager renders markers
  ├── Agents move to checkpoints
  └── Progress HUD shows status
  ↓
Agent Bridge (SSE Stream)
  ├── Receives progress events
  ├── Updates token usage
  ├── Moves to next checkpoint
  └── Completes quest
```

This implementation provides a complete foundation for chat-driven quest generation with visual checkpoint progression, real-time progress tracking, and token usage monitoring.
