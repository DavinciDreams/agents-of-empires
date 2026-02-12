/**
 * Download Utilities
 *
 * Client-side utilities for downloading files in various formats
 */

import JSZip from 'jszip'

/**
 * Download data as JSON file
 * @param data - Object or array to serialize
 * @param filename - Name of the downloaded file
 */
export const downloadJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  })
  downloadBlob(blob, filename)
}

/**
 * Download plain text file
 * @param text - Text content
 * @param filename - Name of the downloaded file
 */
export const downloadText = (text: string, filename: string) => {
  const blob = new Blob([text], { type: 'text/plain' })
  downloadBlob(blob, filename)
}

/**
 * Download markdown file
 * @param content - Markdown content
 * @param filename - Name of the downloaded file
 */
export const downloadMarkdown = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown' })
  downloadBlob(blob, filename)
}

/**
 * Download CSV file
 * @param data - Array of objects to convert to CSV, or pre-formatted CSV string
 * @param filename - Name of the downloaded file
 * @param headers - Optional custom header names (defaults to object keys)
 */
export const downloadCSV = (
  data: any[] | string,
  filename: string,
  headers?: string[]
) => {
  const csv = typeof data === 'string' ? data : convertToCSV(data, headers)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

/**
 * Download ZIP file
 * Can accept either a Blob or an object of files to zip
 * @param data - Blob object or Record<string, string> mapping filenames to contents
 * @param filename - Name of the downloaded file
 */
export const downloadZIP = async (
  data: Blob | Record<string, string>,
  filename: string
): Promise<void> => {
  let blob: Blob

  if (data instanceof Blob) {
    // Already a Blob, just download it
    blob = data
  } else {
    // Object of files - create a ZIP
    const zip = new JSZip()
    Object.entries(data).forEach(([name, content]) => {
      zip.file(name, content)
    })
    blob = await zip.generateAsync({ type: 'blob' })
  }

  downloadBlob(blob, filename)
}

/**
 * Internal helper to create download link and trigger download
 */
const downloadBlob = (blob: Blob, filename: string) => {
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
 * Convert array of objects to CSV format
 */
function convertToCSV(
  data: any[],
  customHeaders?: string[]
): string {
  if (data.length === 0) {
    return ''
  }

  // Get headers from first object or use custom headers
  const headers = customHeaders || Object.keys(data[0])

  // Create header row
  const headerRow = headers
    .map(escapeCSVValue)
    .join(',')

  // Create data rows
  const rows = data.map((obj) =>
    headers
      .map((header) => {
        const value = obj[header]
        return escapeCSVValue(formatValue(value))
      })
      .join(',')
  )

  return [headerRow, ...rows].join('\n')
}

/**
 * Escape CSV values that contain special characters
 */
function escapeCSVValue(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Format value for CSV output
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}
