'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * AgentProgressHUD - Shows progress for agents working on checkpoint-based quests
 * Displays:
 * - Current step description
 * - Progress percentage
 * - Token usage
 * - Estimated cost
 */
export function AgentProgressHUD() {
  const agents = useGameStore((state) => state.agents);
  const checkpoints = useGameStore((state) => state.checkpoints);

  // Filter agents that are working on checkpoint-based quests
  const workingAgents = useMemo(() => {
    return Object.values(agents).filter(
      (agent) => agent.currentQuestId && agent.currentCheckpointId
    );
  }, [agents]);

  if (workingAgents.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-40 pointer-events-auto space-y-2">
      <AnimatePresence>
        {workingAgents.map((agent) => {
          const checkpoint = checkpoints[agent.currentCheckpointId || ''];
          const progress = agent.executionProgress;
          const tokens = agent.tokenUsage;

          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="bg-gray-900/95 border-2 border-[var(--empire-gold)] rounded-lg p-3 min-w-[280px] shadow-lg shadow-[var(--empire-gold)]/20"
            >
              {/* Agent name and state */}
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-[var(--empire-gold)] text-sm">
                  {agent.name}
                </div>
                <div className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                  {agent.state}
                </div>
              </div>

              {/* Current step */}
              {checkpoint && (
                <div className="text-xs text-gray-300 mb-2">
                  <span className="text-gray-500">Step {checkpoint.stepNumber}:</span>{' '}
                  {checkpoint.description}
                </div>
              )}

              {/* Progress bar */}
              {progress && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">
                      Progress: {progress.currentStep}/{progress.totalSteps}
                    </span>
                    <span className="text-[var(--empire-gold)] font-semibold">
                      {progress.percentComplete.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[var(--empire-gold)] to-yellow-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percentComplete}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Token usage */}
              {tokens && tokens.total > 0 && (
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Tokens: {tokens.total.toLocaleString()}</span>
                  <span className="text-green-400">
                    ${tokens.cost.toFixed(4)}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
