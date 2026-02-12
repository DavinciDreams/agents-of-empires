'use client';

import { useRef, useState } from 'react';
import { useGameStore } from '@/app/components/a2ui/game/store';

interface ChatCommanderProps {
  compact?: boolean;
}

export function ChatCommander({ compact = false }: ChatCommanderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRef.current) return;

    const command = inputRef.current.value.trim();
    if (!command) return;

    setIsGenerating(true);
    setError(null);

    try {
      // Get everything from store at submit time only
      const store = useGameStore.getState();
      const selectedAgentIds = store.selectedAgentIds;

      // Log quest generation start
      store.addLog('info', `🚀 Starting quest generation: "${command}"`, 'client');

      const startTime = Date.now();
      const response = await fetch('/api/quests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          agentIds: Array.from(selectedAgentIds)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        store.addLog('error', `Quest generation failed: ${errorData.error}`, 'api');
        throw new Error(errorData.error || 'Failed to generate quest');
      }

      const { quest, checkpoints } = await response.json();
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      // Add to game state
      const addedQuest = store.addQuest(quest);
      checkpoints.forEach((cp: any) => store.addCheckpoint(cp));

      // Auto-assign to selected agents if any
      if (selectedAgentIds.size > 0) {
        store.assignQuestToAgents(addedQuest.id, Array.from(selectedAgentIds));
        store.addLog('success', `✅ Quest "${quest.title}" created with ${checkpoints.length} checkpoints (${duration}s) - Assigned to ${selectedAgentIds.size} agent(s)`, 'client');
      } else {
        store.addLog('success', `✅ Quest "${quest.title}" created with ${checkpoints.length} checkpoints (${duration}s)`, 'client');
      }

      // Clear input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to generate quest:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate quest';
      setError(errorMessage);
      const store = useGameStore.getState();
      store.addLog('error', `❌ ${errorMessage}`, 'client');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className={compact ? "w-full" : "fixed bottom-20 left-1/2 -translate-x-1/2 w-[600px] z-50"}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {isGenerating && (
          <div className="flex items-center justify-center gap-3 px-4 py-2 bg-blue-900/80 border border-blue-500 rounded-lg text-blue-100 text-sm font-medium">
            <div className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
            <span>Generating quest with LLM...</span>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Command your agents... (e.g., 'Build a login page')"
            className="flex-1 px-4 py-3 bg-gray-900/95 border-2 border-[var(--empire-gold)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-0"
            disabled={isGenerating}
            autoComplete="off"
            spellCheck="false"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="px-6 py-3 bg-[var(--empire-gold)] text-gray-900 font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? '⏳' : '🚀'}
          </button>
        </div>
        {error && (
          <div className="text-sm text-red-400 text-center bg-red-900/20 border border-red-600 rounded px-3 py-2">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
