'use client';

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import { useGameStore, useSelectedAgentIds, useAgentsMap, useAgentsShallow, useQuestsShallow, useSelection, useAgentCount, useDragonCount, useQuestCount, useCompletedQuestCount, type GameAgent, type Tool } from '@/app/components/a2ui/game/store';
import { useAgentBridgeContext } from '@/app/components/a2ui/game/bridge/AgentBridge';
import { useCombat } from '@/app/components/a2ui/game/entities/Dragon';
import { ToolCard, ToolListItem, ToolIcon, RarityBadge, TOOL_TYPE_CONFIG, RARITY_CONFIG } from "./ToolCard";
import { screenToWorld } from '@/app/components/a2ui/game/core/CameraController';
import { useAgentBridge } from '@/app/components/a2ui/game/bridge/AgentBridge';
import { PartyPanel } from "./PartyPanel";
import { StructureInfoPanel } from "./StructureInfoPanel";
import { ThemeToggle } from "./ThemeToggle";
import { FleetCommand } from "./FleetCommand";
import { ConnectionLegend } from "@/app/components/a2ui/game/entities/ConnectionLines";
import { IntelligenceBureau } from "./IntelligenceBureau";
import { ChatCommander } from "./ChatCommander";
import { AgentProgressHUD } from "./AgentProgressHUD";
import { LogsViewer } from "./LogsViewer";

// ============================================================================
// Minimap Component
// Classic RTS Position: Top-Right Corner
// Reference: StarCraft II, Age of Empires II
// ============================================================================

interface MinimapProps {
  width?: number;
  height?: number;
}

