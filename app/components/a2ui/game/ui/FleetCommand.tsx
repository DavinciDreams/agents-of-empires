'use client';

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useAgentsMap, usePartiesShallow, useGameStore, type GameAgent } from '@/app/components/a2ui/game/store';

// ============================================================================
// Fleet Command Panel Component
// Shows all agents at a glance with their status, tools, and tasks
// Position: Top-right, below minimap
// ============================================================================

interface FleetCommandProps {
  className?: string;
}

// Agent state icons and colors
const STATE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  IDLE: { icon: "⚡", color: "text-gray-400", label: "Idle" },
  THINKING: { icon: "💭", color: "text-blue-400", label: "Thinking" },
  WORKING: { icon: "🔨", color: "text-yellow-400", label: "Working" },
  MOVING: { icon: "🏃", color: "text-cyan-400", label: "Moving" },
  COMBAT: { icon: "⚔️", color: "text-red-400", label: "Combat" },
  ERROR: { icon: "❌", color: "text-red-500", label: "Error" },
  COMPLETING: { icon: "✅", color: "text-green-400", label: "Completing" },
};

// Tool type icons
const TOOL_ICONS: Record<string, string> = {
  file: "📁",
  code: "💻",
  web: "🌐",
  database: "🗄️",
  api: "🔌",
  terminal: "⌨️",
};

export function FleetCommand({ className = "" }: FleetCommandProps) {
  const agentsMap = useAgentsMap();
  const partiesShallow = usePartiesShallow();
  const selectAgent = useGameStore((state) => state.selectAgent);
  const toggleAgentSelection = useGameStore((state) => state.toggleAgentSelection);
  const selectedAgentIds = useGameStore((state) => state.selectedAgentIds);

  // Convert to array and sort by state (working first, then thinking, then idle)
  const agents = useMemo(() => {
    const agentList = Object.values(agentsMap as Record<string, GameAgent>);

    const stateOrder: Record<string, number> = {
      WORKING: 0,
      THINKING: 1,
      COMBAT: 2,
      MOVING: 3,
      COMPLETING: 4,
      ERROR: 5,
      IDLE: 6,
    };

    return agentList.sort((a, b) => {
      const orderA = stateOrder[a.state] ?? 99;
      const orderB = stateOrder[b.state] ?? 99;
      return orderA - orderB;
    });
  }, [agentsMap]);

  // Get party info for an agent
  const getPartyInfo = (agent: GameAgent) => {
    if (!agent.partyId) return null;
    const party = partiesShallow[agent.partyId];
    return party ? { name: party.name, memberCount: party.memberIds.length } : null;
  };

  const handleAgentClick = (agentId: string, event: React.MouseEvent) => {
    if (event.shiftKey) {
      toggleAgentSelection(agentId);
    } else {
      selectAgent(agentId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
      className={`absolute top-64 right-4 w-80 bg-gray-900/95 border-2 border-[var(--empire-gold)] rounded-lg shadow-lg shadow-[var(--empire-gold)]/20 ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--empire-gold)]/30 to-[var(--empire-gold)]/10 px-4 py-3 border-b border-[var(--empire-gold)]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎖️</span>
            <h2 className="text-[var(--empire-gold)] font-bold text-lg rts-text-header">
              Fleet Command
            </h2>
          </div>
          <div className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
            {agents.length} Agents
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="max-h-96 overflow-y-auto rts-scrollbar">
        {agents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p className="text-sm">No agents deployed</p>
            <p className="text-xs mt-1">Spawn agents to begin</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {agents.map((agent) => {
              const stateConfig = STATE_CONFIG[agent.state] || STATE_CONFIG.IDLE;
              const partyInfo = getPartyInfo(agent);
              const isSelected = selectedAgentIds.has(agent.id);
              const toolIcon = agent.equippedTool
                ? (TOOL_ICONS[agent.equippedTool.type] || "🔧")
                : "—";

              return (
                <button
                  key={agent.id}
                  onClick={(e) => handleAgentClick(agent.id, e)}
                  className={`w-full text-left px-3 py-2 rounded transition-all ${
                    isSelected
                      ? "bg-[var(--empire-gold)]/20 border-2 border-[var(--empire-gold)] shadow-lg"
                      : "bg-gray-800/50 border-2 border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600"
                  }`}
                >
                  {/* Top row: Name, Level, State */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-semibold text-sm text-white truncate">
                        {agent.name}
                      </span>
                      <span className="text-xs text-gray-500 shrink-0">
                        Lv{agent.level}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${stateConfig.color} shrink-0`}>
                      <span>{stateConfig.icon}</span>
                      <span className="font-medium">{stateConfig.label}</span>
                    </div>
                  </div>

                  {/* Middle row: Current Task */}
                  <div className="text-xs text-gray-400 mb-1 truncate">
                    {agent.currentTask || "Awaiting orders..."}
                  </div>

                  {/* Bottom row: Tool & Party */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-gray-500">
                      <span>{toolIcon}</span>
                      <span className="truncate max-w-[100px]">
                        {agent.equippedTool?.name || "No tool"}
                      </span>
                    </div>
                    {partyInfo && (
                      <div className="flex items-center gap-1 text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded">
                        <span>👥</span>
                        <span className="truncate max-w-[80px]">{partyInfo.name}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer - Quick Stats */}
      <div className="border-t border-gray-700 px-4 py-2 bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">🔨</span>
              <span>{agents.filter(a => a.state === "WORKING").length} Working</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-400">💭</span>
              <span>{agents.filter(a => a.state === "THINKING").length} Thinking</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">⚡</span>
              <span>{agents.filter(a => a.state === "IDLE").length} Idle</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
