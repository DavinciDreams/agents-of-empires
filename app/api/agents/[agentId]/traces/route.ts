import { NextRequest, NextResponse } from "next/server";
import { Client } from "langsmith";
import { prisma } from '@/app/lib/db/client';
import { tracesToCSV } from '@/app/lib/utils/formatters';

// ============================================================================
// Traces API
// Fetches execution traces for an agent from database and/or LangSmith
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
    const limit = parseInt(searchParams.get("limit") || "100");
    const executionId = searchParams.get("executionId");
    const since = searchParams.get("since"); // ISO timestamp
    const source = searchParams.get("source") || "database"; // database, langsmith, or both
    const format = searchParams.get("format") || "json"; // json or csv

    let traces: TraceEvent[] = [];

    // Fetch from database
    if (source === "database" || source === "both") {
      const where: any = { agentId };

      if (executionId) {
        where.executionId = executionId;
      }

      if (since) {
        where.timestamp = {
          gte: new Date(since),
        };
      }

      const dbTraces = await prisma.agentTrace.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      traces = dbTraces.map((trace) => ({
        id: trace.id,
        timestamp: trace.timestamp.getTime(),
        type: trace.type as TraceEvent['type'],
        content: trace.content,
        metadata: trace.metadata as Record<string, any> | undefined,
        duration: trace.duration || undefined,
      }));
    }

    // Optionally fetch from LangSmith as well
    if (source === "langsmith" || source === "both") {
      const apiKey = process.env.LANGSMITH_API_KEY;

      if (apiKey) {
        try {
          const client = new Client({
            apiKey,
            apiUrl: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com"
          });

          const runs = await client.listRuns({
            projectName: process.env.LANGSMITH_WORKSPACE_ID,
            filter: `eq(metadata."agent_id", "${agentId}")`,
            limit,
            // @ts-ignore - LangSmith types might be outdated
            startTime: since ? new Date(since) : undefined,
          });

          for await (const run of runs) {
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
                source: 'langsmith',
              },
              duration
            });
          }
        } catch (error) {
          console.warn("[Traces API] Error fetching from LangSmith:", error);
          // Continue with database traces only
        }
      } else if (source === "langsmith") {
        console.warn("[Traces API] LangSmith not configured");
      }
    }

    // Sort by timestamp descending (newest first)
    traces.sort((a, b) => b.timestamp - a.timestamp);

    // Format response
    if (format === "json") {
      return NextResponse.json({
        traces,
        count: traces.length,
        agent_id: agentId,
      });
    } else if (format === "csv") {
      const csv = tracesToCSV(traces);

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="traces-${agentId}.csv"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid format. Supported formats: json, csv' },
        { status: 400 }
      );
    }

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
