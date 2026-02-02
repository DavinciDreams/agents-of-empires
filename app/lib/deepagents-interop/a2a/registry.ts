/**
 * Agent Registry
 *
 * Manages multiple agents with configurations, caching, and lifecycle management.
 */

import { createDeepAgent } from "deepagents";
import type { CompiledStateGraph } from "@langchain/langgraph";
import type { StructuredTool } from "langchain/tools";
import type { SubAgent } from "deepagents";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createLLM, type LLMProvider } from "./providers";

/**
 * Agent configuration for registry
 */
export interface AgentConfig {
  /** Agent ID */
  id: string;

  /** Agent name */
  name: string;

  /** Agent description */
  description: string;

  /** Model configuration */
  model: {
    provider: LLMProvider | "custom";
    name: string;
    temperature?: number;
    apiKey?: string; // Optional override for specific agent
    baseURL?: string; // Optional custom base URL
  };

  /** System prompt */
  systemPrompt: string;

  /** Tools */
  tools?: StructuredTool[];

  /** Subagents */
  subagents?: SubAgent[];

  /** Skills */
  skills?: string[];

  /** Memory files */
  memory?: string[];

  /** Enable checkpointing */
  checkpointer?: boolean;

  /** Custom configuration */
  custom?: Record<string, unknown>;
}

/**
 * Cached agent entry
 */
interface CachedAgent {
  config: AgentConfig;
  agent: CompiledStateGraph;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
}

/**
 * Agent Registry
 *
 * Singleton registry for managing multiple agents with caching.
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents = new Map<string, CachedAgent>();
  private configs = new Map<string, AgentConfig>();

  // Cache settings
  private maxCacheSize = 10;
  private cacheExpirationMs = 3600000; // 1 hour

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register a new agent configuration
   */
  register(config: AgentConfig): void {
    this.configs.set(config.id, config);
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): void {
    this.configs.delete(agentId);
    this.agents.delete(agentId);
  }

  /**
   * Get or create an agent
   */
  async getAgent(agentId: string): Promise<CompiledStateGraph> {
    // Check if agent is in cache
    const cached = this.agents.get(agentId);
    if (cached) {
      // Check if cache is still valid
      const age = Date.now() - cached.createdAt.getTime();
      if (age < this.cacheExpirationMs) {
        cached.lastUsed = new Date();
        cached.usageCount++;
        return cached.agent;
      }

      // Cache expired, remove it
      this.agents.delete(agentId);
    }

    // Get agent configuration
    const config = this.configs.get(agentId);
    if (!config) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Create new agent
    const agent = await this.createAgent(config);

    // Cache the agent
    this.cacheAgent(agentId, config, agent);

    return agent;
  }

  /**
   * Create an agent from configuration
   */
  private async createAgent(config: AgentConfig): Promise<CompiledStateGraph> {
    // Create model
    const model = this.createModel(config.model);

    // Create agent
    const agent = createDeepAgent({
      model,
      systemPrompt: config.systemPrompt,
      tools: config.tools || [],
      subagents: config.subagents || [],
      skills: config.skills || [],
      memory: config.memory || [],
      checkpointer: config.checkpointer ?? true,
    });

    return agent;
  }

  /**
   * Create a model based on configuration
   */
  private createModel(modelConfig: AgentConfig["model"]): BaseChatModel {
    const { provider, name, temperature = 0, apiKey, baseURL } = modelConfig;

    if (provider === "custom") {
      throw new Error("Custom providers must be instantiated manually");
    }

    // Use the provider middleware
    return createLLM(provider, {
      apiKey,
      baseURL,
      defaultModel: name,
      temperature,
    });
  }

  /**
   * Cache an agent
   */
  private cacheAgent(
    agentId: string,
    config: AgentConfig,
    agent: CompiledStateGraph
  ): void {
    // Enforce cache size limit
    if (this.agents.size >= this.maxCacheSize) {
      this.evictOldestAgent();
    }

    this.agents.set(agentId, {
      config,
      agent,
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 1,
    });
  }

  /**
   * Evict the least recently used agent
   */
  private evictOldestAgent(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, cached] of this.agents.entries()) {
      const lastUsedTime = cached.lastUsed.getTime();
      if (lastUsedTime < oldestTime) {
        oldestTime = lastUsedTime;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.agents.delete(oldestId);
    }
  }

  /**
   * Get agent configuration
   */
  getConfig(agentId: string): AgentConfig | undefined {
    return this.configs.get(agentId);
  }

  /**
   * List all registered agent IDs
   */
  listAgents(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    agents: Array<{
      id: string;
      usageCount: number;
      age: number;
      lastUsed: Date;
    }>;
  } {
    const agents = Array.from(this.agents.entries()).map(([id, cached]) => ({
      id,
      usageCount: cached.usageCount,
      age: Date.now() - cached.createdAt.getTime(),
      lastUsed: cached.lastUsed,
    }));

    return {
      size: this.agents.size,
      maxSize: this.maxCacheSize,
      agents,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.agents.clear();
  }

  /**
   * Set cache configuration
   */
  setCacheConfig(options: { maxSize?: number; expirationMs?: number }): void {
    if (options.maxSize !== undefined) {
      this.maxCacheSize = options.maxSize;
    }
    if (options.expirationMs !== undefined) {
      this.cacheExpirationMs = options.expirationMs;
    }
  }
}

/**
 * Initialize default agents
 */
export function initializeDefaultAgents(): void {
  const registry = AgentRegistry.getInstance();

  // Register default agent
  registry.register({
    id: "default",
    name: "Default Agent",
    description: "A general-purpose AI assistant",
    model: {
      provider: "anthropic",
      name: "claude-sonnet-4-20250514",
      temperature: 0,
    },
    systemPrompt: "You are a helpful AI assistant.",
    checkpointer: true,
  });

  // Register research agent
  registry.register({
    id: "research",
    name: "Research Agent",
    description: "Specialized in research and analysis",
    model: {
      provider: "anthropic",
      name: "claude-sonnet-4-20250514",
      temperature: 0,
    },
    systemPrompt: "You are an expert researcher focused on finding accurate information and providing thorough analysis.",
    checkpointer: true,
  });

  // Register creative agent
  registry.register({
    id: "creative",
    name: "Creative Agent",
    description: "Specialized in creative writing and ideation",
    model: {
      provider: "anthropic",
      name: "claude-sonnet-4-20250514",
      temperature: 0.7,
    },
    systemPrompt: "You are a creative AI assistant specialized in writing, brainstorming, and generating innovative ideas.",
    checkpointer: true,
  });
}
