"use client";

/**
 * A2UI React Renderer
 *
 * Renders A2UI component messages as React components.
 * Handles real-time updates from streaming endpoints.
 */

import React, { useMemo } from "react";
import { A2UIMessage } from "@/app/lib/deepagents-interop/types/a2ui";

// Import component renderers
import { TextComponent } from "./components/Text";
import { MarkdownComponent } from "./components/Markdown";
import { CodeComponent } from "./components/Code";
import { CardComponent } from "./components/Card";
import { ContainerComponent } from "./components/Container";
import { ListComponent } from "./components/List";
import { TableComponent } from "./components/Table";
import { ProgressComponent } from "./components/Progress";
import { SpinnerComponent } from "./components/Spinner";
import { StatusComponent } from "./components/Status";
import { DividerComponent } from "./components/Divider";
import { ButtonComponent } from "./components/Button";
import { InputComponent } from "./components/Input";

/**
 * Component map
 */
const COMPONENT_MAP: Record<string, React.FC<any>> = {
  text: TextComponent,
  markdown: MarkdownComponent,
  code: CodeComponent,
  card: CardComponent,
  container: ContainerComponent,
  list: ListComponent,
  table: TableComponent,
  progress: ProgressComponent,
  spinner: SpinnerComponent,
  status: StatusComponent,
  divider: DividerComponent,
  button: ButtonComponent,
  input: InputComponent,
};

/**
 * A2UI Renderer Props
 */
export interface A2UIRendererProps {
  /** A2UI message to render */
  message: A2UIMessage;

  /** Handler for interactive events */
  onEvent?: (eventId: string, data: unknown) => void;

  /** Custom component map (for extending) */
  customComponents?: Record<string, React.FC<any>>;
}

/**
 * A2UI Renderer Component
 *
 * Recursively renders A2UI messages as React components.
 */
export function A2UIRenderer({
  message,
  onEvent,
  customComponents = {},
}: A2UIRendererProps) {
  // Merge custom components with default map
  const componentMap = useMemo(
    () => ({ ...COMPONENT_MAP, ...customComponents }),
    [customComponents]
  );

  // Handle remove messages
  if (message.type === "remove") {
    return null;
  }

  // Get component renderer
  const Component = componentMap[message.component];

  if (!Component) {
    console.warn(`Unknown component type: ${message.component}`);
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">
          Unknown component: <code>{message.component}</code>
        </p>
      </div>
    );
  }

  // Render children if present
  const children = message.children?.map((child, index) => (
    <A2UIRenderer
      key={child.id || `${message.id}-child-${index}`}
      message={child}
      onEvent={onEvent}
      customComponents={customComponents}
    />
  ));

  // Render component with props and children
  return (
    <Component
      key={message.id}
      id={message.id}
      {...message.props}
      onEvent={onEvent}
    >
      {children}
    </Component>
  );
}

/**
 * A2UI Stream Renderer
 *
 * Manages state from streaming A2UI messages.
 */
export function A2UIStreamRenderer({
  onEvent,
  customComponents,
}: {
  onEvent?: (eventId: string, data: unknown) => void;
  customComponents?: Record<string, React.FC<any>>;
}) {
  const [components, setComponents] = React.useState<Map<string, A2UIMessage>>(
    new Map()
  );
  const [rootIds, setRootIds] = React.useState<string[]>([]);

  /**
   * Handle new A2UI message
   */
  const handleMessage = React.useCallback((message: A2UIMessage) => {
    if (message.type === "component") {
      // Add or replace component
      setComponents((prev) => {
        const next = new Map(prev);
        next.set(message.id, message);
        return next;
      });

      // Add to root if no parent
      if (!message.parentId) {
        setRootIds((prev) => {
          if (prev.includes(message.id)) return prev;
          return [...prev, message.id];
        });
      }
    } else if (message.type === "update") {
      // Update existing component props
      setComponents((prev) => {
        const next = new Map(prev);
        const existing = next.get(message.id);
        if (existing) {
          next.set(message.id, {
            ...existing,
            props: {
              ...existing.props,
              ...message.props,
            },
          });
        }
        return next;
      });
    } else if (message.type === "remove") {
      // Remove component
      setComponents((prev) => {
        const next = new Map(prev);
        next.delete(message.id);
        return next;
      });

      setRootIds((prev) => prev.filter((id) => id !== message.id));
    }
  }, []);

  /**
   * Expose handleMessage for parent components
   */
  React.useImperativeHandle(
    React.useRef<any>(),
    () => ({
      handleMessage,
      clear: () => {
        setComponents(new Map());
        setRootIds([]);
      },
    }),
    [handleMessage]
  );

  // Render root components
  return (
    <div className="space-y-4">
      {rootIds.map((id) => {
        const message = components.get(id);
        if (!message) return null;

        return (
          <A2UIRenderer
            key={id}
            message={message}
            onEvent={onEvent}
            customComponents={customComponents}
          />
        );
      })}
    </div>
  );
}

/**
 * Hook for A2UI streaming
 */
export function useA2UIStream(url: string, request: unknown) {
  const [components, setComponents] = React.useState<A2UIMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const connect = React.useCallback(async () => {
    setIsStreaming(true);
    setError(null);
    setComponents([]);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            try {
              const message = JSON.parse(data);
              if (message.type === "complete") {
                setIsStreaming(false);
              } else if (message.type === "error") {
                setError(new Error(message.error?.message || "Unknown error"));
                setIsStreaming(false);
              } else {
                setComponents((prev) => [...prev, message]);
              }
            } catch (e) {
              console.warn("Failed to parse SSE message:", data);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsStreaming(false);
    }
  }, [url, request]);

  return {
    components,
    isStreaming,
    error,
    connect,
  };
}
