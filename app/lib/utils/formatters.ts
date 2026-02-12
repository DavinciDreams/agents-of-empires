/**
 * Format Converters
 *
 * Convert game state (logs, traces, results) to various output formats
 */

import type { LogEntry } from '@/app/components/a2ui/game/store/gameStore'

/**
 * Format logs as JSON
 */
export const logsToJSON = (logs: LogEntry[]): string => {
  return JSON.stringify(logs, null, 2)
}

/**
 * Convert logs to CSV format
 */
export const logsToCSV = (logs: LogEntry[]): string => {
  if (logs.length === 0) {
    return 'id,level,message,timestamp,source\n'
  }

  const headers = ['id', 'level', 'message', 'timestamp', 'source']
  const headerRow = headers.join(',')

  const rows = logs.map((log) =>
    [
      escapeCSV(log.id),
      escapeCSV(log.level),
      escapeCSV(log.message),
      log.timestamp,
      escapeCSV(log.source || '')
    ].join(',')
  )

  return [headerRow, ...rows].join('\n')
}

/**
 * Format logs as plain text with timestamps
 */
export const logsToText = (logs: LogEntry[]): string => {
  if (logs.length === 0) {
    return 'No logs available.\n'
  }

  const lines = logs.map((log) => {
    const timestamp = new Date(log.timestamp).toISOString()
    const level = log.level.toUpperCase().padEnd(7)
    const source = log.source ? `[${log.source}] ` : ''
    return `${timestamp} ${level} ${source}${log.message}`
  })

  return lines.join('\n') + '\n'
}

/**
 * Format trace events as JSON
 */
export const tracesToJSON = (traces: any[]): string => {
  return JSON.stringify(traces, null, 2)
}

/**
 * Convert trace events to CSV format
 */
export const tracesToCSV = (traces: any[]): string => {
  if (traces.length === 0) {
    return 'id,timestamp,type,content,duration\n'
  }

  const headers = ['id', 'timestamp', 'type', 'content', 'duration']
  const headerRow = headers.join(',')

  const rows = traces.map((trace) =>
    [
      escapeCSV(trace.id || ''),
      new Date(trace.timestamp).toISOString(),
      escapeCSV(trace.type || ''),
      escapeCSV(trace.content || ''),
      trace.duration || ''
    ].join(',')
  )

  return [headerRow, ...rows].join('\n')
}

/**
 * Generate markdown report from agent execution result
 */
export const resultToMarkdown = (result: any): string => {
  const lines: string[] = []

  // Title
  lines.push('# Agent Execution Report\n')

  // Metadata
  if (result.metadata) {
    lines.push('## Metadata\n')
    lines.push(`- **Exported At**: ${new Date(result.metadata.exportedAt).toISOString()}`)
    if (result.metadata.agentId) {
      lines.push(`- **Agent ID**: \`${result.metadata.agentId}\``)
    }
    if (result.metadata.questId) {
      lines.push(`- **Quest ID**: \`${result.metadata.questId}\``)
    }
    lines.push('')
  }

  // Summary
  if (result.summary) {
    lines.push('## Summary\n')
    if (typeof result.summary === 'string') {
      lines.push(result.summary)
    } else {
      lines.push(JSON.stringify(result.summary, null, 2))
    }
    lines.push('')
  }

  // Status
  if (result.status) {
    lines.push('## Status\n')
    lines.push(`- **Status**: ${escapeMarkdown(String(result.status))}`)
    lines.push('')
  }

  // Output
  if (result.output) {
    lines.push('## Output\n')
    if (typeof result.output === 'string') {
      lines.push(result.output)
    } else {
      lines.push('```json')
      lines.push(JSON.stringify(result.output, null, 2))
      lines.push('```')
    }
    lines.push('')
  }

  // Execution Details
  if (result.executionDetails) {
    lines.push('## Execution Details\n')
    const details = result.executionDetails
    if (details.totalTime) {
      lines.push(`- **Total Time**: ${details.totalTime}ms`)
    }
    if (details.tokenCount) {
      lines.push(`- **Tokens Used**: ${details.tokenCount}`)
    }
    if (details.stepCount) {
      lines.push(`- **Steps Executed**: ${details.stepCount}`)
    }
    lines.push('')
  }

  // Error (if any)
  if (result.error) {
    lines.push('## Error\n')
    lines.push('```')
    lines.push(String(result.error))
    lines.push('```')
    lines.push('')
  }

  // Raw Result
  if (result.raw) {
    lines.push('## Raw Result\n')
    lines.push('```json')
    lines.push(JSON.stringify(result.raw, null, 2))
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n').trim() + '\n'
}

/**
 * Helper to escape CSV values
 */
function escapeCSV(value: string): string {
  const str = String(value)
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Helper to escape markdown special characters
 */
function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/`/g, '\\`')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Create metadata object for trace exports
 */
export const createTraceMetadata = (
  agentId: string,
  agentName: string,
  traceCount: number
): string => {
  const metadata = {
    exportDate: new Date().toISOString(),
    agentId,
    agentName,
    traceCount,
    version: '1.0.0',
  }
  return JSON.stringify(metadata, null, 2)
}
