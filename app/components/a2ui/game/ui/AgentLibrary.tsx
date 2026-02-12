'use client';

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, type GameAgent } from '@/app/components/a2ui/game/store';

/* ============================================================================
   AGENT LIBRARY - HoMM Hero Selection Style
   Displays all available agents as selectable hero cards for discoverability
   ============================================================================ */

interface AgentLibraryProps {
  onClose: () => void;
  onSelectAgent?: (agentId: string) => void;
}

export function AgentLibrary({ onClose, onSelectAgent }: AgentLibraryProps) {
  const agentsMap = useGameStore((state) => state.agents);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string | null>(null);

  // Memoize to avoid infinite re-renders
  const agents = useMemo(() => Object.values(agentsMap), [agentsMap]);

  const selectedAgent = useMemo(() => {
    return selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;
  }, [selectedAgentId, agents]);

  // Filter agents by state
  const filteredAgents = useMemo(() => {
    if (!filterState) return agents;
    return agents.filter(a => a.state === filterState);
  }, [agents, filterState]);

  // Count agents by state
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    agents.forEach(a => {
      counts[a.state] = (counts[a.state] || 0) + 1;
    });
    return counts;
  }, [agents]);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    if (onSelectAgent) {
      onSelectAgent(agentId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, delay: 0.1 }}
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
            <div className="text-4xl">🎭</div>
            <div>
              <h2 className="rts-text-header text-2xl mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                Agent Library
              </h2>
              <p className="text-sm" style={{ color: 'var(--homm-tan-light)', fontFamily: 'Lora, serif' }}>
                Choose your champions • {agents.length} agents available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rts-button text-white w-10 h-10 rounded flex items-center justify-center text-xl"
          >
            ✕
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 p-4 border-b border-[var(--homm-gold)]/20 overflow-x-auto">
          <button
            onClick={() => setFilterState(null)}
            className={`rts-button text-xs px-4 py-2 rounded whitespace-nowrap ${
              filterState === null ? 'rts-button-primary' : ''
            }`}
          >
            All ({agents.length})
          </button>
          {['IDLE', 'WORKING', 'THINKING', 'MOVING', 'COMBAT', 'ERROR'].map(state => (
            stateCounts[state] > 0 && (
              <button
                key={state}
                onClick={() => setFilterState(state)}
                className={`rts-button text-xs px-4 py-2 rounded whitespace-nowrap ${
                  filterState === state ? 'rts-button-primary' : ''
                }`}
              >
                {state} ({stateCounts[state]})
              </button>
            )
          ))}
        </div>

        {/* Agent Grid */}
        <div className="flex-1 overflow-y-auto rts-scrollbar p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={selectedAgentId === agent.id}
                onSelect={() => handleSelectAgent(agent.id)}
              />
            ))}
          </div>

          {filteredAgents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg" style={{ color: 'var(--homm-tan)' }}>
                No agents found with state: {filterState}
              </p>
            </div>
          )}
        </div>

        {/* Selected Agent Details */}
        <AnimatePresence>
          {selectedAgent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t-2 border-[var(--homm-gold)]/30 p-6"
              style={{ background: 'rgba(0, 0, 0, 0.3)' }}
            >
              <AgentDetails agent={selectedAgent} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================================
   AGENT CARD - HoMM Hero Card Style
   Individual agent card with portrait, stats, and equipment
   ============================================================================ */

interface AgentCardProps {
  agent: GameAgent;
  isSelected: boolean;
  onSelect: () => void;
}

function AgentCard({ agent, isSelected, onSelect }: AgentCardProps) {
  const stateColors: Record<string, string> = {
    IDLE: '#64B5F6',
    WORKING: '#FFB74D',
    THINKING: '#9C27B0',
    MOVING: '#4FC3F7',
    COMBAT: '#EF5350',
    ERROR: '#F44336',
    COMPLETING: '#66BB6A',
  };

  const stateIcons: Record<string, string> = {
    IDLE: '💤',
    WORKING: '⚒️',
    THINKING: '🤔',
    MOVING: '🏃',
    COMBAT: '⚔️',
    ERROR: '❌',
    COMPLETING: '✨',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onSelect}
      className={`hero-card cursor-pointer transition-all ${
        isSelected ? 'rts-glow-gold' : ''
      }`}
      style={{
        borderColor: isSelected ? 'var(--homm-gold)' : 'var(--homm-gold-dark)',
      }}
    >
      {/* State Badge */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
        style={{
          background: stateColors[agent.state] || '#666',
          color: '#fff',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}
      >
        <span>{stateIcons[agent.state]}</span>
        <span>{agent.state}</span>
      </div>

      {/* Portrait */}
      <div className="portrait w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-[var(--homm-gold)] to-[var(--homm-ember)] flex items-center justify-center text-4xl">
        {agent.name.charAt(0)}
      </div>

      {/* Name & Level */}
      <div className="text-center mb-3">
        <h3 className="rts-text-header text-lg mb-1" style={{ fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
          {agent.name}
        </h3>
        <p className="text-xs" style={{ color: 'var(--homm-tan-light)' }}>
          Level {agent.level} Agent
        </p>
      </div>

      {/* Health Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: 'var(--homm-tan)' }}>Health</span>
          <span style={{ color: agent.health > 50 ? '#7cb97c' : '#c64545', fontWeight: 600 }}>
            {agent.health}/{agent.maxHealth}
          </span>
        </div>
        <div className="rts-stat-bar">
          <div
            className="rts-stat-bar-fill"
            style={{
              width: `${(agent.health / agent.maxHealth) * 100}%`,
              background: agent.health > 50
                ? 'linear-gradient(90deg, #7cb97c 0%, #5a8f5a 100%)'
                : 'linear-gradient(90deg, #c64545 0%, #8b3131 100%)',
            }}
          />
        </div>
      </div>

      {/* Equipped Tool */}
      <div className="text-xs mb-2">
        <div style={{ color: 'var(--homm-tan)', marginBottom: '4px' }}>Equipment:</div>
        {agent.equippedTool ? (
          <div className="flex items-center gap-2 p-2 rounded" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
            <span className="text-lg">{agent.equippedTool.icon}</span>
            <span style={{ color: 'var(--homm-gold-light)', fontWeight: 600 }}>{agent.equippedTool.name}</span>
          </div>
        ) : (
          <div className="text-center py-2" style={{ color: 'var(--homm-tan)', opacity: 0.6, fontStyle: 'italic' }}>
            No tool equipped
          </div>
        )}
      </div>

      {/* Inventory Count */}
      <div className="flex justify-between text-xs pt-2 border-t border-[var(--homm-gold)]/20">
        <span style={{ color: 'var(--homm-tan)' }}>Inventory:</span>
        <span style={{ color: 'var(--homm-gold-light)', fontWeight: 600 }}>
          {agent.inventory.length} tools
        </span>
      </div>
    </motion.div>
  );
}

/* ============================================================================
   AGENT DETAILS - Expanded view of selected agent
   ============================================================================ */

interface AgentDetailsProps {
  agent: GameAgent;
}

function AgentDetails({ agent }: AgentDetailsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column: Basic Info */}
      <div>
        <h3 className="rts-text-header text-xl mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
          {agent.name}
        </h3>

        <div className="space-y-3">
          <DetailRow label="Level" value={agent.level.toString()} />
          <DetailRow label="State" value={agent.state} />
          <DetailRow label="Health" value={`${agent.health}/${agent.maxHealth}`} />
          {agent.currentTask && (
            <DetailRow label="Current Task" value={agent.currentTask} />
          )}
          {agent.targetPosition && (
            <DetailRow
              label="Target"
              value={`(${agent.targetPosition[0].toFixed(1)}, ${agent.targetPosition[2].toFixed(1)})`}
            />
          )}
        </div>
      </div>

      {/* Right Column: Equipment & Inventory */}
      <div>
        <h4 className="rts-text-subheader text-lg mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
          Equipment
        </h4>

        <div className="space-y-2">
          <div className="p-3 rounded" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--homm-tan)' }}>Equipped Tool:</div>
            {agent.equippedTool ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl">{agent.equippedTool.icon}</span>
                <div>
                  <div style={{ color: 'var(--homm-gold-light)', fontWeight: 600 }}>
                    {agent.equippedTool.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--homm-tan)' }}>
                    {agent.equippedTool.type} • {agent.equippedTool.rarity}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-2" style={{ color: 'var(--homm-tan)', opacity: 0.6, fontStyle: 'italic' }}>
                No tool equipped
              </div>
            )}
          </div>

          <div className="p-3 rounded" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
            <div className="text-xs mb-2" style={{ color: 'var(--homm-tan)' }}>
              Inventory ({agent.inventory.length} tools):
            </div>
            <div className="flex flex-wrap gap-2">
              {agent.inventory.slice(0, 6).map((tool, idx) => (
                <div
                  key={idx}
                  className="text-2xl"
                  title={tool.name}
                >
                  {tool.icon}
                </div>
              ))}
              {agent.inventory.length > 6 && (
                <div className="text-xs self-center" style={{ color: 'var(--homm-tan)' }}>
                  +{agent.inventory.length - 6} more
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--homm-gold)]/10">
      <span style={{ color: 'var(--homm-tan)' }}>{label}:</span>
      <span style={{ color: 'var(--homm-parchment-light)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
