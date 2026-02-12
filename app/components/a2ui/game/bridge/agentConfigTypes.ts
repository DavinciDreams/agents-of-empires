/**
 * Agent Configuration Types and Constants
 *
 * Provides type definitions and constants for agent configuration.
 * This file contains only types and constants that can be safely used in client components.
 */

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
  memorySources: [], // Will be populated from server-side config
};

/**
 * Backend type constants
 */
export const BACKEND_TYPES = {
  STATE: "state" as BackendType,
  STORE: "store" as BackendType,
  SANDBOX: "sandbox" as BackendType,
} as const;
