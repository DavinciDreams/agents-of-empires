'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/app/components/a2ui/game/store';
import type { LogLevel } from '@/app/components/a2ui/game/store';
import { DropdownButton } from '@/app/components/a2ui/components/DropdownButton';
import { downloadJSON, downloadCSV, downloadText } from '@/app/lib/utils/download';
import { logsToCSV, logsToText } from '@/app/lib/utils/formatters';

const LOG_COLORS: Record<LogLevel, string> = {
  info: 'text-blue-300',
  warn: 'text-yellow-300',
  error: 'text-red-300',
  debug: 'text-gray-400',
  success: 'text-green-300',
};

const LOG_ICONS: Record<LogLevel, string> = {
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  debug: '🔍',
  success: '✅',
};

export function LogsViewer() {
  const logs = useGameStore((state) => state.logs);
  const logsVisible = useGameStore((state) => state.logsVisible);
  const toggleLogsVisible = useGameStore((state) => state.toggleLogsVisible);
  const clearLogs = useGameStore((state) => state.clearLogs);

  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Keyboard shortcut: Shift+L to toggle logs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'L') {
        e.preventDefault();
        toggleLogsVisible();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLogsVisible]);

  // Add initial log on mount
  useEffect(() => {
    const addLog = useGameStore.getState().addLog;
    addLog('info', '📋 Logging system initialized. Press Shift+L to toggle logs.', 'system');
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current && shouldAutoScroll.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // Track if user is scrolling manually
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
      shouldAutoScroll.current = isAtBottom;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // Handle download in various formats
  const handleDownload = (format: string) => {
    if (logs.length === 0) {
      const addLog = useGameStore.getState().addLog;
      addLog('warn', 'No logs available to download', 'system');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `logs-${timestamp}`;

    switch (format) {
      case 'json':
        downloadJSON(logs, `${filename}.json`);
        break;
      case 'csv':
        const csv = logsToCSV(logs);
        downloadCSV(csv, `${filename}.csv`);
        break;
      case 'txt':
        const txt = logsToText(logs);
        downloadText(txt, `${filename}.txt`);
        break;
    }

    const addLog = useGameStore.getState().addLog;
    addLog('success', `Downloaded ${logs.length} logs as ${format.toUpperCase()}`, 'system');
  };

  if (!logsVisible) {
    return (
      <button
        onClick={toggleLogsVisible}
        className="fixed bottom-4 left-[calc(50%+10rem)] z-50 px-4 py-2 bg-gray-800/90 hover:bg-gray-700/90 border-2 border-gray-600 rounded-lg text-white font-mono text-sm transition-colors"
        title="Show logs (Shift+L)"
      >
        📋 Logs ({logs.length})
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-[600px] h-[300px] bg-gray-900/95 border-2 border-gray-600 rounded-lg shadow-2xl flex flex-col"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-600 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-white font-mono text-sm font-bold">📋 Live Logs</span>
          <span className="text-gray-400 font-mono text-xs">({logs.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownButton
            label="Download"
            icon="💾"
            options={[
              { value: 'json', label: 'JSON', icon: '📄' },
              { value: 'csv', label: 'CSV', icon: '📊' },
              { value: 'txt', label: 'TXT', icon: '📝' },
            ]}
            onSelect={handleDownload}
            disabled={logs.length === 0}
          />
          <button
            onClick={clearLogs}
            className="px-2 py-1 bg-red-600/80 hover:bg-red-500 text-white text-xs font-mono rounded transition-colors"
            title="Clear logs"
          >
            Clear
          </button>
          <button
            onClick={toggleLogsVisible}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-mono rounded transition-colors"
            title="Hide logs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Logs container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No logs yet...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 py-1 border-b border-gray-800/50">
              <span className="flex-shrink-0 text-gray-500">{formatTime(log.timestamp)}</span>
              <span className="flex-shrink-0">{LOG_ICONS[log.level]}</span>
              {log.source && (
                <span className="flex-shrink-0 text-cyan-400">[{log.source}]</span>
              )}
              <span className={`flex-1 ${LOG_COLORS[log.level]} break-words`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer tip */}
      <div className="px-4 py-1 bg-gray-800 border-t border-gray-600 rounded-b-lg">
        <p className="text-gray-500 text-xs font-mono">
          {shouldAutoScroll.current ? '🔄 Auto-scrolling' : '⏸️ Scroll to bottom to resume auto-scroll'}
        </p>
      </div>
    </div>
  );
}
