/**
 * GET /api/agents/[agentId]/results
 *
 * List all execution results for a specific agent with pagination and filtering.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db/client'

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || undefined
    const questId = searchParams.get('questId') || undefined

    // Build where clause
    const where: any = {
      agentId,
    }

    if (status) {
      where.status = status
    }

    if (questId) {
      where.questId = questId
    }

    // Fetch results with pagination
    const [results, total] = await Promise.all([
      prisma.agentResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          agentId: true,
          checkpointId: true,
          questId: true,
          status: true,
          createdAt: true,
          completedAt: true,
          metadata: true,
          // Don't include full result in list view for performance
        },
      }),
      prisma.agentResult.count({ where }),
    ])

    return NextResponse.json({
      results,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('[Results API] Error fetching results:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch results',
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
