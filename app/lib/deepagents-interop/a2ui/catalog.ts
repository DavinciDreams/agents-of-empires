/**
 * A2UI Component Catalog
 *
 * Pre-approved UI components that agents can render.
 * Based on Google's A2UI protocol specification.
 */

import { A2UIComponentType } from "../types/a2ui";

/**
 * Component definition with validation rules
 */
export interface ComponentDefinition {
  type: A2UIComponentType;
  description: string;
  props: Record<string, PropDefinition>;
  allowsChildren?: boolean;
  category: "display" | "input" | "layout" | "feedback" | "data";
}

/**
 * Property definition with type and validation
 */
export interface PropDefinition {
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  description: string;
  default?: unknown;
  enum?: unknown[];
  validation?: (value: unknown) => boolean;
}

/**
 * Pre-approved component catalog
 */
export const COMPONENT_CATALOG: Record<string, ComponentDefinition> = {
  // Display Components
  text: {
    type: "text",
    description: "Display text content with optional formatting",
    category: "display",
    props: {
      content: {
        type: "string",
        required: true,
        description: "Text content to display",
      },
      variant: {
        type: "string",
        description: "Text variant (body, heading, caption, etc.)",
        enum: ["body", "heading", "subheading", "caption", "code"],
        default: "body",
      },
      color: {
        type: "string",
        description: "Text color",
        enum: ["default", "primary", "secondary", "success", "warning", "error"],
        default: "default",
      },
    },
  },

  markdown: {
    type: "markdown",
    description: "Render markdown content",
    category: "display",
    props: {
      content: {
        type: "string",
        required: true,
        description: "Markdown content to render",
      },
    },
  },

  code: {
    type: "code",
    description: "Display code with syntax highlighting",
    category: "display",
    props: {
      content: {
        type: "string",
        required: true,
        description: "Code content",
      },
      language: {
        type: "string",
        description: "Programming language for syntax highlighting",
        default: "plaintext",
      },
      showLineNumbers: {
        type: "boolean",
        description: "Show line numbers",
        default: false,
      },
    },
  },

  // Feedback Components
  progress: {
    type: "progress",
    description: "Display progress indicator",
    category: "feedback",
    props: {
      value: {
        type: "number",
        required: true,
        description: "Progress value (0-100)",
        validation: (v) => typeof v === "number" && v >= 0 && v <= 100,
      },
      label: {
        type: "string",
        description: "Progress label",
      },
      status: {
        type: "string",
        description: "Progress status",
        enum: ["active", "success", "error", "warning"],
        default: "active",
      },
    },
  },

  spinner: {
    type: "spinner",
    description: "Display loading spinner",
    category: "feedback",
    props: {
      size: {
        type: "string",
        description: "Spinner size",
        enum: ["small", "medium", "large"],
        default: "medium",
      },
      label: {
        type: "string",
        description: "Loading label",
      },
    },
  },

  status: {
    type: "status",
    description: "Display status indicator",
    category: "feedback",
    props: {
      state: {
        type: "string",
        required: true,
        description: "Status state",
        enum: ["idle", "working", "success", "error", "warning"],
      },
      message: {
        type: "string",
        description: "Status message",
      },
      details: {
        type: "string",
        description: "Additional details",
      },
    },
  },

  // Data Components
  list: {
    type: "list",
    description: "Display list of items",
    category: "data",
    allowsChildren: true,
    props: {
      items: {
        type: "array",
        description: "List items",
      },
      ordered: {
        type: "boolean",
        description: "Ordered (numbered) list",
        default: false,
      },
    },
  },

  table: {
    type: "table",
    description: "Display tabular data",
    category: "data",
    props: {
      columns: {
        type: "array",
        required: true,
        description: "Column definitions",
      },
      rows: {
        type: "array",
        required: true,
        description: "Table rows",
      },
      sortable: {
        type: "boolean",
        description: "Enable column sorting",
        default: false,
      },
    },
  },

  card: {
    type: "card",
    description: "Display card container",
    category: "layout",
    allowsChildren: true,
    props: {
      title: {
        type: "string",
        description: "Card title",
      },
      subtitle: {
        type: "string",
        description: "Card subtitle",
      },
      variant: {
        type: "string",
        description: "Card variant",
        enum: ["default", "elevated", "outlined"],
        default: "default",
      },
    },
  },

  // Layout Components
  container: {
    type: "container",
    description: "Generic container for grouping components",
    category: "layout",
    allowsChildren: true,
    props: {
      direction: {
        type: "string",
        description: "Layout direction",
        enum: ["horizontal", "vertical"],
        default: "vertical",
      },
      spacing: {
        type: "string",
        description: "Spacing between children",
        enum: ["none", "small", "medium", "large"],
        default: "medium",
      },
      align: {
        type: "string",
        description: "Alignment",
        enum: ["start", "center", "end", "stretch"],
        default: "start",
      },
    },
  },

  divider: {
    type: "divider",
    description: "Visual divider",
    category: "layout",
    props: {
      orientation: {
        type: "string",
        description: "Divider orientation",
        enum: ["horizontal", "vertical"],
        default: "horizontal",
      },
    },
  },

  // Input Components (for future interactive features)
  button: {
    type: "button",
    description: "Clickable button",
    category: "input",
    props: {
      label: {
        type: "string",
        required: true,
        description: "Button label",
      },
      variant: {
        type: "string",
        description: "Button variant",
        enum: ["primary", "secondary", "text"],
        default: "primary",
      },
      disabled: {
        type: "boolean",
        description: "Disabled state",
        default: false,
      },
      action: {
        type: "string",
        description: "Action ID to execute on click",
      },
    },
  },

  input: {
    type: "input",
    description: "Text input field",
    category: "input",
    props: {
      label: {
        type: "string",
        description: "Input label",
      },
      placeholder: {
        type: "string",
        description: "Placeholder text",
      },
      value: {
        type: "string",
        description: "Input value",
        default: "",
      },
      disabled: {
        type: "boolean",
        description: "Disabled state",
        default: false,
      },
    },
  },
};

/**
 * Validate component against catalog
 */
export function validateComponent(
  type: string,
  props: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const definition = COMPONENT_CATALOG[type];

  if (!definition) {
    return { valid: false, errors: [`Component type "${type}" not found in catalog`] };
  }

  // Check required props
  for (const [propName, propDef] of Object.entries(definition.props)) {
    if (propDef.required && !(propName in props)) {
      errors.push(`Required prop "${propName}" missing for component "${type}"`);
    }

    const propValue = props[propName];
    if (propValue !== undefined) {
      // Type check
      const actualType = Array.isArray(propValue) ? "array" : typeof propValue;
      if (actualType !== propDef.type) {
        errors.push(
          `Prop "${propName}" has incorrect type: expected ${propDef.type}, got ${actualType}`
        );
      }

      // Enum check
      if (propDef.enum && !propDef.enum.includes(propValue)) {
        errors.push(
          `Prop "${propName}" has invalid value: must be one of ${propDef.enum.join(", ")}`
        );
      }

      // Custom validation
      if (propDef.validation && !propDef.validation(propValue)) {
        errors.push(`Prop "${propName}" failed validation`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get component definition
 */
export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  return COMPONENT_CATALOG[type];
}

/**
 * Get all components by category
 */
export function getComponentsByCategory(
  category: ComponentDefinition["category"]
): ComponentDefinition[] {
  return Object.values(COMPONENT_CATALOG).filter((def) => def.category === category);
}

/**
 * Check if component allows children
 */
export function allowsChildren(type: string): boolean {
  return COMPONENT_CATALOG[type]?.allowsChildren ?? false;
}
