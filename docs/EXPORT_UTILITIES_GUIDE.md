# Export/Download Utilities Guide

Phase D: Client-side utilities for downloading agent results in multiple formats.

## Overview

The export utilities provide a complete solution for exporting agent execution data in multiple formats:

- **JSON**: Raw data structures for programmatic processing
- **CSV**: Tabular format for spreadsheet applications
- **Markdown**: Formatted reports for documentation
- **ZIP**: Complete bundled exports containing all formats

## Directory Structure

```
app/lib/
├── types/
│   └── export.ts          # Type definitions
├── utils/
│   ├── download.ts        # Download utilities
│   ├── formatters.ts      # Format converters
│   ├── zip.ts             # ZIP bundling
│   └── index.ts           # Re-exports
```

## Types

### ExportFormat

```typescript
type ExportFormat = 'json' | 'csv' | 'txt' | 'md' | 'zip'
```

Supported export formats.

### ExportOptions

```typescript
interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeMetadata?: boolean
}
```

Configuration for export operations.

### ExportData

```typescript
interface ExportData {
  logs: any[]
  traces: any[]
  result: any
  metadata?: {
    exportedAt: number
    agentId?: string
    questId?: string
  }
}
```

Complete export data structure.

## Download Utilities

### downloadJSON()

Download data as a JSON file.

```typescript
import { downloadJSON } from '@/lib/utils'

const agentData = {
  name: 'Agent-1',
  status: 'completed',
  result: '...'
}

downloadJSON(agentData, 'agent-data.json')
```

### downloadText()

Download plain text content.

```typescript
import { downloadText } from '@/lib/utils'

const logContent = 'Agent started execution...\nAgent completed task...'
downloadText(logContent, 'execution-log.txt')
```

### downloadMarkdown()

Download markdown formatted content.

```typescript
import { downloadMarkdown } from '@/lib/utils'

const report = '# Execution Report\n\n## Results\n...'
downloadMarkdown(report, 'report.md')
```

### downloadCSV()

Download tabular data as CSV.

```typescript
import { downloadCSV } from '@/lib/utils'

const logs = [
  { timestamp: '2024-01-01T12:00:00Z', level: 'info', message: 'Started' },
  { timestamp: '2024-01-01T12:00:05Z', level: 'success', message: 'Completed' }
]

downloadCSV(logs, 'logs.csv')
```

## Format Converters

### Logs Formatters

Convert LogEntry[] to different formats:

```typescript
import { logsToJSON, logsToCSV, logsToText } from '@/lib/utils'

const logs = [
  { id: '1', level: 'info', message: 'Test', timestamp: Date.now() }
]

// JSON format
const jsonStr = logsToJSON(logs)

// CSV format
const csvStr = logsToCSV(logs)

// Plain text with timestamps
const textStr = logsToText(logs)
```

### Traces Formatters

Convert trace events to different formats:

```typescript
import { tracesToJSON, tracesToCSV } from '@/lib/utils'

const traces = [
  { timestamp: Date.now(), type: 'execution', agentId: 'a1', status: 'success' }
]

// JSON format
const jsonStr = tracesToJSON(traces)

// CSV format
const csvStr = tracesToCSV(traces)
```

### Result Formatter

Generate a formatted markdown report:

```typescript
import { resultToMarkdown } from '@/lib/utils'

const result = {
  status: 'completed',
  summary: 'Task executed successfully',
  output: { result: '...' },
  executionDetails: {
    totalTime: 5000,
    tokenCount: 2500,
    stepCount: 10
  },
  metadata: {
    exportedAt: Date.now(),
    agentId: 'agent-1'
  }
}

const markdown = resultToMarkdown(result)
```

The markdown report includes:
- Title and metadata
- Summary section
- Status
- Output (formatted as code block if JSON)
- Execution details (time, tokens, steps)
- Error information (if any)
- Raw result data

## ZIP Utilities

### createResultZip()

Bundle all export formats into a ZIP file.

```typescript
import { createResultZip, downloadZip } from '@/lib/utils'

const exportData = {
  logs: [...],
  traces: [...],
  result: { ... },
  metadata: {
    exportedAt: Date.now(),
    agentId: 'agent-1'
  }
}

const zipBlob = await createResultZip(exportData)
downloadZip(zipBlob, 'agent-export.zip')
```

