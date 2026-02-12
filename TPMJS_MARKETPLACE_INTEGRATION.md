# TPMJS Marketplace UI - Integration Guide

## Overview

The TPMJS Marketplace UI has been successfully implemented with all requested components. This guide shows how to integrate it into the game HUD.

## Files Created

### Core Components

1. **`/app/components/a2ui/game/ui/ToolLibrary.tsx`**
   - Main component with 3-tab interface (Inventory, Marketplace, Installed)
   - Manages tab state and orchestrates child components
   - Contains placeholder handlers for backend integration

2. **`/app/components/a2ui/game/ui/TPMJSToolCard.tsx`**
   - Individual tool card showing package info, quality score, health status
   - Category icons, download counts, description
   - Install and Test buttons

3. **`/app/components/a2ui/game/ui/TPMJSSearchBar.tsx`**
   - Search input with debouncing (500ms)
   - Category filter chips
   - Sort options (Quality, Downloads, Name)

4. **`/app/components/a2ui/game/ui/TestToolModal.tsx`**
   - Dynamic form generation from inputSchema
   - Test execution with loading state
   - Results display (JSON formatted)
   - Error handling

5. **`/app/components/a2ui/game/ui/AgentPartySelector.tsx`**
   - Modal for selecting installation target
   - Three modes: Single Agent, Party, All Agents
   - Radio selection UI for agents/parties

### Updated Files

6. **`/app/components/a2ui/game/ui/ToolCard.tsx`**
   - Added `tpmjs_generic` type to `TOOL_TYPE_CONFIG`
   - Added missing tool types (file_writer, grep, glob, edit, bash)

## How to Open the Tool Library

### Option 1: Add to Context Menu (Recommended)

Edit `/app/components/a2ui/game/ui/HUD.tsx` to add a Tool Library option in the agent context menu:

```tsx
// Add state at the top of ContextMenu component
const [showToolLibrary, setShowToolLibrary] = useState(false);

// Add button in the context menu JSX
<button
  onClick={() => {
    closeContextMenu();
    setShowToolLibrary(true);
  }}
  className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
>
  <span>📦</span> Tool Library
</button>

// Add modal in the return statement
<AnimatePresence>
  {showToolLibrary && (
    <ToolLibrary
      agentId={agentId}
      onClose={() => setShowToolLibrary(false)}
    />
  )}
</AnimatePresence>
```

### Option 2: Add Keyboard Shortcut

Add to the keyboard shortcut handler in HUD.tsx:

```tsx
// Shift+T to open Tool Library
if (e.shiftKey && e.key === "T") {
  if (agentList.length > 0) {
    const randomAgent = agentList[Math.floor(Math.random() * agentList.length)];
    // Open tool library for this agent
    setShowToolLibrary(true);
    setToolLibraryAgentId(randomAgent.id);
  }
}
```

### Option 3: Add to Fleet Command Panel

Add a button in FleetCommand.tsx that opens the global tool library.

## TypeScript Interfaces

### TPMJSTool Interface

```typescript
export interface TPMJSTool {
  package: string;           // e.g., "anthropic"
  tool: string;              // e.g., "claude_chat"
  category: string;          // "ai" | "search" | "code" | "web" | "data" | "file" | "communication" | "automation"
  qualityScore: number;      // 0-100
  healthStatus: 'healthy' | 'degraded' | 'down';
  downloadCount: number;
  description: string;
  inputSchema?: Record<string, any>;   // For test modal form generation
  outputSchema?: Record<string, any>;
}
```

### Tab Enum

```typescript
export enum ToolLibraryTab {
  INVENTORY = 'inventory',
  MARKETPLACE = 'marketplace',
  INSTALLED = 'installed',
}
```

## Backend Integration Points

The following placeholder functions need to be implemented by the backend-dev:

### 1. Search TPMJS Tools

