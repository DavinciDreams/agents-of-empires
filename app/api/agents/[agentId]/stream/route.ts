/**
 * POST /api/agents/[agentId]/stream
 *
 * Streaming agent invocation endpoint for A2A protocol.
 * Returns Server-Sent Events (SSE) stream.
 */

import { NextRequest } from "next/server";
import { A2AWrapper, validateA2ARequest } from "@/app/lib/deepagents-interop";
import { A2AErrorCode } from "@/app/lib/deepagents-interop/types";
import { AgentRegistry } from "@/app/lib/deepagents-interop/a2a/registry";
import { createGameTools, mapEquippedToolToEnabledTools } from "@/app/lib/deepagents-interop/tools";

/**
 * POST handler for streaming agent invocation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    // Parse request body
    const body = await req.json();

    // Validate A2A request
    const validation = validateA2ARequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: {
            code: A2AErrorCode.INVALID_REQUEST,
            message: "Invalid request format",
            details: { errors: validation.errors },
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const a2aRequest = validation.data;

    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          status: "error",
          error: {
            code: A2AErrorCode.INTERNAL_ERROR,
            message: "API key not configured",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get or create agent from registry
    const registry = AgentRegistry.getInstance();

    let agent;
    try {
      // Try to get existing agent from cache
      agent = await registry.getAgent(agentId);
    } catch (error) {
      // Agent not found in registry, register and create it
      const agentConfig = (a2aRequest.context?.agentConfig || {}) as {
        name?: string;
        description?: string;
        systemPrompt?: string;
        equippedTool?: { id: string; name: string; type: string };
      };
      const model = a2aRequest.config?.model || "claude-sonnet-4-20250514";
      const temperature = a2aRequest.config?.temperature ?? 0;

      // Map equipped tool to enabled tools
      const enabledTools = agentConfig.equippedTool
        ? mapEquippedToolToEnabledTools(agentConfig.equippedTool)
        : ["file_read", "file_write", "list_files"];

      // Create game tools for this agent
      const tools = createGameTools(agentId, enabledTools);

      // Register agent configuration
      registry.register({
        id: agentId,
        name: agentConfig.name || `Agent-${agentId.slice(0, 6)}`,
        description: agentConfig.description || "A game agent",
        model: {
          provider: "anthropic",
          name: model,
          temperature,
          apiKey,
        },
        systemPrompt: agentConfig.systemPrompt ||
          "You are a helpful AI agent in a game world. You can use tools to read/write files, search for information, and complete quests. Work collaboratively with other agents to achieve goals.",
        tools,
        backend: "store", // Use store backend for persistent memory
        checkpointer: true,
        memory: ["conversation_history"], // Enable memory
      });

      // Get the newly created agent
      agent = await registry.getAgent(agentId);
    }

    // Wrap with A2A protocol
    const wrapper = new A2AWrapper(agent, {
      agentId: agentId,
      verbose: process.env.NODE_ENV === "development",
    });

    // Create a ReadableStream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Add thread_id to config for conversation persistence
          const streamConfig = {
            ...a2aRequest,
            config: {
              ...a2aRequest.config,
              configurable: {
                thread_id: a2aRequest.config?.threadId || agentId,
                checkpoint_id: a2aRequest.config?.checkpointId,
              },
            },
          };

          // Stream events from agent
          for await (const event of wrapper.stream(streamConfig)) {
            // Format as SSE
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Close stream
          controller.close();
        } catch (error) {
          console.error("Error in stream:", error);

          // Send error event
          const errorEvent = {
            type: "error",
            data: {
              code: A2AErrorCode.EXECUTION_FAILED,
              message: error instanceof Error ? error.message : "Unknown error",
            },
            timestamp: new Date().toISOString(),
          };

          const data = `data: ${JSON.stringify(errorEvent)}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.close();
        }
      },
    });

    // Return SSE stream
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error in /stream endpoint:", error);

    return new Response(
      JSON.stringify({
        status: "error",
        error: {
          code: A2AErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
