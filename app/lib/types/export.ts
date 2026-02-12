/**
 * Export/Download Type Definitions
 *
 * Defines types for exporting agent results in multiple formats
 */

export type ExportFormat = 'json' | 'csv' | 'txt' | 'md' | 'zip'

export interface ExportOptions {
  format: ExportFormat
  filename?: string
  includeMetadata?: boolean
}

export interface ExportData {
  logs: any[]
  traces: any[]
  result: any
  metadata?: {
    exportedAt: number
    agentId?: string
    questId?: string
  }
}
