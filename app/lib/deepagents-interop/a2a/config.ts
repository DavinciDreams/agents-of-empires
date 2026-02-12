/**
 * A2A Configuration and Initialization
 */

import { AgentRegistry, initializeDefaultAgents } from "./registry";
import { ExecutionTracker } from "./execution-tracker";
import { defaultStoreBackend } from "../backends/store-backend";
import { LocalSandbox } from "../sandbox";
import { validateEnv, logEnvValidation } from "@/app/lib/validateEnv";
import path from "node:path";

/**
 * Default memory sources for agent memory
 */
export const DEFAULT_MEMORY_SOURCES = [
  path.join(process.env.HOME || "", ".deepagents", "AGENTS.md"),
  path.join(process.cwd(), ".deepagents", "AGENTS.md"),
];

/**
 * Initialize backend functions
 */
export const backendInit = {
  /**
   * Get the default store backend configuration
   */
  getStoreBackend: () => defaultStoreBackend,

  /**
   * Create a new LocalSandbox instance
   */
  createSandbox: (workingDirectory: string) =>
    new LocalSandbox({ workingDirectory }),
};

/**
 * Initialize A2A system
 */
export function initializeA2A() {
  // Validate environment configuration
  const envResult = validateEnv();
  logEnvValidation(envResult);

  if (!envResult.valid) {
    console.error("[A2A] Initialization failed due to environment configuration errors");
    throw new Error("A2A initialization failed: Invalid environment configuration");
  }

  // Initialize default agents
  initializeDefaultAgents();

  // Get instances (triggers singleton creation)
  AgentRegistry.getInstance();
  ExecutionTracker.getInstance();

  console.log("[A2A] System initialized successfully");
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
    backends: {
      store: !!defaultStoreBackend,
      memorySources: DEFAULT_MEMORY_SOURCES,
    },
  };
}
