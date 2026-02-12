/**
 * LLM Provider Configurations
 *
 * Support for multiple LLM providers including OpenRouter and ZAI
 */

import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

/**
 * Supported LLM providers
 */
export type LLMProvider =
  | "anthropic"
  | "openai"
  | "openrouter"
  | "zai"
  | "groq"
  | "together"
  | "perplexity";

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  temperature?: number;
}

/**
 * Provider configurations with base URLs
 */
export const PROVIDER_CONFIGS: Record<string, { baseURL: string; defaultModel: string }> = {
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
  },
  zai: {
    baseURL: "https://open.bigmodel.cn/api/coding/paas/v4",
    defaultModel: "glm-4.7",
  },
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.1-70b-versatile",
  },
  together: {
    baseURL: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  },
  perplexity: {
    baseURL: "https://api.perplexity.ai",
    defaultModel: "llama-3.1-sonar-large-128k-online",
  },
};

/**
 * Create LLM instance for a given provider
 */
export function createLLM(
  provider: LLMProvider,
  config: ProviderConfig
) {
  const apiKey = config.apiKey || getProviderAPIKey(provider);

  if (!apiKey) {
    throw new Error(`API key not found for provider: ${provider}`);
  }

  switch (provider) {
    case "anthropic":
      return new ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName: config.defaultModel || "claude-sonnet-4-20250514",
        temperature: config.temperature ?? 0,
      });

    case "openai":
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: config.defaultModel || "gpt-4-turbo-preview",
        temperature: config.temperature ?? 0,
      });

    case "openrouter":
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: config.defaultModel || PROVIDER_CONFIGS.openrouter.defaultModel,
        temperature: config.temperature ?? 0,
        configuration: {
          baseURL: config.baseURL || PROVIDER_CONFIGS.openrouter.baseURL,
          defaultHeaders: {
            "HTTP-Referer": process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
            "X-Title": "Agents of Empire",
          },
        },
      });

    case "zai":
      return new ChatOpenAI({
        apiKey: apiKey,
        model: config.defaultModel || PROVIDER_CONFIGS.zai.defaultModel,
        temperature: config.temperature ?? 0,
        configuration: {
          baseURL: config.baseURL || PROVIDER_CONFIGS.zai.baseURL,
        },
      });

    case "groq":
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: config.defaultModel || PROVIDER_CONFIGS.groq.defaultModel,
        temperature: config.temperature ?? 0,
        configuration: {
          baseURL: config.baseURL || PROVIDER_CONFIGS.groq.baseURL,
        },
      });

    case "together":
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: config.defaultModel || PROVIDER_CONFIGS.together.defaultModel,
        temperature: config.temperature ?? 0,
        configuration: {
          baseURL: config.baseURL || PROVIDER_CONFIGS.together.baseURL,
        },
      });

    case "perplexity":
      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: config.defaultModel || PROVIDER_CONFIGS.perplexity.defaultModel,
        temperature: config.temperature ?? 0,
        configuration: {
          baseURL: config.baseURL || PROVIDER_CONFIGS.perplexity.baseURL,
        },
      });

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Get API key for provider from environment
 */
function getProviderAPIKey(provider: LLMProvider): string | undefined {
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "openrouter":
      return process.env.OPENROUTER_API_KEY;
    case "zai":
      return process.env.ZAI_API_KEY;
    case "groq":
      return process.env.GROQ_API_KEY;
    case "together":
      return process.env.TOGETHER_API_KEY;
    case "perplexity":
      return process.env.PERPLEXITY_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(
  provider: LLMProvider,
  config: ProviderConfig
): { valid: boolean; error?: string } {
  const apiKey = config.apiKey || getProviderAPIKey(provider);

  if (!apiKey) {
    return {
      valid: false,
      error: `Missing API key for provider ${provider}. Set ${provider.toUpperCase()}_API_KEY environment variable.`,
    };
  }

  return { valid: true };
}

/**
 * Get available providers (with API keys configured)
 */
export function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = ["anthropic", "openai", "openrouter", "zai", "groq", "together", "perplexity"];

  return providers.filter((provider) => {
    const apiKey = getProviderAPIKey(provider);
    return !!apiKey;
  });
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  name: string;
  description: string;
  website: string;
  features: string[];
}

export const PROVIDER_METADATA: Record<LLMProvider, ProviderMetadata> = {
  anthropic: {
    name: "Anthropic",
    description: "Claude models - Advanced AI assistant",
    website: "https://anthropic.com",
    features: ["Long context", "Function calling", "Vision", "Streaming"],
  },
  openai: {
    name: "OpenAI",
    description: "GPT models - Versatile language models",
    website: "https://openai.com",
    features: ["Function calling", "Vision", "JSON mode", "Streaming"],
  },
  openrouter: {
    name: "OpenRouter",
    description: "Unified API for 200+ LLMs",
    website: "https://openrouter.ai",
    features: ["Multiple models", "Pay per use", "Fallback routing", "Cost optimization"],
  },
  zai: {
    name: "ZAI",
    description: "Zero-knowledge AI inference",
    website: "https://zai.ai",
    features: ["Privacy-focused", "Multiple models", "Fast inference"],
  },
  groq: {
    name: "Groq",
    description: "Ultra-fast LLM inference",
    website: "https://groq.com",
    features: ["Fastest inference", "Llama models", "Low latency"],
  },
  together: {
    name: "Together AI",
    description: "Open-source model hosting",
    website: "https://together.ai",
    features: ["Open models", "Custom fine-tuning", "Cost-effective"],
  },
  perplexity: {
    name: "Perplexity",
    description: "Llama Sonar models with online search",
    website: "https://perplexity.ai",
    features: ["Online search", "Citations", "Real-time data"],
  },
};
