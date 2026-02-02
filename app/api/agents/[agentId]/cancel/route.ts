/**
 * POST /api/agents/[agentId]/cancel
 *
 * Cancel a running execution using execution tracker.
 */

import { NextRequest, NextResponse } from "next/server";
import { ExecutionTracker } from "@/lib/deepagents-interop";
import { A2AErrorCode } from "@/lib/deepagents-interop/types";

/**
 * POST handler for cancellation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const body = await req.json();
    const { executionId, threadId, checkpointId } = body;

    if (!executionId && !threadId && !checkpointId) {
      return NextResponse.json(
        {
          error: {
            code: A2AErrorCode.INVALID_REQUEST,
            message: "Either executionId, threadId, or checkpointId is required",
          },
        },
        { status: 400 }
      );
    }

    const tracker = ExecutionTracker.getInstance();
    let execution;

    // Find execution
    if (executionId) {
      execution = tracker.getExecution(executionId);
    } else if (threadId) {
      execution = tracker.getExecutionByThread(threadId);
    } else if (checkpointId) {
      execution = tracker.getExecutionByCheckpoint(checkpointId);
    }

    if (!execution) {
      return NextResponse.json(
        {
          error: {
            code: A2AErrorCode.AGENT_NOT_FOUND,
            message: "Execution not found",
          },
        },
        { status: 404 }
      );
    }

    // Verify agent ID matches
    if (execution.agentId !== params.agentId) {
      return NextResponse.json(
        {
          error: {
            code: A2AErrorCode.PERMISSION_DENIED,
            message: "Execution does not belong to this agent",
          },
        },
        { status: 403 }
      );
    }

    // Check if execution is still running
    if (execution.status !== "running") {
      return NextResponse.json(
        {
          error: {
            code: A2AErrorCode.INVALID_REQUEST,
            message: `Cannot cancel execution with status: ${execution.status}`,
          },
        },
        { status: 400 }
      );
    }

    // Attempt to cancel
    const cancelled = tracker.cancelExecution(execution.id);

    if (!cancelled) {
      return NextResponse.json(
        {
          error: {
            code: A2AErrorCode.INTERNAL_ERROR,
            message: "Failed to cancel execution",
          },
        },
        { status: 500 }
      );
    }

    // Return success
    return NextResponse.json({
      executionId: execution.id,
      agentId: execution.agentId,
      threadId: execution.threadId,
      checkpointId: execution.checkpointId,
      status: "cancelled",
      message: "Execution cancelled successfully",
      cancelledAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /cancel endpoint:", error);

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
