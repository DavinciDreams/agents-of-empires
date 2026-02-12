/**
 * GET /api/agents/[agentId]/workspace
 *
 * List files in agent workspace sandbox.
 * Requires E2B sandbox to be active.
 *
 * POST /api/agents/[agentId]/workspace
 *
 * Download specific file from agent workspace.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnsandboxManager } from '@/app/lib/unsandbox/manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET - List files in workspace
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path') || '/home/user'

    const manager = getUnsandboxManager()

    // Check if E2B is available
    if (!manager.isAvailable()) {
      return NextResponse.json(
        {
          error: 'E2B not configured',
          message: 'Set E2B_API_KEY in environment to use workspace features',
        },
        { status: 503 }
      )
    }

    // Get sandbox for agent
    const sandbox = manager.getSandbox(agentId)

    if (!sandbox) {
      return NextResponse.json(
        {
          error: 'Sandbox not found',
          message: 'No active sandbox found for this agent. The agent may need to be executed first.',
        },
        { status: 404 }
      )
    }

    // List files in the specified path
    try {
      const files = await sandbox.files.list(path)

      return NextResponse.json({
        path,
        files: files.map((file) => ({
          name: file.name,
          path: `${path}/${file.name}`,
          type: file.type, // 'file' or 'dir'
          size: file.size,
        })),
        count: files.length,
      })
    } catch (error) {
      console.error('[Workspace API] Error listing files:', error)

      return NextResponse.json(
        {
          error: 'Failed to list files',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Workspace API] Error in GET handler:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Download specific file from workspace
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params
    const body = await request.json()
    const { filePath } = body

    if (!filePath) {
      return NextResponse.json(
        { error: 'filePath is required' },
        { status: 400 }
      )
    }

    const manager = getUnsandboxManager()

    // Check if E2B is available
    if (!manager.isAvailable()) {
      return NextResponse.json(
        {
          error: 'E2B not configured',
          message: 'Set E2B_API_KEY in environment to use workspace features',
        },
        { status: 503 }
      )
    }

    // Get sandbox for agent
    const sandbox = manager.getSandbox(agentId)

    if (!sandbox) {
      return NextResponse.json(
        {
          error: 'Sandbox not found',
          message: 'No active sandbox found for this agent',
        },
        { status: 404 }
      )
    }

    // Read file content
    try {
      const content = await sandbox.files.read(filePath)

      // Extract filename from path
      const filename = filePath.split('/').pop() || 'file.txt'

      // Determine content type based on file extension
      const ext = filename.split('.').pop()?.toLowerCase()
      const contentType = getContentType(ext || '')

      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (error) {
      console.error('[Workspace API] Error reading file:', error)

      return NextResponse.json(
        {
          error: 'Failed to read file',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Workspace API] Error in POST handler:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Helper to determine content type from file extension
 */
function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    js: 'application/javascript',
    ts: 'application/typescript',
    jsx: 'application/javascript',
    tsx: 'application/typescript',
    html: 'text/html',
    css: 'text/css',
    xml: 'application/xml',
    csv: 'text/csv',
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    zip: 'application/zip',
  }

  return contentTypes[ext] || 'application/octet-stream'
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  })
}
