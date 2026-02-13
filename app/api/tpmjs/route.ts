import { NextRequest, NextResponse } from 'next/server';

/**
 * TPMJS API Proxy
 *
 * This backend route acts as a secure proxy to the TPMJS API,
 * keeping the API key server-side and preventing client-side exposure.
 */

const TPMJS_API_KEY = process.env.TPMJS_API_KEY;
const TPMJS_BASE_URL = 'https://tpmjs.com/api';
const REQUEST_TIMEOUT_MS = 10000;

if (!TPMJS_API_KEY) {
  console.error('TPMJS_API_KEY environment variable is not set');
}

// Helper to validate API key on startup
function validateApiKey() {
  if (!TPMJS_API_KEY || TPMJS_API_KEY === 'your-api-key-here') {
    throw new Error('TPMJS API key not configured. Please set TPMJS_API_KEY in your .env file.');
  }
}

/**
 * GET /api/tpmjs
 * Proxies GET requests to TPMJS API (search, list, details)
 */
export async function GET(request: NextRequest) {
  try {
    validateApiKey();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    let endpoint = '';

    switch (action) {
      case 'search': {
        const query = searchParams.get('q');
        const limit = searchParams.get('limit') || '20';
        if (!query) {
          return NextResponse.json(
            { error: 'Missing query parameter for search' },
            { status: 400 }
          );
        }
        endpoint = `/tools/search?q=${encodeURIComponent(query)}&limit=${limit}`;
        break;
      }

      case 'list': {
        const category = searchParams.get('category');
        const official = searchParams.get('official');
        const limit = searchParams.get('limit') || '20';
        const offset = searchParams.get('offset') || '0';

        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (official) params.append('official', official);
        params.append('limit', limit);
        params.append('offset', offset);

        endpoint = `/tools?${params.toString()}`;
        break;
      }

      case 'details': {
        const packageName = searchParams.get('package');
        const toolName = searchParams.get('tool');
        if (!packageName || !toolName) {
          return NextResponse.json(
            { error: 'Missing package or tool parameter for details' },
            { status: 400 }
          );
        }
        endpoint = `/tools/${encodeURIComponent(packageName)}/${encodeURIComponent(toolName)}`;
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${TPMJS_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${TPMJS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return NextResponse.json(
          { error: `TPMJS API error: ${errorText}` },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Normalize TPMJS response format to match our interface
      if (data.results?.tools) {
        data.results.tools = data.results.tools.map((tool: any) => ({
          package: tool.package?.npmPackageName || 'unknown',
          toolName: tool.name || 'unknown',
          description: tool.description || '',
          category: tool.package?.category || 'general',
          downloads: tool.package?.npmDownloadsLastMonth || 0,
          qualityScore: parseFloat(tool.qualityScore || '0') * 100,
          official: tool.package?.isOfficial || false,
          inputSchema: tool.inputSchema || {},
          healthStatus: tool.importHealth === 'HEALTHY' && tool.executionHealth === 'HEALTHY'
            ? 'healthy'
            : tool.importHealth === 'BROKEN' || tool.executionHealth === 'BROKEN'
            ? 'down'
            : 'degraded',
          version: tool.package?.npmVersion || '1.0.0',
        }));
      }

      // Forward rate limit headers
      const headers = new Headers();
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');
      const limit = response.headers.get('X-RateLimit-Limit');

      if (remaining) headers.set('X-RateLimit-Remaining', remaining);
      if (reset) headers.set('X-RateLimit-Reset', reset);
      if (limit) headers.set('X-RateLimit-Limit', limit);

      return NextResponse.json(data, { headers });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: `Request timeout after ${REQUEST_TIMEOUT_MS}ms` },
          { status: 408 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('TPMJS proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tpmjs
 * Proxies POST requests to TPMJS API (tool execution)
 */
export async function POST(request: NextRequest) {
  try {
    validateApiKey();

    const body = await request.json();
    const { action, packageName, toolName, params } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    if (action !== 'execute') {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    if (!packageName || !toolName) {
      return NextResponse.json(
        { error: 'Missing packageName or toolName for execution' },
        { status: 400 }
      );
    }

    // Validate params
    if (!params || typeof params !== 'object') {
      return NextResponse.json(
        { error: 'Invalid params: must be an object' },
        { status: 400 }
      );
    }

    const endpoint = `/tools/execute/${encodeURIComponent(packageName)}/${encodeURIComponent(toolName)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${TPMJS_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TPMJS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return NextResponse.json(
          { error: `TPMJS API error: ${errorText}` },
          { status: response.status }
        );
      }

      // For streaming responses, pipe through
      if (response.body) {
        return new NextResponse(response.body, {
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
          },
        });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: `Request timeout after ${REQUEST_TIMEOUT_MS}ms` },
          { status: 408 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('TPMJS proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
