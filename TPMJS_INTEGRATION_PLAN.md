# TPMJS Integration Plan
## Tool Package Manager for Agents of Empire

---

## 🎯 Overview

Integrate TPMJS (https://tpmjs.com) - an NPM-like registry for AI tools with 667+ tools from 225+ packages - into the existing Tool Library panel. This will transform the current inventory-only system into a full marketplace where agents can discover, search, and equip tools from the TPMJS registry.

**User Experience Goal:** Create a HoMM-style "Artifact Shop" or "Mage Guild" where agents can browse/search the TPMJS registry, view tool details with quality scores, and install tools into their inventory for use.

---

## 🏗️ Architecture Overview

### Current System
```
GameStore
  └─ agents[]
       └─ inventory: Tool[]  (10 DeepAgents tools per agent)
       └─ equippedTool: Tool | null

ToolLibrary (Modal)
  └─ Displays agent inventory only
  └─ Filters: Rarity, Type
  └─ No external tool discovery
```

### Proposed System
```
GameStore
  └─ agents[]
       └─ inventory: Tool[]
       └─ equippedTool: Tool | null
  └─ tpmjsCache: Record<string, TPMJSTool>  (NEW)
  └─ installedTools: Set<string>  (NEW - track installed tool IDs)

ToolLibrary (Enhanced Modal)
  ├─ Tab 1: "Inventory" (existing functionality)
  │    └─ Agent's current tools
  │    └─ Equip/unequip actions
  │
  ├─ Tab 2: "TPMJS Marketplace" (NEW)
  │    ├─ Search bar (BM25 semantic search)
  │    ├─ Category filters
  │    ├─ Quality score badges
  │    ├─ Tool cards with metadata
  │    └─ Install → Inventory flow
  │
  └─ Tab 3: "Installed" (NEW)
       └─ Tools installed from TPMJS
       └─ Update/remove options
```

---

## 🔌 TPMJS API Integration

### API Client (`/app/lib/tpmjs-client.ts`)

```typescript
export interface TPMJSTool {
  package: string;
  toolName: string;
  description: string;
  category: string;
  downloads: number;
  qualityScore: number;
  official: boolean;
  inputSchema: Record<string, any>;
  healthStatus: 'healthy' | 'degraded' | 'down';
  version: string;
}

export interface TPMJSSearchResult {
  tools: TPMJSTool[];
  pagination: { limit: number; offset: number; hasMore: boolean };
}

export class TPMJSClient {
  private apiKey: string;
  private baseUrl = 'https://tpmjs.com/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Search tools with semantic BM25 ranking
  async searchTools(query: string, limit = 20): Promise<TPMJSSearchResult>

  // List tools with filters
  async listTools(options: {
    category?: string;
    official?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<TPMJSSearchResult>

  // Get detailed tool info
  async getToolDetails(packageName: string, toolName: string): Promise<TPMJSTool>

  // Execute tool (for testing in UI)
  async executeTool(
    packageName: string,
    toolName: string,
    params: Record<string, any>
  ): Promise<ReadableStream>
}
```

### Environment Configuration

Add to `.env`:
```bash
NEXT_PUBLIC_TPMJS_API_KEY=tpmjs_sk_your_api_key_here
```

### Rate Limiting Strategy

- FREE tier: 100 req/hour (1.67 req/min)
- Implement client-side caching (5 min TTL)
- Show rate limit status in UI
- Queue requests if approaching limit
- Consider PRO tier ($29/mo) for production

---

## 🎨 UI Components

### 1. Enhanced ToolLibrary (`ToolLibrary.tsx`)

**Add Tabbed Interface:**
```tsx
enum ToolLibraryTab {
  INVENTORY = 'inventory',
  MARKETPLACE = 'marketplace',
  INSTALLED = 'installed',
}

const [activeTab, setActiveTab] = useState<ToolLibraryTab>(ToolLibraryTab.INVENTORY);
```

**Tab 1: Inventory (Existing)**
- Current agent tools
- Equip/unequip buttons
- Existing filters (rarity, type)

**Tab 2: TPMJS Marketplace (New)**
- Search bar with debounced input (500ms)
- Category filter chips
- Quality score sorting
- Tool cards showing:
  - Package name + tool name
  - Description (truncated)
  - Quality score badge
  - Health status indicator
  - Download count
  - "Install" button (adds to inventory)
- Infinite scroll / pagination

**Tab 3: Installed Tools (New)**
- Tools installed from TPMJS
- "Add to Inventory" button
- "Remove" button (uninstall)
- Update notifications if new version available

### 2. TPMJSToolCard Component (`TPMJSToolCard.tsx`)

```tsx
interface TPMJSToolCardProps {
  tool: TPMJSTool;
  onInstall: (tool: TPMJSTool) => void;
  isInstalled: boolean;
  isInInventory: boolean;
}

export function TPMJSToolCard({ tool, onInstall, isInstalled, isInInventory }: TPMJSToolCardProps) {
  return (
    <div className="hero-card">
      {/* Tool Icon (use emoji based on category) */}
      {/* Package + Tool Name */}
      {/* Quality Score Badge (0-100) */}
      {/* Health Status */}
      {/* Download Count */}
      {/* Description (truncated) */}
      {/* Install Button */}
    </div>
  );
}
```

**Quality Score Colors:**
- 90-100: Legendary (gold)
- 70-89: Epic (purple)
- 50-69: Rare (blue)
- 0-49: Common (gray)

### 3. SearchBar Component (`TPMJSSearchBar.tsx`)

```tsx
export function TPMJSSearchBar({ onSearch, onCategoryFilter }) {
  const [query, setQuery] = useState('');
  const debouncedSearch = useDebouncedCallback(onSearch, 500);

  return (
    <div>
      <input
        type="text"
        placeholder="Search 667+ AI tools..."
        onChange={(e) => {
          setQuery(e.target.value);
          debouncedSearch(e.target.value);
        }}
      />
      {/* Category chips */}
      {/* Sort options: Quality, Downloads, Name */}
    </div>
  );
}
```

---

## 🗄️ Store Updates

### Add TPMJS State (`gameStore.ts`)

```typescript
interface GameState {
  // ... existing state

  // TPMJS Integration
  tpmjsCache: Record<string, TPMJSTool>;
  installedTPMJSTools: Set<string>; // Set of "package/toolName"
  tpmjsSearchResults: TPMJSTool[];
  tpmjsLoading: boolean;
  tpmjsError: string | null;
}

// New Actions
interface GameActions {
  // ... existing actions

  // TPMJS Actions
  searchTPMJSTools: (query: string) => Promise<void>;
  listTPMJSTools: (options: any) => Promise<void>;
  installTPMJSTool: (tool: TPMJSTool, agentId: string) => void;
  uninstallTPMJSTool: (toolId: string) => void;
  addTPMJSToolToInventory: (toolId: string, agentId: string) => void;
  cacheTPMJSTool: (tool: TPMJSTool) => void;
}
```

### Tool Conversion: TPMJS → Game Tool

```typescript
function convertTPMJSToolToGameTool(tpmjsTool: TPMJSTool, agentId: string): Tool {
  return {
    id: `tpmjs-${tpmjsTool.package}-${tpmjsTool.toolName}`,
    name: `${tpmjsTool.package}/${tpmjsTool.toolName}`,
    type: inferToolType(tpmjsTool.category),
    icon: getCategoryIcon(tpmjsTool.category),
    description: tpmjsTool.description,
    rarity: getQualityRarity(tpmjsTool.qualityScore),
    power: Math.floor(tpmjsTool.qualityScore / 10),
    cooldownTime: 2000,
    mastery: 0,
    experience: 0,
    // Store TPMJS metadata
    metadata: {
      source: 'tpmjs',
      package: tpmjsTool.package,
      toolName: tpmjsTool.toolName,
      qualityScore: tpmjsTool.qualityScore,
      healthStatus: tpmjsTool.healthStatus,
    },
  };
}

function getQualityRarity(score: number): Rarity {
  if (score >= 90) return 'legendary';
  if (score >= 70) return 'epic';
  if (score >= 50) return 'rare';
  return 'common';
}
```

---

## 🔄 User Flow

### Discovery Flow
```
1. Agent opens Tool Library
2. Clicks "TPMJS Marketplace" tab
3. Sees featured/trending tools
4. Enters search query (e.g., "web scraper")
5. Results update with BM25-ranked tools
6. Filters by category (optional)
7. Clicks tool card to see details
```

### Installation Flow
```
1. User clicks "Install" on TPMJS tool card
2. Tool converts to Game Tool format
3. Added to global installed tools registry
4. Modal: "Install to which agent?"
   - Shows agent selector
   - Or "Install to all agents"
5. Tool added to agent's inventory
6. Success notification
7. Tool now appears in "Inventory" tab
```

### Equip Flow (Existing)
```
1. Switch to "Inventory" tab
2. See all tools (DeepAgents + TPMJS)
3. Click "Equip" on tool
4. Tool moves to agent's equippedTool slot
5. Ready to use in game
```

---

## 📋 Implementation Steps

### Phase 1: API Integration (Days 1-2)
1. ✅ Create TPMJS API client (`/app/lib/tpmjs-client.ts`)
2. ✅ Add API key to `.env`
3. ✅ Implement search, list, getDetails methods
4. ✅ Add error handling and rate limiting
5. ✅ Write unit tests for API client

### Phase 2: Store Updates (Day 2)
1. ✅ Add TPMJS state to gameStore
2. ✅ Implement conversion functions (TPMJS → Game Tool)
3. ✅ Add install/uninstall actions
4. ✅ Add caching layer (5 min TTL)

### Phase 3: UI Components (Days 3-4)
1. ✅ Create TPMJSToolCard component
2. ✅ Create TPMJSSearchBar component
3. ✅ Add tabbed interface to ToolLibrary
4. ✅ Build Marketplace tab layout
5. ✅ Style with HoMM theme (medieval fantasy)

### Phase 4: Integration (Day 5)
1. ✅ Wire up search to TPMJS API
2. ✅ Implement install → inventory flow
3. ✅ Add loading states and error handling
4. ✅ Test with real TPMJS data

### Phase 5: Polish (Day 6)
1. ✅ Add animations (Framer Motion)
2. ✅ Implement infinite scroll / pagination
3. ✅ Add tool execution preview (optional)
4. ✅ Performance optimization (virtualization)
5. ✅ Final testing and bug fixes

---

## ⚖️ Design Trade-offs

### Approach 1: Direct API Calls (RECOMMENDED)
**Pros:**
- Real-time data from TPMJS
- Always up-to-date tool catalog
- No backend needed

**Cons:**
- Rate limits (100/hour on free tier)
- Depends on TPMJS uptime
- Need to manage API keys client-side

**Mitigation:**
- Aggressive caching (5 min TTL)
- Queue requests when near limit
- Upgrade to PRO tier ($29/mo) for production

### Approach 2: Backend Proxy + Cache
**Pros:**
- Hide API keys securely
- Better rate limit management
- Can implement custom caching strategy
- Offline support

**Cons:**
- Requires backend service
- More complex architecture
- Additional hosting costs
- Data staleness

**Decision:** Start with Approach 1 (direct API) for MVP, migrate to Approach 2 if we hit rate limits or need better security.

---

## 🎮 HoMM Theme Integration

### Visual Design
- **Marketplace Tab:** Medieval shop/market theme
  - Wooden panels with gold trim
  - Parchment-style backgrounds
  - Gem/crystal icons for quality scores
  - Scrolls for tool descriptions

### Quality Score as "Artifact Power"
- Display as glowing gems (💎)
- Higher scores = more gems
- Legendary tools glow with golden aura

### Categories as "Schools of Magic"
- **Search:** 🔮 Divination
- **Code:** ⚒️ Artifice
- **Web:** 🌐 Telepathy
- **Data:** 📜 Preservation
- **AI:** 🧙 Arcane

---

## 🚀 Success Metrics

1. **Tool Discovery:** Users can find relevant tools in < 3 searches
2. **Installation Flow:** < 5 clicks from search → equipped
3. **Performance:** Search results in < 500ms (with caching)
4. **Rate Limits:** Stay under 80% of hourly limit
5. **User Satisfaction:** 90%+ tools installed are actually used

---

## 🔐 Security Considerations

1. **API Key Storage:**
   - Store in `.env` (not committed)
   - Use `NEXT_PUBLIC_` prefix for client-side access
   - Consider backend proxy for production

2. **Tool Execution:**
   - TPMJS tools can execute arbitrary code
   - Show security warnings for unverified tools
   - Only execute tools with `official: true` flag by default
   - Add "trust this tool" confirmation dialog

3. **Rate Limiting:**
   - Implement exponential backoff
   - Show rate limit status to user
   - Queue non-urgent requests

---

## 📦 Dependencies

```bash
# Add to package.json
npm install use-debounce
npm install @tanstack/react-virtual  # For virtualized scrolling
```

---

## 🧪 Testing Strategy

1. **Unit Tests:**
   - TPMJSClient API methods
   - Tool conversion functions
   - Store actions

2. **Integration Tests:**
   - Search → Install → Equip flow
   - Rate limiting behavior
   - Error handling

3. **E2E Tests:**
   - Full user journey
   - Multi-agent scenarios
   - Offline behavior

---

## 🎯 Future Enhancements

1. **Tool Collections:** Save favorite tool sets
2. **Tool Recommendations:** AI-suggested tools based on agent role
3. **Tool Analytics:** Track which tools are most effective
4. **Custom Tool Publishing:** Let users publish their own tools
5. **Tool Marketplace:** Buy/sell tools with in-game currency
6. **Tool Combos:** Bonus effects when equipping related tools
7. **MCP Integration:** Direct MCP endpoint support for tool execution

---

## 📝 Notes

- TPMJS has 667 tools across 225 packages (as of 2026-02)
- API supports both REST and MCP protocols
- Quality scores updated based on downloads + documentation
- Tools are auto-discovered within 15 min of NPM publish
- Consider upgrading to PRO tier for production deployment

---

**Last Updated:** 2026-02-12
**Status:** Ready for implementation
**Estimated Timeline:** 5-6 days
**Team:** 1 full-stack developer
