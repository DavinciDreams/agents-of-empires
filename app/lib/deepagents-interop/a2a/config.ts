/**
 * A2A Configuration and Initialization
 */

import { AgentRegistry, initializeDefaultAgents } from "./registry";
import { ExecutionTracker } from "./execution-tracker";

/**
 * Initialize A2A system
 */
export function initializeA2A() {
  // Initialize default agents
  initializeDefaultAgents();

  // Get instances (triggers singleton creation)
  AgentRegistry.getInstance();
  ExecutionTracker.getInstance();

  console.log("[A2A] System initialized");
}

/**
 * Get A2A configuration
 */
export function getA2AConfig() {
  const registry = AgentRegistry.getInstance();
  const tracker = ExecutionTracker.getInstance();

  return {
    agents: {
      registered: registry.listAgents().length,
      cache: registry.getCacheStats(),
    },
    executions: tracker.getStats(),
  };
}
