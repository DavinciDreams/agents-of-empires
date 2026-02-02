/**
 * A2A Client Example
 *
 * Demonstrates how to invoke an agent using the A2A protocol.
 */

import type { A2ARequest, A2AResponse } from "@/app/lib/deepagents-interop/types";

const BASE_URL = "http://localhost:3000";
const AGENT_ID = "default";

/**
 * Example 1: Synchronous invocation
 */
async function invokeAgentSync() {
  const request: A2ARequest = {
    task: "What is the capital of France?",
    config: {
      recursionLimit: 10,
      temperature: 0,
    },
  };

  const response = await fetch(`${BASE_URL}/api/agents/${AGENT_ID}/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const result: A2AResponse = await response.json();

  console.log("=== Synchronous Invocation ===");
  console.log("Status:", result.status);
  console.log("Execution Time:", result.metadata.executionTime, "ms");

  if (result.status === "success" && result.result) {
    console.log("\nMessages:");
    result.result.messages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}]: ${msg.content}`);
    });

    if (result.result.todos && result.result.todos.length > 0) {
      console.log("\nTodos:");
      result.result.todos.forEach((todo, i) => {
        console.log(`  ${i + 1}. [${todo.status}] ${todo.content}`);
      });
    }
  } else if (result.status === "error") {
    console.error("\nError:", result.error);
  }

  return result;
}

/**
 * Example 2: Streaming invocation
 */
async function invokeAgentStream() {
  const request: A2ARequest = {
    task: "Write a short poem about AI agents",
    config: {
      streaming: true,
      recursionLimit: 10,
    },
  };

  console.log("\n=== Streaming Invocation ===");

  const response = await fetch(`${BASE_URL}/api/agents/${AGENT_ID}/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.body) {
    console.error("No response body");
    return;
  }

  // Parse Server-Sent Events
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    // Decode chunk
    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE messages
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || ""; // Keep incomplete message in buffer

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.substring(6);
        try {
          const event = JSON.parse(data);
          handleStreamEvent(event);
        } catch (error) {
          console.error("Failed to parse event:", error);
        }
      }
    }
  }
}

/**
 * Handle stream event
 */
function handleStreamEvent(event: any) {
  switch (event.type) {
    case "start":
      console.log("🚀 Stream started", event.data);
      break;

    case "token":
      process.stdout.write(event.data.token);
      break;

    case "tool_start":
      console.log("\n🔧 Tool:", event.data.toolName);
      break;

    case "tool_end":
      console.log("✅ Tool completed");
      break;

    case "message":
      console.log("\n💬 Message:", event.data.messages);
      break;

    case "state_update":
      console.log("\n📊 State update:", event.data.key);
      break;

    case "error":
      console.error("\n❌ Error:", event.data);
      break;

    case "end":
      console.log("\n\n✨ Stream ended (", event.data.duration, "ms)");
      break;
  }
}

/**
 * Example 3: Get agent card
 */
async function getAgentCard() {
  const response = await fetch(`${BASE_URL}/.well-known/agent-card.json`);
  const card = await response.json();

  console.log("\n=== Agent Card ===");
  console.log("Name:", card.name);
  console.log("Description:", card.description);
  console.log("Version:", card.version);
  console.log("\nCapabilities:");
  console.log("  - Planning:", card.capabilities.planning);
  console.log("  - Memory:", card.capabilities.memory);
  console.log("  - Streaming:", card.capabilities.streaming);
  console.log("  - Tools:", card.capabilities.tools.length);
  console.log("\nProtocols:");
  console.log("  - A2A:", card.protocols.a2a.version);
  console.log("  - A2UI:", card.protocols.a2ui?.version);

  return card;
}

/**
 * Run all examples
 */
async function main() {
  try {
    // Get agent card
    await getAgentCard();

    // Synchronous invocation
    await invokeAgentSync();

    // Streaming invocation
    await invokeAgentStream();
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { invokeAgentSync, invokeAgentStream, getAgentCard };
