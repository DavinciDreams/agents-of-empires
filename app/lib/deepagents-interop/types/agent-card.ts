/**
 * Agent Card Type Definitions
 * Based on A2A Protocol Specification
 * Agent cards are JSON metadata files served at /.well-known/agent-card.json
 */

import type { JSONSchema7 } from "json-schema";

/**
 * Agent Card - Complete metadata for an A2A agent
 */
export interface AgentCard {
  /** Required fields per A2A spec */
  name: string;
  description: string;
  version: string;

  /** Agent capabilities */
  capabilities: AgentCapabilities;

  /** Supported protocols */
  protocols: AgentProtocols;

  /** API endpoints */
  endpoints: AgentEndpoints;

  /** Input schema (JSON Schema) */
  inputSchema: JSONSchema7;

  /** Output schema (JSON Schema) */
  outputSchema: JSONSchema7;

  /** Optional metadata */
  metadata?: AgentMetadata;
}

/**
 * Agent capabilities - What the agent can do
 */
export interface AgentCapabilities {
  /** Available tools */
  tools: ToolMetadata[];

  /** Available subagents */
  subagents: SubAgentMetadata[];

  /** Available skills */
  skills: SkillMetadata[];

  /** Planning capability */
  planning: boolean;

  /** Memory/persistence capability */
  memory: boolean;

  /** Streaming capability */
  streaming: boolean;

  /** File system access */
  filesystem: boolean;

  /** Sandbox execution */
  sandbox: boolean;

  /** Human-in-the-loop support */
  humanInTheLoop: boolean;
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Input schema */
  inputSchema?: JSONSchema7;

  /** Output schema */
  outputSchema?: JSONSchema7;

  /** Whether tool is dangerous (requires approval) */
  dangerous?: boolean;

  /** Tool category */
  category?: string;
}

/**
 * Subagent metadata
 */
export interface SubAgentMetadata {
  /** Subagent name */
  name: string;

  /** Subagent description */
  description: string;

  /** Subagent capabilities */
  capabilities?: string[];

  /** Model used by subagent */
  model?: string;
}

/**
 * Skill metadata
 */
export interface SkillMetadata {
  /** Skill name */
  name: string;

  /** Skill description */
  description: string;

  /** Skill path */
  path: string;

  /** License */
  license?: string;

  /** Compatibility info */
  compatibility?: string;

  /** Additional metadata */
  metadata?: Record<string, string>;
}

/**
 * Protocol support information
 */
export interface AgentProtocols {
  /** A2A protocol support */
  a2a: {
    version: string;
    bindings: A2ABinding[];
  };

  /** A2UI protocol support */
  a2ui?: {
    version: string;
    components: string[];
  };

  /** MCP (Model Context Protocol) support */
  mcp?: {
    version: string;
    tools: string[];
  };
}

/**
 * A2A protocol bindings
 */
export type A2ABinding = "http" | "jsonrpc" | "grpc" | "websocket";

/**
 * Agent endpoints
 */
export interface AgentEndpoints {
  /** Synchronous invocation endpoint */
  invoke: string;

  /** Streaming invocation endpoint */
  stream: string;

  /** Status check endpoint */
  status: string;

  /** Cancel execution endpoint */
  cancel: string;

  /** Health check endpoint */
  health?: string;
}

/**
 * Optional agent metadata
 */
export interface AgentMetadata {
  /** Author information */
  author?: {
    name: string;
    email?: string;
    url?: string;
  };

  /** License */
  license?: string;

  /** Repository URL */
  repository?: string;

  /** Homepage URL */
  homepage?: string;

  /** Keywords/tags */
  keywords?: string[];

  /** Model information */
  model?: {
    provider: string;
    name: string;
    version?: string;
  };

  /** Rate limits */
  rateLimits?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };

  /** Authentication requirements */
  authentication?: {
    type: "none" | "apiKey" | "oauth" | "jwt";
    required: boolean;
  };

  /** Additional custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Agent Card validation result
 */
export interface AgentCardValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
