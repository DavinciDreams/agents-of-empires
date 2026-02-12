# Export Component Example

Complete working example of how to implement export functionality in a React component using Phase D utilities.

## Simple Export Panel Component

```typescript
'use client'

import React, { useState } from 'react'
import { useGameStore } from '@/components/a2ui/game/store/gameStore'
import {
  downloadJSON,
  downloadCSV,
  downloadZIP,
  logsToCSV,
  logsToText,
  logsToJSON,
  downloadMarkdown,
  resultToMarkdown
} from '@/lib/utils'

interface ExportPanelProps {
  agentId?: string
  questId?: string
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  agentId,
  questId
}) => {
  const logs = useGameStore((state) => state.logs)
  const agents = useGameStore((state) => state.agents)
  const [isExporting, setIsExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'text' | 'zip'>('json')

  const agent = agentId ? agents[agentId] : null

  const handleExportLogs = async () => {
    if (logs.length === 0) {
      alert('No logs to export')
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = agentId
        ? `logs-${agentId.slice(0, 8)}-${timestamp}`
        : `logs-${timestamp}`

      switch (exportFormat) {
        case 'json':
          downloadJSON(logs, `${filename}.json`)
          break

        case 'csv':
          const csv = logsToCSV(logs)
          downloadCSV(csv, `${filename}.csv`)
          break

        case 'text':
          const text = logsToText(logs)
          downloadMarkdown(text, `${filename}.txt`)
          break

        case 'zip':
          await handleExportZip(filename)
          break
      }

      // Add log entry for export
      useGameStore.getState().addLog(
        'success',
        `Exported ${logs.length} logs as ${exportFormat.toUpperCase()}`,
        'export-system'
      )
    } catch (error) {
      console.error('Export failed:', error)
      useGameStore.getState().addLog(
        'error',
        `Failed to export logs: ${error}`,
        'export-system'
      )
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportZip = async (baseFilename: string) => {
    try {
      // Build export data
      const csv = logsToCSV(logs)
      const json = logsToJSON(logs)
      const text = logsToText(logs)

      const result = {
        summary: 'Agent Execution Export',
        status: 'completed',
        logCount: logs.length,
        agentId: agentId,
        questId: questId,
        exportedAt: new Date().toISOString()
      }

      const markdown = resultToMarkdown(result)

      // Create ZIP with all formats
      const files: Record<string, string> = {
        'logs.json': json,
        'logs.csv': csv,
        'logs.txt': text,
        'report.md': markdown,
        'metadata.json': JSON.stringify({
          exportDate: new Date().toISOString(),
          agentId,
          questId,
          logCount: logs.length
        }, null, 2)
      }

      await downloadZIP(files, `${baseFilename}.zip`)
    } catch (error) {
      console.error('ZIP export failed:', error)
      throw error
    }
  }

  const handleExportAll = async () => {
    if (!agent) {
      alert('Please select an agent first')
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `agent-${agent.id.slice(0, 8)}-${timestamp}`

      // Prepare complete export data
      const result = {
        agent: {
          id: agent.id,
          name: agent.name,
          level: agent.level,
          state: agent.state,
          position: agent.position
        },
        summary: `Agent ${agent.name} execution report`,
        status: agent.state === 'ERROR' ? 'failed' : 'completed',
        tokenUsage: agent.tokenUsage,
        progress: agent.executionProgress,
        metadata: {
          exportedAt: Date.now(),
          agentId: agent.id,
          agentName: agent.name
        }
      }

      const files: Record<string, string> = {
        'logs.json': logsToJSON(logs),
        'logs.csv': logsToCSV(logs),
        'logs.txt': logsToText(logs),
        'report.md': resultToMarkdown(result),
        'metadata.json': JSON.stringify(result.metadata, null, 2)
      }

      await downloadZIP(files, `${filename}-complete.zip`)

      useGameStore.getState().addLog(
        'success',
        `Complete export created for ${agent.name}`,
        'export-system'
      )
    } catch (error) {
      console.error('Complete export failed:', error)
      useGameStore.getState().addLog(
        'error',
        `Failed to create complete export: ${error}`,
        'export-system'
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="export-panel p-4 bg-slate-900 rounded border border-blue-500">
      <h3 className="text-lg font-bold text-blue-300 mb-4">Export Options</h3>

      <div className="space-y-3">
        {/* Format Selector */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">
            Export Format:
          </label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-800 border border-blue-500 rounded text-white"
          >
            <option value="json">JSON (Structured)</option>
            <option value="csv">CSV (Spreadsheet)</option>
            <option value="text">Text (Plain Text)</option>
            <option value="zip">ZIP (All Formats)</option>
          </select>
        </div>

        {/* Quick Export Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleExportLogs}
            disabled={isExporting || logs.length === 0}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold transition"
          >
            {isExporting ? 'Exporting...' : `Export Logs (${logs.length})`}
          </button>

          {agent && (
            <button
              onClick={handleExportAll}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-semibold transition"
            >
              {isExporting ? 'Exporting...' : `Complete Export: ${agent.name}`}
            </button>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-gray-400 mt-4">
          {logs.length} logs available for export
          {agent && ` | Agent: ${agent.name}`}
          {questId && ` | Quest: ${questId.slice(0, 8)}...`}
        </p>
      </div>
    </div>
  )
}
```

