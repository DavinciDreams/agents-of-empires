# Phase D: Quick Start Guide

## Installation

All dependencies are already installed:
```bash
pnpm install  # jszip is already included
```

## Basic Usage

### Download JSON
```typescript
import { downloadJSON } from '@/lib/utils'

downloadJSON({ data: 'value' }, 'export.json')
```

### Download CSV
```typescript
import { downloadCSV, logsToCSV } from '@/lib/utils'

const logs = [...]
const csv = logsToCSV(logs)
downloadCSV(csv, 'logs.csv')
```

### Download as Markdown
```typescript
import { resultToMarkdown, downloadMarkdown } from '@/lib/utils'

const result = { status: 'success', output: '...' }
const md = resultToMarkdown(result)
downloadMarkdown(md, 'report.md')
```

### Download ZIP with Multiple Files
```typescript
import { downloadZIP } from '@/lib/utils'

const files = {
  'logs.json': JSON.stringify(logs),
  'report.md': markdownContent,
  'data.csv': csvContent
}

await downloadZIP(files, 'export.zip')
```

### One-Step ZIP Export
```typescript
import { createResultZip, downloadZip } from '@/lib/utils/zip'

const data = {
  logs: [],
  traces: [],
  result: { status: 'completed' },
  metadata: { exportedAt: Date.now() }
}

const blob = await createResultZip(data)
downloadZip(blob, 'results.zip')
```

## Files Reference

```
app/
├── lib/
│   ├── types/
│   │   └── export.ts              # Type definitions
│   └── utils/
│       ├── download.ts            # Download functions
│       ├── formatters.ts          # Format converters
│       ├── zip.ts                 # ZIP utilities
│       └── index.ts               # Re-exports
└── docs/
    ├── EXPORT_UTILITIES_GUIDE.md  # Complete documentation
    ├── EXPORT_COMPONENT_EXAMPLE.md # React component examples
    ├── PHASE_D_SUMMARY.md         # Implementation details
    └── PHASE_D_QUICK_START.md     # This file
```

## Export Types

| Type | Function | Format |
|------|----------|--------|
| JSON | `downloadJSON()` | Structured data |
| CSV | `downloadCSV()` | Spreadsheet compatible |
| Text | `downloadText()` | Plain text |
| Markdown | `downloadMarkdown()` | Formatted document |
| ZIP | `downloadZIP()` | Multiple files |

## Format Converters

| Source | Function | Output |
|--------|----------|--------|
| LogEntry[] | `logsToJSON()` | JSON string |
| LogEntry[] | `logsToCSV()` | CSV string |
| LogEntry[] | `logsToText()` | Text string |
| TraceEvent[] | `tracesToJSON()` | JSON string |
| TraceEvent[] | `tracesToCSV()` | CSV string |
| Result Object | `resultToMarkdown()` | Markdown string |

## Common Patterns

### Pattern 1: Simple Download
```typescript
const handleDownload = () => {
  const data = useGameStore((state) => state.logs)
  downloadJSON(data, 'logs.json')
}
```

### Pattern 2: Format Selection
```typescript
const handleExport = (format: 'json' | 'csv') => {
  const logs = useGameStore((state) => state.logs)
  if (format === 'json') {
    downloadJSON(logs, 'logs.json')
  } else {
    const csv = logsToCSV(logs)
    downloadCSV(csv, 'logs.csv')
  }
}
```

### Pattern 3: ZIP with Progress
```typescript
const handleZipExport = async () => {
  setLoading(true)
  try {
    const data = { logs, traces, result }
    await createAndDownloadZip(data)
  } finally {
    setLoading(false)
  }
}
```

### Pattern 4: With Metadata
```typescript
const handleCompleteExport = async () => {
  const exportData = {
    logs: useGameStore.getState().logs,
    traces: getTraces(),
    result: { status: 'completed' },
    metadata: {
      exportedAt: Date.now(),
      agentId: selectedAgent.id,
      questId: activeQuest.id
    }
  }
  await createAndDownloadZip(exportData, 'complete-export.zip')
}
```

## Type Definitions

```typescript
type ExportFormat = 'json' | 'csv' | 'txt' | 'md' | 'zip'

interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeMetadata?: boolean
}

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

## Error Handling

```typescript
try {
  const logs = useGameStore.getState().logs
  downloadJSON(logs, 'logs.json')
  useGameStore.getState().addLog('success', 'Export complete', 'system')
} catch (error) {
  console.error('Export failed:', error)
  useGameStore.getState().addLog('error', `Export failed: ${error}`, 'system')
}
```

## Performance Tips

- JSON: Best for small to medium datasets
- CSV: Best for importing to spreadsheets
- Text: Best for logs and text content
- ZIP: Best for bundling multiple files
- For large datasets (>100K items), use ZIP to compress

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Important Notes

1. All downloads are client-side only
2. No data is sent to servers
3. Downloads trigger automatically via browser
4. Large exports may take a few seconds
5. ZIP requires jszip library (already installed)

## Integration Examples

### LogsViewer
Already integrated! Uses JSON, CSV, and text export.

### IntelligenceBureau
Already integrated! Uses traces export with ZIP bundling.

### Custom Component
```typescript
import { downloadJSON, downloadCSV } from '@/lib/utils'

export function MyExportButton() {
  const logs = useGameStore((state) => state.logs)

  return (
    <>
      <button onClick={() => downloadJSON(logs, 'logs.json')}>
        Export JSON
      </button>
      <button onClick={() => {
        const csv = logsToCSV(logs)
        downloadCSV(csv, 'logs.csv')
      }}>
        Export CSV
      </button>
    </>
  )
}
```

## Next Steps

1. Review `/docs/EXPORT_UTILITIES_GUIDE.md` for complete API reference
2. See `/docs/EXPORT_COMPONENT_EXAMPLE.md` for full component examples
3. Check how LogsViewer and IntelligenceBureau use the utilities
4. Add custom export buttons to your components
5. Integrate with your UI/UX design

## Troubleshooting

**Downloads not triggering?**
- Check browser console for errors
- Ensure blob is created correctly
- Verify filename is not empty

**ZIP creation fails?**
- Check jszip is imported correctly
- Verify files object has valid content
- Check browser supports ZIP (all modern ones do)

**Character encoding issues?**
- CSV special characters are automatically escaped
- Markdown special characters are properly escaped
- Use UTF-8 compatible files

## Support Files

- Documentation: `/docs/EXPORT_UTILITIES_GUIDE.md`
- Components: `/docs/EXPORT_COMPONENT_EXAMPLE.md`
- Summary: `/docs/PHASE_D_SUMMARY.md`
- Source: `/app/lib/utils/`
