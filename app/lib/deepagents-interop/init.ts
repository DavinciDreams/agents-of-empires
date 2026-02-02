/**
 * Initialization Script for A2A System
 *
 * Call this on server startup to initialize the A2A system.
 */

import { initializeA2A } from "./a2a/config";

// Auto-initialize on import
if (typeof window === "undefined") {
  // Server-side only
  initializeA2A();
}

export { initializeA2A };
