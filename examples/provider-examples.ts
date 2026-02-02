/**
 * LLM Provider Examples
 *
 * Demonstrates how to use different LLM providers with the agent registry.
 */

import { AgentRegistry } from "@/lib/deepagents-interop";

/**
 * Example 1: Using OpenRouter (Access to 200+ models)
 */
export function registerOpenRouterAgent() {
  const registry = AgentRegistry.getInstance();

  registry.register({
    id: "openrouter-claude",
    name: "OpenRouter Claude Agent",
    description: "Uses Claude via OpenRouter for cost optimization",
    model: {
      provider: "openrouter",
      name: "anthropic/claude-3.5-sonnet", // OpenRouter model identifier
      temperature: 0,
    },
    systemPrompt: "You are a helpful AI assistant powered by Claude via OpenRouter.",
  });

  // You can also use other models available on OpenRouter
  registry.register({
    id: "openrouter-gpt4",
    name: "OpenRouter GPT-4 Agent",
    description: "Uses GPT-4 via OpenRouter",
    model: {
      provider: "openrouter",
      name: "openai/gpt-4-turbo",
      temperature: 0.7,
    },
    systemPrompt: "You are a creative AI assistant.",
  });
}

/**
 * Example 2: Using ZAI (Privacy-focused inference)
 */
export function registerZAIAgent() {
  const registry = AgentRegistry.getInstance();

  registry.register({
    id: "zai-claude",
    name: "ZAI Claude Agent",
    description: "Privacy-focused Claude inference via ZAI",
    model: {
      provider: "zai",
      name: "claude-3-5-sonnet-20241022",
      temperature: 0,
    },
    systemPrompt: "You are a privacy-conscious AI assistant.",
  });
}

/**
 * Example 3: Using Groq (Ultra-fast inference)
 */
export function registerGroqAgent() {
  const registry = AgentRegistry.getInstance();

  registry.register({
    id: "groq-llama",
    name: "Groq Llama Agent",
    description: "Ultra-fast Llama 3.1 70B inference",
    model: {
      provider: "groq",
      name: "llama-3.1-70b-versatile",
      temperature: 0,
    },
    systemPrompt: "You are a fast and efficient AI assistant.",
  });

  // Groq also offers other models
  registry.register({
    id: "groq-mixtral",
    name: "Groq Mixtral Agent",
    description: "Fast Mixtral 8x7B inference",
    model: {
      provider: "groq",
      name: "mixtral-8x7b-32768",
      temperature: 0.5,
    },
    systemPrompt: "You are a knowledgeable AI assistant.",
  });
}

/**
 * Example 4: Using Together AI (Open-source models)
 */
export function registerTogetherAgent() {
  const registry = AgentRegistry.getInstance();

  registry.register({
    id: "together-llama",
    name: "Together Llama Agent",
    description: "Cost-effective Llama inference",
    model: {
      provider: "together",
      name: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      temperature: 0,
    },
    systemPrompt: "You are an AI assistant powered by open-source models.",
  });
}

/**
 * Example 5: Using Perplexity (With online search)
 */
export function registerPerplexityAgent() {
  const registry = AgentRegistry.getInstance();

  registry.register({
    id: "perplexity-sonar",
    name: "Perplexity Sonar Agent",
    description: "Llama Sonar with real-time online search",
    model: {
      provider: "perplexity",
      name: "llama-3.1-sonar-large-128k-online",
      temperature: 0,
    },
    systemPrompt:
      "You are an AI assistant with access to real-time internet data. Provide citations for your sources.",
  });
}

/**
 * Example 6: Using multiple providers for different use cases
 */
export function registerMultiProviderAgents() {
  const registry = AgentRegistry.getInstance();

  // Fast agent for simple queries (Groq)
  registry.register({
    id: "fast-agent",
    name: "Fast Response Agent",
    description: "Ultra-fast responses for simple queries",
    model: {
      provider: "groq",
      name: "llama-3.1-70b-versatile",
      temperature: 0,
    },
    systemPrompt: "You are a fast AI assistant. Keep responses concise.",
  });

  // Research agent with online access (Perplexity)
  registry.register({
    id: "research-agent",
    name: "Research Agent",
    description: "Deep research with online search",
    model: {
      provider: "perplexity",
      name: "llama-3.1-sonar-large-128k-online",
      temperature: 0,
    },
    systemPrompt:
      "You are a research specialist. Always provide citations and verify facts with online sources.",
  });

  // Cost-optimized agent (OpenRouter)
  registry.register({
    id: "budget-agent",
    name: "Budget Agent",
    description: "Cost-effective agent using cheapest available model",
    model: {
      provider: "openrouter",
      name: "meta-llama/llama-3.1-8b-instruct:free", // Free model on OpenRouter
      temperature: 0.5,
    },
    systemPrompt: "You are a helpful AI assistant.",
  });

  // High-quality agent (Claude via ZAI or Anthropic)
  registry.register({
    id: "premium-agent",
    name: "Premium Agent",
    description: "Highest quality responses with Claude",
    model: {
      provider: "anthropic",
      name: "claude-sonnet-4-20250514",
      temperature: 0,
    },
    systemPrompt: "You are an expert AI assistant providing detailed, accurate responses.",
  });
}

/**
 * Example 7: Using custom API key (per-agent override)
 */
export function registerAgentWithCustomKey() {
  const registry = AgentRegistry.getInstance();

  registry.register({
    id: "custom-key-agent",
    name: "Custom Key Agent",
    description: "Uses agent-specific API key instead of environment variable",
    model: {
      provider: "openrouter",
      name: "anthropic/claude-3.5-sonnet",
      temperature: 0,
      apiKey: "your-specific-api-key-here", // Override default API key
    },
    systemPrompt: "You are a specialized AI assistant.",
  });
}

/**
 * Example 8: Usage in API endpoint
 */
export async function exampleAPIUsage() {
  // Register agents on server startup
  registerOpenRouterAgent();
  registerGroqAgent();
  registerPerplexityAgent();

  // Use them via A2A API endpoints
  const examples = [
    // Fast response with Groq
    {
      endpoint: "/api/agents/groq-llama/invoke",
      body: { task: "What is 2+2?" },
    },

    // Research with Perplexity
    {
      endpoint: "/api/agents/perplexity-sonar/invoke",
      body: { task: "What are the latest developments in AI?" },
    },

    // Cost-effective with OpenRouter
    {
      endpoint: "/api/agents/openrouter-claude/invoke",
      body: { task: "Explain quantum computing" },
    },
  ];

  console.log("Example API calls:", examples);
}

/**
 * Example 9: Check available providers
 */
export function checkAvailableProviders() {
  const { getAvailableProviders, PROVIDER_METADATA } = require("@/lib/deepagents-interop");

  const available = getAvailableProviders();

  console.log("Available providers:");
  available.forEach((provider) => {
    const meta = PROVIDER_METADATA[provider];
    console.log(`- ${meta.name}: ${meta.description}`);
    console.log(`  Features: ${meta.features.join(", ")}`);
  });
}
