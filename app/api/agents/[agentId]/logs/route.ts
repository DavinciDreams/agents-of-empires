/**
 * GET /api/agents/[agentId]/logs
 *
 * Get execution logs for a specific agent with filtering and pagination.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db/client'
import { logsToCSV, logsToText } from '@/app/lib/utils/formatters'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const searchParams = request.nextUrl.searchParams

    // Parse query parameters
    const executionId = searchParams.get('executionId') || undefined
    const level = searchParams.get('level') || undefined
    const source = searchParams.get('source') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)
    const offset = parseInt(searchParams.get('offset') || '0')
    const format = searchParams.get('format') || 'json'

    // Build where clause
    const where: any = {
      agentId,
    }

    if (executionId) {
      where.executionId = executionId
    }

    if (level) {
      where.level = level
    }

    if (source) {
      where.source = source
    }

    // Fetch logs
    const logs = await prisma.executionLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    })

    // Format based on request
    if (format === 'json') {
      return NextResponse.json({
        logs,
        count: logs.length,
        limit,
        offset,
      })
    } else if (format === 'csv') {
      const csv = logsToCSV(
        logs.map((log) => ({
          id: log.id,
          level: log.level,
          message: log.message,
          timestamp: log.timestamp.getTime(),
          source: log.source || '',
        }))
      )

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="logs-${agentId}.csv"`,
        },
      })
    } else if (format === 'text') {
      const text = logsToText(
        logs.map((log) => ({
          id: log.id,
          level: log.level,
          message: log.message,
          timestamp: log.timestamp.getTime(),
          source: log.source || '',
        }))
      )

      return new Response(text, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="logs-${agentId}.txt"`,
        },
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: json, csv, text' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[Logs API] Error fetching logs:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch logs',
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
