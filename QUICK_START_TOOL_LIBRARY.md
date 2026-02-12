# Quick Start: Add Tool Library to Your Game

## 1-Minute Integration

### Option A: Add to Context Menu (Easiest)

Edit `/app/components/a2ui/game/ui/HUD.tsx`:

```tsx
// 1. Import at the top
import { ToolLibrary } from "./ToolLibrary";

// 2. In ContextMenu component, add state:
const [showToolLibrary, setShowToolLibrary] = useState(false);

// 3. Add button in context menu JSX (around line 880):
<button
  onClick={() => {
    closeContextMenu();
    setShowToolLibrary(true);
  }}
  className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
>
  <span>📦</span> Tool Library
</button>

// 4. Add modal in return JSX (around line 950, after </AnimatePresence>):
<AnimatePresence>
  {showToolLibrary && (
    <ToolLibrary
      agentId={agentId}
      onClose={() => setShowToolLibrary(false)}
    />
  )}
</AnimatePresence>
```

### Option B: Add Keyboard Shortcut

In `HUD.tsx`, find the keyboard handler (around line 1116):

```tsx
// Add inside handleKeyDown function:
if (e.shiftKey && e.key === "T") {
  if (agentList.length > 0) {
    const randomAgent = agentList[Math.floor(Math.random() * agentList.length)];
    // TODO: Add state to HUD component and open ToolLibrary
    console.log('Open Tool Library for', randomAgent.name);
  }
}
```

---

## Testing It Out

1. **Open the game**
2. **Right-click an agent**
3. **Click "Tool Library"**
4. **You should see**:
   - Inventory tab (shows agent's current tools)
   - TPMJS Marketplace tab (shows 5 mock tools)
   - Installed tab (empty for now)

---

## What Works Now (No Backend Needed)

- Tab switching
- Search (with debounce)
- Category filtering
- Sort options (UI only)
- Test modal opens
- Install selector opens
- All animations and styling

---

## What Needs Backend

Replace these placeholders in `ToolLibrary.tsx`:

```typescript
// Line ~52: Replace mock data
const [tpmjsTools] = useState<TPMJSTool[]>([...]);
// With:
const tpmjsTools = useGameStore((state) => state.tpmjsTools);

// Line ~94: Replace handleExecuteTest
const handleExecuteTest = async (tool: TPMJSTool, params: Record<string, any>) => {
  return await gameStore.testTPMJSTool(tool.package, tool.tool, params);
};

// Line ~102: Replace handleInstallConfirm
const handleInstallConfirm = (targetAgentId?: string, targetPartyId?: string) => {
  await gameStore.installTPMJSTool(installingTool, targetAgentId, targetPartyId);
};
```

---

## File Paths

All new components are in:
```
/app/components/a2ui/game/ui/
```

Import them like this:
```tsx
import { ToolLibrary } from '@/app/components/a2ui/game/ui/ToolLibrary';
```

---

## Questions?

Check the detailed docs:
- `TPMJS_UI_SUMMARY.md` - Full implementation details
- `TPMJS_MARKETPLACE_INTEGRATION.md` - Backend integration guide

---

## Visual Preview

```
┌─────────────────────────────────────────┐
│ Tool Library          Agent's Arsenal  │ [X]
├─────────────────────────────────────────┤
│ [Inventory] [MARKETPLACE] [Installed]   │
├─────────────────────────────────────────┤
│ Search 667+ AI tools...           🔍   │
│ [🤖 AI] [🔍 Search] [💻 Code] ...      │
│ Sort by: [Quality] [Downloads] [Name]  │
├─────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ 🤖 95│ │ 🤖 92│ │ 🔍 88│ │ 💻 85│   │
│ │claude│ │ gpt4 │ │google│ │github│   │
│ │ 🟢125K│ │ 🟢98K│ │ 🟢250K│ │ 🟡45K│   │
│ │[Test]│ │[Test]│ │[Test]│ │[Test]│   │
│ │[Inst]│ │[Inst]│ │[Inst]│ │[Inst]│   │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────┘
```

---

That's it! You're ready to go! 🚀