The ZIP contains:
```
agent-export/
├── logs/
│   ├── logs.json
│   ├── logs.csv
│   └── logs.txt
├── traces/
│   ├── traces.json
│   └── traces.csv
├── result.md
├── metadata.json
└── README.txt
```

### createAndDownloadZip()

Create and download ZIP in a single call:

```typescript
import { createAndDownloadZip } from '@/lib/utils'

const exportData = { logs, traces, result, metadata }
await createAndDownloadZip(exportData, 'execution-results.zip')
```

### createCustomZip()

Create ZIP with custom folder structure:

```typescript
import { createCustomZip } from '@/lib/utils'

const structure = {
  'logs.json': JSON.stringify(logs),
  'results': {
    'summary.md': '# Summary\n...',
    'details.json': JSON.stringify(details)
  }
}

const zipBlob = await createCustomZip(structure)
```

## Component Integration Example

```typescript
'use client'

import { useState } from 'react'
import { useGameStore } from '@/components/a2ui/game/store/gameStore'
import { createAndDownloadZip, downloadJSON, downloadCSV } from '@/lib/utils'

export function ExportPanel() {
  const logs = useGameStore((state) => state.logs)
  const [isLoading, setIsLoading] = useState(false)

  const handleExportJSON = () => {
    downloadJSON(logs, `logs-${Date.now()}.json`)
  }

  const handleExportCSV = () => {
    downloadCSV(logs, `logs-${Date.now()}.csv`)
  }

  const handleExportZip = async () => {
    setIsLoading(true)
    try {
      const exportData = {
        logs,
        traces: [],
        result: { status: 'completed' },
        metadata: {
          exportedAt: Date.now()
        }
      }
      await createAndDownloadZip(exportData)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="export-panel">
      <h3>Export Results</h3>
      <button onClick={handleExportJSON}>Export as JSON</button>
      <button onClick={handleExportCSV}>Export as CSV</button>
      <button onClick={handleExportZip} disabled={isLoading}>
        {isLoading ? 'Creating ZIP...' : 'Export as ZIP'}
      </button>
    </div>
  )
}
```

## API Reference

### Download Functions

```typescript
// All these functions trigger a browser download
downloadJSON(data: any, filename: string): void
downloadText(text: string, filename: string): void
downloadMarkdown(content: string, filename: string): void
downloadCSV(data: any[], filename: string, headers?: string[]): void
```

### Formatter Functions

```typescript
// All return formatted strings
logsToJSON(logs: LogEntry[]): string
logsToCSV(logs: LogEntry[]): string
logsToText(logs: LogEntry[]): string
tracesToJSON(traces: any[]): string
tracesToCSV(traces: any[]): string
resultToMarkdown(result: any): string
```

### ZIP Functions

```typescript
// Async functions that return Blobs
createResultZip(data: ZipContentData): Promise<Blob>
createCustomZip(structure: Record<string, any>): Promise<Blob>

// Synchronous download
downloadZip(blob: Blob, filename: string): void

// Combined async function
createAndDownloadZip(data: ZipContentData, filename?: string): Promise<void>
```

## Dependencies

- **jszip** ^3.10.1: ZIP file creation

## Features

- Type-safe TypeScript implementations
- Support for multiple export formats
- Automatic file download with proper MIME types
- CSV special character escaping
- Markdown report generation with proper formatting
- ZIP bundling with organized folder structure
- README file included in ZIP exports
- Metadata tracking for all exports
- Efficient blob-based file creation
- Memory cleanup (URL.revokeObjectURL)

## Error Handling

All functions are designed for client-side use. ZIP creation is async to prevent blocking the UI:

```typescript
try {
  const zipBlob = await createResultZip(exportData)
  downloadZip(zipBlob, 'results.zip')
} catch (error) {
  console.error('Export failed:', error)
  // Show user-facing error message
}
```

## Browser Compatibility

- All modern browsers (Chrome, Firefox, Safari, Edge)
- Requires Blob and URL.createObjectURL support
- CSV downloads: All browsers
- ZIP downloads: All browsers with jszip support

## Performance Considerations

- CSV conversion is O(n) where n is number of records
- ZIP creation is async and shouldn't block UI
- Memory is cleaned up after download via URL.revokeObjectURL
- Large datasets (>100K records) may benefit from streaming approaches

## Future Enhancements

Potential additions:
- Excel (.xlsx) export via exceljs
- PDF export via pdfkit
- Streaming ZIP creation for large datasets
- Server-side export endpoint
- Export scheduling/automation
- Compression options for ZIP files
