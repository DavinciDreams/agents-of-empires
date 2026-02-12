/**
 * Agent Configuration Helper
 *
 * Provides default agent configurations with middleware support for
 * storage, memory, and sandbox functionality.
 */

import { createDeepAgent } from "deepagents";
import type { DeepAgent, CreateDeepAgentParams } from "deepagents";
import { defaultStoreBackend } from "@/app/lib/deepagents-interop/backends/store-backend";
import { LocalSandbox } from "@/app/lib/deepagents-interop/sandbox";
import { DEFAULT_MEMORY_SOURCES } from "@/app/lib/deepagents-interop/a2a/config";
import type { BaseLanguageModel } from "@langchain/core/language_models/base";
import type { StructuredTool } from "@langchain/core/tools";
import type { SubAgent } from "deepagents";

// ============================================================================
// Types
// ============================================================================

export type BackendType = "state" | "store" | "sandbox";

export interface AgentMiddlewareConfig {
  backend: BackendType;
  enableMemory: boolean;
  enableSandbox: boolean;
  memorySources: string[];
  sandboxWorkingDir?: string;
}

export interface GameAgentConfig {
  id: string;
  name: string;
  model: BaseLanguageModel | string;
  systemPrompt: string;
  tools?: StructuredTool[];
  subagents?: SubAgent[];
  skills?: string[];
  middleware?: AgentMiddlewareConfig;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default middleware configuration
 */
export const DEFAULT_MIDDLEWARE: AgentMiddlewareConfig = {
  backend: "store",
  enableMemory: true,
  enableSandbox: false,
  memorySources: DEFAULT_MEMORY_SOURCES,
};

/**
 * Backend type constants
 */
export const BACKEND_TYPES = {
  STATE: "state" as BackendType,
  STORE: "store" as BackendType,
  SANDBOX: "sandbox" as BackendType,
} as const;

// ============================================================================
// Default Agent Configuration
// ============================================================================

/**
 * Default agent configuration with middleware
 */
export const DEFAULT_AGENT_CONFIG: Partial<GameAgentConfig> = {
  middleware: DEFAULT_MIDDLEWARE,
};

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Create agent middleware configuration
 */
export function createMiddlewareConfig(
  overrides?: Partial<AgentMiddlewareConfig>
): AgentMiddlewareConfig {
  return {
    ...DEFAULT_MIDDLEWARE,
    ...overrides,
  };
}

/**
 * Create agent configuration with store backend (default)
 */
export function createStoreAgentConfig(
  config: Partial<GameAgentConfig>
): GameAgentConfig {
  return {
    ...DEFAULT_AGENT_CONFIG,
    ...config,
    id: config.id || "",
    name: config.name || "Agent",
    model: config.model!,
    systemPrompt: config.systemPrompt || "",
    middleware: createMiddlewareConfig({
      backend: "store",
      enableMemory: true,
      enableSandbox: false,
    }),
  };
}

/**
 * Create agent configuration with sandbox backend
 */
export function createSandboxAgentConfig(
  config: Partial<GameAgentConfig>
): GameAgentConfig {
  return {
    ...DEFAULT_AGENT_CONFIG,
    ...config,
    id: config.id || "",
    name: config.name || "Agent",
    model: config.model!,
    systemPrompt: config.systemPrompt || "",
    middleware: createMiddlewareConfig({
      backend: "sandbox",
      enableMemory: true,
      enableSandbox: true,
      sandboxWorkingDir: config.middleware?.sandboxWorkingDir || "./sandbox-workspace",
    }),
  };
}

/**
 * Create agent configuration with state backend (ephemeral)
 */
export function createStateAgentConfig(
  config: Partial<GameAgentConfig>
): GameAgentConfig {
  return {
    ...DEFAULT_AGENT_CONFIG,
    ...config,
    id: config.id || "",
    name: config.name || "Agent",
    model: config.model!,
    systemPrompt: config.systemPrompt || "",
    middleware: createMiddlewareConfig({
      backend: "state",
      enableMemory: false,
      enableSandbox: false,
    }),
  };
}

// ============================================================================
// Agent Creation Functions
// ============================================================================

/**
 * Build DeepAgent configuration from game agent config
 */
export function buildDeepAgentConfig(
  config: GameAgentConfig
): any {
  const middleware = config.middleware || DEFAULT_MIDDLEWARE;
  let backendConfig: any;
  let checkpointer: any;
  let store: any;

  // Configure backend based on middleware type
  if (middleware.backend === "store") {
    // Use StoreBackend with MemorySaver
    backendConfig = defaultStoreBackend.backend;
    checkpointer = defaultStoreBackend.checkpointer;
    store = defaultStoreBackend.store;
  } else if (middleware.backend === "sandbox") {
    // Use sandbox backend
    backendConfig = new LocalSandbox({
      workingDirectory: middleware.sandboxWorkingDir || "./sandbox-workspace",
    });
    checkpointer = undefined;
    store = undefined;
  } else {
    // Default to state backend (ephemeral)
    backendConfig = undefined;
    checkpointer = undefined;
    store = undefined;
  }

  // Configure memory
  const memory = middleware.enableMemory ? middleware.memorySources : [];

  return {
    model: config.model,
    systemPrompt: config.systemPrompt,
    tools: config.tools || [],
    subagents: config.subagents || [],
    skills: config.skills || [],
    memory,
    checkpointer,
    store,
    backend: backendConfig,
  };
}

/**
 * Create a DeepAgent instance from game agent configuration
 */
export async function createGameAgent(
  config: GameAgentConfig
): Promise<DeepAgent> {
  const deepAgentConfig = buildDeepAgentConfig(config);
  return createDeepAgent(deepAgentConfig);
}

/**
 * Create a DeepAgent instance with default store backend
 */
export async function createDefaultGameAgent(
  id: string,
  name: string,
  model: BaseLanguageModel | string,
  systemPrompt: string,
  tools?: StructuredTool[],
  subagents?: SubAgent[],
  skills?: string[]
): Promise<DeepAgent> {
  const config = createStoreAgentConfig({
    id,
    name,
    model,
    systemPrompt,
    tools,
    subagents,
    skills,
  });

  return createGameAgent(config);
}
