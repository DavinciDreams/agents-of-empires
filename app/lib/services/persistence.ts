/**
 * Persistence Service
 *
 * Handles checkpoint state management for agent execution recovery.
 * Provides functions to save, load, and manage execution checkpoints.
 */

import { prisma } from '@/app/lib/db/client';

/**
 * Checkpoint state structure
 */
export interface CheckpointData {
  /** Current step/iteration number */
  step: number;

  /** Task being executed */
  task: string;

  /** Partial results accumulated so far */
  partialResults: any[];

  /** Tool outputs from execution */
  toolOutputs: ToolOutput[];

  /** Current agent state */
  agentState: any;

  /** Timestamp of checkpoint creation */
  timestamp: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface ToolOutput {
  toolName: string;
  input: any;
  output: any;
  timestamp: string;
  duration?: number;
}

/**
 * Save a checkpoint state to database
 *
 * @param agentId - Agent identifier
 * @param checkpointId - Checkpoint identifier
 * @param threadId - Execution thread ID
 * @param state - Checkpoint state data
 */
export async function saveCheckpoint(
  agentId: string,
  checkpointId: string,
  threadId: string,
  state: CheckpointData
): Promise<void> {
  try {
    await prisma.checkpointState.upsert({
      where: { checkpointId },
      update: {
        state: state as any,
        agentId,
        threadId,
      },
      create: {
        checkpointId,
        agentId,
        threadId,
        state: state as any,
      },
    });
  } catch (error) {
    console.error('[Persistence] Failed to save checkpoint:', error);
    throw new Error(`Failed to save checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load a checkpoint state from database
 *
 * @param checkpointId - Checkpoint identifier
 * @returns Checkpoint state or null if not found
 */
export async function loadCheckpoint(
  checkpointId: string
): Promise<CheckpointData | null> {
  try {
    const checkpoint = await prisma.checkpointState.findUnique({
      where: { checkpointId },
    });

    if (!checkpoint) {
      return null;
    }

    return checkpoint.state as unknown as CheckpointData;
  } catch (error) {
    console.error('[Persistence] Failed to load checkpoint:', error);
    throw new Error(`Failed to load checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a checkpoint exists
 *
 * @param checkpointId - Checkpoint identifier
 * @returns True if checkpoint exists
 */
export async function checkpointExists(
  checkpointId: string
): Promise<boolean> {
  try {
    const count = await prisma.checkpointState.count({
      where: { checkpointId },
    });
    return count > 0;
  } catch (error) {
    console.error('[Persistence] Failed to check checkpoint existence:', error);
    return false;
  }
}

/**
 * Delete a checkpoint from database
 *
 * @param checkpointId - Checkpoint identifier
 */
export async function deleteCheckpoint(
  checkpointId: string
): Promise<void> {
  try {
    await prisma.checkpointState.delete({
      where: { checkpointId },
    });
  } catch (error) {
    console.error('[Persistence] Failed to delete checkpoint:', error);
    // Don't throw - deletion is best-effort
  }
}

/**
 * Get all checkpoints for an agent
 *
 * @param agentId - Agent identifier
 * @returns Array of checkpoint states
 */
export async function getAgentCheckpoints(
  agentId: string
): Promise<Array<{ checkpointId: string; threadId: string; createdAt: Date }>> {
  try {
    const checkpoints = await prisma.checkpointState.findMany({
      where: { agentId },
      select: {
        checkpointId: true,
        threadId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return checkpoints;
  } catch (error) {
    console.error('[Persistence] Failed to get agent checkpoints:', error);
    return [];
  }
}

/**
 * Clean up old checkpoints (older than specified days)
 *
 * @param daysToKeep - Number of days to keep checkpoints
 * @returns Number of checkpoints deleted
 */
export async function cleanupOldCheckpoints(
  daysToKeep: number = 7
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.checkpointState.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[Persistence] Cleaned up ${result.count} old checkpoints`);
    return result.count;
  } catch (error) {
    console.error('[Persistence] Failed to cleanup old checkpoints:', error);
    return 0;
  }
}

/**
 * Save execution result to database
 *
 * @param agentId - Agent identifier
 * @param checkpointId - Checkpoint identifier (optional)
 * @param result - Execution result
 * @param status - Execution status
 * @param metadata - Additional metadata
 */
export async function saveExecutionResult(
  agentId: string,
  result: string,
  status: 'success' | 'failed_recoverable' | 'failed_permanent' | 'timeout' | 'cancelled',
  metadata: Record<string, any>,
  checkpointId?: string,
  questId?: string
): Promise<string> {
  try {
    const agentResult = await prisma.agentResult.create({
      data: {
        agentId,
        checkpointId,
        questId,
        result,
        status,
        metadata: metadata as any,
        completedAt: new Date(),
      },
    });

    return agentResult.id;
  } catch (error) {
    console.error('[Persistence] Failed to save execution result:', error);
    throw new Error(`Failed to save execution result: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update execution result status
 *
 * @param resultId - Result identifier
 * @param status - New status
 * @param additionalMetadata - Additional metadata to merge
 */
export async function updateExecutionResult(
  resultId: string,
  status: 'success' | 'failed_recoverable' | 'failed_permanent' | 'timeout' | 'cancelled',
  additionalMetadata?: Record<string, any>
): Promise<void> {
  try {
    const currentResult = await prisma.agentResult.findUnique({
      where: { id: resultId },
    });

    if (!currentResult) {
      throw new Error(`Result ${resultId} not found`);
    }

    const mergedMetadata = additionalMetadata
      ? { ...(currentResult.metadata as any), ...additionalMetadata }
      : currentResult.metadata;

    await prisma.agentResult.update({
      where: { id: resultId },
      data: {
        status,
        metadata: mergedMetadata as any,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[Persistence] Failed to update execution result:', error);
    throw new Error(`Failed to update execution result: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
