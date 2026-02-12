/**
 * Results Persistence Service
 *
 * Manages saving and retrieving agent execution results, logs, checkpoints, and traces
 * to/from PostgreSQL database with incremental saving and resume capability.
 */

import { prisma } from '@/app/lib/db/client'
import type { AgentResult, ExecutionLog, CheckpointState, AgentTrace } from '../../generated/prisma/client'

/**
 * Data for creating a new result record
 */
export interface CreateResultData {
  agentId: string
  checkpointId?: string
  questId?: string
  result: string
  metadata: any
  status: string
}

/**
 * Data for updating an existing result record
 */
export interface UpdateResultData {
  result?: string
  metadata?: any
  status?: string
  completedAt?: Date
}

/**
 * Data for creating a log entry
 */
export interface CreateLogData {
  agentId: string
  executionId: string
  level: string
  message: string
  source?: string
}

/**
 * Data for creating a checkpoint state
 */
export interface CreateCheckpointData {
  agentId: string
  checkpointId: string
  state: any
  threadId: string
}

/**
 * Data for creating a trace event
 */
export interface CreateTraceData {
  agentId: string
  executionId: string
  type: string
  content: string
  metadata?: any
  duration?: number
}

/**
 * Results Persistence Service
 *
 * Provides methods for persisting agent execution data to database.
 */
