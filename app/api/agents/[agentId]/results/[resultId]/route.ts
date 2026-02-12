/**
 * GET /api/agents/[agentId]/results/[resultId]
 *
 * Get a specific agent execution result with various export formats.
 * Supports json, markdown, csv, and zip formats.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db/client'
import { resultToMarkdown, tracesToCSV, logsToCSV } from '@/app/lib/utils/formatters'
import { createResultZip } from '@/app/lib/utils/zip'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; resultId: string }> }
) {
  try {
    const { agentId, resultId } = await params
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json'
    const includeTraces = searchParams.get('includeTraces') === 'true'
    const includeLogs = searchParams.get('includeLogs') === 'true'

    // Fetch result from database
    const result = await prisma.agentResult.findUnique({
      where: { id: resultId },
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Result not found' },
        { status: 404 }
      )
    }

    // Verify agent ID matches
    if (result.agentId !== agentId) {
      return NextResponse.json(
        { error: 'Result does not belong to this agent' },
        { status: 403 }
      )
    }

    // Parse result JSON
    let parsedResult: any
    try {
      parsedResult = JSON.parse(result.result)
    } catch {
      parsedResult = { raw: result.result }
    }

    // Fetch related data if requested
    let logs: any[] = []
    let traces: any[] = []

    if (includeLogs || format === 'zip') {
      logs = await prisma.executionLog.findMany({
        where: {
          agentId: result.agentId,
          // executionId would need to be stored in metadata or as a separate field
        },
        orderBy: { timestamp: 'asc' },
        take: 1000,
      })
    }

    if (includeTraces || format === 'zip') {
      traces = await prisma.agentTrace.findMany({
        where: {
          agentId: result.agentId,
        },
        orderBy: { timestamp: 'asc' },
        take: 1000,
      })
    }

    // Format based on request
    if (format === 'json') {
      return NextResponse.json({
        id: result.id,
        agentId: result.agentId,
        checkpointId: result.checkpointId,
        questId: result.questId,
        status: result.status,
        createdAt: result.createdAt,
        completedAt: result.completedAt,
        result: parsedResult,
        metadata: result.metadata,
        ...(includeLogs && { logs }),
        ...(includeTraces && { traces }),
      })
    } else if (format === 'md' || format === 'markdown') {
      const markdown = resultToMarkdown({
        ...parsedResult,
        metadata: {
          ...(typeof result.metadata === 'object' && result.metadata !== null ? result.metadata as Record<string, unknown> : {}),
          exportedAt: new Date().toISOString(),
          agentId: result.agentId,
          questId: result.questId,
          resultId: result.id,
        },
        status: result.status,
      })

      return new Response(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="result-${resultId}.md"`,
        },
      })
    } else if (format === 'csv') {
      // For CSV, we'll export traces if available
      const csv = traces.length > 0
        ? tracesToCSV(traces)
        : logsToCSV(logs)

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="result-${resultId}.csv"`,
        },
      })
    } else if (format === 'zip') {
      // Create ZIP with result, logs, traces
      const zipData = {
        result: {
          ...parsedResult,
          metadata: result.metadata,
          status: result.status,
        },
        logs: logs.map((log) => ({
          id: log.id,
          level: log.level,
          message: log.message,
          timestamp: log.timestamp.getTime(),
          source: log.source || '',
        })),
        traces: traces.map((trace) => ({
          id: trace.id,
          timestamp: trace.timestamp.getTime(),
          type: trace.type,
          content: trace.content,
          duration: trace.duration,
          metadata: trace.metadata,
        })),
        metadata: {
          exportedAt: Date.now(),
          agentId: result.agentId,
          questId: result.questId || undefined,
          resultId: result.id,
        },
      }

      const zip = await createResultZip(zipData)

      // Convert Blob to Buffer for Node.js Response
      const buffer = Buffer.from(await zip.arrayBuffer())

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="result-${resultId}.zip"`,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: json, md, csv, zip' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[Result API] Error fetching result:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch result',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  })
}
