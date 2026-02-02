/**
 * Agent Card Endpoint
 *
 * Serves the agent card at /.well-known/agent-card.json
 * This is the standard location for A2A agent discovery.
 */

import { NextResponse } from "next/server";
import { generateAgentCard } from "@/app/lib/deepagents-interop";
import type { DeepAgentConfig } from "@/app/lib/deepagents-interop";

/**
 * GET /.well-known/agent-card.json
 *
 * Returns the agent card for this deployment.
 */
export async function GET() {
  try {
    // Get the base URL from environment or request
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Define the default agent configuration
    // In a real app, this would come from your agent setup
    const agentConfig: DeepAgentConfig = {
      tools: [], // Will be populated with actual tools
      subagents: [], // Will be populated with actual subagents
      skills: [], // Will be populated with actual skills
      memory: [], // Will be populated with memory files
      checkpointer: true, // Enable checkpointing for conversation persistence
    };

    // Generate the agent card
    const agentCard = generateAgentCard({
      config: agentConfig,
      agentId: "default",
      name: "Agents of Empire",
      description:
        "A DeepAgent powered by LangGraph with cross-platform compatibility for Microsoft Agent Framework via A2A and A2UI protocols",
      version: "1.0.0",
      baseUrl,
      model: "claude-sonnet-4-20250514",
      metadata: {
        author: {
          name: "Agents of Empire Team",
        },
        license: "MIT",
        keywords: [
          "ai",
          "agents",
          "deepagents",
          "langgraph",
          "a2a",
          "a2ui",
          "microsoft-agent-framework",
        ],
      },
    });

    // Return the agent card
    return NextResponse.json(agentCard, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating agent card:", error);

    return NextResponse.json(
      {
        error: "Failed to generate agent card",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /.well-known/agent-card.json
 *
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
