'use client';

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shallow } from "zustand/shallow";
import {
  useGameStore,
  useSelectedAgentIds,
  useAgentsMap,
  useQuestsShallow,
  type Structure,
  type Quest,
} from '@/components/a2ui/game/store';

// ============================================================================
// Structure Type Icons
// ============================================================================

const STRUCTURE_ICONS: Record<string, string> = {
  castle: "🏰",
  tower: "🗼",
  workshop: "🔧",
  campfire: "🔥",
  base: "🏠",
};

const STRUCTURE_COLORS: Record<string, string> = {
  castle: "text-purple-400",
  tower: "text-blue-400",
  workshop: "text-orange-400",
  campfire: "text-yellow-400",
  base: "text-green-400",
};

const STRUCTURE_BORDER_COLORS: Record<string, string> = {
  castle: "border-purple-500",
  tower: "border-blue-500",
  workshop: "border-orange-500",
  campfire: "border-yellow-500",
  base: "border-green-500",
};

// ============================================================================
// Structure Info Panel Component
// Position: Right side, similar to Inventory Panel
// ============================================================================

interface StructureInfoPanelProps {
  structureId: string;
  onClose?: () => void;
}

export function StructureInfoPanel({ structureId, onClose }: StructureInfoPanelProps) {
  const structure = useGameStore((state) => state.structures[structureId]);
  const questsMap = useQuestsShallow();
  const selectedAgentIds = useSelectedAgentIds();
  const agentsMap = useAgentsMap();
  const assignQuestToAgents = useGameStore((state) => state.assignQuestToAgents);
  const updateAgent = useGameStore((state) => state.updateAgent);
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  if (!structure) return null;

  // Find quests associated with this structure
  const associatedQuests = useMemo(() => {
    return Object.values(questsMap as unknown as Record<string, Quest>).filter((quest) => quest.targetStructureId === structureId);
  }, [questsMap, structureId]);

  // Get selected agents as array
  const selectedAgents = useMemo(() => {
    const agents: Array<{ id: string; name: string; level: number; state: string }> = [];
    for (const id of selectedAgentIds) {
      const agent = agentsMap[id];
      if (agent) {
        agents.push({
          id: agent.id,
          name: agent.name,
          level: agent.level,
          state: agent.state,
        });
      }
    }
    return agents;
  }, [selectedAgentIds, agentsMap]);

  // Get all available agents for selection
  const availableAgents = useMemo(() => {
    return Object.values(agentsMap).map((agent) => ({
      id: agent.id,
      name: agent.name,
      level: agent.level,
      state: agent.state,
    }));
  }, [agentsMap]);

  // Handle assigning selected agents to structure
  const handleAssignAgents = () => {
    if (selectedAgentIds.size === 0) {
      console.log("No agents selected to assign");
      return;
    }

    const agentIdArray = Array.from(selectedAgentIds);

    // Update agent tasks to reflect assignment to this structure
    for (const agentId of agentIdArray) {
      updateAgent(agentId, {
        currentTask: `Assigned to ${structure.name}`,
        targetPosition: structure.position,
        state: "MOVING",
      });
    }

    console.log(`Assigned ${agentIdArray.length} agents to ${structure.name}`);
  };

  // Handle assigning agents to a quest
  const handleAssignQuest = (quest: Quest) => {
    if (selectedAgentIds.size === 0) {
      console.log("No agents selected to assign to quest");
      return;
    }

    assignQuestToAgents(quest.id, Array.from(selectedAgentIds));
  };

  // Handle toggling agent selection
  const handleToggleAgent = (agentId: string) => {
    const toggleAgentSelection = useGameStore.getState().toggleAgentSelection;
    toggleAgentSelection(agentId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-900/98 border-2 rounded-lg p-4 text-white w-96 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
      style={{ borderColor: STRUCTURE_BORDER_COLORS[structure.type]?.replace("border-", "") || "#f4d03f" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{STRUCTURE_ICONS[structure.type] || "🏗️"}</span>
          <div>
            <h3 className="text-lg font-bold text-empire-gold">{structure.name}</h3>
            <p className={`text-xs uppercase tracking-wider ${STRUCTURE_COLORS[structure.type] || "text-gray-400"}`}>
              {structure.type}
            </p>
          </div>
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

      {/* Structure Details */}
      <div className="mb-4 p-3 rounded-lg bg-gray-800/80 border border-gray-700">
        <p className="text-sm text-gray-300">{structure.description}</p>
        <div className="mt-2 text-xs text-gray-500">
          Position: [{structure.position[0].toFixed(1)}, {structure.position[1].toFixed(1)}, {structure.position[2].toFixed(1)}]
        </div>
        {structure.goalId && (
          <div className="mt-2 text-xs text-empire-gold">
            Goal ID: {structure.goalId}
          </div>
        )}
      </div>

      {/* Associated Quests */}
      {associatedQuests.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-empire-gold">Associated Quests</h4>
            <span className="text-xs text-gray-400">{associatedQuests.length} quest(s)</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {associatedQuests.map((quest) => (
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
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                  <span>Required: {quest.requiredAgents} agents</span>
                  <span>Assigned: {quest.assignedAgentIds.length}</span>
                </div>
                {quest.rewards.length > 0 && (
                  <div className="text-xs text-empire-gold mb-2">
                    Rewards: {quest.rewards.join(", ")}
                  </div>
                )}
                {quest.status === "pending" && selectedAgentIds.size > 0 && (
                  <button
                    onClick={() => handleAssignQuest(quest)}
                    className="text-xs bg-empire-gold text-gray-900 px-3 py-1 rounded font-semibold hover:bg-yellow-500 transition-colors w-full"
                  >
                    Assign {selectedAgentIds.size} Agent{selectedAgentIds.size > 1 ? "s" : ""} to Quest
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Assignment Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-semibold text-empire-gold">Agent Assignment</h4>
          <button
            onClick={() => setShowAgentSelector(!showAgentSelector)}
            className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            {showAgentSelector ? "Hide" : "Show"} Agent List
          </button>
        </div>

        {/* Selected Agents Summary */}
        {selectedAgents.length > 0 ? (
          <div className="mb-3 p-3 rounded-lg bg-blue-900/20 border border-blue-700/50">
            <div className="text-sm text-blue-300 mb-2">
              {selectedAgents.length} agent{selectedAgents.length > 1 ? "s" : ""} selected
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedAgents.slice(0, 5).map((agent) => (
                <span
                  key={agent.id}
                  className="text-xs px-2 py-1 rounded bg-blue-800/50 text-blue-200"
                >
                  {agent.name}
                </span>
              ))}
              {selectedAgents.length > 5 && (
                <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                  +{selectedAgents.length - 5} more
                </span>
              )}
            </div>
            <button
              onClick={handleAssignAgents}
              className="mt-2 w-full text-xs bg-empire-gold text-gray-900 px-3 py-2 rounded font-semibold hover:bg-yellow-500 transition-colors"
            >
              Assign to {structure.name}
            </button>
          </div>
        ) : (
          <div className="mb-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700 text-center">
            <p className="text-sm text-gray-400">No agents selected</p>
            <p className="text-xs text-gray-500">Select agents to assign them to this structure</p>
          </div>
        )}

        {/* Agent Selector */}
        <AnimatePresence>
          {showAgentSelector && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex-1 overflow-y-auto space-y-1 pr-1"
            >
              {availableAgents.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">No agents available</p>
              ) : (
                availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleToggleAgent(agent.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors flex justify-between items-center ${
                      selectedAgentIds.has(agent.id)
                        ? "bg-empire-gold/20 border border-empire-gold"
                        : "bg-gray-800/50 border border-gray-700 hover:bg-gray-700"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{agent.name}</div>
                      <div className="text-xs text-gray-400">Level {agent.level} • {agent.state}</div>
                    </div>
                    {selectedAgentIds.has(agent.id) && (
                      <span className="text-empire-gold">✓</span>
                    )}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
