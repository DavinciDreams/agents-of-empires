'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import ReactMarkdown from 'react-markdown';

/**
 * AgentCheckpointPanel - Shows detailed checkpoint results and manual controls
 * Features:
 * - View agent output/result for each checkpoint
 * - Manual controls to advance or retry
 * - Checkpoint history
 * - Token usage breakdown
 */
export function AgentCheckpointPanel() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const agents = useGameStore((state) => state.agents);
  const checkpoints = useGameStore((state) => state.checkpoints);
  const quests = useGameStore((state) => state.quests);
  const updateAgent = useGameStore((state) => state.updateAgent);
  const setAgentCheckpoint = useGameStore((state) => state.setAgentCheckpoint);

  const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;
  const currentCheckpoint = selectedAgent?.currentCheckpointId
    ? checkpoints[selectedAgent.currentCheckpointId]
    : null;
  const quest = selectedAgent?.currentQuestId
    ? quests[selectedAgent.currentQuestId]
    : null;

  // Get all checkpoints for this quest
  const questCheckpoints = quest?.checkpointIds?.map(id => checkpoints[id]).filter(Boolean) || [];

  // Find current checkpoint index
  const currentIndex = currentCheckpoint && quest?.checkpointIds
    ? quest.checkpointIds.indexOf(currentCheckpoint.id)
    : -1;

  // Handler to manually advance to next checkpoint
  const handleNextCheckpoint = () => {
    if (!selectedAgent || !quest?.checkpointIds || currentIndex === -1) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex < quest.checkpointIds.length) {
      const nextCheckpointId = quest.checkpointIds[nextIndex];
      const nextCheckpoint = checkpoints[nextCheckpointId];

      if (nextCheckpoint) {
        // Move agent to next checkpoint
        updateAgent(selectedAgent.id, {
          currentCheckpointId: nextCheckpointId,
          currentStepDescription: nextCheckpoint.description,
          targetPosition: nextCheckpoint.position,
          state: 'MOVING',
          currentTask: `Moving to checkpoint ${nextIndex + 1}/${quest.checkpointIds.length}`,
        });

        // Update progress
        if (selectedAgent.executionProgress) {
          useGameStore.getState().updateAgentProgress(selectedAgent.id, {
            currentStep: nextIndex + 1,
            percentComplete: ((nextIndex + 1) / quest.checkpointIds.length) * 100,
          });
        }

        // Set checkpoint as active
        useGameStore.getState().updateCheckpoint(nextCheckpointId, { status: 'active' });
        if (currentCheckpoint) {
          useGameStore.getState().updateCheckpoint(currentCheckpoint.id, { status: 'completed' });
        }
      }
    }
  };

  // Handler to retry current checkpoint
  const handleRetryCheckpoint = () => {
    if (!selectedAgent || !currentCheckpoint) return;

    // Reset agent to checkpoint position
    updateAgent(selectedAgent.id, {
      targetPosition: currentCheckpoint.position,
      state: 'MOVING',
      currentTask: `Retrying checkpoint ${currentIndex + 1}`,
    });

    // Reset checkpoint status
    useGameStore.getState().updateCheckpoint(currentCheckpoint.id, {
      status: 'pending',
      result: undefined,
      actualTokens: undefined,
      completedAt: undefined,
    });
  };

  // Handler to view a specific checkpoint
  const handleViewCheckpoint = (checkpointId: string) => {
    if (!selectedAgent) return;
    setAgentCheckpoint(selectedAgent.id, checkpointId);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-[var(--empire-gold)] hover:bg-yellow-500 text-gray-900 font-bold px-4 py-2 rounded-lg shadow-lg transition-colors"
      >
        📋 Checkpoint Panel
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        className="fixed top-20 right-4 bottom-4 w-96 z-40 bg-gray-900/95 border-2 border-[var(--empire-gold)] rounded-lg shadow-2xl shadow-[var(--empire-gold)]/20 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-[var(--empire-gold)]">
            📋 Checkpoint Panel
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Agent Selector */}
        <div className="p-4 border-b border-gray-700">
          <label className="text-xs text-gray-400 mb-2 block">Select Agent</label>
          <select
            value={selectedAgentId || ''}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
          >
            <option value="">-- Select Agent --</option>
            {Object.values(agents)
              .filter((agent) => agent.currentQuestId)
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} - {agent.state}
                </option>
              ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedAgent ? (
            <div className="text-center text-gray-500 py-8">
              Select an agent to view checkpoint details
            </div>
          ) : (
            <>
              {/* Quest Info */}
              {quest && (
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Quest</div>
                  <div className="text-sm font-semibold text-white">{quest.title}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {questCheckpoints.filter(cp => cp.status === 'completed').length} / {questCheckpoints.length} completed
                  </div>
                </div>
              )}

              {/* Current Checkpoint */}
              {currentCheckpoint && (
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-400">
                      Checkpoint {currentIndex + 1} / {questCheckpoints.length}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      currentCheckpoint.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                      currentCheckpoint.status === 'active' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-gray-600/20 text-gray-400'
                    }`}>
                      {currentCheckpoint.status}
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-white mb-2">
                    {currentCheckpoint.title}
                  </div>

                  <div className="text-xs text-gray-400 mb-3">
                    {currentCheckpoint.description}
                  </div>

                  {/* Checkpoint Result */}
                  {currentCheckpoint.result && (
                    <div className="mt-3 border-t border-gray-700 pt-3">
                      <div className="text-xs text-gray-400 mb-2">Agent Output:</div>
                      <div className="bg-gray-900 rounded p-3 text-xs text-gray-300 max-h-48 overflow-y-auto prose prose-invert prose-sm">
                        <ReactMarkdown>{currentCheckpoint.result}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Token Usage */}
                  {currentCheckpoint.actualTokens && (
                    <div className="mt-3 flex justify-between text-xs text-gray-400">
                      <span>Tokens Used:</span>
                      <span className="text-[var(--empire-gold)]">
                        {currentCheckpoint.actualTokens.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Controls */}
              {currentCheckpoint && (
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-3">Manual Controls</div>
                  <div className="space-y-2">
                    <button
                      onClick={handleNextCheckpoint}
                      disabled={currentIndex >= questCheckpoints.length - 1 || currentCheckpoint.status !== 'completed'}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
                    >
                      ➡️ Next Checkpoint
                    </button>
                    <button
                      onClick={handleRetryCheckpoint}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm"
                    >
                      🔄 Retry Checkpoint
                    </button>
                  </div>
                </div>
              )}

              {/* Checkpoint History */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-3">Checkpoint History</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {questCheckpoints.map((cp, idx) => (
                    <button
                      key={cp.id}
                      onClick={() => handleViewCheckpoint(cp.id)}
                      className={`w-full text-left p-2 rounded transition-colors ${
                        cp.id === currentCheckpoint?.id
                          ? 'bg-[var(--empire-gold)]/20 border border-[var(--empire-gold)]'
                          : 'bg-gray-900 hover:bg-gray-800 border border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Step {idx + 1}</span>
                        <span className={`text-xs ${
                          cp.status === 'completed' ? 'text-green-400' :
                          cp.status === 'active' ? 'text-yellow-400' :
                          'text-gray-500'
                        }`}>
                          {cp.status === 'completed' ? '✓' : cp.status === 'active' ? '⚡' : '○'}
                        </span>
                      </div>
                      <div className="text-xs text-white">{cp.title}</div>
                      {cp.actualTokens && (
                        <div className="text-xs text-gray-500 mt-1">
                          {cp.actualTokens.toLocaleString()} tokens
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
