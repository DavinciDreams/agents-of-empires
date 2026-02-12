/**
 * Execution Tracker
 *
 * Tracks running agent executions for status checking and cancellation.
 * Integrates with database persistence for durable state management.
 */

import type { A2ARequest } from "../types/a2a";
import { resultsPersistence } from "@/app/lib/results-persistence";

/**
 * Execution status
 */
export type ExecutionStatus = "running" | "completed" | "failed" | "cancelled";

/**
 * Execution information
 */
export interface ExecutionInfo {
  /** Execution ID */
  id: string;

  /** Agent ID */
  agentId: string;

  /** Thread ID */
  threadId: string;

  /** Checkpoint ID (if available) */
  checkpointId?: string;

  /** Execution status */
  status: ExecutionStatus;

  /** Original request */
  request: A2ARequest;

  /** Start time */
  startedAt: Date;

  /** Completion time */
  completedAt?: Date;

  /** Error message (if failed) */
  error?: string;

  /** Abort controller for cancellation */
  abortController?: AbortController;

  /** Progress information */
  progress?: {
    currentStep?: string;
    stepsCompleted: number;
    totalSteps?: number;
  };
}

/**
 * Execution Tracker
 *
 * Singleton tracker for managing execution lifecycle.
 */
export class ExecutionTracker {
  private static instance: ExecutionTracker;
  private executions = new Map<string, ExecutionInfo>();
  private executionsByThread = new Map<string, string>(); // threadId -> executionId
  private executionsByCheckpoint = new Map<string, string>(); // checkpointId -> executionId

  // Cleanup settings
  private cleanupIntervalMs = 300000; // 5 minutes
  private executionRetentionMs = 3600000; // 1 hour
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    // Start cleanup timer
    this.startCleanup();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ExecutionTracker {
    if (!ExecutionTracker.instance) {
      ExecutionTracker.instance = new ExecutionTracker();
    }
    return ExecutionTracker.instance;
  }

  /**
   * Start a new execution
   */
  async startExecution(
    agentId: string,
    threadId: string,
    request: A2ARequest,
    checkpointId?: string
  ): Promise<ExecutionInfo> {
    const id = this.generateExecutionId();

    const execution: ExecutionInfo = {
      id,
      agentId,
      threadId,
      checkpointId,
      status: "running",
      request,
      startedAt: new Date(),
      abortController: new AbortController(),
      progress: {
        stepsCompleted: 0,
      },
    };

    this.executions.set(id, execution);
    this.executionsByThread.set(threadId, id);

    if (checkpointId) {
      this.executionsByCheckpoint.set(checkpointId, id);
    }

    // Persist to database
    try {
      await resultsPersistence.saveLog({
        agentId,
        executionId: id,
        level: 'info',
        message: `Execution started for thread ${threadId}${checkpointId ? ` (checkpoint: ${checkpointId})` : ''}`,
        source: 'execution-tracker',
      });
    } catch (error) {
      console.error('[ExecutionTracker] Failed to persist start:', error);
    }

    return execution;
  }

