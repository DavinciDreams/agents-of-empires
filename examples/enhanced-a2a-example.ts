/**
 * Enhanced A2A Client Example
 *
 * Demonstrates all enhanced features:
 * - Agent Registry
 * - Execution Tracking
 * - Status Checking
 * - Cancellation
 * - Rate Limiting
 * - Authentication
 */

const BASE_URL = "http://localhost:3000";
const API_KEY = process.env.A2A_API_KEY; // Optional

/**
 * Example 1: Using different agents from registry
 */
async function useMultipleAgents() {
  console.log("=== Using Multiple Agents ===\n");

  // Use default agent
  const defaultResponse = await fetch(`${BASE_URL}/api/agents/default/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY && { "X-API-Key": API_KEY }),
    },
    body: JSON.stringify({
      task: "What is 2+2?",
    }),
  });

  const defaultResult = await defaultResponse.json();
  console.log("Default Agent:", defaultResult.result?.messages[1]?.content);

  // Use research agent
  const researchResponse = await fetch(`${BASE_URL}/api/agents/research/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY && { "X-API-Key": API_KEY }),
    },
    body: JSON.stringify({
      task: "Explain quantum computing",
    }),
  });

  const researchResult = await researchResponse.json();
  console.log("\nResearch Agent:", researchResult.result?.messages[1]?.content);

  // Use creative agent
  const creativeResponse = await fetch(`${BASE_URL}/api/agents/creative/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY && { "X-API-Key": API_KEY }),
    },
    body: JSON.stringify({
      task: "Write a haiku about coding",
    }),
  });

  const creativeResult = await creativeResponse.json();
  console.log("\nCreative Agent:", creativeResult.result?.messages[1]?.content);
}

/**
 * Example 2: Track execution status
 */
async function trackExecution() {
  console.log("\n=== Execution Tracking ===\n");

  // Start execution
  const response = await fetch(`${BASE_URL}/api/agents/default/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY && { "X-API-Key": API_KEY }),
    },
    body: JSON.stringify({
      task: "Count slowly from 1 to 5",
      config: { threadId: "my-thread-123" },
    }),
  });

  // Get execution ID from headers
  const executionId = response.headers.get("X-Execution-ID");
  const threadId = response.headers.get("X-Thread-ID");

  console.log("Execution ID:", executionId);
  console.log("Thread ID:", threadId);

  // Check status by execution ID
  if (executionId) {
    const statusResponse = await fetch(
      `${BASE_URL}/api/agents/default/status?executionId=${executionId}`,
      {
        headers: {
          ...(API_KEY && { "X-API-Key": API_KEY }),
        },
      }
    );

    const status = await statusResponse.json();
    console.log("\nExecution Status:", status);
  }

  // Check status by thread ID
  if (threadId) {
    const statusResponse = await fetch(
      `${BASE_URL}/api/agents/default/status?threadId=${threadId}`,
      {
        headers: {
          ...(API_KEY && { "X-API-Key": API_KEY }),
        },
      }
    );

    const status = await statusResponse.json();
    console.log("\nStatus by Thread:", status);
  }
}

/**
 * Example 3: Cancel execution
 */
async function cancelExecution() {
  console.log("\n=== Execution Cancellation ===\n");

  // Note: This is a demonstration - actual cancellation requires
  // a long-running task. For testing, you'd need to:
  // 1. Start a long-running execution
  // 2. Immediately call cancel before it completes

  const executionId = "exec_123_abc"; // Example ID

  const response = await fetch(`${BASE_URL}/api/agents/default/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY && { "X-API-Key": API_KEY }),
    },
    body: JSON.stringify({
      executionId,
    }),
  });

  const result = await response.json();
  console.log("Cancel Result:", result);
}

/**
 * Example 4: Handle rate limiting
 */
async function testRateLimiting() {
  console.log("\n=== Rate Limiting ===\n");

  console.log("Making 65 requests rapidly (limit is 60/min)...\n");

  for (let i = 0; i < 65; i++) {
    const response = await fetch(`${BASE_URL}/api/agents/default/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(API_KEY && { "X-API-Key": API_KEY }),
      },
      body: JSON.stringify({
        task: "Say hello",
      }),
    });

    if (response.status === 429) {
      const result = await response.json();
      console.log(`Request ${i + 1}: RATE LIMITED`);
      console.log("Rate Limit Info:", {
        limit: response.headers.get("X-RateLimit-Limit"),
        remaining: response.headers.get("X-RateLimit-Remaining"),
        reset: response.headers.get("X-RateLimit-Reset"),
        retryAfter: response.headers.get("Retry-After"),
      });
      console.log("Error:", result.error);
      break;
    }

    console.log(`Request ${i + 1}: Success`);
  }
}

/**
 * Example 5: Continue conversation (using thread ID)
 */
async function continueConversation() {
  console.log("\n=== Conversation Continuity ===\n");

  const threadId = "conversation-456";

  // First message
  console.log("User: My name is Alice");
  const response1 = await fetch(`${BASE_URL}/api/agents/default/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY && { "X-API-Key": API_KEY }),
    },
    body: JSON.stringify({
      task: "My name is Alice. Remember this.",
      config: { threadId },
    }),
  });

  const result1 = await response1.json();
  console.log("Agent:", result1.result?.messages[1]?.content, "\n");

  // Second message (same thread)
  console.log("User: What's my name?");
  const response2 = await fetch(`${BASE_URL}/api/agents/default/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY && { "X-API-Key": API_KEY }),
    },
    body: JSON.stringify({
      task: "What's my name?",
      config: { threadId }, // Same thread - agent remembers!
    }),
  });

  const result2 = await response2.json();
  console.log("Agent:", result2.result?.messages[1]?.content);
}

/**
 * Example 6: Using API key authentication
 */
async function withAuthentication() {
  console.log("\n=== API Key Authentication ===\n");

  // Without API key (if required)
  console.log("Request without API key:");
  const response1 = await fetch(`${BASE_URL}/api/agents/default/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // No X-API-Key header
    },
    body: JSON.stringify({
      task: "Hello",
    }),
  });

  if (response1.status === 401) {
    console.log("❌ Unauthorized (as expected if API key is required)\n");
  } else {
    console.log("✅ Success (API key not required)\n");
  }

  // With API key
  if (API_KEY) {
    console.log("Request with API key:");
    const response2 = await fetch(`${BASE_URL}/api/agents/default/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({
        task: "Hello",
      }),
    });

    if (response2.ok) {
      console.log("✅ Authenticated successfully");
    }
  }
}

/**
 * Run all examples
 */
async function main() {
  try {
    await useMultipleAgents();
    await trackExecution();
    // await cancelExecution(); // Requires actual running execution
    // await testRateLimiting(); // Commented to avoid hitting rate limit
    await continueConversation();
    await withAuthentication();
  } catch (error) {
    console.error("Error running examples:", error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  useMultipleAgents,
  trackExecution,
  cancelExecution,
  testRateLimiting,
  continueConversation,
  withAuthentication,
};
