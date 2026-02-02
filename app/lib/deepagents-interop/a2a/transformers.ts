/**
 * Transformers for converting between LangGraph state and A2A protocol formats
 */

import type { BaseMessage } from "@langchain/core/messages";
import type {
  A2AResult,
  A2AMessage,
  A2AFileData,
  A2ATodoItem,
  A2AStreamEvent,
  A2AToolCall,
} from "../types/a2a";
import { A2AStreamEventType } from "../types/a2a";

/**
 * Transform LangGraph execution result to A2A result format
 */
export function transformToA2AResult(state: Record<string, unknown>): A2AResult {
  const result: A2AResult = {
    messages: transformMessages(state.messages as BaseMessage[] | undefined),
  };

  // Add files if present
  if (state.files && typeof state.files === "object") {
    result.files = transformFiles(state.files as Record<string, unknown>);
  }

  // Add todos if present
  if (state.todos && Array.isArray(state.todos)) {
    result.todos = transformTodos(state.todos);
  }

  // Add structured response if present
  if (state.structuredResponse) {
    result.structuredResponse = state.structuredResponse;
  }

  // Add any additional state
  const { messages, files, todos, structuredResponse, ...additionalState } = state;
  if (Object.keys(additionalState).length > 0) {
    result.state = additionalState;
  }

  return result;
}

/**
 * Transform LangChain messages to A2A message format
 */
export function transformMessages(
  messages: BaseMessage[] | undefined
): A2AMessage[] {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  return messages.map((msg) => transformMessage(msg));
}

/**
 * Transform a single LangChain message to A2A format
 */
export function transformMessage(message: BaseMessage): A2AMessage {
  const baseMsg: A2AMessage = {
    role: mapMessageRole(message._getType()),
    content: typeof message.content === "string" ? message.content : JSON.stringify(message.content),
  };

  // Add name if present
  if (message.name) {
    baseMsg.name = message.name;
  }

  // Handle tool calls (for assistant messages)
  if ("tool_calls" in message && Array.isArray(message.tool_calls)) {
    baseMsg.toolCalls = (message.tool_calls as any[]).map((tc) => ({
      id: tc.id || "",
      type: "function" as const,
      function: {
        name: tc.name || "",
        arguments: JSON.stringify(tc.args || {}),
      },
    }));
  }

  // Handle tool responses
  if (message._getType() === "tool" && "tool_call_id" in message) {
    baseMsg.toolCallId = (message as any).tool_call_id;
  }

  return baseMsg;
}

/**
 * Map LangChain message type to A2A role
 */
function mapMessageRole(
  messageType: string
): "user" | "assistant" | "system" | "tool" {
  switch (messageType) {
    case "human":
      return "user";
    case "ai":
      return "assistant";
    case "system":
      return "system";
    case "tool":
      return "tool";
    default:
      return "assistant";
  }
}

/**
 * Transform files from DeepAgents format to A2A format
 */
export function transformFiles(
  files: Record<string, unknown>
): Record<string, A2AFileData> {
  const result: Record<string, A2AFileData> = {};

  for (const [path, fileData] of Object.entries(files)) {
    if (fileData && typeof fileData === "object") {
      const fd = fileData as any;

      result[path] = {
        content: Array.isArray(fd.content)
          ? fd.content.join("\n")
          : String(fd.content || ""),
        createdAt: fd.created_at || fd.createdAt || new Date().toISOString(),
        modifiedAt: fd.modified_at || fd.modifiedAt || new Date().toISOString(),
        mimeType: fd.mimeType || fd.mime_type || "text/plain",
      };
    }
  }

  return result;
}

/**
 * Transform todos from DeepAgents format to A2A format
 */
export function transformTodos(todos: unknown[]): A2ATodoItem[] {
  return todos
    .filter((todo): todo is Record<string, unknown> => typeof todo === "object" && todo !== null)
    .map((todo) => ({
      content: String(todo.content || ""),
      status: (todo.status as A2ATodoItem["status"]) || "pending",
      activeForm: String(todo.activeForm || todo.content || ""),
    }));
}

/**
 * Transform LangGraph stream event to A2A stream event
 */
export function transformStreamEvent(event: unknown): A2AStreamEvent | null {
  if (!event || typeof event !== "object") {
    return null;
  }

  const evt = event as any;
  const timestamp = new Date().toISOString();

  // Handle different event types
  switch (evt.event) {
    case "on_chat_model_stream":
      // Token streaming
      if (evt.data?.chunk?.content) {
        return {
          type: A2AStreamEventType.TOKEN,
          data: {
            token: evt.data.chunk.content,
            id: evt.run_id,
          },
          timestamp,
        };
      }
      break;

    case "on_tool_start":
      // Tool execution start
      return {
        type: A2AStreamEventType.TOOL_START,
        data: {
          toolName: evt.name,
          toolInput: evt.data?.input,
          id: evt.run_id,
        },
        timestamp,
      };

    case "on_tool_end":
      // Tool execution end
      return {
        type: A2AStreamEventType.TOOL_END,
        data: {
          toolName: evt.name,
          toolOutput: evt.data?.output,
          id: evt.run_id,
        },
        timestamp,
      };

    case "on_chain_end":
      // Message completion
      if (evt.data?.output?.messages) {
        return {
          type: A2AStreamEventType.MESSAGE,
          data: {
            messages: transformMessages(evt.data.output.messages),
          },
          timestamp,
        };
      }
      break;
  }

  // Handle LangGraph-specific events
  if (evt.metadata?.langgraph_node) {
    const node = evt.metadata.langgraph_node;

    if (node === "todos" && evt.data?.todos) {
      // Todo list update
      return {
        type: A2AStreamEventType.STATE_UPDATE,
        data: {
          key: "todos",
          value: transformTodos(evt.data.todos),
        },
        timestamp,
      };
    }

    if (node === "files" && evt.data?.files) {
      // File system update
      return {
        type: A2AStreamEventType.STATE_UPDATE,
        data: {
          key: "files",
          value: transformFiles(evt.data.files),
        },
        timestamp,
      };
    }
  }

  return null;
}

/**
 * Transform A2A tool call to LangChain format
 */
export function transformToolCall(toolCall: A2AToolCall): {
  id: string;
  name: string;
  args: Record<string, unknown>;
} {
  return {
    id: toolCall.id,
    name: toolCall.function.name,
    args: JSON.parse(toolCall.function.arguments),
  };
}
