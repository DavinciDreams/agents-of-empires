'use client';

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, useAgentsMap, type Tool } from '@/app/components/a2ui/game/store';
import { ToolCard } from "./ToolCard";
import { TPMJSToolCard } from "./TPMJSToolCard";
import { TPMJSSearchBar } from "./TPMJSSearchBar";
import { TestToolModal } from "./TestToolModal";
import { AgentPartySelector } from "./AgentPartySelector";

// ============================================================================
// Types
// ============================================================================

export interface TPMJSTool {
  package: string;
  tool: string;
  category: string;
  qualityScore: number; // 0-100
  healthStatus: 'healthy' | 'degraded' | 'down';
  downloadCount: number;
  description: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export enum ToolLibraryTab {
  INVENTORY = 'inventory',
  MARKETPLACE = 'marketplace',
  INSTALLED = 'installed',
}

// ============================================================================
// ToolLibrary Component
// ============================================================================

interface ToolLibraryProps {
  agentId?: string;
  onClose?: () => void;
}

export function ToolLibrary({ agentId, onClose }: ToolLibraryProps) {
  const agentsMap = useAgentsMap();
  const equipTool = useGameStore((state) => state.equipTool);
  const unequipTool = useGameStore((state) => state.unequipTool);

  const [activeTab, setActiveTab] = useState<ToolLibraryTab>(ToolLibraryTab.INVENTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [testingTool, setTestingTool] = useState<TPMJSTool | null>(null);
  const [installingTool, setInstallingTool] = useState<TPMJSTool | null>(null);

  // Mock TPMJS tools data (backend-dev will replace this with API call)
  const [tpmjsTools] = useState<TPMJSTool[]>([
    {
      package: 'anthropic',
      tool: 'claude_chat',
      category: 'ai',
      qualityScore: 95,
      healthStatus: 'healthy',
      downloadCount: 125000,
      description: 'Chat with Claude AI models for conversations, analysis, and generation tasks.',
      inputSchema: { message: 'string', model: 'string' },
    },
    {
      package: 'openai',
      tool: 'gpt4_completion',
      category: 'ai',
      qualityScore: 92,
      healthStatus: 'healthy',
      downloadCount: 98000,
      description: 'Generate text completions using GPT-4 for advanced language tasks.',
    },
    {
      package: 'google',
      tool: 'search',
      category: 'search',
      qualityScore: 88,
      healthStatus: 'healthy',
      downloadCount: 250000,
      description: 'Search the web using Google Search API with advanced filtering.',
    },
    {
      package: 'github',
      tool: 'create_pr',
      category: 'code',
      qualityScore: 85,
      healthStatus: 'degraded',
      downloadCount: 45000,
      description: 'Create pull requests on GitHub repositories programmatically.',
    },
    {
      package: 'firecrawl',
      tool: 'scrape_url',
      category: 'web',
      qualityScore: 78,
      healthStatus: 'healthy',
      downloadCount: 32000,
      description: 'Scrape and extract content from web pages with smart parsing.',
    },
  ]);

  const [installedTools] = useState<Set<string>>(new Set());

  // Get current agent's inventory
  const agent = agentId ? agentsMap[agentId] : null;
  const inventory = agent?.inventory || [];

  // Filter TPMJS tools based on search and category
  const filteredTPMJSTools = useMemo(() => {
    return tpmjsTools.filter((tool) => {
      const matchesSearch = !searchQuery ||
        tool.tool.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.package.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !categoryFilter || tool.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [tpmjsTools, searchQuery, categoryFilter]);

  // Handlers (placeholders for backend integration)
  const handleInstall = (tool: TPMJSTool) => {
    setInstallingTool(tool);
  };

  const handleTest = (tool: TPMJSTool) => {
    setTestingTool(tool);
  };

  const handleExecuteTest = async (tool: TPMJSTool, params: Record<string, any>) => {
    // Placeholder: backend-dev will implement gameStore.testTPMJSTool(package, tool, params)
    console.log('Testing tool:', tool, 'with params:', params);
    return { success: true, result: 'Mock test result' };
  };

  const handleInstallConfirm = (targetAgentId?: string, targetPartyId?: string) => {
    if (!installingTool) return;

    // Placeholder: backend-dev will implement gameStore.installTPMJSTool(tool, agentId/partyId)
    console.log('Installing tool:', installingTool, 'to agent:', targetAgentId, 'or party:', targetPartyId);
    setInstallingTool(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className="bg-gray-900/98 border-2 border-[var(--empire-gold)] rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl shadow-[var(--empire-gold)]/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--empire-gold)]/30 to-[var(--empire-gold)]/10 px-6 py-4 border-b border-[var(--empire-gold)]/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[var(--empire-gold)] font-bold text-2xl" style={{ fontFamily: 'Cinzel, serif' }}>
                  Tool Library
                </h2>
                {agent && (
                  <p className="text-sm text-gray-400" style={{ fontFamily: 'Lora, serif' }}>
                    {agent.name}'s Arsenal
                  </p>
                )}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white hover:bg-gray-700 w-8 h-8 rounded transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              {Object.values(ToolLibraryTab).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-t-lg font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-[var(--empire-gold)] text-gray-900'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  style={{ fontFamily: 'Cinzel, serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {tab === ToolLibraryTab.INVENTORY && '🎒 Inventory'}
                  {tab === ToolLibraryTab.MARKETPLACE && '🏪 TPMJS Marketplace'}
                  {tab === ToolLibraryTab.INSTALLED && '✓ Installed Tools'}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
            <AnimatePresence mode="wait">
              {/* Tab 1: Inventory */}
              {activeTab === ToolLibraryTab.INVENTORY && (
                <motion.div
                  key="inventory"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {inventory.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-gray-500 text-lg" style={{ fontFamily: 'Lora, serif' }}>
                        No tools in inventory
                      </p>
                      <p className="text-gray-600 text-sm mt-2">
                        Browse the marketplace to acquire new tools
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {inventory.map((tool) => (
                        <ToolCard
                          key={tool.id}
                          tool={tool}
                          isEquipped={agent?.equippedTool?.id === tool.id}
                          onEquip={() => agentId && equipTool(agentId, tool)}
                          onUnequip={() => agentId && unequipTool(agentId)}
                          showDetails={true}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab 2: TPMJS Marketplace */}
              {activeTab === ToolLibraryTab.MARKETPLACE && (
                <motion.div
                  key="marketplace"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <TPMJSSearchBar
                    onSearch={setSearchQuery}
                    onCategoryFilter={setCategoryFilter}
                  />

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredTPMJSTools.map((tool) => (
                      <TPMJSToolCard
                        key={`${tool.package}.${tool.tool}`}
                        tool={tool}
                        onInstall={handleInstall}
                        onTest={handleTest}
                        isInstalled={installedTools.has(`${tool.package}.${tool.tool}`)}
                      />
                    ))}
                  </div>

                  {filteredTPMJSTools.length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-gray-500 text-lg">No tools found</p>
                      <p className="text-gray-600 text-sm mt-2">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab 3: Installed Tools */}
              {activeTab === ToolLibraryTab.INSTALLED && (
                <motion.div
                  key="installed"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {installedTools.size === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-gray-500 text-lg" style={{ fontFamily: 'Lora, serif' }}>
                        No TPMJS tools installed
                      </p>
                      <p className="text-gray-600 text-sm mt-2">
                        Install tools from the marketplace to see them here
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {Array.from(installedTools).map((toolKey) => {
                        const tool = tpmjsTools.find((t) => `${t.package}.${t.tool}` === toolKey);
                        if (!tool) return null;
                        return (
                          <TPMJSToolCard
                            key={toolKey}
                            tool={tool}
                            onInstall={handleInstall}
                            onTest={handleTest}
                            isInstalled={true}
                          />
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>

      {/* Test Tool Modal */}
      <AnimatePresence>
        {testingTool && (
          <TestToolModal
            tool={testingTool}
            onClose={() => setTestingTool(null)}
            onExecute={(params) => handleExecuteTest(testingTool, params)}
          />
        )}
      </AnimatePresence>

      {/* Agent/Party Selector Modal */}
      <AnimatePresence>
        {installingTool && (
          <AgentPartySelector
            onSelectAgent={(agentId) => handleInstallConfirm(agentId, undefined)}
            onSelectParty={(partyId) => handleInstallConfirm(undefined, partyId)}
            onClose={() => setInstallingTool(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
