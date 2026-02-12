'use client';

import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useGameStore, useAgentCount, useDragonCount, useQuestCount, useCompletedQuestCount } from '@/app/components/a2ui/game/store';
import { GameLayout, TabbedPanel, CollapsibleSection, FloatingPanel } from './GameLayout';
import { Minimap, AgentPanel, QuestTracker } from './HUD';
import { AgentLibrary } from './AgentLibrary';
import { PipelineVisualization } from './PipelineVisualization';
import { ToolLibrary } from './ToolLibrary';
import { ChatCommander } from './ChatCommander';
import { LogsViewer } from './LogsViewer';
import { AgentProgressHUD } from './AgentProgressHUD';
import { FleetCommand } from './FleetCommand';

/* ============================================================================
   HUD V2 - Proper Game-Style UI/UX
   Clear zones, collapsible panels, no overlapping
   ============================================================================ */

export function HUD_v2() {
  const [showAgentLibrary, setShowAgentLibrary] = useState(false);
  const [showPipelineViz, setShowPipelineViz] = useState(false);
  const [showToolLibrary, setShowToolLibrary] = useState(false);

  return (
    <div className="fixed inset-0 pointer-events-none">
      {/* Top Bar - Always Visible */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-auto">
        <TopBar />
      </div>

      {/* Left Panel */}
      <div className="absolute top-20 left-0 bottom-20 z-40" style={{ width: '400px' }}>
        <div className="pointer-events-auto h-full">
          <LeftPanel />
        </div>
      </div>

      {/* Right Panel */}
      <div className="absolute top-20 right-0 bottom-20 z-40" style={{ width: '420px' }}>
        <div className="pointer-events-auto h-full">
          <RightPanel />
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <BottomBar />
      </div>

      {/* Quick Access Buttons */}
      <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-50 flex gap-2 pointer-events-auto">
        <button
          onClick={() => setShowAgentLibrary(true)}
          className="rts-button-primary px-4 py-2 rounded flex items-center gap-2 shadow-lg"
        >
          <span>🎭</span>
          <span>Agents</span>
        </button>
        <button
          onClick={() => setShowToolLibrary(true)}
          className="rts-button-primary px-4 py-2 rounded flex items-center gap-2 shadow-lg"
        >
          <span>🗡️</span>
          <span>Tools</span>
        </button>
        <button
          onClick={() => setShowPipelineViz(true)}
          className="rts-button px-4 py-2 rounded flex items-center gap-2 shadow-lg"
        >
          <span>⚙️</span>
          <span>Pipeline</span>
        </button>
      </div>

      {/* Floating Modals */}
      <AnimatePresence>
        {showAgentLibrary && (
          <AgentLibrary
            onClose={() => setShowAgentLibrary(false)}
            onSelectAgent={(id) => console.log('Selected:', id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToolLibrary && (
          <ToolLibrary onClose={() => setShowToolLibrary(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPipelineViz && (
          <PipelineVisualization onClose={() => setShowPipelineViz(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================================
   TOP BAR - Resources & Status
   ============================================================================ */

function TopBar() {
  const agentCount = useAgentCount();
  const dragonCount = useDragonCount();
  const questCount = useQuestCount();
  const completedQuests = useCompletedQuestCount();

  return (
    <div
      className="w-full py-3 px-6"
      style={{
        background: 'linear-gradient(180deg, rgba(92, 71, 54, 0.95) 0%, rgba(63, 45, 32, 0.85) 100%)',
        borderBottom: '3px solid var(--homm-gold)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Game Title */}
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: 'Cinzel, serif',
              color: 'var(--homm-gold)',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            Agents of Empire
          </h1>
          <p className="text-xs" style={{ color: 'var(--homm-tan-light)' }}>
            AI-Powered Strategy Game
          </p>
        </div>

        {/* Resource Counters */}
        <div className="flex gap-6">
          <ResourceCounter icon="🎭" label="Units" value={agentCount} color="var(--homm-gold)" />
          <ResourceCounter
            icon="✓"
            label="Quests"
            value={`${completedQuests}/${questCount}`}
            color="#66bb6a"
          />
          <ResourceCounter icon="⚔️" label="Threats" value={dragonCount} color="#d32f2f" />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button className="rts-button px-3 py-1 rounded text-sm">⚙️ Settings</button>
          <button className="rts-button px-3 py-1 rounded text-sm">❓ Help</button>
        </div>
      </div>
    </div>
  );
}

function ResourceCounter({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '2px solid var(--homm-gold-dark)',
      }}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-xs" style={{ color: 'var(--homm-tan)', fontFamily: 'Lora, serif' }}>
          {label}
        </div>
        <div
          className="text-lg font-bold"
          style={{ color, fontFamily: 'Cinzel, serif', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)' }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   LEFT PANEL - Quests & Objectives
   ============================================================================ */

function LeftPanel() {
  const quests = useGameStore((state) => Object.values(state.quests));
  const logs = useGameStore((state) => state.logs);

  const tabs = [
    {
      id: 'quests',
      label: 'Quests',
      icon: '📜',
      badge: quests.filter(q => q.status !== 'completed').length,
      content: (
        <div className="p-4">
          <QuestTracker className="!static !p-0 !border-0 !shadow-none !bg-transparent" />
        </div>
      ),
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: '📋',
      badge: logs.slice(-10).length,
      content: (
        <div className="p-4">
          <LogsViewer compact={true} />
        </div>
      ),
    },
  ];

  return <TabbedPanel tabs={tabs} defaultTab="quests" className="h-full rounded-r-lg" />;
}

/* ============================================================================
   RIGHT PANEL - Agents & Info
   ============================================================================ */

function RightPanel() {
  const agents = useGameStore((state) => Object.values(state.agents));
  const selectedAgentIds = useGameStore((state) => state.selectedAgentIds);

  const tabs = [
    {
      id: 'agents',
      label: 'Agents',
      icon: '🎭',
      badge: selectedAgentIds.size,
      content: (
        <div className="p-4">
          <AgentPanel className="!static !p-0 !border-0 !shadow-none !bg-transparent" />
          <div className="mt-4">
            <FleetCommand />
          </div>
        </div>
      ),
    },
    {
      id: 'map',
      label: 'Map',
      icon: '🗺️',
      content: (
        <div className="p-4 flex flex-col items-center">
          <Minimap width={300} height={300} />
          <div className="mt-4 w-full">
            <AgentProgressHUD />
          </div>
        </div>
      ),
    },
    {
      id: 'intel',
      label: 'Intel',
      icon: '🕵️',
      content: (
        <div className="p-4">
          <h3 className="rts-text-header text-lg mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
            Intelligence Bureau
          </h3>
          <p className="text-sm" style={{ color: 'var(--homm-tan)' }}>
            Select an agent to view execution traces and tool usage
          </p>
        </div>
      ),
    },
  ];

  return <TabbedPanel tabs={tabs} defaultTab="agents" className="h-full rounded-l-lg" />;
}

/* ============================================================================
   BOTTOM BAR - Command Input & Quick Actions
   ============================================================================ */

function BottomBar() {
  return (
    <div
      className="w-full py-3 px-6"
      style={{
        background: 'linear-gradient(0deg, rgba(92, 71, 54, 0.95) 0%, rgba(63, 45, 32, 0.85) 100%)',
        borderTop: '3px solid var(--homm-gold)',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="max-w-4xl mx-auto">
        <ChatCommander compact={true} />
      </div>
    </div>
  );
}