## Usage in Parent Component

```typescript
import { ExportPanel } from '@/components/ExportPanel'

export function GameInterface() {
  const selectedAgentId = useGameStore((state) => {
    const ids = state.selectedAgentIds
    return ids.size > 0 ? Array.from(ids)[0] : undefined
  })

  return (
    <div className="game-ui">
      <ExportPanel
        agentId={selectedAgentId}
        questId={activeQuestId}
      />
    </div>
  )
}
```

## Advanced: Export with Progress

```typescript
export const AdvancedExportPanel: React.FC = () => {
  const [progress, setProgress] = useState(0)
  const [isExporting, setIsExporting] = useState(false)

  const handleExportWithProgress = async () => {
    setIsExporting(true)
    setProgress(0)

    try {
      // Step 1: Prepare logs (20%)
      setProgress(20)
      const logs = useGameStore.getState().logs
      const csv = logsToCSV(logs)

      // Step 2: Format results (40%)
      setProgress(40)
      const result = { /* ... */ }
      const markdown = resultToMarkdown(result)

      // Step 3: Create ZIP (60%)
      setProgress(60)
      const files = {
        'logs.csv': csv,
        'report.md': markdown
      }

      // Step 4: Download (80%)
      setProgress(80)
      await downloadZIP(files, `export-${Date.now()}.zip`)

      // Step 5: Complete (100%)
      setProgress(100)
      setTimeout(() => {
        setProgress(0)
        setIsExporting(false)
      }, 500)
    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
      setProgress(0)
    }
  }

  return (
    <div>
      <button onClick={handleExportWithProgress} disabled={isExporting}>
        Export with Progress
      </button>
      {isExporting && (
        <div className="w-full bg-gray-700 rounded h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {isExporting && <p className="text-sm mt-1">{progress}% Complete</p>}
    </div>
  )
}
```

## Integration with Game Store

The utilities integrate seamlessly with the game store's log system:

```typescript
// Somewhere in your game logic
const addLog = useGameStore.getState().addLog

try {
  // Do something
  addLog('info', 'Task started', 'agent')
} catch (error) {
  addLog('error', `Failed: ${error}`, 'agent')
}

// Then export all logs
const logs = useGameStore.getState().logs
downloadJSON(logs, 'game-logs.json')
```

## TypeScript Interface Usage

```typescript
import type { ExportOptions, ExportData } from '@/lib/types/export'

const exportOptions: ExportOptions = {
  format: 'zip',
  filename: 'my-export',
  includeMetadata: true
}

const exportData: ExportData = {
  logs: [],
  traces: [],
  result: { /* ... */ },
  metadata: {
    exportedAt: Date.now(),
    agentId: 'agent-123'
  }
}
```

## Tips and Best Practices

1. **Large Exports**: ZIP format is best for large datasets
2. **Spreadsheet Import**: Use CSV format for Excel/Sheets
3. **Documentation**: Markdown format for reports
4. **Metadata**: Always include export timestamp and context
5. **Error Handling**: Wrap exports in try-catch and log failures
6. **User Feedback**: Show progress for large exports
7. **File Naming**: Include timestamp and context in filenames
8. **Cleanup**: URL.revokeObjectURL is handled automatically

## Browser Compatibility

All modern browsers support:
- Blob API
- URL.createObjectURL
- Download mechanism
- jszip for ZIP creation

Tested on:
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+