export function Minimap({ width = 220, height = 220 }: MinimapProps) {
  const agentsMap = useAgentsShallow();
  const dragonsMap = useGameStore((state) => state.dragons);
  const structuresMap = useGameStore((state) => state.structures);
  const selectedAgentIds = useSelection();
  const worldSize = useGameStore((state) => state.worldSize);

  // Convert Records to arrays with useMemo to prevent infinite re-renders
  const agents = useMemo(() => Object.values(agentsMap as Record<string, any>), [agentsMap]);
  const dragons = useMemo(() => Object.values(dragonsMap as Record<string, any>), [dragonsMap]);
  const structures = useMemo(() => Object.values(structuresMap as Record<string, any>), [structuresMap]);

  const scale = width / worldSize.width;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="absolute top-4 right-4 pointer-events-auto bg-gray-900/95 border-2 border-[var(--empire-gold)] rounded-lg overflow-hidden shadow-lg shadow-[var(--empire-gold)]/20"
      style={{ width, height }}
    >
      {/* Classic RTS minimap header */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[var(--empire-gold)]/20 to-transparent pointer-events-none" />

      <svg width={width} height={height} className="w-full h-full">
        {/* Definitions */}
        <defs>
          {/* Terrain gradient - gives depth/landscape feel */}
          <radialGradient id="terrainGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a4a2e" />
            <stop offset="50%" stopColor="#1f3a26" />
            <stop offset="100%" stopColor="#14261a" />
          </radialGradient>

          {/* Grid pattern for tactical overlay */}
          <pattern id="gridPattern" patternUnits="userSpaceOnUse" width={20} height={20}>
            <rect width={20} height={20} fill="none" />
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2a3a2e" strokeWidth={0.5} />
          </pattern>

          {/* Topographical lines for landscape effect */}
          <pattern id="topoPattern" patternUnits="userSpaceOnUse" width={40} height={40}>
            <ellipse cx={20} cy={20} rx={15} ry={12} fill="none" stroke="#334d33" strokeWidth={0.5} opacity={0.3} />
            <ellipse cx={20} cy={20} rx={10} ry={8} fill="none" stroke="#2d442d" strokeWidth={0.5} opacity={0.3} />
          </pattern>
        </defs>

        {/* Base terrain with gradient */}
        <rect width={width} height={height} fill="url(#terrainGradient)" />

        {/* Topographical overlay */}
        <rect width={width} height={height} fill="url(#topoPattern)" opacity={0.4} />

        {/* Tactical grid */}
        <rect width={width} height={height} fill="url(#gridPattern)" opacity={0.6} />

        {/* Border glow for depth */}
        <rect
          width={width}
          height={height}
          fill="none"
          stroke="url(#terrainGradient)"
          strokeWidth={2}
          opacity={0.3}
        />

        {/* Structures - marked with distinctive geometric shapes */}
        {structures.map((structure) => {
          const x = structure.position[0] * scale;
          const y = structure.position[2] * scale;
          const size = structure.type === "castle" ? 8 : structure.type === "workshop" ? 6 : 5;

          return (
            <g key={structure.id}>
              {/* Structure base with glow */}
              <circle
                cx={x}
                cy={y}
                r={size + 2}
                fill="#FFD700"
                opacity={0.2}
              />
              {/* Structure icon - square for buildings */}
              <rect
                x={x - size / 2}
                y={y - size / 2}
                width={size}
                height={size}
                fill="#f39c12"
                stroke="#FFD700"
                strokeWidth={1.5}
              />
              {/* Type indicator */}
              {structure.type === "castle" && (
                <rect
                  x={x - 2}
                  y={y - size / 2 - 3}
                  width={4}
                  height={3}
                  fill="#FFD700"
                />
              )}
            </g>
          );
        })}

        {/* Dragons - enemies marked with triangular threat icons */}
        {dragons.map((dragon) => {
          const x = dragon.position[0] * scale;
          const y = dragon.position[2] * scale;
          const size = 6;

          return (
            <g key={dragon.id}>
              {/* Threat zone indicator */}
              <circle
                cx={x}
                cy={y}
                r={10}
                fill="#DC143C"
                opacity={0.1}
              />
              {/* Triangle warning icon */}
              <path
                d={`M ${x} ${y - size} L ${x + size} ${y + size} L ${x - size} ${y + size} Z`}
                fill="#e74c3c"
                stroke="#ff6b6b"
                strokeWidth={1.5}
              />
              {/* Alert pulse */}
              <circle
                cx={x}
                cy={y}
                r={8}
                fill="none"
                stroke="#e74c3c"
                strokeWidth={1}
                opacity={0.4}
              >
                <animate
                  attributeName="r"
                  from="6"
                  to="12"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.6"
                  to="0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}

        {/* Agents - friendly units with tactical icons */}
        {agents.map((agent) => {
          const x = agent.position[0] * scale;
          const y = agent.position[2] * scale;
          const isSelected = selectedAgentIds.has(agent.id);
          const size = isSelected ? 4.5 : 3.5;

          // Determine color based on state
          const stateColors: Record<string, string> = {
            IDLE: "#64B5F6",
            WORKING: "#FFB74D",
            THINKING: "#9C27B0",
            MOVING: "#4FC3F7",
            COMBAT: "#EF5350",
            ERROR: "#F44336",
          };
          const color = stateColors[agent.state] || "#3498db";

          return (
            <g key={agent.id}>
              {/* Selection/activity zone */}
              {isSelected && (
                <circle
                  cx={x}
                  cy={y}
                  r={10}
                  fill="#FFD700"
                  opacity={0.15}
                />
              )}
              {/* Agent icon - diamond shape for units */}
              <path
                d={`M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`}
                fill={isSelected ? "#FFD700" : color}
                stroke={isSelected ? "#FFD700" : "#ffffff"}
                strokeWidth={isSelected ? 1.5 : 0.8}
              />
              {/* Selection ring */}
              {isSelected && (
                <>
                  <circle
                    cx={x}
                    cy={y}
                    r={9}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth={1.5}
                    strokeDasharray="2,2"
                  />
                  {/* Rotating selection indicator */}
                  <circle
                    cx={x}
                    cy={y}
                    r={9}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth={1}
                    opacity={0.5}
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from={`0 ${x} ${y}`}
                      to={`360 ${x} ${y}`}
                      dur="4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </>
              )}
              {/* Working indicator */}
              {agent.state === "WORKING" && !isSelected && (
                <circle
                  cx={x}
                  cy={y - size - 2}
                  r={1.5}
                  fill="#FFB74D"
                >
                  <animate
                    attributeName="opacity"
                    values="0.3;1;0.3"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Camera view indicator - classic RTS feature */}
        <rect
          x={0}
          y={0}
          width={width * 0.3}
          height={height * 0.3}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={0.4}
          rx={2}
        />
      </svg>

      {/* Minimap label - classic RTS style */}
      <div className="absolute bottom-1 right-2 text-xs text-[var(--empire-gold)] font-bold tracking-wider rts-text-label">
        MINIMAP
      </div>

      {/* Compass indicator */}
      <div className="absolute top-1 left-2 text-xs text-gray-400 font-bold rts-text-label">
        N
      </div>

      {/* Holographic scanline effect */}
      <div className="rts-scanline" />
    </motion.div>
  );
}

// ============================================================================
// Agent Panel Component
// Classic RTS Position: Bottom-Left Corner
// Reference: StarCraft II command card, Age of Empires unit info
// ============================================================================

interface AgentPanelProps {
  className?: string;
}

export function AgentPanel({ className = "" }: AgentPanelProps) {
  const selectedAgentIds = useSelectedAgentIds();
  const agentsMap = useAgentsMap();
  const updateAgent = useGameStore((state) => state.updateAgent);
  const clearSelection = useGameStore((state) => state.clearSelection);

  // Convert Set and Record to array with memoization
  const selectedAgents = useMemo(() => {
    const agents: GameAgent[] = [];
    for (const id of selectedAgentIds) {
      const agent = agentsMap[id];
      if (agent) agents.push(agent);
    }
    return agents;
  }, [selectedAgentIds, agentsMap]);

  if (selectedAgents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`absolute bottom-4 left-4 pointer-events-auto bg-gray-900/95 border-2 border-[var(--empire-gold)]/50 rounded-lg p-4 text-white w-80 ${className}`}
      >
        <div className="text-center text-gray-400">
          <p className="text-lg font-semibold">No units selected</p>
          <p className="text-sm mt-1">Click on agents or drag to select multiple</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`absolute bottom-4 left-4 pointer-events-auto bg-gray-900/95 border-2 border-[var(--empire-gold)] rounded-lg p-4 text-white w-80 max-h-96 overflow-y-auto shadow-lg shadow-[var(--empire-gold)]/20 ${className}`}
    >
      {/* Classic RTS selection header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-[var(--empire-gold)]/30">
        <h3 className="text-[var(--empire-gold)] text-lg font-bold rts-text-header">
          {selectedAgents.length} Unit{selectedAgents.length > 1 ? "s" : ""} Selected
        </h3>
        <button
          onClick={clearSelection}
          className="rts-button text-white text-sm px-3 py-1.5 rounded font-semibold"
        >
          Deselect
        </button>
      </div>

      <div className="space-y-3">
        {selectedAgents.map((agent) => (
          <div key={agent.id} className="bg-gray-800/80 rounded p-3 border border-[var(--empire-gold)]/30">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-[var(--empire-gold)] text-base">{agent.name}</div>
                <div className="text-xs text-gray-400">Level {agent.level} Agent</div>
              </div>
              <div className="text-xs px-2 py-1 rounded bg-gray-700 border border-gray-600">
                {agent.state}
              </div>
            </div>

            {/* Health bar - classic RTS style */}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400 rts-text-label">Health</span>
                <span className={agent.health > 30 ? "text-green-400 font-semibold" : "text-red-400 font-semibold rts-pulse"}>
                  {agent.health}/{agent.maxHealth}
                </span>
              </div>
              <div className="rts-stat-bar">
                <div
                  className="rts-stat-bar-fill"
                  style={{
                    width: `${(agent.health / agent.maxHealth) * 100}%`,
                    background: agent.health > 50
                      ? "linear-gradient(90deg, #00FF88 0%, #00CC66 100%)"
                      : agent.health > 30
                      ? "linear-gradient(90deg, #FFA500 0%, #FF8C00 100%)"
                      : "linear-gradient(90deg, #DC143C 0%, #8B0000 100%)",
                  }}
                />
              </div>
            </div>

            {/* Current task */}
            {agent.currentTask && (
              <div className="text-xs text-gray-300 mb-2 bg-gray-900/50 px-2 py-1 rounded">
                <span className="text-gray-500">Task:</span> {agent.currentTask}
              </div>
            )}

            {/* Equipped tool */}
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {agent.equippedTool ? (
                  <span className="text-[var(--empire-gold)]">
                    {agent.equippedTool.icon} {agent.equippedTool.name}
                  </span>
                ) : (
                  <span className="text-gray-500 italic">No tool equipped</span>
                )}
              </div>
              {agent.equippedTool && (
                <button
                  onClick={() => updateAgent(agent.id, { equippedTool: null })}
                  className="rts-button text-xs text-white px-3 py-1 rounded font-semibold"
                >
                  Unequip
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Inventory Panel Component - Enhanced RPG-Style
// ============================================================================

interface InventoryPanelProps {
  agentId: string;
  onClose?: () => void;
  viewMode?: "grid" | "list";
}

export function InventoryPanel({ agentId, onClose, viewMode = "list" }: InventoryPanelProps) {
  const agent = useGameStore((state) => state.agents[agentId]);
  const equipTool = useGameStore((state) => state.equipTool);
  const unequipTool = useGameStore((state) => state.unequipTool);
  const [selectedRarityFilter, setSelectedRarityFilter] = useState<string | null>(null);

  if (!agent) return null;

  // Filter inventory by rarity if filter is active
  const filteredInventory = useMemo(() => {
    if (!selectedRarityFilter) return agent.inventory;
    return agent.inventory.filter((tool) => tool.rarity === selectedRarityFilter);
  }, [agent.inventory, selectedRarityFilter]);

  // Count tools by rarity
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    agent.inventory.forEach((tool) => {
      counts[tool.rarity] = (counts[tool.rarity] || 0) + 1;
    });
    return counts;
  }, [agent.inventory]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-900/98 border-2 border-[var(--empire-gold)] rounded-lg p-4 text-white w-80 shadow-2xl shadow-[var(--empire-gold)]/30 max-h-[80vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-[var(--empire-gold)]/30">
        <div>
          <h3 className="text-[var(--empire-gold)] text-lg font-bold">Inventory</h3>
          <p className="text-xs text-gray-400">{agent.name}'s Equipment</p>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700 w-6 h-6 rounded transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Currently Equipped Tool */}
      <div className="mb-4 p-3 rounded-lg bg-gray-800/80 border border-[var(--empire-gold)]/30">
        <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Equipped</p>
        {agent.equippedTool ? (
          <div className="flex items-center gap-3">
            <ToolIcon toolType={agent.equippedTool.type} rarity={agent.equippedTool.rarity} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[var(--empire-gold)] truncate">{agent.equippedTool.name}</p>
              <RarityBadge rarity={agent.equippedTool.rarity} />
            </div>
            <button
              onClick={() => unequipTool(agentId)}
              className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900 transition-colors"
            >
              Unequip
            </button>
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic text-center py-2">No tool equipped</p>
        )}
      </div>

      {/* Rarity Filter Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedRarityFilter(null)}
          className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
            selectedRarityFilter === null
              ? "bg-empire-gold text-gray-900 font-bold"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          All ({agent.inventory.length})
        </button>
        {(["common", "rare", "epic", "legendary"] as const).map((rarity) => (
          <button
            key={rarity}
            onClick={() => setSelectedRarityFilter(rarity)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              selectedRarityFilter === rarity
                ? "font-bold"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            style={{
              backgroundColor: selectedRarityFilter === rarity ? RARITY_CONFIG[rarity].color : undefined,
              color: selectedRarityFilter === rarity ? "#1a1a2e" : undefined,
            }}
          >
            {RARITY_CONFIG[rarity].label} ({rarityCounts[rarity]})
          </button>
        ))}
      </div>

      {/* Inventory Grid/List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredInventory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm italic">
              {selectedRarityFilter ? `No ${selectedRarityFilter} tools` : "No tools available"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredInventory.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isEquipped={agent.equippedTool?.id === tool.id}
                onEquip={() => equipTool(agentId, tool)}
                onUnequip={() => unequipTool(agentId)}
                showDetails={false}
                draggable={true}
                onDragStart={(e, tool) => {
                  console.log(`[Drag] Started dragging ${tool.name}`);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredInventory.map((tool) => (
              <ToolListItem
                key={tool.id}
                tool={tool}
                isEquipped={agent.equippedTool?.id === tool.id}
                onEquip={() => equipTool(agentId, tool)}
                onUnequip={() => unequipTool(agentId)}
                draggable={true}
                onDragStart={(e, tool) => {
                  console.log(`[Drag] Started dragging ${tool.name}`);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tool Types Legend */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 mb-2">Tool Types</p>
        <div className="grid grid-cols-3 gap-1 text-xs">
          {Object.entries(TOOL_TYPE_CONFIG).map(([type, config]) => (
            <div key={type} className="flex items-center gap-1 text-gray-400">
              <span>{config.icon}</span>
              <span className="truncate">{config.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Quest Tracker Component
// Classic RTS Position: Top-Left Corner
// Reference: Age of Empires objectives panel, StarCraft II objectives
// ============================================================================

interface QuestTrackerProps {
  className?: string;
}

export function QuestTracker({ className = "" }: QuestTrackerProps) {
  const questsMap = useQuestsShallow();
  const agentsMap = useAgentsMap();
  const assignQuestToAgents = useGameStore((state) => state.assignQuestToAgents);

  const quests = useMemo(() => Object.values(questsMap), [questsMap]);

  // Track which quest has its agent picker open
  const [assigningQuestId, setAssigningQuestId] = useState<string | null>(null);
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());

  // Agents available for assignment (not already assigned to the target quest)
  const getAvailableAgents = useCallback(
    (questId: string) => {
      const quest = questsMap[questId];
      if (!quest) return [];
      const assignedSet = new Set(quest.assignedAgentIds);
      return Object.values(agentsMap as Record<string, GameAgent>).filter(
        (a) => !assignedSet.has(a.id)
      );
    },
    [agentsMap, questsMap]
  );

  const openPicker = (questId: string) => {
    setPickerSelected(new Set());
    setAssigningQuestId(questId);
  };

  const closePicker = () => {
    setAssigningQuestId(null);
    setPickerSelected(new Set());
  };

  const togglePickerAgent = (agentId: string) => {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const confirmAssign = () => {
    if (assigningQuestId && pickerSelected.size > 0) {
      assignQuestToAgents(assigningQuestId, Array.from(pickerSelected));
      closePicker();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -50, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`absolute top-4 left-4 z-40 bg-gray-900 border-2 border-[var(--empire-gold)] rounded-lg p-4 text-white w-80 shadow-lg shadow-[var(--empire-gold)]/20 pointer-events-auto max-h-[calc(100vh-2rem)] overflow-y-auto rts-scrollbar ${className}`}
    >
      {/* Classic RTS objectives header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-[var(--empire-gold)]/50">
        <span className="text-[var(--empire-gold)] text-xl">📜</span>
        <h3 className="text-[var(--empire-gold)] text-lg font-bold rts-text-header">Objectives</h3>
      </div>

      {quests.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No active objectives</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {quests.map((quest) => {
            const needsMore =
              quest.assignedAgentIds.length < quest.requiredAgents &&
              quest.status !== "completed";
            const isPickerOpen = assigningQuestId === quest.id;

            return (
              <div
                key={quest.id}
                className={`p-3 rounded border transition-all ${
                  quest.status === "completed"
                    ? "bg-green-900/30 border-green-600"
                    : quest.status === "in_progress"
                    ? "bg-yellow-900/30 border-yellow-600"
                    : "bg-gray-800/80 border-gray-700"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm">{quest.title}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      quest.status === "completed"
                        ? "bg-green-700 text-white"
                        : quest.status === "in_progress"
                        ? "bg-yellow-700 text-white"
                        : "bg-gray-600 text-gray-300"
                    }`}
                  >
                    {quest.status === "completed"
                      ? "Done"
                      : quest.status === "in_progress"
                      ? "Active"
                      : "Pending"}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mb-2">{quest.description}</p>

                <div className="text-xs text-gray-400 mb-2">
                  {quest.assignedAgentIds.length} / {quest.requiredAgents} units assigned
                </div>

                {/* Assign button - always visible when quest needs agents */}
                {needsMore && !isPickerOpen && (
                  <button
                    onClick={() => openPicker(quest.id)}
                    className="rts-button-primary text-xs text-gray-900 px-4 py-1.5 rounded font-bold"
                  >
                    Assign Agents
                  </button>
                )}

                {/* Inline agent picker */}
                {isPickerOpen && (
                  <div className="mt-2 rts-dropdown rounded relative z-50">
                    <div className="max-h-32 overflow-y-auto rts-scrollbar">
                      {getAvailableAgents(quest.id).length === 0 ? (
                        <div className="text-xs text-gray-500 text-center py-3">
                          No available agents
                        </div>
                      ) : (
                        getAvailableAgents(quest.id).map((agent) => (
                          <div
                            key={agent.id}
                            onClick={() => togglePickerAgent(agent.id)}
                            className={`rts-dropdown-item flex items-center gap-2 px-3 py-2 cursor-pointer text-xs border-b border-gray-700/30 last:border-b-0 ${
                              pickerSelected.has(agent.id)
                                ? "bg-empire-gold/20 text-white border-l-empire-gold"
                                : "text-gray-300 hover:text-white"
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded border flex items-center justify-center ${
                                pickerSelected.has(agent.id)
                                  ? "border-[var(--empire-gold)] bg-empire-gold/30 text-[var(--empire-gold)] text-[10px]"
                                  : "border-gray-600"
                              }`}
                            >
                              {pickerSelected.has(agent.id) && "✓"}
                            </div>
                            <span className="flex-1">{agent.name}</span>
                            <span className="text-gray-500">Lvl {agent.level}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2 p-2 border-t-2 border-gray-700/50">
                      <button
                        onClick={confirmAssign}
                        disabled={pickerSelected.size === 0}
                        className="flex-1 rts-button-success text-xs text-gray-900 px-3 py-1.5 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Assign ({pickerSelected.size})
                      </button>
                      <button
                        onClick={closePicker}
                        className="flex-1 rts-button text-xs text-white px-3 py-1.5 rounded font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {quest.status === "completed" && (
                  <div className="text-xs text-green-400 font-semibold">
                    ✓ Quest Complete!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Context Menu Component
// ============================================================================

interface ContextMenuProps {
  agentId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function ContextMenu({ agentId, position, onClose }: ContextMenuProps) {
  const agent = useGameStore((state) => state.agents[agentId]);
  const closeContextMenu = useGameStore((state) => state.closeContextMenu);
  const contextMenuOpen = useGameStore((state) => state.contextMenuOpen);
  const dragonsMap = useGameStore(useShallow((state) => state.dragons));
  const [showInventory, setShowInventory] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  const [showCombat, setShowCombat] = useState(false);
  const { attackDragon, autoResolveCombat } = useCombat();

  if (!agent) return null;

  // Find nearby dragons with memoization
  const dragons = useMemo(() => {
    return Object.values(dragonsMap).filter(
      (dragon) =>
        Math.abs(dragon.position[0] - agent.position[0]) < 5 &&
        Math.abs(dragon.position[2] - agent.position[2]) < 5
    );
  }, [dragonsMap, agent.position]);

  const handleAttack = (dragonId: string) => {
    closeContextMenu();
    attackDragon(agentId, dragonId);
  };

  const handleAutoCombat = (dragonId: string) => {
    closeContextMenu();
    autoResolveCombat(agentId, dragonId);
  };

  return (
    <>
      <AnimatePresence>
        {showInventory && (
          <InventoryPanel agentId={agentId} onClose={() => setShowInventory(false)} />
        )}
        {showIntel && (
          <IntelligenceBureau agentId={agentId} onClose={() => setShowIntel(false)} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed bg-gray-900/95 border-2 border-[var(--empire-gold)] rounded-lg py-2 text-white w-56 z-50 shadow-xl shadow-[var(--empire-gold)]/20"
        style={{
          left: Math.min(position.x, window.innerWidth - 230),
          top: Math.min(position.y, window.innerHeight - 300),
        }}
      >
        <div className="px-4 py-2 border-b border-[var(--empire-gold)]/30 bg-empire-gold/10">
          <div className="font-bold text-[var(--empire-gold)]">{agent.name}</div>
          <div className="text-xs text-gray-400">Level {agent.level} • {agent.state}</div>
        </div>

        <div className="py-1">
          <button
            onClick={() => {
              closeContextMenu();
              setShowInventory(true);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
          >
            <span>🎒</span> Open Inventory
          </button>

          <button
            onClick={() => {
              closeContextMenu();
              setShowIntel(true);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
          >
            <span>🕵️</span> Intelligence Bureau
          </button>

          <div className="border-t border-gray-700 my-1" />

          <button
            onClick={() => {
              closeContextMenu();
              useGameStore.getState().updateAgent(agentId, { currentTask: "Hold position..." });
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
          >
            <span>✋</span> Hold Position
          </button>

          <button
            onClick={() => {
              closeContextMenu();
              useGameStore.getState().updateAgent(agentId, { currentTask: "Returning to base..." });
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 flex items-center gap-2 transition-colors"
          >
            <span>🏠</span> Return to Base
          </button>

          {dragons.length > 0 && (
            <>
              <div className="border-t border-gray-700 my-1" />
              <div className="px-4 py-1 text-xs text-red-400 font-semibold">NEARBY DRAGONS</div>
              {dragons.map((dragon) => (
                <div key={dragon.id} className="px-4 py-1">
                  <div className="text-sm text-gray-300 flex justify-between">
                    <span>{dragon.type} Dragon</span>
                    <span className="text-red-400">{dragon.health}/{dragon.maxHealth} HP</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => handleAttack(dragon.id)}
                      className="flex-1 text-xs bg-red-700 hover:bg-[var(--empire-red)] py-1 rounded transition-colors"
                    >
                      Attack
                    </button>
                    <button
                      onClick={() => handleAutoCombat(dragon.id)}
                      className="flex-1 text-xs bg-blue-700 hover:bg-blue-600 py-1 rounded transition-colors"
                    >
                      Auto-Battle
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </motion.div>

      {/* Backdrop */}
      {contextMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeContextMenu}
        />
      )}
    </>
  );
}

// ============================================================================
// Top Bar Component (Resource counts, etc.)
// Classic RTS Position: Top Center
// Reference: StarCraft II resource display, Age of Empires resources
// ============================================================================

interface TopBarProps {
  className?: string;
}

export function TopBar({ className = "" }: TopBarProps) {
  const agentCount = useAgentCount();
  const dragonCount = useDragonCount();
  const questCount = useQuestCount();
  const completedQuests = useCompletedQuestCount();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`absolute top-0 left-0 right-0 pointer-events-auto bg-gradient-to-b from-gray-900/90 to-transparent pt-2 pb-8 px-4 ${className}`}
    >
      <div className="flex justify-center gap-8">
        {/* Classic RTS resource display style */}
        <div className="text-white text-center px-6 py-2 rounded-lg border-2 border-[var(--empire-gold)]/50 rts-glow-gold">
          <div className="text-3xl font-bold text-[var(--empire-gold)] rts-text-header" style={{textShadow: '0 0 20px rgba(255, 215, 0, 0.8)'}}>{agentCount}</div>
          <div className="text-xs text-gray-300 rts-text-label">Units</div>
        </div>
        <div className="text-white text-center px-6 py-2 rounded-lg border-2 border-[var(--empire-green)]/50 rts-glow-green">
          <div className="text-3xl font-bold text-[var(--empire-green)] rts-text-header" style={{textShadow: '0 0 20px rgba(0, 255, 136, 0.8)'}}>
            {completedQuests}/{questCount}
          </div>
          <div className="text-xs text-gray-300 rts-text-label">Objectives</div>
        </div>
        <div className="text-white text-center px-6 py-2 rounded-lg border-2 border-[var(--empire-red)]/50 rts-glow-red">
          <div className="text-3xl font-bold text-[var(--empire-red)] rts-text-header" style={{textShadow: '0 0 20px rgba(220, 20, 60, 0.8)'}}>{dragonCount}</div>
          <div className="text-xs text-gray-300 rts-text-label">Threats</div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// HUD Main Component
// Combines all RTS-style UI elements
// ============================================================================

interface HUDProps {
  className?: string;
}

export function HUD({ className = "" }: HUDProps) {
  const contextMenuOpen = useGameStore((state) => state.contextMenuOpen);
  const contextMenuPosition = useGameStore((state) => state.contextMenuPosition);
  const contextMenuAgentId = useGameStore((state) => state.contextMenuAgentId);
  const closeContextMenu = useGameStore((state) => state.closeContextMenu);
  const selectedStructureId = useGameStore((state) => state.selectedStructureId);
  const setSelectedStructure = useGameStore((state) => state.setSelectedStructure);
  const spawnDragon = useGameStore((state) => state.spawnDragon);
  const agents = useAgentsShallow();
  const bridge = useAgentBridge();
  const equipTool = useGameStore((state) => state.equipTool);

  // Handle drag and drop for tool equipping
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();

      // Get the tool data
      if (!e.dataTransfer) return;
      const toolData = e.dataTransfer.getData("application/json");
      if (!toolData) return;

      try {
        const tool: Tool = JSON.parse(toolData);

        // Get drop position
        const dropX = e.clientX;
        const dropY = e.clientY;

        // Find the closest agent to the drop position
        const canvas = document.querySelector("canvas");
        if (!canvas) return;

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const camera = (window as any).gameCamera;

        if (camera) {
          const worldPos = screenToWorld(dropX, dropY, camera, width, height);
          if (worldPos) {
            // Find closest agent
            let closestAgentId: string | null = null;
            let closestDistance = Infinity;

            const agentList = Object.values(agents);
            for (const agent of agentList) {
              const dx = agent.position[0] - worldPos.x;
              const dz = agent.position[2] - worldPos.z;
              const distance = Math.sqrt(dx * dx + dz * dz);

              if (distance < 3 && distance < closestDistance) {
                closestDistance = distance;
                closestAgentId = agent.id;
              }
            }

            // Equip the tool to the closest agent
            if (closestAgentId) {
              equipTool(closestAgentId, tool);
              console.log(`[Drag & Drop] Equipped ${tool.name} to agent ${closestAgentId}`);
            }
          }
        }
      } catch (err) {
        console.error("Error handling tool drop:", err);
      }
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    // Store camera reference for raycasting
    const updateCameraRef = () => {
      const canvas = document.querySelector("canvas");
      if (canvas && canvas.children[0]) {
        (window as any).gameCamera = (canvas.children[0] as any).camera;
      }
    };

    updateCameraRef();
    const observer = new MutationObserver(updateCameraRef);
    const canvas = document.querySelector("canvas");
    if (canvas) {
      observer.observe(canvas, { childList: true });
    }

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
      observer.disconnect();
    };
  }, [agents, equipTool]);

  // Keyboard shortcuts for testing (COMB-001: Dragon spawn test, Phase 2 tests)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const agentList = Object.values(agents);

      // Shift+D to spawn a test dragon
      if (e.shiftKey && e.key === "D") {
        if (agentList.length > 0) {
          const randomAgent = agentList[Math.floor(Math.random() * agentList.length)];
          const errorTypes = [
            { type: "SYNTAX" as const, error: "Unexpected token ';'" },
            { type: "RUNTIME" as const, error: "TypeError: Cannot read property" },
            { type: "NETWORK" as const, error: "Network request failed" },
            { type: "PERMISSION" as const, error: "Access denied: insufficient permissions" },
            { type: "UNKNOWN" as const, error: "Unknown error occurred" },
          ];
          const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
          spawnDragon(
            randomError.type,
            [randomAgent.position[0] + 2, 0, randomAgent.position[2]] as [number, number, number],
            randomError.error,
            randomAgent.id
          );
          console.log(`[COMB-001 Test] Spawned ${randomError.type} dragon at ${randomAgent.name}'s location`);
        }
      }

      // Shift+R to test file read operation
      if (e.shiftKey && e.key === "R") {
        if (agentList.length > 0) {
          const randomAgent = agentList[Math.floor(Math.random() * agentList.length)];
          bridge.handleFileRead(randomAgent.id, "config.json");
          console.log(`[Phase 2 Test] File read operation on ${randomAgent.name}`);
        }
      }

      // Shift+W to test file write operation
      if (e.shiftKey && e.key === "W" && !e.ctrlKey) {
        if (agentList.length > 0) {
          const randomAgent = agentList[Math.floor(Math.random() * agentList.length)];
          bridge.handleFileWrite(randomAgent.id, "output.md");
          console.log(`[Phase 2 Test] File write operation on ${randomAgent.name}`);
        }
      }

      // Shift+S to test subagent spawn
      if (e.shiftKey && e.key === "S") {
        if (agentList.length > 0) {
          const randomAgent = agentList[Math.floor(Math.random() * agentList.length)];
          bridge.handleSubagentSpawn(randomAgent.id, "Subagent-" + randomAgent.name);
          console.log(`[Phase 2 Test] Subagent spawned from ${randomAgent.name}`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [agents, spawnDragon, bridge]);

  return (
    <div className={`pointer-events-none ${className}`}>
      {/* Top bar - Classic RTS resource display (top center) */}
      <TopBar />

      {/* Quest tracker - Classic RTS objectives panel (top-left) */}
      <QuestTracker />

      {/* Minimap - Classic RTS minimap (top-right) */}
      <Minimap />

      {/* Fleet Command - Agent status overview (top-right, below minimap) */}
      <div className="pointer-events-auto">
        <FleetCommand />
      </div>

      {/* Connection Legend - Shows what connection lines mean (top-right, next to minimap) */}
      <div className="pointer-events-auto">
        <ConnectionLegend position="top-right" />
      </div>

      {/* Agent panel - Classic RTS unit info (bottom-left) */}
      <AgentPanel />

      {/* Party panel - Bottom-right panel for party management */}
      <div className="pointer-events-auto">
        <PartyPanel />
      </div>

      {/* Structure Info Panel (has pointer events) */}
      <AnimatePresence>
        {selectedStructureId && (
          <div className="pointer-events-auto">
            <StructureInfoPanel
              structureId={selectedStructureId}
              onClose={() => setSelectedStructure(null)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Context menu (has pointer events) */}
      <AnimatePresence>
        {contextMenuOpen && contextMenuAgentId && contextMenuPosition && (
          <div className="pointer-events-auto">
            <ContextMenu
              agentId={contextMenuAgentId}
              position={contextMenuPosition}
              onClose={closeContextMenu}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Theme toggle - Bottom left corner */}
      <div className="pointer-events-auto fixed bottom-4 left-96 z-40">
        <ThemeToggle />
      </div>

      {/* Chat Commander - Bottom center */}
      <div className="pointer-events-auto">
        <ChatCommander />
      </div>

      {/* Agent Progress HUD - Top right, below minimap */}
      <AgentProgressHUD />

      {/* Logs Viewer - Bottom right */}
      <div className="pointer-events-auto">
        <LogsViewer />
      </div>
    </div>
  );
}
