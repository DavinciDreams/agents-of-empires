/**
 * POST /api/agents/[agentId]/ui-stream
 *
 * A2UI Streaming Endpoint
 * Streams declarative UI components as agent executes.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  AgentRegistry,
  ExecutionTracker,
  rateLimiter,
  apiKeyAuth,
  composeMiddleware,
} from "@/app/lib/deepagents-interop";
import { A2UIWrapper } from "@/app/lib/deepagents-interop/a2ui/wrapper";
import { A2AErrorCode } from "@/app/lib/deepagents-interop/types";
import { validateA2ARequest } from "@/app/lib/deepagents-interop/a2a/validator";

// Middleware stack
const middleware = composeMiddleware(
  rateLimiter({
    maxRequests: 60,
    windowMs: 60000,
  }),
  apiKeyAuth({
    required: false,
  })
);

/**
 * POST handler for A2UI streaming
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  // Apply middleware
  const middlewareResult = await middleware(req);
  if (middlewareResult) {
    return middlewareResult;
  }

  try {
    const { agentId } = await params;
    // Parse and validate request
    const body = await req.json();
    const validation = validateA2ARequest(body);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: {
            code: A2AErrorCode.INVALID_REQUEST,
            message: "Invalid request",
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    const a2aRequest = validation.data;

    // Get agent from registry
    const registry = AgentRegistry.getInstance();
    const agent = await registry.getAgent(agentId);

    if (!agent) {
      return NextResponse.json(
        {
          error: {
            code: A2AErrorCode.AGENT_NOT_FOUND,
            message: `Agent not found: ${agentId}`,
          },
        },
        { status: 404 }
      );
    }

    // Generate thread ID if not provided
    const threadId = a2aRequest.config?.threadId || `thread_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    a2aRequest.config = {
      ...a2aRequest.config,
      threadId,
    };

    // Start execution tracking
    const tracker = ExecutionTracker.getInstance();
    const execution = tracker.startExecution(agentId, threadId, a2aRequest);

    // Create A2UI wrapper
    const wrapper = new A2UIWrapper(agent, {
      agentId: agentId,
      enableProgressTracking: true,
      batchUpdates: false,
    });

    // Create readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Stream A2UI messages
          for await (const message of wrapper.stream(a2aRequest, {
            signal: execution.abortController?.signal,
          })) {
            const data = JSON.stringify(message);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }

          // Mark execution as completed
          tracker.completeExecution(execution.id);

          // Send completion event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                executionId: execution.id,
                threadId,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error("Error in ui-stream:", error);

          // Mark execution as failed
          tracker.failExecution(
            execution.id,
            error instanceof Error ? error.message : String(error)
          );

          // Send error event
          const errorData = JSON.stringify({
            type: "error",
            error: {
              code: A2AErrorCode.INTERNAL_ERROR,
              message: error instanceof Error ? error.message : "Unknown error",
            },
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));

          controller.close();
        }
      },

      cancel() {
        // Handle client disconnect
        tracker.cancelExecution(execution.id);
      },
    });

    // Return SSE response
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Execution-ID": execution.id,
        "X-Thread-ID": threadId,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in /ui-stream endpoint:", error);

    return NextResponse.json(
      {
        error: {
          code: A2AErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    },
  });
}
