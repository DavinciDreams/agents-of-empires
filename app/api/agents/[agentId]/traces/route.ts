import { NextRequest, NextResponse } from "next/server";
import { Client } from "langsmith";

// ============================================================================
// LangSmith Traces API
// Fetches execution traces for an agent from LangSmith
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TraceEvent {
  id: string;
  timestamp: number;
  type: 'thought' | 'tool' | 'message' | 'checkpoint' | 'error';
  content: string;
  metadata?: Record<string, any>;
  duration?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const since = searchParams.get("since"); // ISO timestamp

    // Check if LangSmith is configured
    const apiKey = process.env.LANGSMITH_API_KEY;
    if (!apiKey) {
      console.warn("[Traces API] LangSmith not configured, returning empty traces");
      return NextResponse.json({
        traces: [],
        message: "LangSmith not configured. Set LANGSMITH_API_KEY to enable tracing."
      });
    }

    // Initialize LangSmith client
    const client = new Client({
      apiKey,
      apiUrl: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com"
    });

    // Fetch runs for this agent
    // The agentId should map to a LangSmith project or be tagged on runs
    const runs = await client.listRuns({
      projectName: process.env.LANGSMITH_WORKSPACE_ID,
      filter: `eq(metadata."agent_id", "${agentId}")`,
      limit,
      // @ts-ignore - LangSmith types might be outdated
      startTime: since ? new Date(since) : undefined,
    });

    // Transform LangSmith runs into our TraceEvent format
    const traces: TraceEvent[] = [];

    for await (const run of runs) {
      // Determine event type based on run type
      let eventType: TraceEvent['type'] = 'message';
      if (run.run_type === 'tool') {
        eventType = 'tool';
      } else if (run.run_type === 'chain' && run.name?.includes('think')) {
        eventType = 'thought';
      } else if (run.error) {
        eventType = 'error';
      } else if (run.name?.includes('checkpoint')) {
        eventType = 'checkpoint';
      }

      // Calculate duration
      const duration = run.end_time && run.start_time
        ? new Date(run.end_time).getTime() - new Date(run.start_time).getTime()
        : undefined;

      traces.push({
        id: run.id,
        timestamp: run.start_time ? new Date(run.start_time).getTime() : Date.now(),
        type: eventType,
        content: run.error || run.inputs?.input || run.outputs?.output || run.name || 'Processing...',
        metadata: {
          run_type: run.run_type,
          name: run.name,
          status: run.error ? 'error' : (run.end_time ? 'completed' : 'running'),
          inputs: run.inputs,
          outputs: run.outputs,
          tags: run.tags,
        },
        duration
      });
    }

    // Sort by timestamp descending (newest first)
    traces.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      traces,
      count: traces.length,
      agent_id: agentId,
    });

  } catch (error) {
    console.error("[Traces API] Error fetching traces:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch traces",
        message: error instanceof Error ? error.message : "Unknown error",
        traces: []
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Stream traces in real-time using Server-Sent Events (SSE)
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const apiKey = process.env.LANGSMITH_API_KEY;

      if (!apiKey) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "LangSmith not configured" })}\n\n`));
        controller.close();
        return;
      }

      const client = new Client({
        apiKey,
        apiUrl: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com"
      });

      // Poll for new traces every 2 seconds
      const interval = setInterval(async () => {
        try {
          const runs = await client.listRuns({
            projectName: process.env.LANGSMITH_WORKSPACE_ID,
            filter: `eq(metadata."agent_id", "${agentId}")`,
            limit: 10,
          });

          for await (const run of runs) {
            if (!run.end_time) {
              // Ongoing run - send update
              const event = {
                id: run.id,
                timestamp: run.start_time ? new Date(run.start_time).getTime() : Date.now(),
                type: run.run_type === 'tool' ? 'tool' : 'thought',
                content: run.inputs?.input || run.name || 'Processing...',
                metadata: { status: 'running' }
              };

              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
          }
        } catch (error) {
          console.error("[Traces Stream] Error:", error);
        }
      }, 2000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