export class ResultsPersistenceService {
  /**
   * Save a new result to database
   *
   * @param data - Result data
   * @returns Result ID
   */
  async saveResult(data: CreateResultData): Promise<string> {
    try {
      const result = await prisma.agentResult.create({
        data: {
          agentId: data.agentId,
          checkpointId: data.checkpointId,
          questId: data.questId,
          result: data.result,
          metadata: data.metadata,
          status: data.status,
        },
      })

      return result.id
    } catch (error) {
      console.error('[ResultsPersistence] Error saving result:', error)
      throw new Error(`Failed to save result: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Incrementally update an existing result
   *
   * @param resultId - Result ID
   * @param updates - Fields to update
   */
  async updateResult(resultId: string, updates: UpdateResultData): Promise<void> {
    try {
      await prisma.agentResult.update({
        where: { id: resultId },
        data: updates,
      })
    } catch (error) {
      console.error('[ResultsPersistence] Error updating result:', error)
      throw new Error(`Failed to update result: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Save an execution log entry
   *
   * @param data - Log data
   */
  async saveLog(data: CreateLogData): Promise<void> {
    try {
      await prisma.executionLog.create({
        data: {
          agentId: data.agentId,
          executionId: data.executionId,
          level: data.level,
          message: data.message,
          source: data.source,
        },
      })
    } catch (error) {
      console.error('[ResultsPersistence] Error saving log:', error)
      // Don't throw - logging should not break execution
    }
  }

  /**
   * Save checkpoint state for resume capability
   *
   * @param data - Checkpoint data
   */
  async saveCheckpointState(data: CreateCheckpointData): Promise<void> {
    try {
      // Use upsert to handle both create and update cases
      await prisma.checkpointState.upsert({
        where: { checkpointId: data.checkpointId },
        create: {
          agentId: data.agentId,
          checkpointId: data.checkpointId,
          state: data.state,
          threadId: data.threadId,
        },
        update: {
          state: data.state,
          threadId: data.threadId,
        },
      })
    } catch (error) {
      console.error('[ResultsPersistence] Error saving checkpoint state:', error)
      throw new Error(`Failed to save checkpoint state: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get checkpoint state for resume
   *
   * @param checkpointId - Checkpoint ID
   * @returns Checkpoint state or null if not found
   */
  async getCheckpointState(checkpointId: string): Promise<CheckpointState | null> {
    try {
      const checkpoint = await prisma.checkpointState.findUnique({
        where: { checkpointId },
      })

      return checkpoint
    } catch (error) {
      console.error('[ResultsPersistence] Error getting checkpoint state:', error)
      throw new Error(`Failed to get checkpoint state: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Save a trace event
   *
   * @param data - Trace data
   */
  async saveTrace(data: CreateTraceData): Promise<void> {
    try {
      await prisma.agentTrace.create({
        data: {
          agentId: data.agentId,
          executionId: data.executionId,
          type: data.type,
          content: data.content,
          metadata: data.metadata || null,
          duration: data.duration,
        },
      })
    } catch (error) {
      console.error('[ResultsPersistence] Error saving trace:', error)
      // Don't throw - tracing should not break execution
    }
  }

  /**
   * Get all results for an agent
   *
   * @param agentId - Agent ID
   * @param limit - Maximum number of results to return
   * @returns Array of results
   */
  async getAgentResults(agentId: string, limit: number = 50): Promise<AgentResult[]> {
    try {
      const results = await prisma.agentResult.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return results
    } catch (error) {
      console.error('[ResultsPersistence] Error getting agent results:', error)
      throw new Error(`Failed to get agent results: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get a specific result by ID
   *
   * @param resultId - Result ID
   * @returns Result or null if not found
   */
  async getResult(resultId: string): Promise<AgentResult | null> {
    try {
      const result = await prisma.agentResult.findUnique({
        where: { id: resultId },
      })

      return result
    } catch (error) {
      console.error('[ResultsPersistence] Error getting result:', error)
      throw new Error(`Failed to get result: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get execution logs for a specific execution
   *
   * @param executionId - Execution ID
   * @param limit - Maximum number of logs to return
   * @returns Array of logs
   */
  async getExecutionLogs(executionId: string, limit: number = 100): Promise<ExecutionLog[]> {
    try {
      const logs = await prisma.executionLog.findMany({
        where: { executionId },
        orderBy: { timestamp: 'asc' },
        take: limit,
      })

      return logs
    } catch (error) {
      console.error('[ResultsPersistence] Error getting execution logs:', error)
      throw new Error(`Failed to get execution logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get traces for a specific execution
   *
   * @param executionId - Execution ID
   * @param limit - Maximum number of traces to return
   * @returns Array of traces
   */
  async getExecutionTraces(executionId: string, limit: number = 100): Promise<AgentTrace[]> {
    try {
      const traces = await prisma.agentTrace.findMany({
        where: { executionId },
        orderBy: { timestamp: 'asc' },
        take: limit,
      })

      return traces
    } catch (error) {
      console.error('[ResultsPersistence] Error getting execution traces:', error)
      throw new Error(`Failed to get execution traces: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete old results (cleanup)
   *
   * @param olderThan - Delete results older than this date
   * @returns Number of deleted results
   */
  async cleanupOldResults(olderThan: Date): Promise<number> {
    try {
      const result = await prisma.agentResult.deleteMany({
        where: {
          createdAt: { lt: olderThan },
          status: { in: ['completed', 'failed'] },
        },
      })

      return result.count
    } catch (error) {
      console.error('[ResultsPersistence] Error cleaning up old results:', error)
      throw new Error(`Failed to cleanup old results: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete old logs (cleanup)
   *
   * @param olderThan - Delete logs older than this date
   * @returns Number of deleted logs
   */
  async cleanupOldLogs(olderThan: Date): Promise<number> {
    try {
      const result = await prisma.executionLog.deleteMany({
        where: {
          timestamp: { lt: olderThan },
        },
      })

      return result.count
    } catch (error) {
      console.error('[ResultsPersistence] Error cleaning up old logs:', error)
      throw new Error(`Failed to cleanup old logs: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete old traces (cleanup)
   *
   * @param olderThan - Delete traces older than this date
   * @returns Number of deleted traces
   */
  async cleanupOldTraces(olderThan: Date): Promise<number> {
    try {
      const result = await prisma.agentTrace.deleteMany({
        where: {
          timestamp: { lt: olderThan },
        },
      })

      return result.count
    } catch (error) {
      console.error('[ResultsPersistence] Error cleaning up old traces:', error)
      throw new Error(`Failed to cleanup old traces: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

/**
 * Singleton instance of results persistence service
 */
export const resultsPersistence = new ResultsPersistenceService()
