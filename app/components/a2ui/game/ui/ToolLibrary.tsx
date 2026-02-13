'use client';

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, type Tool } from '@/app/components/a2ui/game/store';
import { TOOL_TYPE_CONFIG, RARITY_CONFIG } from './ToolCard';
import { TPMJSSearchBar } from './TPMJSSearchBar';
import { TPMJSToolCard } from './TPMJSToolCard';
import { TestToolModal } from './TestToolModal';
import { AgentPartySelector } from './AgentPartySelector';
import { ErrorBoundary } from './ErrorBoundary';
import type { TPMJSTool } from '@/app/lib/tpmjs-client';

/* ============================================================================
   TOOL LIBRARY - Integrated with TPMJS Marketplace
   3 Tabs: Inventory | TPMJS Marketplace | Installed
   ============================================================================ */

enum ToolLibraryTab {
  INVENTORY = 'inventory',
  MARKETPLACE = 'marketplace',
  INSTALLED = 'installed',
}

interface ToolLibraryProps {
  onClose?: () => void;
  agentId?: string;
}

export function ToolLibrary({ onClose, agentId }: ToolLibraryProps) {
  const [activeTab, setActiveTab] = useState<ToolLibraryTab>(ToolLibraryTab.INVENTORY);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [selectedTPMJSTool, setSelectedTPMJSTool] = useState<TPMJSTool | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  // Store selectors
  const agentsMap = useGameStore((state) => state.agents);
  const equipTool = useGameStore((state) => state.equipTool);
  const searchTPMJSTools = useGameStore((state) => state.searchTPMJSTools);
  const tpmjsSearchResults = useGameStore((state) => state.tpmjsSearchResults);
  const tpmjsLoading = useGameStore((state) => state.tpmjsLoading);
  const tpmjsError = useGameStore((state) => state.tpmjsError);
  const installTPMJSTool = useGameStore((state) => state.installTPMJSTool);
  const installTPMJSToolToParty = useGameStore((state) => state.installTPMJSToolToParty);
  const testTPMJSTool = useGameStore((state) => state.testTPMJSTool);
  const installedTPMJSTools = useGameStore((state) => state.installedTPMJSTools);

  const agents = useMemo(() => Object.values(agentsMap), [agentsMap]);

  // Inventory tab state
  const [filterRarity, setFilterRarity] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Collect all tools from agents
  const allTools = useMemo(() => {
    const toolsMap = new Map<string, Tool>();
    agents.forEach(agent => {
      agent.inventory.forEach(tool => {
        if (!toolsMap.has(tool.id)) {
          toolsMap.set(tool.id, tool);
        }
      });
    });
    return Array.from(toolsMap.values());
  }, [agents]);

  // Filter inventory tools
  const filteredTools = useMemo(() => {
    let filtered = allTools;
    if (filterRarity) {
      filtered = filtered.filter(t => t.rarity === filterRarity);
    }
    if (filterType) {
      filtered = filtered.filter(t => t.type === filterType);
    }
    return filtered;
  }, [allTools, filterRarity, filterType]);

  // Count tools by rarity/type
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allTools.forEach(tool => {
      counts[tool.rarity] = (counts[tool.rarity] || 0) + 1;
    });
    return counts;
  }, [allTools]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allTools.forEach(tool => {
      counts[tool.type] = (counts[tool.type] || 0) + 1;
    });
    return counts;
  }, [allTools]);

  // Installed TPMJS tools
  const installedTools = useMemo(() => {
    return allTools.filter(tool => tool.id.startsWith('tpmjs-'));
  }, [allTools]);

  // Handle TPMJS tool install
  const handleInstallTool = (tool: TPMJSTool) => {
    setSelectedTPMJSTool(tool);
    setShowAgentSelector(true);
  };

  // Handle agent/party selection
  const handleSelectAgent = (selectedAgentId: string) => {
    if (selectedTPMJSTool) {
      installTPMJSTool(selectedTPMJSTool, selectedAgentId);
      setShowAgentSelector(false);
      setSelectedTPMJSTool(null);
    }
  };

  const handleSelectParty = (partyId: string) => {
    if (selectedTPMJSTool) {
      installTPMJSToolToParty(selectedTPMJSTool, partyId);
      setShowAgentSelector(false);
      setSelectedTPMJSTool(null);
    }
  };

  // Handle tool test
  const handleTestTool = async (tool: TPMJSTool, params: Record<string, any>) => {
    return await testTPMJSTool(tool.package, tool.toolName, params);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 pointer-events-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="homm-panel-ornate max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: `
              linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, transparent 50%),
              linear-gradient(225deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
              var(--homm-wood)
            `,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b-2 border-[var(--homm-gold)]/30">
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {activeTab === ToolLibraryTab.MARKETPLACE ? '🏪' : activeTab === ToolLibraryTab.INSTALLED ? '📦' : '🗡️'}
              </div>
              <div>
                <h2 className="rts-text-header text-2xl mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                  {activeTab === ToolLibraryTab.MARKETPLACE ? 'TPMJS Marketplace' : activeTab === ToolLibraryTab.INSTALLED ? 'Installed Tools' : 'Tool Inventory'}
                </h2>
                <p className="text-sm" style={{ color: 'var(--homm-tan-light)', fontFamily: 'Lora, serif' }}>
                  {activeTab === ToolLibraryTab.MARKETPLACE
                    ? `Discover 667+ AI tools • ${tpmjsSearchResults.length} results`
                    : activeTab === ToolLibraryTab.INSTALLED
                    ? `${installedTools.length} tools installed from TPMJS`
                    : `${allTools.length} tools available`}
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="rts-button text-white w-10 h-10 rounded flex items-center justify-center text-xl"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tab Bar */}
          <div className="flex border-b-2 border-[var(--homm-gold)]/20">
            <button
              onClick={() => setActiveTab(ToolLibraryTab.INVENTORY)}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === ToolLibraryTab.INVENTORY
                  ? 'bg-[var(--homm-gold)] text-[var(--homm-dark-brown)]'
                  : 'text-[var(--homm-tan)] hover:bg-[var(--homm-wood-dark)]'
              }`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              <span className="mr-2">🎒</span> Inventory
            </button>
            <button
              onClick={() => setActiveTab(ToolLibraryTab.MARKETPLACE)}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === ToolLibraryTab.MARKETPLACE
                  ? 'bg-[var(--homm-gold)] text-[var(--homm-dark-brown)]'
                  : 'text-[var(--homm-tan)] hover:bg-[var(--homm-wood-dark)]'
              }`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              <span className="mr-2">🏪</span> TPMJS Marketplace
            </button>
            <button
              onClick={() => setActiveTab(ToolLibraryTab.INSTALLED)}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === ToolLibraryTab.INSTALLED
                  ? 'bg-[var(--homm-gold)] text-[var(--homm-dark-brown)]'
                  : 'text-[var(--homm-tan)] hover:bg-[var(--homm-wood-dark)]'
              }`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              <span className="mr-2">📦</span> Installed ({installedTools.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto rts-scrollbar">
            {activeTab === ToolLibraryTab.INVENTORY && (
              <InventoryTab
                tools={filteredTools}
                filterRarity={filterRarity}
                filterType={filterType}
                rarityCounts={rarityCounts}
                typeCounts={typeCounts}
                allToolsCount={allTools.length}
                selectedTool={selectedTool}
                agentId={agentId}
                onSetFilterRarity={setFilterRarity}
                onSetFilterType={setFilterType}
                onSelectTool={setSelectedTool}
              />
            )}

            {activeTab === ToolLibraryTab.MARKETPLACE && (
              <ErrorBoundary>
                <MarketplaceTab
                  searchResults={tpmjsSearchResults}
                  loading={tpmjsLoading}
                  error={tpmjsError}
                  installedTools={installedTPMJSTools}
                  onSearch={searchTPMJSTools}
                  onInstall={handleInstallTool}
                  onTest={(tool) => {
                    setSelectedTPMJSTool(tool);
                    setShowTestModal(true);
                  }}
                />
              </ErrorBoundary>
            )}

            {activeTab === ToolLibraryTab.INSTALLED && (
              <InstalledTab
                tools={installedTools}
                agentId={agentId}
                onSelectTool={setSelectedTool}
              />
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showTestModal && selectedTPMJSTool && (
          <TestToolModal
            tool={selectedTPMJSTool}
            onClose={() => {
              setShowTestModal(false);
              setSelectedTPMJSTool(null);
            }}
            onExecute={(params) => handleTestTool(selectedTPMJSTool, params)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAgentSelector && (
          <AgentPartySelector
            onSelectAgent={handleSelectAgent}
            onSelectParty={handleSelectParty}
            onClose={() => {
              setShowAgentSelector(false);
              setSelectedTPMJSTool(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ============================================================================
   INVENTORY TAB
   ============================================================================ */

interface InventoryTabProps {
  tools: Tool[];
  filterRarity: string | null;
  filterType: string | null;
  rarityCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  allToolsCount: number;
  selectedTool: Tool | null;
  agentId?: string;
  onSetFilterRarity: (rarity: string | null) => void;
  onSetFilterType: (type: string | null) => void;
  onSelectTool: (tool: Tool) => void;
}

function InventoryTab({
  tools,
  filterRarity,
  filterType,
  rarityCounts,
  typeCounts,
  allToolsCount,
  selectedTool,
  agentId,
  onSetFilterRarity,
  onSetFilterType,
  onSelectTool,
}: InventoryTabProps) {
  const equipTool = useGameStore((state) => state.equipTool);
  const agentsMap = useGameStore((state) => state.agents);
  const agents = useMemo(() => Object.values(agentsMap), [agentsMap]);

  return (
    <>
      {/* Filters */}
      <div className="p-4 border-b border-[var(--homm-gold)]/20 space-y-3">
        <div>
          <div className="text-xs mb-2" style={{ color: 'var(--homm-tan)', fontFamily: 'Lora, serif' }}>
            Filter by Rarity:
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onSetFilterRarity(null)}
              className={`rts-button text-xs px-3 py-1 rounded ${filterRarity === null ? 'rts-button-primary' : ''}`}
            >
              All ({allToolsCount})
            </button>
            {(['common', 'rare', 'epic', 'legendary'] as const).map(rarity => (
              rarityCounts[rarity] > 0 && (
                <button
                  key={rarity}
                  onClick={() => onSetFilterRarity(rarity)}
                  className={`text-xs px-3 py-1 rounded ${filterRarity === rarity ? 'rts-button-primary' : 'rts-button'}`}
                >
                  {RARITY_CONFIG[rarity].label} ({rarityCounts[rarity]})
                </button>
              )
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs mb-2" style={{ color: 'var(--homm-tan)', fontFamily: 'Lora, serif' }}>
            Filter by Type:
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onSetFilterType(null)}
              className={`rts-button text-xs px-3 py-1 rounded ${filterType === null ? 'rts-button-primary' : ''}`}
            >
              All Types
            </button>
            {Object.entries(typeCounts).map(([type, count]) => {
              const config = TOOL_TYPE_CONFIG[type as keyof typeof TOOL_TYPE_CONFIG];
              return (
                <button
                  key={type}
                  onClick={() => onSetFilterType(type)}
                  className={`text-xs px-3 py-1 rounded ${filterType === type ? 'rts-button-primary' : 'rts-button'}`}
                >
                  {config?.icon || '📦'} {config?.label || type} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tool Grid */}
      <div className="p-6">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {tools.map(tool => {
            const equippedBy = agents.find(a => a.equippedTool?.id === tool.id);
            const rarityConfig = RARITY_CONFIG[tool.rarity];
            const typeConfig = TOOL_TYPE_CONFIG[tool.type];

            return (
              <motion.div
                key={tool.id}
                whileHover={{ y: -2 }}
                onClick={() => onSelectTool(tool)}
                className={`hero-card cursor-pointer transition-all p-3 ${selectedTool?.id === tool.id ? 'rts-glow-gold' : ''}`}
                style={{
                  borderColor: selectedTool?.id === tool.id ? 'var(--homm-gold)' : rarityConfig.color,
                }}
              >
                <div className="text-3xl text-center mb-2">{tool.icon}</div>
                <h4
                  className="rts-text-header text-center mb-1 leading-tight"
                  style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: rarityConfig.color }}
                >
                  {tool.name}
                </h4>
                <div className="text-xs text-center mb-1" style={{ color: 'var(--homm-tan)', fontSize: '0.65rem' }}>
                  {typeConfig?.icon} {typeConfig?.label}
                </div>
                <div className="flex justify-center mb-1">
                  <span
                    className="px-1 py-0.5 rounded text-xs font-bold"
                    style={{
                      background: rarityConfig.color,
                      color: '#1a1a2e',
                      fontSize: '0.6rem',
                    }}
                  >
                    {rarityConfig.label}
                  </span>
                </div>
                {equippedBy && (
                  <div className="text-xs text-center truncate" style={{ color: 'var(--homm-gold-light)', fontSize: '0.65rem' }}>
                    {equippedBy.name}
                  </div>
                )}
                {agentId && !equippedBy && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      equipTool(agentId, tool);
                    }}
                    className="w-full rts-button-success text-xs py-0.5 rounded mt-1"
                    style={{ fontSize: '0.65rem' }}
                  >
                    Equip
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {tools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: 'var(--homm-tan)' }}>
              No tools found
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================================
   MARKETPLACE TAB
   ============================================================================ */

interface MarketplaceTabProps {
  searchResults: TPMJSTool[];
  loading: boolean;
  error: string | null;
  installedTools: Set<string>;
  onSearch: (query: string) => Promise<void>;
  onInstall: (tool: TPMJSTool) => void;
  onTest: (tool: TPMJSTool) => void;
}

function MarketplaceTab({
  searchResults,
  loading,
  error,
  installedTools,
  onSearch,
  onInstall,
  onTest,
}: MarketplaceTabProps) {
  return (
    <div className="p-6 space-y-4">
      {/* Search Bar */}
      <TPMJSSearchBar
        onSearch={onSearch}
        onCategoryFilter={(category) => {
          // TODO: Implement category filtering
          console.log('Category filter:', category);
        }}
      />

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900/20 border-2 border-red-500/50 rounded" style={{ fontFamily: 'Lora, serif' }}>
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <p style={{ color: 'var(--homm-tan)', fontFamily: 'Lora, serif' }}>
            Searching TPMJS registry...
          </p>
        </div>
      )}

      {/* Results Grid */}
      {!loading && searchResults.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {searchResults.map(tool => (
            <TPMJSToolCard
              key={`${tool.package}/${tool.toolName}`}
              tool={tool}
              onInstall={() => onInstall(tool)}
              onTest={() => onTest(tool)}
              isInstalled={installedTools.has(`${tool.package}/${tool.toolName}`)}
              compact={true}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && searchResults.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-lg mb-2" style={{ color: 'var(--homm-tan)', fontFamily: 'Cinzel, serif' }}>
            Search for AI Tools
          </p>
          <p style={{ color: 'var(--homm-tan-light)', fontFamily: 'Lora, serif' }}>
            Try searching for "web scraper", "code generator", or "data analysis"
          </p>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   INSTALLED TAB
   ============================================================================ */

interface InstalledTabProps {
  tools: Tool[];
  agentId?: string;
  onSelectTool: (tool: Tool) => void;
}

function InstalledTab({ tools, agentId, onSelectTool }: InstalledTabProps) {
  const equipTool = useGameStore((state) => state.equipTool);
  const agentsMap = useGameStore((state) => state.agents);
  const agents = useMemo(() => Object.values(agentsMap), [agentsMap]);

  return (
    <div className="p-6">
      {tools.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {tools.map(tool => {
            const equippedBy = agents.find(a => a.equippedTool?.id === tool.id);
            const rarityConfig = RARITY_CONFIG[tool.rarity];
            const typeConfig = TOOL_TYPE_CONFIG[tool.type];

            return (
              <motion.div
                key={tool.id}
                whileHover={{ y: -2 }}
                onClick={() => onSelectTool(tool)}
                className="hero-card cursor-pointer transition-all p-3"
                style={{ borderColor: rarityConfig.color }}
              >
                <div className="text-3xl text-center mb-2">{tool.icon}</div>
                <h4
                  className="rts-text-header text-center mb-1 leading-tight"
                  style={{ fontFamily: 'Cinzel, serif', fontSize: '0.7rem', color: rarityConfig.color }}
                >
                  {tool.name}
                </h4>
                <div className="text-xs text-center mb-1" style={{ color: 'var(--homm-tan)', fontSize: '0.65rem' }}>
                  {typeConfig?.icon} {typeConfig?.label}
                </div>
                <div className="flex justify-center mb-1">
                  <span
                    className="px-1 py-0.5 rounded text-xs font-bold"
                    style={{
                      background: rarityConfig.color,
                      color: '#1a1a2e',
                      fontSize: '0.6rem',
                    }}
                  >
                    {rarityConfig.label}
                  </span>
                </div>
                {equippedBy && (
                  <div className="text-xs text-center truncate" style={{ color: 'var(--homm-gold-light)', fontSize: '0.65rem' }}>
                    {equippedBy.name}
                  </div>
                )}
                {agentId && !equippedBy && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      equipTool(agentId, tool);
                    }}
                    className="w-full rts-button-success text-xs py-0.5 rounded mt-1"
                    style={{ fontSize: '0.65rem' }}
                  >
                    Equip
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-lg mb-2" style={{ color: 'var(--homm-tan)', fontFamily: 'Cinzel, serif' }}>
            No Tools Installed Yet
          </p>
          <p style={{ color: 'var(--homm-tan-light)', fontFamily: 'Lora, serif' }}>
            Visit the TPMJS Marketplace to discover and install tools
          </p>
        </div>
      )}
    </div>
  );
}
