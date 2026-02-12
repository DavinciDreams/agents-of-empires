/**
 * ZIP File Creation Utilities
 *
 * Bundle multiple export files into a single ZIP archive
 */

import JSZip from 'jszip'
import {
  logsToJSON,
  logsToCSV,
  logsToText,
  tracesToJSON,
  tracesToCSV,
  resultToMarkdown
} from './formatters'

export interface ZipContentData {
  logs: any[]
  traces: any[]
  result: any
  metadata?: {
    exportedAt: number
    agentId?: string
    questId?: string
  }
}

/**
 * Create a ZIP file containing all export formats
 *
 * The resulting ZIP will contain:
 * - logs.json (structured log data)
 * - logs.csv (CSV formatted logs)
 * - logs.txt (plain text logs with timestamps)
 * - traces.json (structured trace events)
 * - traces.csv (CSV formatted traces)
 * - result.md (markdown formatted report)
 * - metadata.json (export metadata)
 *
 * @param data - Object containing logs, traces, result, and optional metadata
 * @returns Promise<Blob> - ZIP file as Blob for download
 */
export const createResultZip = async (data: ZipContentData): Promise<Blob> => {
  const zip = new JSZip()

  // Create logs folder
  const logsFolder = zip.folder('logs')
  if (logsFolder) {
    logsFolder.file('logs.json', logsToJSON(data.logs))
    logsFolder.file('logs.csv', logsToCSV(data.logs))
    logsFolder.file('logs.txt', logsToText(data.logs))
  }

  // Create traces folder
  const tracesFolder = zip.folder('traces')
  if (tracesFolder) {
    tracesFolder.file('traces.json', tracesToJSON(data.traces))
    tracesFolder.file('traces.csv', tracesToCSV(data.traces))
  }

  // Add result as markdown in root
  zip.file('result.md', resultToMarkdown(data.result))

  // Add metadata
  if (data.metadata) {
    zip.file(
      'metadata.json',
      JSON.stringify(data.metadata, null, 2)
    )
  }

  // Add a README
  zip.file('README.txt', createZipReadme())

  // Generate and return ZIP
  return await zip.generateAsync({ type: 'blob' })
}

/**
 * Create a README file for the ZIP contents
 */
function createZipReadme(): string {
  return `Agent Execution Export
======================

This ZIP file contains a complete export of agent execution results.

Contents:
---------

logs/
  - logs.json: Structured log entries (JSON format)
  - logs.csv: Logs in CSV format for spreadsheet import
  - logs.txt: Plain text logs with timestamps

traces/
  - traces.json: Execution trace events (JSON format)
  - traces.csv: Trace events in CSV format

result.md: Formatted execution report (Markdown)
metadata.json: Export metadata and timestamps
README.txt: This file

Usage:
------

- Open result.md in any markdown viewer or text editor
- Import logs.csv and traces.csv into Excel, Google Sheets, or similar
- Load .json files into your preferred JSON viewer
- Use the metadata.json to track when this export was created

Generated: ${new Date().toISOString()}
`
}

/**
 * Advanced: Create ZIP with custom folder structure
 *
 * @param structure - Object defining folder structure and files
 * @returns Promise<Blob> - ZIP file as Blob
 */
export const createCustomZip = async (
  structure: Record<string, any>
): Promise<Blob> => {
  const zip = new JSZip()

  const addToZip = (
    folder: JSZip,
    obj: any,
    basePath: string = ''
  ) => {
    for (const [key, value] of Object.entries(obj)) {
      const path = basePath ? `${basePath}/${key}` : key

      if (value instanceof Blob) {
        folder.file(key, value)
      } else if (typeof value === 'string') {
        folder.file(key, value)
      } else if (typeof value === 'object' && value !== null) {
        // Check if it's a file-like object
        if ('data' in value && 'name' in value) {
          folder.file(value.name as string, value.data as string)
        } else {
          // It's a folder structure
          const subfolder = folder.folder(key)
          if (subfolder) {
            addToZip(subfolder, value, '')
          }
        }
      }
    }
  }

  addToZip(zip, structure)
  return await zip.generateAsync({ type: 'blob' })
}

/**
 * Download ZIP file to client
 *
 * @param blob - ZIP file as Blob
 * @param filename - Name for downloaded file
 */
export const downloadZip = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Create and download ZIP in one step
 */
export const createAndDownloadZip = async (
  data: ZipContentData,
  filename: string = 'agent-export.zip'
) => {
  const blob = await createResultZip(data)
  downloadZip(blob, filename)
}
