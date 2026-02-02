'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameState, GameLoop } from './core/Game';
import { CameraController } from './core/CameraController';
import { SelectionSystem } from './core/SelectionSystem';
import { WorldGrid } from './world/WorldManager';
import { AgentPool } from './entities/GameAgent';
import { InitialAgents } from './entities/AgentPool';
import { DragonPool } from './entities/Dragon';
import { StructurePool } from './entities/Structure';
import { ConnectionLines } from './entities/ConnectionLines';
import { HUD } from './ui/HUD';
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
  // Structure interaction handlers
  const setSelectedStructure = useGameStore((state) => state.setSelectedStructure);
  const getSelectedAgentIds = () => useGameStore.getState().selectedAgentIds;
  const assignQuestToAgents = useGameStore((state) => state.assignQuestToAgents);

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
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[50, 50, 25]}
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

          {/* Fog for depth */}
          <fog attach="fog" args={['#1a1a2e', 50, 150]} />

          {/* Game Systems */}
          <GameLoop />
          <CameraController />
          <SelectionSystem
            onStructureClicked={handleStructureClick}
            onStructureRightClicked={handleStructureRightClick}
          />

          {/* World and Entities */}
          <Suspense fallback={null}>
            <WorldGrid width={50} height={50} />
            <InitialAgents count={10} />
            <AgentPool />
            <DragonPool />
            <StructurePool />
            <ConnectionLines />
          </Suspense>
        </Canvas>

        {/* UI Overlay (rendered outside Canvas) */}
        <HUD />
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
