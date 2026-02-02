/**
 * Agent Card Generator
 *
 * Generates A2A-compliant agent cards from DeepAgent configurations.
 */

import type { JSONSchema7 } from "json-schema";
import type { AgentCard, AgentEndpoints, AgentProtocols } from "../types/agent-card";
import { extractCapabilities, extractModelInfo, type DeepAgentConfig } from "./extractor";

/**
 * Options for generating an agent card
 */
export interface GenerateAgentCardOptions {
  /** Agent configuration */
  config: DeepAgentConfig;

  /** Agent identifier */
  agentId: string;

  /** Agent name */
  name: string;

  /** Agent description */
  description: string;

  /** Version */
  version?: string;

  /** Base URL for endpoints */
  baseUrl: string;

  /** Model information (if not in config) */
  model?: string | unknown;

  /** Additional metadata */
  metadata?: {
    author?: { name: string; email?: string; url?: string };
    license?: string;
    repository?: string;
    homepage?: string;
    keywords?: string[];
  };

  /** A2UI component catalog */
  a2uiComponents?: string[];
}

/**
 * Generate an agent card from a DeepAgent configuration
 */
export function generateAgentCard(options: GenerateAgentCardOptions): AgentCard {
  const {
    config,
    agentId,
    name,
    description,
    version = "1.0.0",
    baseUrl,
    model,
    metadata,
    a2uiComponents = getDefaultA2UIComponents(),
  } = options;

  // Extract capabilities
  const capabilities = extractCapabilities(config);

  // Generate endpoints
  const endpoints = generateEndpoints(baseUrl, agentId);

  // Generate protocol info
  const protocols = generateProtocols(a2uiComponents);

  // Generate schemas
  const inputSchema = generateInputSchema();
  const outputSchema = generateOutputSchema();

  // Extract model info
  const modelInfo = extractModelInfo(model || config);

  return {
    name,
    description,
    version,
    capabilities,
    protocols,
    endpoints,
    inputSchema,
    outputSchema,
    metadata: {
      ...metadata,
      model: modelInfo,
      authentication: {
        type: "apiKey",
        required: false, // Can be configured per deployment
      },
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
    },
  };
}

/**
 * Generate endpoint URLs
 */
function generateEndpoints(baseUrl: string, agentId: string): AgentEndpoints {
  const base = `${baseUrl}/api/agents/${agentId}`;

  return {
    invoke: `${base}/invoke`,
    stream: `${base}/stream`,
    status: `${base}/status`,
    cancel: `${base}/cancel`,
    health: `${baseUrl}/api/health`,
  };
}

/**
 * Generate protocol support information
 */
function generateProtocols(a2uiComponents: string[]): AgentProtocols {
  return {
    a2a: {
      version: "1.0",
      bindings: ["http", "jsonrpc"],
    },
    a2ui: {
      version: "1.0",
      components: a2uiComponents,
    },
  };
}

/**
 * Generate input schema for agent requests
 */
function generateInputSchema(): JSONSchema7 {
  return {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "The task or query for the agent to perform",
      },
      context: {
        type: "object",
        description: "Additional context for the agent",
        additionalProperties: true,
      },
      config: {
        type: "object",
        description: "Configuration for agent execution",
        properties: {
          recursionLimit: {
            type: "number",
            description: "Maximum number of agent reasoning steps",
            default: 50,
          },
          streaming: {
            type: "boolean",
            description: "Enable streaming responses",
            default: false,
          },
          checkpointId: {
            type: "string",
            description: "Resume from a specific checkpoint",
          },
          threadId: {
            type: "string",
            description: "Thread ID for conversation continuity",
          },
          model: {
            type: "string",
            description: "Model override for this request",
          },
          temperature: {
            type: "number",
            description: "Temperature for LLM generation",
            minimum: 0,
            maximum: 2,
          },
        },
      },
    },
    required: ["task"],
  };
}

/**
 * Generate output schema for agent responses
 */
function generateOutputSchema(): JSONSchema7 {
  return {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["success", "error", "pending", "cancelled"],
        description: "Execution status",
      },
      result: {
        type: "object",
        description: "Result data (present on success)",
        properties: {
          messages: {
            type: "array",
            description: "Conversation messages",
            items: {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["user", "assistant", "system", "tool"],
                },
                content: { type: "string" },
                name: { type: "string" },
                toolCallId: { type: "string" },
              },
              required: ["role", "content"],
            },
          },
          files: {
            type: "object",
            description: "Files created/modified by the agent",
            additionalProperties: {
              type: "object",
              properties: {
                content: { type: "string" },
                createdAt: { type: "string", format: "date-time" },
                modifiedAt: { type: "string", format: "date-time" },
              },
            },
          },
          todos: {
            type: "array",
            description: "Todo list (if agent uses planning)",
            items: {
              type: "object",
              properties: {
                content: { type: "string" },
                status: {
                  type: "string",
                  enum: ["pending", "in_progress", "completed"],
                },
                activeForm: { type: "string" },
              },
            },
          },
          state: {
            type: "object",
            description: "Additional state data",
            additionalProperties: true,
          },
        },
      },
      error: {
        type: "object",
        description: "Error information (present on error)",
        properties: {
          code: { type: "string" },
          message: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
        required: ["code", "message"],
      },
      metadata: {
        type: "object",
        description: "Metadata about the execution",
        properties: {
          executionTime: {
            type: "number",
            description: "Total execution time in milliseconds",
          },
          tokensUsed: { type: "number" },
          checkpointId: { type: "string" },
          threadId: { type: "string" },
          agentId: { type: "string" },
          startedAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time" },
          model: { type: "string" },
        },
        required: ["executionTime", "agentId", "startedAt", "completedAt"],
      },
    },
    required: ["status", "metadata"],
  };
}

/**
 * Get default A2UI components
 */
function getDefaultA2UIComponents(): string[] {
  return [
    // Display components
    "Card",
    "Text",
    "Code",
    "Markdown",

    // Input components
    "Button",
    "TextField",

    // Layout components
    "Stack",
    "Grid",
    "Container",

    // Agent-specific components
    "TaskList",
    "FileTree",
    "ToolResult",
    "AgentThinking",
    "ProgressBar",
  ];
}

/**
 * Validate an agent card
 */
export function validateAgentCard(card: AgentCard): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!card.name) errors.push("Missing required field: name");
  if (!card.description) errors.push("Missing required field: description");
  if (!card.version) errors.push("Missing required field: version");

  // Endpoints
  if (!card.endpoints.invoke) errors.push("Missing required endpoint: invoke");
  if (!card.endpoints.stream) errors.push("Missing required endpoint: stream");

  // Schemas
  if (!card.inputSchema) errors.push("Missing required field: inputSchema");
  if (!card.outputSchema) errors.push("Missing required field: outputSchema");

  return {
    valid: errors.length === 0,
    errors,
  };
}
