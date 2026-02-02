/**
 * Agent Card Generation Example
 *
 * Demonstrates how to generate an agent card from a DeepAgent configuration.
 */

import { createDeepAgent } from "deepagents";
import { tool } from "langchain";
import { z } from "zod";
import { generateAgentCard, extractCapabilities } from "@/app/lib/deepagents-interop";
import type { SubAgent } from "deepagents";

// Example: Create a simple tool
const weatherTool = tool(
  async ({ city }: { city: string }) => {
    return `The weather in ${city} is sunny.`;
  },
  {
    name: "get_weather",
    description: "Get the current weather in a city",
    schema: z.object({
      city: z.string().describe("The city to get weather for"),
    }),
  }
);

// Example: Define a subagent
const researchSubagent: SubAgent = {
  name: "research-agent",
  description: "Specialized agent for deep research tasks",
  systemPrompt: "You are an expert researcher focused on finding accurate information.",
  tools: [],
  model: "gpt-4o",
};

// Example: Create a DeepAgent
const agent = createDeepAgent({
  tools: [weatherTool],
  subagents: [researchSubagent],
  systemPrompt: "You are a helpful assistant with weather information and research capabilities.",
  model: "claude-sonnet-4-20250514",
  checkpointer: true,
});

// Example: Generate an agent card
const agentCard = generateAgentCard({
  config: {
    tools: [weatherTool],
    subagents: [researchSubagent],
    checkpointer: true,
  },
  agentId: "example-agent",
  name: "Weather & Research Agent",
  description: "An agent that provides weather information and conducts research",
  version: "1.0.0",
  baseUrl: "http://localhost:3000",
  model: "claude-sonnet-4-20250514",
  metadata: {
    author: {
      name: "Example Team",
      email: "team@example.com",
    },
    license: "MIT",
    keywords: ["weather", "research", "deepagents"],
  },
  a2uiComponents: [
    "Card",
    "Text",
    "Button",
    "TaskList",
    "ToolResult",
  ],
});

// Print the agent card
console.log("Generated Agent Card:");
console.log(JSON.stringify(agentCard, null, 2));

// Example: Extract capabilities only
const capabilities = extractCapabilities({
  tools: [weatherTool],
  subagents: [researchSubagent],
  checkpointer: true,
});

console.log("\nExtracted Capabilities:");
console.log(JSON.stringify(capabilities, null, 2));

export { agentCard, capabilities };
