/**
 * A2UI Adapter
 *
 * Transforms LangGraph agent state into A2UI component messages.
 * Maps agent execution state to declarative UI components.
 */

import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { A2UIMessage } from "../types/a2ui";
import { validateComponent } from "./catalog";

/**
 * Transform agent state to A2UI messages
 */
export function stateToA2UI(state: Record<string, unknown>): A2UIMessage[] {
  const messages: A2UIMessage[] = [];

  // Transform agent messages to UI
  if (state.messages && Array.isArray(state.messages)) {
    messages.push(...transformMessages(state.messages as BaseMessage[]));
  }

  // Transform todos to UI
  if (state.todos && Array.isArray(state.todos)) {
    messages.push(transformTodos(state.todos));
  }

  // Transform files to UI
  if (state.files && Array.isArray(state.files)) {
    messages.push(transformFiles(state.files));
  }

  // Transform agent status
  if (state.status && typeof state.status === 'object' && state.status !== null && 'state' in state.status) {
    messages.push(transformStatus(state.status as { state: string; message?: string; progress?: number }));
  }

  return messages;
}

/**
 * Transform LangGraph messages to A2UI components
 */
function transformMessages(messages: BaseMessage[]): A2UIMessage[] {
  return messages.map((msg, index) => {
    const isUser = msg instanceof HumanMessage;
    const isAI = msg instanceof AIMessage;
    const isSystem = msg instanceof SystemMessage;

    let content = "";
    if (typeof msg.content === "string") {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Handle multi-part content
      content = msg.content
        .map((part) => {
          if (typeof part === "string") return part;
          if (typeof part === "object" && "text" in part) return part.text;
          return "";
        })
        .join("\n");
    }

    // Determine if content is code/markdown or plain text
    const hasCodeBlock = content.includes("```");
    const hasMarkdown = /[#*\[\]`]/.test(content);

    return {
      type: "component",
      id: `message-${index}`,
      component: hasCodeBlock || hasMarkdown ? "markdown" : "text",
      props: {
        content,
        variant: isSystem ? "caption" : isUser ? "body" : "body",
        color: isUser ? "primary" : isAI ? "default" : "secondary",
      },
      metadata: {
        role: isUser ? "user" : isAI ? "assistant" : "system",
        timestamp: new Date().toISOString(),
      },
    };
  });
}

/**
 * Transform todos to A2UI component
 */
function transformTodos(
  todos: Array<{ content: string; status: string; activeForm?: string }>
): A2UIMessage {
  const todoItems = todos.map((todo, index) => ({
    type: "component" as const,
    id: `todo-item-${index}`,
    component: "text" as const,
    props: {
      content: `${getStatusIcon(todo.status)} ${
        todo.status === "in_progress" && todo.activeForm ? todo.activeForm : todo.content
      }`,
      variant: "body",
      color: getStatusColor(todo.status),
    },
  }));

  return {
    type: "component",
    id: "todos",
    component: "card",
    props: {
      title: "Tasks",
      variant: "outlined",
    },
    children: [
      {
        type: "component",
        id: "todo-list",
        component: "list",
        props: {
          items: todoItems,
          ordered: false,
        },
        children: todoItems,
      },
    ],
  };
}

/**
 * Transform files to A2UI component
 */
function transformFiles(files: Array<{ path: string; status: string; content?: string }>): A2UIMessage {
  return {
    type: "component",
    id: "files",
    component: "card",
    props: {
      title: "Modified Files",
      variant: "outlined",
    },
    children: [
      {
        type: "component",
        id: "file-list",
        component: "list",
        props: {
          items: files.map((file) => ({
            path: file.path,
            status: file.status,
          })),
        },
        children: files.map((file, index) => ({
          type: "component" as const,
          id: `file-${index}`,
          component: "text" as const,
          props: {
            content: `${getFileStatusIcon(file.status)} ${file.path}`,
            variant: "body",
            color: getFileStatusColor(file.status),
          },
        })),
      },
    ],
  };
}

/**
 * Transform agent status to A2UI component
 */
function transformStatus(status: {
  state: string;
  message?: string;
  progress?: number;
}): A2UIMessage {
  const children: A2UIMessage[] = [];

  // Status indicator
  children.push({
    type: "component",
    id: "status-indicator",
    component: "status",
    props: {
      state: mapStatusState(status.state),
      message: status.message || "Processing...",
    },
  });

  // Progress bar if available
  if (status.progress !== undefined) {
    children.push({
      type: "component",
      id: "progress-bar",
      component: "progress",
      props: {
        value: status.progress,
        label: `${Math.round(status.progress)}% complete`,
        status: "active",
      },
    });
  }

  return {
    type: "component",
    id: "agent-status",
    component: "container",
    props: {
      direction: "vertical",
      spacing: "small",
    },
    children,
  };
}

/**
 * Create A2UI component message
 */
export function createComponent(
  id: string,
  component: string,
  props: Record<string, unknown>,
  children?: A2UIMessage[]
): A2UIMessage {
  // Validate component
  const validation = validateComponent(component, props);
  if (!validation.valid) {
    throw new Error(
      `Invalid component "${component}": ${validation.errors.join(", ")}`
    );
  }

  return {
    type: "component",
    id,
    component: component as any,
    props,
    ...(children && { children }),
  };
}

/**
 * Create update message for existing component
 */
export function createUpdate(
  id: string,
  props: Record<string, unknown>
): Omit<A2UIMessage, "component"> & { type: "update" } {
  return {
    type: "update",
    id,
    props,
  };
}

/**
 * Create remove message for component
 */
export function createRemove(id: string): Omit<A2UIMessage, "component" | "props"> & { type: "remove" } {
  return {
    type: "remove",
    id,
  };
}

/**
 * Helper: Get status icon
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "✅";
    case "in_progress":
      return "🔄";
    case "pending":
      return "⏳";
    case "failed":
      return "❌";
    default:
      return "•";
  }
}

/**
 * Helper: Get status color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "success";
    case "in_progress":
      return "primary";
    case "failed":
      return "error";
    default:
      return "default";
  }
}

/**
 * Helper: Get file status icon
 */
function getFileStatusIcon(status: string): string {
  switch (status) {
    case "created":
      return "➕";
    case "modified":
      return "✏️";
    case "deleted":
      return "🗑️";
    default:
      return "📄";
  }
}

/**
 * Helper: Get file status color
 */
function getFileStatusColor(status: string): string {
  switch (status) {
    case "created":
      return "success";
    case "modified":
      return "warning";
    case "deleted":
      return "error";
    default:
      return "default";
  }
}

/**
 * Helper: Map agent status to A2UI status state
 */
function mapStatusState(state: string): "idle" | "working" | "success" | "error" | "warning" {
  switch (state.toLowerCase()) {
    case "idle":
    case "pending":
      return "idle";
    case "running":
    case "processing":
    case "in_progress":
      return "working";
    case "completed":
    case "success":
      return "success";
    case "failed":
    case "error":
      return "error";
    case "warning":
    case "paused":
      return "warning";
    default:
      return "idle";
  }
}