```typescript
// In ToolLibrary.tsx, replace mock data with:
const { data: tpmjsTools, isLoading } = useGameStore((state) => ({
  data: state.tpmjsTools,
  isLoading: state.tpmjsToolsLoading,
}));

// In gameStore.ts, add:
interface GameState {
  // ... existing state
  tpmjsTools: TPMJSTool[];
  tpmjsToolsLoading: boolean;
  installedTPMJSTools: Set<string>;
}

interface GameActions {
  // ... existing actions
  searchTPMJSTools: (query: string) => Promise<void>;
  installTPMJSTool: (tool: TPMJSTool, agentId?: string, partyId?: string) => Promise<void>;
  testTPMJSTool: (packageName: string, toolName: string, params: Record<string, any>) => Promise<any>;
}
```

### 2. Install Tool

```typescript
// Replace handleInstallConfirm in ToolLibrary.tsx:
const handleInstallConfirm = async (targetAgentId?: string, targetPartyId?: string) => {
  if (!installingTool) return;

  try {
    if (targetPartyId) {
      await gameStore.installTPMJSTool(installingTool, undefined, targetPartyId);
    } else if (targetAgentId) {
      await gameStore.installTPMJSTool(installingTool, targetAgentId, undefined);
    } else {
      // Install to all agents
      const agents = Object.values(agentsMap);
      for (const agent of agents) {
        await gameStore.installTPMJSTool(installingTool, agent.id, undefined);
      }
    }
    setInstallingTool(null);
  } catch (error) {
    console.error('Failed to install tool:', error);
  }
};
```

### 3. Test Tool

```typescript
// Replace handleExecuteTest in ToolLibrary.tsx:
const handleExecuteTest = async (tool: TPMJSTool, params: Record<string, any>) => {
  try {
    const result = await gameStore.testTPMJSTool(tool.package, tool.tool, params);
    return result;
  } catch (error) {
    throw new Error(`Test failed: ${error.message}`);
  }
};
```

## Styling

All components follow the existing HoMM theme:

- **Panels**: `homm-panel-ornate` style with `var(--empire-gold)` borders
- **Fonts**: `Cinzel` for headers, `Lora` for body text
- **Colors**:
  - Gold: `var(--empire-gold)` (#FFD700)
  - Background: `bg-gray-900/98`
  - Borders: `border-[var(--empire-gold)]`
- **Animations**: Framer Motion for smooth transitions

## Quality Score → Rarity Mapping

The quality score (0-100) maps to existing RARITY_CONFIG colors:

- **90-100**: Legendary (gold)
- **75-89**: Epic (purple)
- **50-74**: Rare (blue)
- **0-49**: Common (gray)

## Category Icons

```typescript
ai: 🤖
search: 🔍
code: 💻
web: 🌐
data: 📊
file: 📁
communication: 💬
automation: ⚙️
```

## Example Usage

```tsx
import { ToolLibrary } from '@/app/components/a2ui/game/ui/ToolLibrary';

function MyComponent() {
  const [showLibrary, setShowLibrary] = useState(false);
  const selectedAgentId = "agent-123";

  return (
    <>
      <button onClick={() => setShowLibrary(true)}>
        Open Tool Library
      </button>

      <AnimatePresence>
        {showLibrary && (
          <ToolLibrary
            agentId={selectedAgentId}
            onClose={() => setShowLibrary(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
```

## Next Steps

1. **Backend-dev**: Implement the three store methods:
   - `searchTPMJSTools(query: string)`
   - `installTPMJSTool(tool, agentId?, partyId?)`
   - `testTPMJSTool(package, tool, params)`

2. **Frontend-dev** (you): Choose where to add the ToolLibrary trigger (context menu, keyboard shortcut, or panel button)

3. **Test the flow**:
   - Open marketplace tab
   - Search for tools
   - Filter by category
   - Test a tool with the modal
   - Install to an agent or party
   - Verify in "Installed" tab

## Known Limitations

- Mock data used for TPMJS tools (667 tools mentioned, only 5 shown)
- No actual API calls yet (waiting for backend implementation)
- Installed tools set is local state (needs persistence)
- Sort functionality is UI-only (not connected to data)

## Files Modified

- `/app/components/a2ui/game/ui/ToolCard.tsx` - Added tool types
- `/app/components/a2ui/game/store/gameStore.ts` - Already had `tpmjs_generic` type

## Dependencies

No new dependencies required. All features use existing packages:
- `framer-motion` (already installed)
- `zustand` (already installed)
- Custom debounce implementation (no external package needed)
