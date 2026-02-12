'use client';

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, useAgentsMap, type GameAgent } from '@/app/components/a2ui/game/store';
import { DropdownButton } from '@/app/components/a2ui/components/DropdownButton';
import { downloadJSON, downloadCSV, downloadZIP } from '@/app/lib/utils/download';
import { tracesToJSON, tracesToCSV, createTraceMetadata } from '@/app/lib/utils/formatters';

// ============================================================================
// Intelligence Bureau Component
// Shows LangSmith traces and LangGraph execution for selected agent
// Theme: RTS spy network / intelligence gathering
// Position: Right side panel (replaces inventory when agent selected)
// ============================================================================

interface IntelligenceBureauProps {
  agentId: string;
  onClose?: () => void;
}

interface TraceEvent {
  id: string;
  timestamp: number;
  type: 'thought' | 'tool' | 'message' | 'checkpoint' | 'error';
  content: string;
  metadata?: Record<string, any>;
  duration?: number;
}

// Mock data - will be replaced with real LangSmith API calls
const getMockTraces = (agentId: string): TraceEvent[] => {
  return [
    {
      id: '1',
      timestamp: Date.now() - 30000,
      type: 'checkpoint',
      content: 'Agent initialized with Code Workshop mission',
      metadata: { checkpoint: 'init', state: 'ready' }
    },
    {
      id: '2',
      timestamp: Date.now() - 25000,
      type: 'thought',
      content: 'Analyzing codebase structure to identify files related to agent solutions...',
      metadata: { reasoning_steps: 3 }
    },
    {
      id: '3',
      timestamp: Date.now() - 20000,
      type: 'tool',
      content: 'file_reader.read("src/agent/solution.ts")',
      metadata: { tool: 'file_reader', success: true },
      duration: 1200
    },
    {
      id: '4',
      timestamp: Date.now() - 15000,
      type: 'thought',
      content: 'Found 3 potential areas for improvement. Planning refactoring approach...',
      metadata: { reasoning_steps: 5 }
    },
    {
      id: '5',
      timestamp: Date.now() - 10000,
      type: 'tool',
      content: 'code_editor.modify("src/agent/solution.ts", changes)',
      metadata: { tool: 'code_editor', success: true },
      duration: 2400
    },
    {
      id: '6',
      timestamp: Date.now() - 5000,
      type: 'message',
      content: 'Successfully refactored agent solution. Running validation tests...',
      metadata: { status: 'in_progress' }
    },
    {
      id: '7',
      timestamp: Date.now() - 1000,
      type: 'checkpoint',
      content: 'Work checkpoint saved',
      metadata: { checkpoint: 'work_progress', files_modified: 1 }
    }
  ];
};

const TYPE_CONFIG = {
  thought: {
    icon: '💭',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-600/30',
    label: 'Reasoning'
  },
  tool: {
    icon: '🔧',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/20',
    borderColor: 'border-yellow-600/30',
    label: 'Tool Call'
  },
  message: {
    icon: '💬',
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-600/30',
    label: 'Output'
  },
  checkpoint: {
    icon: '💾',
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/20',
    borderColor: 'border-purple-600/30',
    label: 'Checkpoint'
  },
  error: {
    icon: '❌',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20',
    borderColor: 'border-red-600/30',
    label: 'Error'
  }
};

