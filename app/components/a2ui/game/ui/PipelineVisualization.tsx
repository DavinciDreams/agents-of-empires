'use client';

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from '@/app/components/a2ui/game/store';

/* ============================================================================
   PIPELINE VISUALIZATION
   Shows the LangChain → DeepAgents → LangGraph → A2A flow
   Visualizes all aspects of the agent execution pipeline
   ============================================================================ */

interface PipelineVisualizationProps {
  onClose?: () => void;
  compact?: boolean;
}

export function PipelineVisualization({ onClose, compact = false }: PipelineVisualizationProps) {
  const agentsMap = useGameStore((state) => state.agents);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  // Memoize to avoid infinite re-renders
  const agents = React.useMemo(() => Object.values(agentsMap), [agentsMap]);

  // Calculate pipeline metrics
  const metrics = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.state === 'WORKING' || a.state === 'THINKING').length,
    idleAgents: agents.filter(a => a.state === 'IDLE').length,
    errorAgents: agents.filter(a => a.state === 'ERROR').length,
    averageHealth: agents.reduce((sum, a) => sum + a.health, 0) / agents.length || 0,
  };

  const pipelineStages = [
    {
      id: 'langchain',
      name: 'LangChain',
      icon: '🔗',
      description: 'Foundation framework for LLM applications',
      color: 'var(--homm-gold)',
      activeCount: metrics.activeAgents,
      status: 'operational',
    },
    {
      id: 'deepagents',
      name: 'DeepAgents',
      icon: '🤖',
      description: 'Agent runtime and execution environment',
      color: '#64B5F6',
      activeCount: metrics.activeAgents,
      status: 'operational',
    },
    {
      id: 'langgraph',
      name: 'LangGraph',
      icon: '🕸️',
      description: 'Graph-based agent orchestration',
      color: '#9C27B0',
      activeCount: Math.floor(metrics.activeAgents * 0.8),
      status: 'operational',
    },
    {
      id: 'a2a',
      name: 'A2A Protocol',
      icon: '⚡',
      description: 'Agent-to-Agent communication layer',
      color: '#FFB74D',
      activeCount: Math.floor(metrics.activeAgents * 0.6),
      status: 'operational',
    },
  ];

  if (compact) {
    return <CompactPipeline stages={pipelineStages} metrics={metrics} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 pointer-events-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="homm-panel-ornate max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
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
            <div className="text-4xl">⚙️</div>
            <div>
              <h2 className="rts-text-header text-2xl mb-1" style={{ fontFamily: 'Cinzel, serif' }}>
                Agent Pipeline
              </h2>
              <p className="text-sm" style={{ color: 'var(--homm-tan-light)', fontFamily: 'Lora, serif' }}>
                LangChain → DeepAgents → LangGraph → A2A Converter
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

        {/* Metrics Bar */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-[var(--homm-gold)]/20">
          <MetricCard label="Total Agents" value={metrics.totalAgents} icon="🎭" />
          <MetricCard label="Active" value={metrics.activeAgents} icon="⚡" color="#64B5F6" />
          <MetricCard label="Idle" value={metrics.idleAgents} icon="💤" color="#9E9E9E" />
          <MetricCard label="Errors" value={metrics.errorAgents} icon="❌" color="#EF5350" />
        </div>

        {/* Pipeline Flow */}
        <div className="flex-1 overflow-y-auto rts-scrollbar p-6">
          <div className="flex items-center justify-between gap-4 mb-8">
            {pipelineStages.map((stage, index) => (
              <React.Fragment key={stage.id}>
                <PipelineStage
                  stage={stage}
                  isSelected={selectedStage === stage.id}
                  onSelect={() => setSelectedStage(stage.id)}
                />
                {index < pipelineStages.length - 1 && (
                  <div className="flex-shrink-0">
                    <svg width="40" height="40" viewBox="0 0 40 40">
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="10"
                          markerHeight="10"
                          refX="9"
                          refY="3"
                          orient="auto"
                        >
                          <polygon
                            points="0 0, 10 3, 0 6"
                            fill="var(--homm-gold)"
                          />
                        </marker>
                      </defs>
                      <line
                        x1="0"
                        y1="20"
                        x2="40"
                        y2="20"
                        stroke="var(--homm-gold)"
                        strokeWidth="3"
                        markerEnd="url(#arrowhead)"
                        opacity="0.6"
                      />
                      {/* Animated pulse */}
                      <circle
                        r="3"
                        fill="var(--homm-gold)"
                        opacity="0.8"
                      >
                        <animateMotion
                          dur="2s"
                          repeatCount="indefinite"
                          path="M 0 20 L 40 20"
                        />
                      </circle>
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Selected Stage Details */}
          <AnimatePresence>
            {selectedStage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 rounded"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '2px solid var(--homm-gold)',
                }}
              >
                <StageDetails
                  stage={pipelineStages.find(s => s.id === selectedStage)!}
                  agents={agents}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Legend */}
          <div className="mt-8 p-4 rounded" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
            <h4 className="rts-text-subheader text-sm mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
              Pipeline Layers
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <strong style={{ color: 'var(--homm-gold)' }}>LangChain:</strong>
                <span style={{ color: 'var(--homm-tan)' }}> Base framework for prompts, chains, and memory</span>
              </div>
              <div>
                <strong style={{ color: '#64B5F6' }}>DeepAgents:</strong>
                <span style={{ color: 'var(--homm-tan)' }}> Execution runtime with sandbox and tools</span>
              </div>
              <div>
                <strong style={{ color: '#9C27B0' }}>LangGraph:</strong>
                <span style={{ color: 'var(--homm-tan)' }}> Graph orchestration for complex workflows</span>
              </div>
              <div>
                <strong style={{ color: '#FFB74D' }}>A2A Protocol:</strong>
                <span style={{ color: 'var(--homm-tan)' }}> Agent-to-Agent communication and coordination</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================================
   PIPELINE STAGE CARD
   ============================================================================ */

interface PipelineStageProps {
  stage: {
    id: string;
    name: string;
    icon: string;
    description: string;
    color: string;
    activeCount: number;
    status: string;
  };
  isSelected: boolean;
  onSelect: () => void;
}

function PipelineStage({ stage, isSelected, onSelect }: PipelineStageProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.05 }}
      onClick={onSelect}
      className={`flex-1 hero-card cursor-pointer min-w-0 ${
        isSelected ? 'rts-glow-gold' : ''
      }`}
      style={{
        borderColor: isSelected ? stage.color : 'var(--homm-gold-dark)',
        minHeight: '160px',
      }}
    >
      <div className="text-center">
        <div className="text-4xl mb-3">{stage.icon}</div>
        <h3 className="rts-text-header text-base mb-2" style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem' }}>
          {stage.name}
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--homm-tan)', lineHeight: '1.4' }}>
          {stage.description}
        </p>
        <div className="flex items-center justify-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: stage.status === 'operational' ? '#66BB6A' : '#EF5350',
              boxShadow: `0 0 8px ${stage.status === 'operational' ? '#66BB6A' : '#EF5350'}`,
            }}
          />
          <span style={{ color: 'var(--homm-tan-light)', fontWeight: 600 }}>
            {stage.activeCount} active
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================================
   STAGE DETAILS
   ============================================================================ */

