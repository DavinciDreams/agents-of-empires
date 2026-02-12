'use client';

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, type Tool } from '@/app/components/a2ui/game/store';
import { TOOL_TYPE_CONFIG, RARITY_CONFIG } from './ToolCard';

/* ============================================================================
   TOOL LIBRARY - HoMM Artifact/Equipment Style
   Browse and equip tools to agents like HoMM artifacts
   ============================================================================ */

interface ToolLibraryProps {
  onClose?: () => void;
  agentId?: string; // If provided, shows equip buttons for this agent
}

export function ToolLibrary({ onClose, agentId }: ToolLibraryProps) {
  const agents = useGameStore((state) => Object.values(state.agents));
  const equipTool = useGameStore((state) => state.equipTool);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [filterRarity, setFilterRarity] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Collect all unique tools from all agents
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

  // Filter tools
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

  // Count tools by rarity
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allTools.forEach(tool => {
      counts[tool.rarity] = (counts[tool.rarity] || 0) + 1;
    });
    return counts;
  }, [allTools]);

  // Count tools by type
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allTools.forEach(tool => {
      counts[tool.type] = (counts[tool.type] || 0) + 1;
    });
    return counts;
  }, [allTools]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
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
            <div className="text-4xl">🗡️</div>
            <div>
              <h2 className="rts-text-header text-2xl mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                Tool Library
              </h2>
              <p className="text-sm" style={{ color: 'var(--homm-tan-light)', fontFamily: 'Lora, serif' }}>
                Equip artifacts and tools • {allTools.length} items available
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rts-button text-white w-10 h-10 rounded flex items-center justify-center text-xl"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-[var(--homm-gold)]/20 space-y-3">
          {/* Rarity Filter */}
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--homm-tan)', fontFamily: 'Lora, serif' }}>
              Filter by Rarity:
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterRarity(null)}
                className={`rts-button text-xs px-3 py-1 rounded ${filterRarity === null ? 'rts-button-primary' : ''}`}
              >
                All ({allTools.length})
              </button>
              {(['common', 'rare', 'epic', 'legendary'] as const).map(rarity => (
                rarityCounts[rarity] > 0 && (
                  <button
                    key={rarity}
                    onClick={() => setFilterRarity(rarity)}
                    className={`text-xs px-3 py-1 rounded ${filterRarity === rarity ? 'rts-button-primary' : 'rts-button'}`}
                  >
                    {RARITY_CONFIG[rarity].label} ({rarityCounts[rarity]})
                  </button>
                )
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <div className="text-xs mb-2" style={{ color: 'var(--homm-tan)', fontFamily: 'Lora, serif' }}>
              Filter by Type:
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterType(null)}
                className={`rts-button text-xs px-3 py-1 rounded ${filterType === null ? 'rts-button-primary' : ''}`}
              >
                All Types
              </button>
              {Object.entries(typeCounts).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-xs px-3 py-1 rounded ${filterType === type ? 'rts-button-primary' : 'rts-button'}`}
                >
                  {TOOL_TYPE_CONFIG[type]?.icon || ''} {TOOL_TYPE_CONFIG[type]?.label || type} ({count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tool Grid */}
        <div className="flex-1 overflow-y-auto rts-scrollbar p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTools.map(tool => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isSelected={selectedTool?.id === tool.id}
                onSelect={() => setSelectedTool(tool)}
                agentId={agentId}
              />
            ))}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg" style={{ color: 'var(--homm-tan)' }}>
                No tools found
              </p>
            </div>
          )}
        </div>

        {/* Selected Tool Details */}
        <AnimatePresence>
          {selectedTool && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t-2 border-[var(--homm-gold)]/30 p-6"
              style={{ background: 'rgba(0, 0, 0, 0.3)' }}
            >
              <ToolDetails tool={selectedTool} agentId={agentId} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================================
   TOOL CARD - Individual Tool Display
   ============================================================================ */

interface ToolCardProps {
  tool: Tool;
  isSelected: boolean;
  onSelect: () => void;
  agentId?: string;
}

function ToolCard({ tool, isSelected, onSelect, agentId }: ToolCardProps) {
  const equipTool = useGameStore((state) => state.equipTool);
  const agents = useGameStore((state) => Object.values(state.agents));

  // Check if any agent has this tool equipped
  const equippedBy = agents.find(a => a.equippedTool?.id === tool.id);

  const rarityConfig = RARITY_CONFIG[tool.rarity];
  const typeConfig = TOOL_TYPE_CONFIG[tool.type];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onSelect}
      className={`hero-card cursor-pointer transition-all ${isSelected ? 'rts-glow-gold' : ''}`}
      style={{
        borderColor: isSelected ? 'var(--homm-gold)' : rarityConfig.color,
      }}
    >
      {/* Tool Icon */}
      <div className="text-5xl text-center mb-3">
        {tool.icon}
      </div>

      {/* Tool Name */}
      <h4
        className="rts-text-header text-sm text-center mb-2"
        style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', color: rarityConfig.color }}
      >
        {tool.name}
      </h4>

      {/* Tool Type */}
      <div className="text-xs text-center mb-2" style={{ color: 'var(--homm-tan)' }}>
        {typeConfig?.icon} {typeConfig?.label}
      </div>

      {/* Rarity Badge */}
      <div className="flex justify-center mb-3">
        <span
          className="px-2 py-1 rounded text-xs font-bold"
          style={{
            background: rarityConfig.color,
            color: '#1a1a2e',
          }}
        >
          {rarityConfig.label}
        </span>
      </div>

      {/* Equipped Status */}
      {equippedBy && (
        <div className="text-xs text-center" style={{ color: 'var(--homm-gold-light)' }}>
          Equipped by {equippedBy.name}
        </div>
      )}

      {/* Equip Button (if agentId provided) */}
      {agentId && !equippedBy && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            equipTool(agentId, tool);
          }}
          className="w-full rts-button-success text-xs py-1 rounded mt-2"
        >
          Equip
        </button>
      )}
    </motion.div>
  );
}

/* ============================================================================
   TOOL DETAILS - Expanded Tool Information
   ============================================================================ */

interface ToolDetailsProps {
  tool: Tool;
  agentId?: string;
}

function ToolDetails({ tool, agentId }: ToolDetailsProps) {
  const equipTool = useGameStore((state) => state.equipTool);
  const agents = useGameStore((state) => Object.values(state.agents));

  const equippedBy = agents.find(a => a.equippedTool?.id === tool.id);
  const rarityConfig = RARITY_CONFIG[tool.rarity];
  const typeConfig = TOOL_TYPE_CONFIG[tool.type];

  // Find agents that have this tool in inventory
  const ownedBy = agents.filter(a => a.inventory.some(t => t.id === tool.id));

  return (
    <div>
      <div className="flex items-start gap-6 mb-4">
        {/* Tool Icon */}
        <div className="text-6xl">{tool.icon}</div>

        {/* Tool Info */}
        <div className="flex-1">
          <h3
            className="rts-text-header text-2xl mb-2"
            style={{ fontFamily: 'Cinzel, serif', color: rarityConfig.color }}
          >
            {tool.name}
          </h3>
          <div className="flex items-center gap-3 mb-3">
            <span
              className="px-3 py-1 rounded text-sm font-bold"
              style={{ background: rarityConfig.color, color: '#1a1a2e' }}
            >
              {rarityConfig.label}
            </span>
            <span className="text-sm" style={{ color: 'var(--homm-tan)' }}>
              {typeConfig?.icon} {typeConfig?.label}
            </span>
          </div>

          {/* Description (if exists) */}
          {tool.description && (
            <p className="text-sm mb-3" style={{ color: 'var(--homm-parchment-light)' }}>
              {tool.description}
            </p>
          )}

          {/* Ownership */}
          <div className="text-sm mb-2" style={{ color: 'var(--homm-tan)' }}>
            <strong>Owned by:</strong> {ownedBy.map(a => a.name).join(', ') || 'No one'}
          </div>

          {/* Equipment Status */}
          {equippedBy ? (
            <div className="text-sm" style={{ color: 'var(--homm-gold-light)' }}>
              <strong>Currently equipped by:</strong> {equippedBy.name}
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--homm-tan)' }}>
              <strong>Status:</strong> Not equipped
            </div>
          )}
        </div>
      </div>

      {/* Equip to Agent (if agentId provided and not equipped) */}
      {agentId && !equippedBy && (
        <div className="flex justify-end">
          <button
            onClick={() => equipTool(agentId, tool)}
            className="rts-button-success px-6 py-2 rounded"
          >
            Equip to Agent
          </button>
        </div>
      )}
    </div>
  );
}
