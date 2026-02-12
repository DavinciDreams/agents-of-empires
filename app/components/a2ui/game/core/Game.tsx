'use client';

import React, { useEffect, useState } from "react";
import { useGameStore } from '@/app/components/a2ui/game/store';
import type { GameConfig } from "./GameHooks";
import { useGame } from "./GameHooks";
import { DEFAULT_MIDDLEWARE, BACKEND_TYPES } from "@/app/components/a2ui/game/bridge/agentConfigTypes";

// ============================================================================
// Game State Component
// ============================================================================()

export interface GameStateProps {
  children: React.ReactNode;
  config?: GameConfig;
}

export function GameState({ children, config }: GameStateProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize game world
  useEffect(() => {
    const { initializeWorld, addStructure, addQuest, setBackendConfig, setAgentMiddleware } = useGameStore.getState();

    // Configure default backend and middleware for agents
    setBackendConfig({
      type: BACKEND_TYPES.STORE,
      initialized: true,
    });

    setAgentMiddleware(DEFAULT_MIDDLEWARE);

    // Initialize terrain
    initializeWorld(50, 50);

    // ============================================================================
    // Initialize Goal Structures - All 5 Types
    // ============================================================================

    // 1. BASE - Home base (fortified)
    addStructure({
      type: "base",
      position: [25, 0, 25],
      name: "Command Center",
      description: "Agent spawn point and base of operations",
    });

    // 2. CASTLE - Main goals (large, impressive)
    const knowledgeCastle = addStructure({
      type: "castle",
      position: [40, 0, 10],
      name: "Knowledge Castle",
      description: "The ultimate goal - complete all research here",
      goalId: "main-goal-knowledge",
    });

    // 3. TOWER - Sub-goals (tall, watchtower style)
    const scoutTower = addStructure({
      type: "tower",
      position: [8, 0, 8],
      name: "Scout Tower",
      description: "Sub-goal: Establish reconnaissance",
      goalId: "sub-goal-scouting",
    });

    const watchtower = addStructure({
      type: "tower",
      position: [42, 0, 42],
      name: "Watchtower",
      description: "Sub-goal: Defend the perimeter",
      goalId: "sub-goal-defense",
    });

    // 4. WORKSHOP - Tasks (building with work areas)
    const codeWorkshop = addStructure({
      type: "workshop",
      position: [10, 0, 40],
      name: "Code Workshop",
      description: "Task: Craft agent solutions",
    });

    const researchLab = addStructure({
      type: "workshop",
      position: [40, 0, 40],
      name: "Research Lab",
      description: "Task: Analyze data patterns",
    });

    // 5. CAMPFIRE - Gathering points (warm, inviting)
    addStructure({
      type: "campfire",
      position: [25, 0, 15],
      name: "Strategy Circle",
      description: "Gathering point for agent coordination",
    });

    addStructure({
      type: "campfire",
      position: [15, 0, 25],
      name: "Rest Camp",
      description: "Agent rest and recovery point",
    });

    // ============================================================================
    // Initialize Quests - Linked to Structures
    // ============================================================================

    // Main Quest - Knowledge Castle
    addQuest({
      title: "Unlock the Knowledge Castle",
      description: "Research and unlock the secrets of the Knowledge Castle",
      status: "in_progress",
      targetStructureId: knowledgeCastle.id,
      requiredAgents: 5,
      assignedAgentIds: [],
      rewards: ["1000 XP", "500 Gold", "Legendary Item"],
    });

    // Sub-quests
    addQuest({
      title: "Scout the Territory",
      description: "Establish reconnaissance at the Scout Tower",
      status: "in_progress",
      targetStructureId: scoutTower.id,
      requiredAgents: 2,
      assignedAgentIds: [],
      rewards: ["250 XP", "100 Gold"],
    });

    addQuest({
      title: "Defend the Perimeter",
      description: "Set up defenses at the Watchtower",
      status: "pending",
      targetStructureId: watchtower.id,
      requiredAgents: 3,
      assignedAgentIds: [],
      rewards: ["300 XP", "150 Gold"],
    });

    // Task quests
    addQuest({
      title: "Craft Agent Solutions",
      description: "Work at the Code Workshop to develop agent tools",
      status: "pending",
      targetStructureId: codeWorkshop.id,
      requiredAgents: 2,
      assignedAgentIds: [],
      rewards: ["200 XP", "100 Gold", "New Tool"],
    });

    addQuest({
      title: "Analyze Data Patterns",
      description: "Research data patterns at the Research Lab",
      status: "pending",
      targetStructureId: researchLab.id,
      requiredAgents: 2,
      assignedAgentIds: [],
      rewards: ["200 XP", "100 Gold", "Research Insights"],
    });

    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center text-empire-gold">
        <div className="text-center">
          <div className="text-4xl mb-4">⚔️</div>
          <div className="text-xl">Loading Agents of Empire...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ============================================================================
// Game Loop Component - Must be used inside Canvas
// ============================================================================

export interface GameLoopProps {
  config?: GameConfig;
}

export function GameLoop({ config }: GameLoopProps) {
  // Set up game loop - this must be called inside Canvas
  useGame(config);
  return null;
}

// Re-export hooks from GameHooks
export { useGame, useGameTime, useGameStats } from "./GameHooks";
export type { GameConfig };
