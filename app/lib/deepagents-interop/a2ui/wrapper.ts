/**
 * A2UI Wrapper
 *
 * Wraps LangGraph agents to provide A2UI streaming interface.
 * Transforms agent execution into real-time UI component streams.
 */

import { CompiledStateGraph } from "@langchain/langgraph";
import { A2UIMessage, A2UIStreamOptions } from "../types/a2ui";
import { A2ARequest } from "../types/a2a";
import { stateToA2UI } from "./adapter";
import {
  transformStreamEvent,
  createProgressUpdate,
  createError,
  createCompletion,
  LangGraphEvent,
} from "./event-transformer";

/**
 * A2UI Wrapper Configuration
 */
export interface A2UIConfig {
  agentId: string;
  enableProgressTracking?: boolean;
  batchUpdates?: boolean;
  batchIntervalMs?: number;
}

/**
 * A2UI Wrapper
 *
 * Provides A2UI streaming interface for LangGraph agents.
 */
export class A2UIWrapper {
  private agent: CompiledStateGraph;
  private config: Required<A2UIConfig>;

  constructor(agent: CompiledStateGraph, config: A2UIConfig) {
    this.agent = agent;
    this.config = {
      enableProgressTracking: true,
      batchUpdates: false,
      batchIntervalMs: 100,
      ...config,
    };
  }

  /**
   * Stream A2UI component messages as agent executes
   */
  async *stream(
    request: A2ARequest,
    options?: A2UIStreamOptions
  ): AsyncGenerator<A2UIMessage> {
    const startTime = Date.now();

    try {
      // Build LangGraph input
      const input = {
        messages: [
          {
            role: "user",
            content: request.task,
          },
        ],
        context: request.context,
      };

      // Run config with thread ID and signal
      const runConfig: Record<string, unknown> = {
        configurable: {},
      };

      if (request.config?.threadId) {
        (runConfig.configurable as any).thread_id = request.config.threadId;
      }

      if (options?.signal) {
        runConfig.signal = options.signal;
      }

      // Initial state component
      yield {
        type: "component",
        id: "agent-container",
        component: "container",
        props: {
          direction: "vertical",
          spacing: "medium",
        },
        children: [],
      };

      // Stream events from agent
      const stream = await this.agent.stream(input, {
        ...runConfig,
        streamMode: "updates",
      });

      let updateCount = 0;
      const updateBatch: A2UIMessage[] = [];
      let lastBatchTime = Date.now();

      for await (const chunk of stream) {
        updateCount++;

        // Transform chunk to A2UI messages
        const messages = this.transformChunk(chunk, updateCount);

        if (this.config.batchUpdates) {
          // Batch updates
          updateBatch.push(...messages);

          const now = Date.now();
          if (now - lastBatchTime >= this.config.batchIntervalMs) {
            // Flush batch
            for (const msg of updateBatch) {
              yield msg;
            }
            updateBatch.length = 0;
            lastBatchTime = now;
          }
        } else {
          // Stream updates immediately
          for (const msg of messages) {
            yield msg;
          }
        }
      }

      // Flush remaining batched messages
      if (this.config.batchUpdates && updateBatch.length > 0) {
        for (const msg of updateBatch) {
          yield msg;
        }
      }

      // Get final state
      const finalState = await this.getFinalState(request.config?.threadId);

      // Transform final state to UI
      const finalMessages = stateToA2UI(finalState);
      for (const msg of finalMessages) {
        yield msg;
      }

      // Completion message
      const duration = Date.now() - startTime;
      yield createCompletion({
        duration,
        checkpointId: finalState.checkpointId as string | undefined,
      });
    } catch (error) {
      // Error component
      yield createError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Transform chunk to A2UI messages
   */
  private transformChunk(chunk: Record<string, unknown>, updateIndex: number): A2UIMessage[] {
    const messages: A2UIMessage[] = [];

    // Check if this is a state update
    if (chunk && typeof chunk === "object") {
      // Extract messages
      if ("messages" in chunk && Array.isArray(chunk.messages)) {
        const lastMsg = chunk.messages[chunk.messages.length - 1];
        if (lastMsg && typeof lastMsg === "object" && "content" in lastMsg) {
          messages.push({
            type: "component",
            id: `message-${updateIndex}`,
            component: "markdown",
            props: {
              content: String(lastMsg.content),
            },
          });
        }
      }

      // Extract todos
      if ("todos" in chunk && Array.isArray(chunk.todos)) {
        const inProgress = chunk.todos.find((t: any) => t.status === "in_progress");
        if (inProgress) {
          messages.push({
            type: "update",
            id: "current-task",
            props: {
              content: inProgress.activeForm || inProgress.content,
            },
          } as any);
        }
      }

      // Extract tool calls
      if ("tool_calls" in chunk) {
        messages.push({
          type: "component",
          id: `tool-${updateIndex}`,
          component: "status",
          props: {
            state: "working",
            message: "Using tools...",
          },
        });
      }
    }

    return messages;
  }

  /**
   * Get final state from checkpoint
   */
  private async getFinalState(threadId?: string): Promise<Record<string, unknown>> {
    if (!threadId) {
      return {};
    }

    try {
      const config = {
        configurable: {
          thread_id: threadId,
        },
      };

      const state = await this.agent.getState(config);
      return state.values || {};
    } catch (error) {
      console.error("Failed to get final state:", error);
      return {};
    }
  }

  /**
   * Stream with detailed event tracking (alternative streaming mode)
   */
  async *streamEvents(
    request: A2ARequest,
    options?: A2UIStreamOptions
  ): AsyncGenerator<A2UIMessage> {
    try {
      const input = {
        messages: [
          {
            role: "user",
            content: request.task,
          },
        ],
        context: request.context,
      };

      const runConfig: Record<string, unknown> = {
        configurable: {},
      };

      if (request.config?.threadId) {
        (runConfig.configurable as any).thread_id = request.config.threadId;
      }

      if (options?.signal) {
        runConfig.signal = options.signal;
      }

      // Stream detailed events
      const stream = await this.agent.streamEvents(input, {
        ...runConfig,
        version: "v2",
      });

      for await (const event of stream) {
        const messages = transformStreamEvent(event as LangGraphEvent);
        for (const msg of messages) {
          yield msg;
        }
      }
    } catch (error) {
      yield createError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get current state as A2UI components (for status checks)
   */
  async getStateUI(threadId: string): Promise<A2UIMessage[]> {
    try {
      const config = {
        configurable: {
          thread_id: threadId,
        },
      };

      const state = await this.agent.getState(config);
      return stateToA2UI(state.values || {});
    } catch (error) {
      return [
        createError(error instanceof Error ? error : new Error(String(error))),
      ];
    }
  }
}
