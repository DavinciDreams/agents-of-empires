/**
 * A2A Protocol Wrapper for DeepAgents
 *
 * Wraps a DeepAgent (LangGraph graph) to handle A2A protocol requests and responses.
 */

import type { CompiledStateGraph } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import type {
  A2ARequest,
  A2AResponse,
  A2AResult,
  A2AMetadata,
  A2AStreamEvent,
} from "../types/a2a";
import { A2AErrorCode } from "../types/a2a";
import { transformToA2AResult, transformStreamEvent } from "./transformers";

/**
 * Configuration for the A2A wrapper
 */
export interface A2AWrapperConfig {
  /** Agent identifier */
  agentId: string;

  /** Default recursion limit */
  defaultRecursionLimit?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Enable detailed logging */
  verbose?: boolean;
}

/**
 * A2A Wrapper for DeepAgents
 *
 * Provides A2A protocol compatibility for LangGraph-based DeepAgents.
 */
export class A2AWrapper {
  private agent: CompiledStateGraph;
  private config: Required<A2AWrapperConfig>;

  constructor(agent: CompiledStateGraph, config: A2AWrapperConfig) {
    this.agent = agent;
    this.config = {
      agentId: config.agentId,
      defaultRecursionLimit: config.defaultRecursionLimit ?? 50,
      timeout: config.timeout ?? 300000, // 5 minutes
      verbose: config.verbose ?? false,
    };
  }

  /**
   * Invoke the agent synchronously with an A2A request
   */
  async invoke(request: A2ARequest): Promise<A2AResponse> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    try {
      this.log("Invoking agent with request:", request);

      // Validate request
      this.validateRequest(request);

      // Transform A2A request to LangGraph input
      const input = this.transformRequest(request);

      // Configure execution
      const runConfig = {
        recursionLimit: request.config?.recursionLimit ?? this.config.defaultRecursionLimit,
        configurable: {
          thread_id: request.config?.threadId || this.generateThreadId(),
          checkpoint_id: request.config?.checkpointId,
        },
      };

      // Execute agent
      const result = await this.executeWithTimeout(
        () => this.agent.invoke(input, runConfig),
        this.config.timeout
      );

      // Transform result to A2A response
      const a2aResult = transformToA2AResult(result);

      // Build response
      const response: A2AResponse = {
        status: "success",
        result: a2aResult,
        metadata: this.buildMetadata({
          startTime,
          startedAt,
          threadId: runConfig.configurable.thread_id,
        }),
      };

      this.log("Agent invocation successful:", response);

      return response;
    } catch (error) {
      this.log("Agent invocation failed:", error);

      return {
        status: "error",
        error: this.transformError(error),
        metadata: this.buildMetadata({
          startTime,
          startedAt,
        }),
      };
    }
  }

  /**
   * Stream the agent execution with A2A streaming
   */
  async *stream(request: A2ARequest): AsyncGenerator<A2AStreamEvent> {
    const startTime = Date.now();

    try {
      this.log("Starting stream with request:", request);

      // Validate request
      this.validateRequest(request);

      // Transform request
      const input = this.transformRequest(request);

      // Configure execution
      const runConfig = {
        recursionLimit: request.config?.recursionLimit ?? this.config.defaultRecursionLimit,
        configurable: {
          thread_id: request.config?.threadId || this.generateThreadId(),
          checkpoint_id: request.config?.checkpointId,
        },
      };

      // Emit start event
      yield {
        type: "start" as const,
        data: { threadId: runConfig.configurable.thread_id },
        timestamp: new Date().toISOString(),
      };

      // Stream events from LangGraph
      const stream = await this.agent.stream(input, {
        ...runConfig,
        streamMode: "events", // Use events mode for maximum flexibility
      });

      for await (const event of stream) {
        // Transform LangGraph event to A2A stream event
        const a2aEvent = transformStreamEvent(event);
        if (a2aEvent) {
          yield a2aEvent;
        }
      }

      // Emit end event
      yield {
        type: "end" as const,
        data: { duration: Date.now() - startTime },
        timestamp: new Date().toISOString(),
      };

      this.log("Stream completed");
    } catch (error) {
      this.log("Stream failed:", error);

      // Emit error event
      yield {
        type: "error" as const,
        data: this.transformError(error),
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Transform A2A request to LangGraph input
   */
  private transformRequest(request: A2ARequest): Record<string, unknown> {
    return {
      messages: [new HumanMessage(request.task)],
      ...request.context,
    };
  }

  /**
   * Validate A2A request
   */
  private validateRequest(request: A2ARequest): void {
    if (!request.task || typeof request.task !== "string") {
      throw new Error("Request must include a 'task' string");
    }

    if (request.config?.recursionLimit && request.config.recursionLimit < 1) {
      throw new Error("recursionLimit must be >= 1");
    }

    if (request.config?.temperature) {
      const temp = request.config.temperature;
      if (temp < 0 || temp > 2) {
        throw new Error("temperature must be between 0 and 2");
      }
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error("Execution timeout")),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Transform error to A2A error format
   */
  private transformError(error: unknown) {
    if (error instanceof Error) {
      // Determine error code
      let code = A2AErrorCode.INTERNAL_ERROR;

      if (error.message.includes("timeout")) {
        code = A2AErrorCode.TIMEOUT;
      } else if (error.message.includes("not found")) {
        code = A2AErrorCode.AGENT_NOT_FOUND;
      } else if (
        error.message.includes("invalid") ||
        error.message.includes("must")
      ) {
        code = A2AErrorCode.INVALID_REQUEST;
      }

      return {
        code,
        message: error.message,
        details: {
          name: error.name,
          stack: this.config.verbose ? error.stack : undefined,
        },
      };
    }

    return {
      code: A2AErrorCode.INTERNAL_ERROR,
      message: "An unknown error occurred",
      details: { error: String(error) },
    };
  }

  /**
   * Build metadata for response
   */
  private buildMetadata(options: {
    startTime: number;
    startedAt: string;
    threadId?: string;
    checkpointId?: string;
  }): A2AMetadata {
    return {
      executionTime: Date.now() - options.startTime,
      agentId: this.config.agentId,
      startedAt: options.startedAt,
      completedAt: new Date().toISOString(),
      threadId: options.threadId,
      checkpointId: options.checkpointId,
    };
  }

  /**
   * Generate a unique thread ID
   */
  private generateThreadId(): string {
    return `thread_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Log message (if verbose)
   */
  private log(message: string, data?: unknown): void {
    if (this.config.verbose) {
      console.log(`[A2AWrapper] ${message}`, data || "");
    }
  }

  /**
   * Get the wrapped agent
   */
  getAgent(): CompiledStateGraph {
    return this.agent;
  }

  /**
   * Get wrapper configuration
   */
  getConfig(): Required<A2AWrapperConfig> {
    return { ...this.config };
  }
}
