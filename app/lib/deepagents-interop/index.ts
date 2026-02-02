/**
 * DeepAgents Interoperability Library
 *
 * Provides integration between deepagentsjs and:
 * - A2A (Agent-to-Agent) Protocol
 * - A2UI (Agent-to-UI) Protocol
 * - Microsoft Agent Framework
 */

// Type exports
export * from "./types";

// Agent Card exports
export * from "./agent-card";

// A2A Protocol
export * from "./a2a";

// A2UI Protocol
export {
  A2UIWrapper,
  stateToA2UI,
  createComponent,
  createUpdate,
  createRemove,
  validateComponent,
  getComponentDefinition,
  getComponentsByCategory,
  allowsChildren,
  transformStreamEvent as transformStreamEventA2UI,
  createProgressUpdate,
  createError,
  createCompletion,
  COMPONENT_CATALOG,
} from "./a2ui";

// Backend exports
export { createStoreBackend, defaultStoreBackend } from "./backends/store-backend";

// Sandbox exports
export { LocalSandbox } from "./sandbox";