export function IntelligenceBureau({ agentId, onClose }: IntelligenceBureauProps) {
  const agentsMap = useAgentsMap();
  const agent = agentsMap[agentId] as GameAgent | undefined;
  const [traces, setTraces] = useState<TraceEvent[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Fetch traces from LangSmith API
  useEffect(() => {
    if (!agent) return;

    let isMounted = true;
    let eventSource: EventSource | null = null;

    // Initial load of traces
    const fetchTraces = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/traces?limit=50`);
        const data = await response.json();

        if (isMounted) {
          if (data.traces && data.traces.length > 0) {
            setTraces(data.traces);
          } else {
            // Fallback to mock data if no real traces yet or LangSmith not configured
            setTraces(getMockTraces(agentId));
          }
        }
      } catch (error) {
        console.error("[Intelligence Bureau] Error fetching traces:", error);
        // Fallback to mock data on error
        if (isMounted) {
          setTraces(getMockTraces(agentId));
        }
      }
    };

    fetchTraces();

    // Set up real-time streaming if supported
    try {
      eventSource = new EventSource(`/api/agents/${agentId}/traces`, {
        // @ts-ignore - EventSource POST not standard but we're using it
        method: 'POST'
      });

      eventSource.onmessage = (event) => {
        if (!isMounted) return;

        try {
          const trace = JSON.parse(event.data);
          if (trace.error) {
            console.warn("[Intelligence Bureau] Stream error:", trace.error);
            return;
          }

          setTraces(prev => {
            // Check if trace already exists
            if (prev.some(t => t.id === trace.id)) {
              return prev;
            }
            // Add new trace and keep last 50
            return [trace, ...prev].slice(0, 50);
          });
        } catch (error) {
          console.error("[Intelligence Bureau] Error parsing trace event:", error);
        }
      };

      eventSource.onerror = () => {
        console.warn("[Intelligence Bureau] Stream connection error, will retry");
      };
    } catch (error) {
      console.error("[Intelligence Bureau] Error setting up stream:", error);
    }

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [agent, agentId]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get relative time
  const getRelativeTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Handle export in various formats
  const handleExport = async (format: string) => {
    if (traces.length === 0) {
      const addLog = useGameStore.getState().addLog;
      addLog('warn', 'No trace data available to export', 'system');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `traces-${agentId}-${timestamp}`;

    try {
      switch (format) {
        case 'json':
          downloadJSON(traces, `${filename}.json`);
          break;
        case 'csv':
          const csv = tracesToCSV(traces);
          downloadCSV(csv, `${filename}.csv`);
          break;
        case 'zip':
          const metadata = createTraceMetadata(agentId, agent?.name || 'Unknown', traces.length);
          const files = {
            'traces.json': tracesToJSON(traces),
            'traces.csv': tracesToCSV(traces),
            'metadata.json': metadata,
          };
          await downloadZIP(files, `${filename}.zip`);
          break;
      }

      const addLog = useGameStore.getState().addLog;
      addLog('success', `Exported ${traces.length} traces as ${format.toUpperCase()}`, 'system');
    } catch (error) {
      console.error('Export error:', error);
      const addLog = useGameStore.getState().addLog;
      addLog('error', `Failed to export traces: ${error}`, 'system');
    }
  };

  if (!agent) return null;

  const selectedTraceData = traces.find(t => t.id === selectedTrace);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-900/98 border-2 border-[var(--empire-gold)] rounded-lg text-white w-96 shadow-2xl shadow-[var(--empire-gold)]/30 max-h-[85vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--empire-gold)]/30 to-[var(--empire-gold)]/10 px-4 py-3 border-b border-[var(--empire-gold)]/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🕵️</span>
              <h3 className="text-[var(--empire-gold)] text-lg font-bold rts-text-header">
                Intelligence Bureau
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Agent: {agent.name}</p>
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
      </div>

      {/* Controls */}
      <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {traces.length} trace events
        </div>
        <div className="flex items-center gap-2">
          <DropdownButton
            label="Export"
            icon="📦"
            options={[
              { value: 'json', label: 'JSON', icon: '📄' },
              { value: 'csv', label: 'CSV', icon: '📊' },
              { value: 'zip', label: 'ZIP', icon: '🗜️' },
            ]}
            onSelect={handleExport}
            disabled={traces.length === 0}
          />
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              autoScroll
                ? 'bg-[var(--empire-gold)]/20 text-[var(--empire-gold)] border border-[var(--empire-gold)]/50'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {autoScroll ? '📜 Auto' : '⏸️ Paused'}
          </button>
          <button
            onClick={() => setTraces([])}
            className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Trace Timeline */}
      <div className="flex-1 overflow-y-auto rts-scrollbar p-3 space-y-2">
        {traces.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No intelligence data yet</p>
            <p className="text-xs mt-1">Traces will appear as agent works</p>
          </div>
        ) : (
          traces.map((trace, index) => {
            const config = TYPE_CONFIG[trace.type];
            const isSelected = selectedTrace === trace.id;

            return (
              <motion.button
                key={trace.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedTrace(isSelected ? null : trace.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? `${config.bgColor} ${config.borderColor} shadow-lg`
                    : `${config.bgColor} border-transparent hover:${config.borderColor}`
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {getRelativeTime(trace.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mb-1">
                  {trace.content}
                </p>
                {trace.duration && (
                  <div className="text-xs text-gray-500">
                    ⏱️ {trace.duration}ms
                  </div>
                )}
              </motion.button>
            );
          })
        )}
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedTraceData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t-2 border-[var(--empire-gold)]/30 bg-gray-800/50 overflow-hidden"
          >
            <div className="p-4 space-y-2 max-h-48 overflow-y-auto rts-scrollbar">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-[var(--empire-gold)] uppercase tracking-wider">
                  Trace Details
                </h4>
                <button
                  onClick={() => setSelectedTrace(null)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-xs">
                  <span className="text-gray-500">Time:</span>{' '}
                  <span className="text-gray-300">{formatTime(selectedTraceData.timestamp)}</span>
                </div>
                {selectedTraceData.metadata && Object.keys(selectedTraceData.metadata).length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Metadata:</div>
                    <div className="bg-gray-900/50 rounded p-2 font-mono text-xs text-gray-300 overflow-x-auto">
                      <pre>{JSON.stringify(selectedTraceData.metadata, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span>💭</span>
              <span>{traces.filter(t => t.type === 'thought').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🔧</span>
              <span>{traces.filter(t => t.type === 'tool').length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>💾</span>
              <span>{traces.filter(t => t.type === 'checkpoint').length}</span>
            </div>
          </div>
          <div className="text-[var(--empire-gold)]">
            🔴 Live
          </div>
        </div>
      </div>
    </motion.div>
  );
}
