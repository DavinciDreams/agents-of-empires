/**
 * A2A (Agent-to-Agent) Protocol Type Definitions
 * Based on: https://a2a-protocol.org/latest/specification/
 */

import type { JSONSchema7 } from "json-schema";

/**
 * A2A Request - Sent to invoke an agent
 */
export interface A2ARequest {
  /** The task or query for the agent to perform */
  task: string;

  /** Additional context for the agent */
  context?: Record<string, unknown>;

  /** Configuration for agent execution */
  config?: A2ARequestConfig;
}

/**
 * Configuration options for A2A requests
 */
export interface A2ARequestConfig {
  /** Maximum number of agent reasoning steps */
  recursionLimit?: number;

  /** Enable streaming responses */
  streaming?: boolean;

  /** Resume from a specific checkpoint */
  checkpointId?: string;

  /** Thread ID for conversation continuity */
  threadId?: string;

  /** Model override for this request */
  model?: string;

  /** Temperature for LLM generation */
  temperature?: number;
}

/**
 * A2A Response - Returned from agent invocation
 */
export interface A2AResponse {
  /** Execution status */
  status: "success" | "error" | "pending" | "cancelled";

  /** Result data (present on success) */
  result?: A2AResult;

  /** Error information (present on error) */
  error?: A2AError;

  /** Metadata about the execution */
  metadata: A2AMetadata;
}

/**
 * Result data from successful agent execution
 */
export interface A2AResult {
  /** Conversation messages */
  messages: A2AMessage[];

  /** Files created/modified by the agent */
  files?: Record<string, A2AFileData>;

  /** Todo list (if agent uses planning) */
  todos?: A2ATodoItem[];

  /** Additional state data */
  state?: Record<string, unknown>;

  /** Structured response (if agent uses response format) */
  structuredResponse?: unknown;
}

/**
 * Message in A2A conversation
 */
export interface A2AMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: A2AToolCall[];
}

/**
 * Tool call made by the agent
 */
export interface A2AToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * File data structure
 */
export interface A2AFileData {
  content: string;
  createdAt: string;
  modifiedAt: string;
  mimeType?: string;
}

/**
 * Todo item from planning
 */
export interface A2ATodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

/**
 * Error information
 */
export interface A2AError {
  code: A2AErrorCode;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

/**
 * Standard A2A error codes
 */
export enum A2AErrorCode {
  INVALID_REQUEST = "invalid_request",
  AGENT_NOT_FOUND = "agent_not_found",
  EXECUTION_FAILED = "execution_failed",
  TIMEOUT = "timeout",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  INTERNAL_ERROR = "internal_error",
  AUTHENTICATION_FAILED = "authentication_failed",
  PERMISSION_DENIED = "permission_denied",
}

/**
 * Execution metadata
 */
export interface A2AMetadata {
  /** Total execution time in milliseconds */
  executionTime: number;

  /** Tokens consumed (if available) */
  tokensUsed?: number;

  /** Checkpoint ID for resumption */
  checkpointId?: string;

  /** Thread ID */
  threadId?: string;

  /** Agent ID that handled the request */
  agentId: string;

  /** Timestamp of execution start */
  startedAt: string;

  /** Timestamp of execution end */
  completedAt: string;

  /** Model used for execution */
  model?: string;
}

/**
 * A2A Stream Event - Emitted during streaming execution
 */
export interface A2AStreamEvent {
  type: A2AStreamEventType;
  data: unknown;
  timestamp: string;
}

/**
 * Types of stream events
 */
export enum A2AStreamEventType {
  START = "start",
  TOKEN = "token",
  TOOL_START = "tool_start",
  TOOL_END = "tool_end",
  MESSAGE = "message",
  STATE_UPDATE = "state_update",
  ERROR = "error",
  END = "end",
}

/**
 * Agent discovery metadata
 */
export interface A2AAgentDiscovery {
  /** Agent identifier */
  id: string;

  /** Agent name */
  name: string;

  /** Agent description */
  description: string;

  /** Version */
  version: string;

  /** Endpoint URL */
  endpoint: string;

  /** Supported protocols */
  protocols: string[];

  /** Capabilities */
  capabilities: string[];
}

/**
 * JSON-RPC 2.0 Request (optional A2A binding)
 */
export interface A2AJsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params: A2ARequest;
  id: string | number;
}

/**
 * JSON-RPC 2.0 Response
 */
export interface A2AJsonRpcResponse {
  jsonrpc: "2.0";
  result?: A2AResponse;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number;
}
