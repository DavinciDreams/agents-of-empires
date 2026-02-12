/**
 * E2B Unsandbox Manager
 *
 * Manages E2B remote sandboxes for agent code execution and file operations.
 * Provides lifecycle management, error handling, and automatic cleanup.
 */

import { Sandbox } from "@e2b/code-interpreter";

/**
 * Sandbox instance with metadata
 */
interface SandboxInstance {
  sandbox: Sandbox;
  agentId: string;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * Configuration options for the unsandbox manager
 */
export interface UnsandboxManagerOptions {
  /**
   * E2B API key (defaults to process.env.E2B_API_KEY)
   */
  apiKey?: string;

  /**
   * Maximum idle time before auto-cleanup (milliseconds)
   * Default: 30 minutes
   */
  maxIdleTime?: number;

  /**
   * Cleanup interval for checking idle sandboxes (milliseconds)
   * Default: 5 minutes
   */
  cleanupInterval?: number;
}

/**
 * E2B Unsandbox Manager
 *
 * Manages remote sandboxes for agent execution using E2B CodeInterpreter.
 */
export class UnsandboxManager {
  private sandboxes: Map<string, SandboxInstance> = new Map();
  private apiKey: string | undefined;
  private maxIdleTime: number;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: UnsandboxManagerOptions = {}) {
    this.apiKey = options.apiKey || process.env.E2B_API_KEY;
    this.maxIdleTime = options.maxIdleTime || 30 * 60 * 1000; // 30 minutes
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5 minutes

    // Start automatic cleanup
    this.startAutoCleanup();
  }

  /**
   * Check if E2B is available (API key is set)
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Create a new sandbox for an agent
   *
   * @param agentId - Unique identifier for the agent
   * @returns The created sandbox instance
   * @throws Error if E2B API key is not configured or creation fails
   */
  async createSandbox(agentId: string): Promise<Sandbox> {
    if (!this.apiKey) {
      throw new Error(
        "E2B_API_KEY is not configured. Set it in your .env file to use remote sandboxes."
      );
    }

    // If sandbox already exists, return it
    const existing = this.sandboxes.get(agentId);
    if (existing) {
      existing.lastUsed = new Date();
      return existing.sandbox;
    }

    try {
      console.log(`[UnsandboxManager] Creating E2B sandbox for agent: ${agentId}`);

      const sandbox = await Sandbox.create({
        apiKey: this.apiKey,
        metadata: {
          agentId,
          createdAt: new Date().toISOString(),
        },
      });

      const instance: SandboxInstance = {
        sandbox,
        agentId,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      this.sandboxes.set(agentId, instance);

      console.log(
        `[UnsandboxManager] Successfully created sandbox for agent: ${agentId} (ID: ${sandbox.sandboxId})`
      );

      return sandbox;
    } catch (error) {
      console.error(`[UnsandboxManager] Failed to create sandbox for agent ${agentId}:`, error);
      throw new Error(
        `Failed to create E2B sandbox: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get an existing sandbox for an agent
   *
   * @param agentId - Unique identifier for the agent
   * @returns The sandbox instance or null if not found
   */
  getSandbox(agentId: string): Sandbox | null {
    const instance = this.sandboxes.get(agentId);
    if (instance) {
      instance.lastUsed = new Date();
      return instance.sandbox;
    }
    return null;
  }

  /**
   * Get or create a sandbox for an agent
   *
   * @param agentId - Unique identifier for the agent
   * @returns The sandbox instance
   */
  async getOrCreateSandbox(agentId: string): Promise<Sandbox> {
    const existing = this.getSandbox(agentId);
    if (existing) {
      return existing;
    }
    return this.createSandbox(agentId);
  }

  /**
   * Destroy a sandbox for an agent
   *
   * @param agentId - Unique identifier for the agent
   */
  async destroySandbox(agentId: string): Promise<void> {
    const instance = this.sandboxes.get(agentId);
    if (!instance) {
      return;
    }

    try {
      console.log(`[UnsandboxManager] Destroying sandbox for agent: ${agentId}`);
      await instance.sandbox.kill();
      this.sandboxes.delete(agentId);
      console.log(`[UnsandboxManager] Successfully destroyed sandbox for agent: ${agentId}`);
    } catch (error) {
      console.error(`[UnsandboxManager] Error destroying sandbox for agent ${agentId}:`, error);
      // Still remove from map even if kill fails
      this.sandboxes.delete(agentId);
    }
  }

  /**
   * Destroy all sandboxes
   */
  async destroyAll(): Promise<void> {
    console.log(`[UnsandboxManager] Destroying all sandboxes (${this.sandboxes.size} active)`);

    const destroyPromises = Array.from(this.sandboxes.keys()).map((agentId) =>
      this.destroySandbox(agentId)
    );

    await Promise.allSettled(destroyPromises);

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get statistics about active sandboxes
   */
  getStats() {
    const now = new Date();
    const instances = Array.from(this.sandboxes.values());

    return {
      total: instances.length,
      agentIds: instances.map((i) => i.agentId),
      oldestCreated: instances.reduce(
        (oldest, i) => (i.createdAt < oldest ? i.createdAt : oldest),
        now
      ),
      oldestUsed: instances.reduce(
        (oldest, i) => (i.lastUsed < oldest ? i.lastUsed : oldest),
        now
      ),
    };
  }

  /**
   * Start automatic cleanup of idle sandboxes
   */
  private startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleSandboxes();
    }, this.cleanupInterval);

    // Note: In serverless environments (Vercel), process lifecycle hooks may not work.
    // Manual cleanup is required via destroyAll() or sandbox timeouts.
    // For local development, attempt graceful shutdown:
    if (typeof process !== 'undefined' && process.on && process.env.NODE_ENV !== 'production') {
      process.on("beforeExit", () => {
        this.destroyAll();
      });
    }
  }

  /**
   * Clean up sandboxes that have been idle for too long
   */
  private async cleanupIdleSandboxes(): Promise<void> {
    const now = new Date();
    const toDestroy: string[] = [];

    // Convert iterator to array for compatibility
    const entries = Array.from(this.sandboxes.entries());
    for (const [agentId, instance] of entries) {
      const idleTime = now.getTime() - instance.lastUsed.getTime();
      if (idleTime > this.maxIdleTime) {
        toDestroy.push(agentId);
      }
    }

    if (toDestroy.length > 0) {
      console.log(
        `[UnsandboxManager] Cleaning up ${toDestroy.length} idle sandboxes: ${toDestroy.join(", ")}`
      );

      for (const agentId of toDestroy) {
        await this.destroySandbox(agentId);
      }
    }
  }
}

// Singleton instance for the application
let globalManager: UnsandboxManager | null = null;

/**
 * Get the global unsandbox manager instance
 */
export function getUnsandboxManager(): UnsandboxManager {
  if (!globalManager) {
    globalManager = new UnsandboxManager();
  }
  return globalManager;
}

/**
 * Reset the global manager (useful for testing)
 */
export function resetUnsandboxManager(): void {
  if (globalManager) {
    globalManager.destroyAll();
    globalManager = null;
  }
}
