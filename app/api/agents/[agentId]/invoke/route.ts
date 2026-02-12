/**
 * POST /api/agents/[agentId]/invoke
 *
 * Synchronous agent invocation endpoint for A2A protocol.
 * Enhanced with registry, execution tracking, rate limiting, and auth.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  A2AWrapper,
  validateA2ARequest,
  sanitizeResponse,
  AgentRegistry,
  ExecutionTracker,
  rateLimiter,
  apiKeyAuth,
  composeMiddleware,
} from "@/app/lib/deepagents-interop";
import { A2AErrorCode } from "@/app/lib/deepagents-interop/types";

// Initialize middleware
const middleware = composeMiddleware(
  // Rate limiting: 60 requests per minute
  rateLimiter({
    maxRequests: 60,
    windowMs: 60000,
  }),
  // API key authentication (optional by default)
  apiKeyAuth({
    headerName: "X-API-Key",
    required: false,
  })
);

/**
 * POST handler for agent invocation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const startTime = Date.now();

  try {
    const { agentId } = await params;

    // Apply middleware
    const middlewareResponse = await middleware(req);
    if (middlewareResponse) {
      return middlewareResponse;
    }

    // Parse request body
    const body = await req.json();

    // Validate A2A request
    const validation = validateA2ARequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          status: "error",
          error: {
            code: A2AErrorCode.INVALID_REQUEST,
            message: "Invalid request format",
            details: { errors: validation.errors },
          },
          metadata: {
            executionTime: Date.now() - startTime,
            agentId: agentId,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const a2aRequest = validation.data;

    // Get agent from registry (with caching)
    const registry = AgentRegistry.getInstance();
    const agent = await registry.getAgent(agentId);

    // Generate thread ID if not provided
    const threadId =
      a2aRequest.config?.threadId ||
      `thread_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Track execution
    const tracker = ExecutionTracker.getInstance();
    const execution = await tracker.startExecution(
      agentId,
      threadId,
      a2aRequest
    );

    try {
      // Wrap agent with A2A protocol
      const wrapper = new A2AWrapper(agent, {
        agentId: agentId,
        verbose: process.env.NODE_ENV === "development",
      });

      // Invoke agent
      const response = await wrapper.invoke(a2aRequest);

      // Mark execution as complete
      await tracker.completeExecution((await execution).id, response.metadata.checkpointId);

      // Sanitize response
      const sanitized = sanitizeResponse(response);

      // Return response
      return NextResponse.json(sanitized, {
        status: response.status === "success" ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
          "X-Execution-ID": execution.id,
          "X-Thread-ID": threadId,
        },
      });
    } catch (error) {
      // Mark execution as failed
      tracker.failExecution(
        execution.id,
        error instanceof Error ? error.message : "Unknown error"
      );
      throw error;
    }
  } catch (error) {
    console.error("Error in /invoke endpoint:", error);

    // Extract agentId from params (might not be available if error occurred early)
    let agentId: string | undefined;
    try {
      agentId = (await params).agentId;
    } catch {
      agentId = undefined;
    }

    return NextResponse.json(
      {
        status: "error",
        error: {
          code: A2AErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        metadata: {
          executionTime: Date.now() - startTime,
          agentId: agentId,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    },
  });
}
