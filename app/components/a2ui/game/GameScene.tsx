'use client';

import React, { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameState, GameLoop } from './core/Game';
import { CameraController } from './core/CameraController';
import { SelectionSystem } from './core/SelectionSystem';
import { WorldGrid } from './world/WorldManager';
import { EnhancedTerrain } from './world/EnhancedTerrain';
import { WaterPlane } from './world/WaterPlane';
import { NaturalFeatures } from './world/NaturalFeatures';
import { AgentPool } from './entities/GameAgent';
import { InitialAgents } from './entities/AgentPool';
import { DragonPool } from './entities/Dragon';
import { StructurePool } from './entities/Structure';
import { ConnectionLines } from './entities/ConnectionLines';
import { CheckpointManager } from './entities/CheckpointManager';
import { HUD } from './ui/HUD';
import { HUD_v2 } from './ui/HUD_v2';
import { Tutorial } from './ui/Tutorial';
import { AgentBridgeProvider } from './bridge/AgentBridge';
import { useGameStore } from './store/gameStore';

/**
 * GameScene Component
 *
 * Main game scene that sets up the 3D Canvas with all game systems:
 * - Three.js Canvas with proper camera and lighting
 * - Game loop and state management
 * - World terrain and entities
 * - Camera controls and selection system
 * - HUD overlay
 */
export function GameScene() {
  // Agent + Structure interaction handlers
  const selectAgent = useGameStore((state) => state.selectAgent);
  const clearSelection = useGameStore((state) => state.clearSelection);
  const setSelectedStructure = useGameStore((state) => state.setSelectedStructure);
  const getSelectedAgentIds = () => useGameStore.getState().selectedAgentIds;
  const assignQuestToAgents = useGameStore((state) => state.assignQuestToAgents);

  const handleAgentClick = useCallback((agentId: string) => {
    clearSelection();
    selectAgent(agentId);
  }, [clearSelection, selectAgent]);

  const handleStructureClick = (structureId: string) => {
    // Left-click: Select structure to show info panel
    setSelectedStructure(structureId);
  };

  const handleStructureRightClick = (structureId: string) => {
    // Right-click: Auto-assign selected agents to structure
    const selectedAgentIds = getSelectedAgentIds();

    if (selectedAgentIds.size === 0) {
      // No agents selected, just show the structure info
      setSelectedStructure(structureId);
      return;
    }

    // Find a quest for this structure
    const quests = useGameStore.getState().quests;
    const questForStructure = Object.values(quests).find(
      (quest) => quest.targetStructureId === structureId
    );

    if (questForStructure) {
      // Assign selected agents to the quest
      assignQuestToAgents(questForStructure.id, Array.from(selectedAgentIds));
    }

    // Also select the structure to show confirmation
    setSelectedStructure(structureId);
  };

  return (
    <GameState>
      <AgentBridgeProvider>
        {/* 3D Canvas */}
        <Canvas
          shadows
          camera={{
            position: [25, 30, 35],
            fov: 60,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            antialias: true,
            alpha: false,
          }}
          className="w-full h-full"
        >
          {/* Lighting - Enhanced for natural atmosphere */}
          <ambientLight intensity={0.45} color="#f0f0e8" />
          <directionalLight
            position={[60, 60, 30]}
            intensity={0.8}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={200}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />

          {/* Fog for depth - Enhanced for terrain */}
          <fog attach="fog" args={['#1a1a2e', 40, 120]} />

          {/* Game Systems */}
          <GameLoop />
          <CameraController />
          <SelectionSystem
            onStructureClicked={handleStructureClick}
            onStructureRightClicked={handleStructureRightClick}
          />

          {/* World and Entities */}
          <Suspense fallback={null}>
            <EnhancedTerrain width={50} height={50} />
            <WaterPlane />
            <NaturalFeatures />
            <InitialAgents count={10} />
            <AgentPool onAgentClick={handleAgentClick} />
            <DragonPool />
            <StructurePool />
            <ConnectionLines />
            <CheckpointManager />
          </Suspense>
        </Canvas>

        {/* UI Overlay (rendered outside Canvas) */}
        {/* TODO: Remove HUD and use HUD_v2 */}
        {/* <HUD /> */}
        <HUD_v2 />

        {/* Tutorial System */}
        <Tutorial />
      </AgentBridgeProvider>
    </GameState>
  );
}

/**
 * Loading Screen Component
 * Shown while the game is initializing
 */
export function GameLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center text-empire-gold">
      <div className="text-center">
        <div className="text-4xl mb-4">⚔️</div>
        <div className="text-xl">Loading Agents of Empire...</div>
      </div>
    </div>
  );
}
