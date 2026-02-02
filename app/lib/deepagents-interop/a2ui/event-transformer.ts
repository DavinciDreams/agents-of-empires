/**
 * A2UI Event Transformer
 *
 * Transforms LangGraph streaming events into A2UI component messages.
 * Enables real-time UI updates as the agent executes.
 */

import { A2UIMessage } from "../types/a2ui";
import { createComponent, createUpdate } from "./adapter";

/**
 * LangGraph event types we handle
 */
export type LangGraphEvent = {
  event: string;
  name?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

/**
 * Transform LangGraph stream event to A2UI message(s)
 */
export function transformStreamEvent(event: LangGraphEvent): A2UIMessage[] {
  const messages: A2UIMessage[] = [];

  switch (event.event) {
    case "on_chain_start":
      messages.push(handleChainStart(event));
      break;

    case "on_chain_stream":
      messages.push(...handleChainStream(event));
      break;

    case "on_chain_end":
      messages.push(handleChainEnd(event));
      break;

    case "on_tool_start":
      messages.push(handleToolStart(event));
      break;

    case "on_tool_end":
      messages.push(handleToolEnd(event));
      break;

    case "on_chat_model_stream":
      messages.push(...handleChatStream(event));
      break;

    case "on_llm_new_token":
      messages.push(handleTokenStream(event));
      break;

    default:
      // Unknown event, skip
      break;
  }

  return messages;
}

/**
 * Handle chain start event
 */
function handleChainStart(event: LangGraphEvent): A2UIMessage {
  return createComponent(
    `status-${Date.now()}`,
    "status",
    {
      state: "working",
      message: `Starting ${event.name || "agent"}...`,
    }
  );
}

/**
 * Handle chain stream event (incremental state updates)
 */
function handleChainStream(event: LangGraphEvent): A2UIMessage[] {
  const messages: A2UIMessage[] = [];
  const data = event.data || {};

  // Handle message updates
  if (data.messages && Array.isArray(data.messages)) {
    const lastMessage = data.messages[data.messages.length - 1];
    if (lastMessage) {
      messages.push(
        createComponent(
          `message-${data.messages.length - 1}`,
          "markdown",
          {
            content: lastMessage.content || "",
          }
        )
      );
    }
  }

  // Handle todo updates
  if (data.todos && Array.isArray(data.todos)) {
    const inProgress = data.todos.find((t: any) => t.status === "in_progress");
    if (inProgress) {
      messages.push(
        createUpdate(`todo-status`, {
          message: inProgress.activeForm || inProgress.content,
        }) as any
      );
    }
  }

  // Handle file updates
  if (data.files && Array.isArray(data.files)) {
    messages.push(
      createUpdate(`file-count`, {
        content: `${data.files.length} file(s) modified`,
      }) as any
    );
  }

  return messages;
}

/**
 * Handle chain end event
 */
function handleChainEnd(event: LangGraphEvent): A2UIMessage {
  return createComponent(
    `status-${Date.now()}`,
    "status",
    {
      state: "success",
      message: `Completed ${event.name || "agent"}`,
    }
  );
}

/**
 * Handle tool start event
 */
function handleToolStart(event: LangGraphEvent): A2UIMessage {
  const toolName = event.name || "tool";
  const input = event.data?.input;

  let message = `Using ${toolName}`;
  if (input && typeof input === "object") {
    const inputStr = JSON.stringify(input, null, 2);
    if (inputStr.length < 100) {
      message += `: ${inputStr}`;
    }
  }

  return createComponent(
    `tool-${toolName}-${Date.now()}`,
    "card",
    {
      title: `Tool: ${toolName}`,
      variant: "outlined",
    },
    [
      createComponent(
        `tool-${toolName}-status`,
        "status",
        {
          state: "working",
          message,
        }
      ),
    ]
  );
}

/**
 * Handle tool end event
 */
function handleToolEnd(event: LangGraphEvent): A2UIMessage {
  const toolName = event.name || "tool";
  const output = event.data?.output;

  let details = "";
  if (output) {
    if (typeof output === "string") {
      details = output.length > 200 ? output.substring(0, 200) + "..." : output;
    } else {
      const outputStr = JSON.stringify(output, null, 2);
      details = outputStr.length > 200 ? outputStr.substring(0, 200) + "..." : outputStr;
    }
  }

  return createUpdate(`tool-${toolName}-status`, {
    state: "success",
    message: `Completed ${toolName}`,
    details,
  }) as any;
}

/**
 * Handle chat model stream (token by token)
 */
function handleChatStream(event: LangGraphEvent): A2UIMessage[] {
  const messages: A2UIMessage[] = [];
  const chunk = event.data?.chunk;

  if (chunk && typeof chunk === "object" && "content" in chunk) {
    // Create or update streaming message
    messages.push(
      createUpdate("streaming-response", {
        content: chunk.content,
      }) as any
    );
  }

  return messages;
}

/**
 * Handle individual token stream
 */
function handleTokenStream(event: LangGraphEvent): A2UIMessage {
  const token = event.data?.token || "";

  return createUpdate("streaming-response", {
    content: token,
    append: true, // Hint to append rather than replace
  }) as any;
}

/**
 * Create progress update from execution info
 */
export function createProgressUpdate(
  stepsCompleted: number,
  totalSteps: number,
  currentStep: string
): A2UIMessage {
  const progress = totalSteps > 0 ? (stepsCompleted / totalSteps) * 100 : 0;

  return createComponent("execution-progress", "container", {
    direction: "vertical",
    spacing: "small",
  }, [
    createComponent("progress-bar", "progress", {
      value: progress,
      label: `Step ${stepsCompleted}/${totalSteps}`,
      status: "active",
    }),
    createComponent("current-step", "text", {
      content: currentStep,
      variant: "caption",
      color: "secondary",
    }),
  ]);
}

/**
 * Create error component
 */
export function createError(error: Error): A2UIMessage {
  return createComponent("error", "card", {
    title: "Error",
    variant: "outlined",
  }, [
    createComponent("error-status", "status", {
      state: "error",
      message: error.message,
      details: error.stack,
    }),
  ]);
}

/**
 * Create completion component
 */
export function createCompletion(result: {
  duration?: number;
  checkpointId?: string;
}): A2UIMessage {
  return createComponent("completion", "card", {
    title: "Completed",
    variant: "elevated",
  }, [
    createComponent("completion-status", "status", {
      state: "success",
      message: "Task completed successfully",
      details: result.duration
        ? `Duration: ${(result.duration / 1000).toFixed(2)}s`
        : undefined,
    }),
    ...(result.checkpointId
      ? [
          createComponent("checkpoint", "text", {
            content: `Checkpoint: ${result.checkpointId}`,
            variant: "caption",
            color: "secondary",
          }),
        ]
      : []),
  ]);
}
