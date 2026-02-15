/**
 * A2A (Agent-to-Agent) Protocol Types
 * 
 * This module defines types for the Microsoft A2A protocol.
 */

/**
 * A2A Error Codes
 */
export enum A2AErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  AGENT_NOT_FOUND = "AGENT_NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  EXECUTION_ERROR = "EXECUTION_ERROR",
  EXECUTION_FAILED = "EXECUTION_FAILED",
  TIMEOUT = "TIMEOUT",
}

/**
 * A2A Request
 */
export interface A2ARequest {
  sessionId?: string;
  threadId?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
  }>;
  context?: Record<string, unknown>;
  config?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  };
}

/**
 * A2A Response
 */
export interface A2AResponse {
  sessionId: string;
  threadId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  status: 'success' | 'error';
  error?: {
    code: A2AErrorCode;
    message: string;
    details?: string[];
  };
  metadata?: {
    model?: string;
    tokensUsed?: number;
    executionTime?: number;
  };
}

/**
 * A2A Stream Event Types
 */
export enum A2AStreamEventType {
  START = "start",
  MESSAGE = "message",
  TOOL_CALL = "tool_call",
  TOOL_RESULT = "tool_result",
  ERROR = "error",
  END = "end",
}

/**
 * A2A Stream Event
 */
export interface A2AStreamEvent {
  type: A2AStreamEventType;
  sessionId: string;
  threadId: string;
  timestamp: string;
  data: unknown;
}

/**
 * A2A Error Response
 */
export interface A2AErrorResponse {
  error: {
    code: A2AErrorCode;
    message: string;
    details?: string[];
  };
}

/**
 * SubAgent Type
 */
export interface SubAgent {
  name: string;
  description: string;
  type?: string;
  capabilities?: string[];
}