  /**
   * Update execution progress
   */
  async updateProgress(
    executionId: string,
    progress: Partial<ExecutionInfo["progress"]>
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.progress) {
      execution.progress = {
        ...execution.progress,
        ...progress,
      };

      // Persist progress update to database
      try {
        await resultsPersistence.saveLog({
          agentId: execution.agentId,
          executionId,
          level: 'info',
          message: `Progress update: ${progress.currentStep || ''} (${progress.stepsCompleted || 0}/${progress.totalSteps || '?'} steps)`,
          source: 'execution-tracker',
        });
      } catch (error) {
        console.error('[ExecutionTracker] Failed to persist progress:', error);
      }
    }
  }

  /**
   * Complete an execution
   */
  async completeExecution(
    executionId: string,
    checkpointId?: string
  ): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = "completed";
      execution.completedAt = new Date();

      if (checkpointId) {
        execution.checkpointId = checkpointId;
        this.executionsByCheckpoint.set(checkpointId, executionId);
      }

      // Persist completion to database
      try {
        await resultsPersistence.saveLog({
          agentId: execution.agentId,
          executionId,
          level: 'info',
          message: `Execution completed${checkpointId ? ` (checkpoint: ${checkpointId})` : ''}`,
          source: 'execution-tracker',
        });
      } catch (error) {
        console.error('[ExecutionTracker] Failed to persist completion:', error);
      }
    }
  }

  /**
   * Fail an execution
   */
  async failExecution(executionId: string, error: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = "failed";
      execution.completedAt = new Date();
      execution.error = error;

      // Persist failure to database
      try {
        await resultsPersistence.saveLog({
          agentId: execution.agentId,
          executionId,
          level: 'error',
          message: `Execution failed: ${error}`,
          source: 'execution-tracker',
        });
      } catch (dbError) {
        console.error('[ExecutionTracker] Failed to persist failure:', dbError);
      }
    }
  }

  /**
   * Cancel an execution
   */
  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    if (execution.status !== "running") {
      return false;
    }

    // Signal abort
    execution.abortController?.abort();

    // Update status
    execution.status = "cancelled";
    execution.completedAt = new Date();

    return true;
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): ExecutionInfo | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get execution by thread ID
   */
  getExecutionByThread(threadId: string): ExecutionInfo | undefined {
    const executionId = this.executionsByThread.get(threadId);
    return executionId ? this.executions.get(executionId) : undefined;
  }

  /**
   * Get execution by checkpoint ID
   */
  getExecutionByCheckpoint(checkpointId: string): ExecutionInfo | undefined {
    const executionId = this.executionsByCheckpoint.get(checkpointId);
    return executionId ? this.executions.get(executionId) : undefined;
  }

  /**
   * List executions for an agent
   */
  listExecutions(agentId: string): ExecutionInfo[] {
    return Array.from(this.executions.values())
      .filter((exec) => exec.agentId === agentId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const executions = Array.from(this.executions.values());

    return {
      total: executions.length,
      running: executions.filter((e) => e.status === "running").length,
      completed: executions.filter((e) => e.status === "completed").length,
      failed: executions.filter((e) => e.status === "failed").length,
      cancelled: executions.filter((e) => e.status === "cancelled").length,
    };
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Clean up old completed executions
   */
  private cleanup(): void {
    const now = Date.now();
    const idsToRemove: string[] = [];

    for (const [id, execution] of this.executions.entries()) {
      // Only clean up completed/failed/cancelled executions
      if (execution.status === "running") {
        continue;
      }

      // Check if execution is old enough to remove
      const completedAt = execution.completedAt?.getTime() || now;
      const age = now - completedAt;

      if (age > this.executionRetentionMs) {
        idsToRemove.push(id);
      }
    }

    // Remove old executions
    for (const id of idsToRemove) {
      const execution = this.executions.get(id);
      if (execution) {
        this.executions.delete(id);
        this.executionsByThread.delete(execution.threadId);
        if (execution.checkpointId) {
          this.executionsByCheckpoint.delete(execution.checkpointId);
        }
      }
    }

    if (idsToRemove.length > 0) {
      console.log(`[ExecutionTracker] Cleaned up ${idsToRemove.length} old executions`);
    }
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Clear all executions
   */
  clear(): void {
    this.executions.clear();
    this.executionsByThread.clear();
    this.executionsByCheckpoint.clear();
  }

  /**
   * Set retention configuration
   */
  setRetentionConfig(options: {
    cleanupIntervalMs?: number;
    executionRetentionMs?: number;
  }): void {
    if (options.cleanupIntervalMs !== undefined) {
      this.cleanupIntervalMs = options.cleanupIntervalMs;

      // Restart cleanup timer with new interval
      this.stopCleanup();
      this.startCleanup();
    }

    if (options.executionRetentionMs !== undefined) {
      this.executionRetentionMs = options.executionRetentionMs;
    }
  }
}
