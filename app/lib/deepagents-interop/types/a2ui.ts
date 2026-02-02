/**
 * A2UI (Agent-to-UI) Protocol Type Definitions
 * Based on: https://a2ui.org/
 */

/**
 * A2UI Message - Declarative UI component message
 */
export interface A2UIMessage {
  /** Message type */
  type: "component" | "update" | "remove";

  /** Unique identifier for this component */
  id: string;

  /** Component type from catalog */
  component: A2UIComponentType;

  /** Component properties */
  props: Record<string, unknown>;

  /** Child components */
  children?: A2UIMessage[];

  /** Parent component ID */
  parentId?: string;

  /** Timestamp */
  timestamp?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Component types in the A2UI catalog
 */
export type A2UIComponentType =
  // Display components (lowercase for web compatibility)
  | "text"
  | "markdown"
  | "code"
  | "card"
  | "image"
  | "video"
  | "link"

  // Input components
  | "button"
  | "input"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "slider"

  // Layout components
  | "container"
  | "stack"
  | "grid"
  | "divider"
  | "spacer"

  // Feedback components
  | "progress"
  | "spinner"
  | "status"

  // Data components
  | "list"
  | "table"

  // Agent-specific components (backwards compatibility)
  | "TaskList"
  | "FileTree"
  | "ToolResult"
  | "AgentThinking"
  | "ProgressBar"
  | "StatusBadge";

/**
 * Component catalog definition
 */
export interface A2UIComponentDefinition {
  /** Component type */
  type: A2UIComponentType;

  /** Allowed props for this component */
  props: Record<string, A2UIPropDefinition>;

  /** Whether this component can have children */
  allowsChildren?: boolean;

  /** Description of the component */
  description?: string;
}

/**
 * Prop definition for component validation
 */
export interface A2UIPropDefinition {
  /** Prop type */
  type: "string" | "number" | "boolean" | "object" | "array" | "function";

  /** Whether prop is required */
  required?: boolean;

  /** Default value */
  default?: unknown;

  /** Allowed values (enum) */
  enum?: unknown[];

  /** Description */
  description?: string;
}

/**
 * A2UI Stream - Streaming UI updates
 */
export interface A2UIStream {
  messages: A2UIMessage[];
  complete: boolean;
}

/**
 * Options for A2UI streaming
 */
export interface A2UIStreamOptions {
  /** Abort signal for cancellation */
  signal?: AbortSignal;

  /** Enable batching of updates */
  batchUpdates?: boolean;

  /** Batch interval in milliseconds */
  batchIntervalMs?: number;
}

/**
 * Component catalog - Pre-approved UI components
 */
export interface A2UICatalog {
  /** Catalog version */
  version: string;

  /** Available components */
  components: Record<A2UIComponentType, A2UIComponentDefinition>;

  /** Custom theme configuration */
  theme?: A2UITheme;
}

/**
 * Theme configuration for A2UI components
 */
export interface A2UITheme {
  colors?: {
    primary?: string;
    secondary?: string;
    success?: string;
    warning?: string;
    error?: string;
    info?: string;
    background?: string;
    surface?: string;
    text?: string;
    textSecondary?: string;
  };

  spacing?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };

  typography?: {
    fontFamily?: string;
    fontSize?: {
      xs?: string;
      sm?: string;
      md?: string;
      lg?: string;
      xl?: string;
    };
  };
}

/**
 * Props for common components
 */

export interface CardProps {
  title?: string;
  description?: string;
  actions?: ButtonProps[];
  variant?: "elevated" | "outlined" | "filled";
}

export interface TextProps {
  content: string;
  variant?: "body" | "heading" | "caption" | "subtitle";
  color?: string;
  align?: "left" | "center" | "right";
}

export interface CodeProps {
  language: string;
  content: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export interface ButtonProps {
  label: string;
  onClick?: string; // Event handler ID
  variant?: "primary" | "secondary" | "text" | "outlined";
  disabled?: boolean;
  icon?: string;
}

export interface TextFieldProps {
  label: string;
  value: string;
  onChange?: string; // Event handler ID
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
}

export interface TaskListProps {
  todos: {
    content: string;
    status: "pending" | "in_progress" | "completed";
    activeForm: string;
  }[];
  onUpdate?: string; // Event handler ID
}

export interface FileTreeProps {
  files: {
    path: string;
    type: "file" | "directory";
    size?: number;
    modified?: string;
  }[];
  onSelect?: string; // Event handler ID
  selectedPath?: string;
}

export interface ToolResultProps {
  tool: string;
  result: string | object;
  status: "running" | "success" | "error";
  timestamp: string;
  duration?: number;
}

export interface AgentThinkingProps {
  message: string;
  animated?: boolean;
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  variant?: "linear" | "circular";
  color?: string;
}

export interface StackProps {
  direction: "row" | "column";
  spacing?: string | number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "space-between" | "space-around";
}

export interface GridProps {
  columns: number | string;
  gap?: string | number;
  rows?: number | string;
}