interface StageDetailsProps {
  stage: PipelineStageProps['stage'];
  agents: any[];
}

function StageDetails({ stage, agents }: StageDetailsProps) {
  const activeAgents = agents.filter(a => a.state === 'WORKING' || a.state === 'THINKING');

  return (
    <div>
      <h3 className="rts-text-header text-xl mb-4" style={{ fontFamily: 'Cinzel, serif' }}>
        {stage.icon} {stage.name} Details
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--homm-tan)' }}>Status</div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: stage.status === 'operational' ? '#66BB6A' : '#EF5350',
                boxShadow: `0 0 10px ${stage.status === 'operational' ? '#66BB6A' : '#EF5350'}`,
              }}
            />
            <span style={{ color: 'var(--homm-parchment-light)', fontWeight: 600, textTransform: 'capitalize' }}>
              {stage.status}
            </span>
          </div>
        </div>

        <div className="p-3 rounded" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--homm-tan)' }}>Active Processes</div>
          <div style={{ color: 'var(--homm-gold)', fontWeight: 700, fontSize: '1.5rem' }}>
            {stage.activeCount}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm mb-2" style={{ color: 'var(--homm-tan-light)' }}>
          Active Agents ({activeAgents.length}):
        </h4>
        <div className="flex flex-wrap gap-2">
          {activeAgents.slice(0, 10).map(agent => (
            <div
              key={agent.id}
              className="px-3 py-1 rounded text-xs"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--homm-gold-dark)',
                color: 'var(--homm-parchment-light)',
              }}
            >
              {agent.name}
            </div>
          ))}
          {activeAgents.length > 10 && (
            <div className="px-3 py-1 text-xs" style={{ color: 'var(--homm-tan)' }}>
              +{activeAgents.length - 10} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   METRIC CARD
   ============================================================================ */

interface MetricCardProps {
  label: string;
  value: number;
  icon: string;
  color?: string;
}

function MetricCard({ label, value, icon, color = 'var(--homm-gold)' }: MetricCardProps) {
  return (
    <div className="p-4 rounded" style={{ background: 'rgba(0, 0, 0, 0.3)', border: '2px solid var(--homm-gold-dark)' }}>
      <div className="flex items-center gap-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <div className="text-2xl font-bold" style={{ color, fontFamily: 'Cinzel, serif' }}>
            {value}
          </div>
          <div className="text-xs" style={{ color: 'var(--homm-tan)' }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   COMPACT PIPELINE - For HUD display
   ============================================================================ */

interface CompactPipelineProps {
  stages: any[];
  metrics: any;
}

function CompactPipeline({ stages, metrics }: CompactPipelineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="homm-panel p-4 rounded"
      style={{ minWidth: '300px' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="text-xl">⚙️</div>
        <h3 className="rts-text-header text-sm" style={{ fontFamily: 'Cinzel, serif' }}>
          Pipeline Status
        </h3>
      </div>

      <div className="space-y-2">
        {stages.map(stage => (
          <div key={stage.id} className="flex items-center justify-between text-xs p-2 rounded" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
            <div className="flex items-center gap-2">
              <span>{stage.icon}</span>
              <span style={{ color: 'var(--homm-parchment-light)' }}>{stage.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: stage.status === 'operational' ? '#66BB6A' : '#EF5350',
                  boxShadow: `0 0 6px ${stage.status === 'operational' ? '#66BB6A' : '#EF5350'}`,
                }}
              />
              <span style={{ color: stage.color, fontWeight: 600 }}>{stage.activeCount}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--homm-gold)]/20 flex justify-between text-xs">
        <span style={{ color: 'var(--homm-tan)' }}>Total Active:</span>
        <span style={{ color: 'var(--homm-gold)', fontWeight: 700 }}>{metrics.activeAgents}</span>
      </div>
    </motion.div>
  );
}
