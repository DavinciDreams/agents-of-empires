/**
 * Store Backend Configuration
 *
 * Configured StoreBackend with MemorySaver for persistent storage.
 */

import { MemorySaver, InMemoryStore } from "@langchain/langgraph-checkpoint";
import { StoreBackend } from "deepagents";

/**
 * Create a configured StoreBackend instance
 *
 * Uses MemorySaver for checkpointing and InMemoryStore for
 * persistent, cross-conversation file storage.
 */
export function createStoreBackend() {
  const checkpointer = new MemorySaver();
  const store = new InMemoryStore();

  return {
    checkpointer,
    store,
    backend: (config: any) => new StoreBackend(config),
  };
}

/**
 * Default store backend configuration
 */
export const defaultStoreBackend = createStoreBackend();
