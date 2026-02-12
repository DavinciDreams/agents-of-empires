"use strict";
/**
 * Results Persistence Service
 *
 * Manages saving and retrieving agent execution results, logs, checkpoints, and traces
 * to/from PostgreSQL database with incremental saving and resume capability.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resultsPersistence = exports.ResultsPersistenceService = void 0;
const client_1 = require("@/app/lib/db/client");
/**
 * Results Persistence Service
 *
 * Provides methods for persisting agent execution data to database.
 */
class ResultsPersistenceService {
    /**
     * Save a new result to database
     *
     * @param data - Result data
     * @returns Result ID
     */
    async saveResult(data) {
        try {
            const result = await client_1.prisma.agentResult.create({
                data: {
                    agentId: data.agentId,
                    checkpointId: data.checkpointId,
                    questId: data.questId,
                    result: data.result,
                    metadata: data.metadata,
                    status: data.status,
                },
            });
            return result.id;
        }
        catch (error) {
            console.error('[ResultsPersistence] Error saving result:', error);
            throw new Error(`Failed to save result: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Incrementally update an existing result
     *
     * @param resultId - Result ID
     * @param updates - Fields to update
     */
    async updateResult(resultId, updates) {
        try {
            await client_1.prisma.agentResult.update({
                where: { id: resultId },
                data: updates,
            });
        }
        catch (error) {
            console.error('[ResultsPersistence] Error updating result:', error);
            throw new Error(`Failed to update result: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Save an execution log entry
     *
     * @param data - Log data
     */
    async saveLog(data) {
        try {
            await client_1.prisma.executionLog.create({
                data: {
                    agentId: data.agentId,
                    executionId: data.executionId,
                    level: data.level,
                    message: data.message,
                    source: data.source,
                },
            });
        }
        catch (error) {
            console.error('[ResultsPersistence] Error saving log:', error);
            // Don't throw - logging should not break execution
        }
    }
    /**
     * Save checkpoint state for resume capability
     *
     * @param data - Checkpoint data
     */
    async saveCheckpointState(data) {
        try {
            // Use upsert to handle both create and update cases
            await client_1.prisma.checkpointState.upsert({
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
            });
        }
        catch (error) {
            console.error('[ResultsPersistence] Error saving checkpoint state:', error);
            throw new Error(`Failed to save checkpoint state: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get checkpoint state for resume
     *
     * @param checkpointId - Checkpoint ID
     * @returns Checkpoint state or null if not found
     */
    async getCheckpointState(checkpointId) {
        try {
            const checkpoint = await client_1.prisma.checkpointState.findUnique({
                where: { checkpointId },
            });
            return checkpoint;
        }
        catch (error) {
            console.error('[ResultsPersistence] Error getting checkpoint state:', error);
            throw new Error(`Failed to get checkpoint state: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Save a trace event
     *
     * @param data - Trace data
     */
    async saveTrace(data) {
        try {
            await client_1.prisma.agentTrace.create({
                data: {
                    agentId: data.agentId,
                    executionId: data.executionId,
                    type: data.type,
                    content: data.content,
                    metadata: data.metadata || null,
                    duration: data.duration,
                },
            });
        }
        catch (error) {
            console.error('[ResultsPersistence] Error saving trace:', error);
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
    async getAgentResults(agentId, limit = 50) {
        try {
            const results = await client_1.prisma.agentResult.findMany({
                where: { agentId },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
            return results;
        }
        catch (error) {
            console.error('[ResultsPersistence] Error getting agent results:', error);
            throw new Error(`Failed to get agent results: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get a specific result by ID
     *
     * @param resultId - Result ID
     * @returns Result or null if not found
     */
    async getResult(resultId) {
        try {
            const result = await client_1.prisma.agentResult.findUnique({
                where: { id: resultId },
            });
            return result;
        }
        catch (error) {
            console.error('[ResultsPersistence] Error getting result:', error);
            throw new Error(`Failed to get result: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get execution logs for a specific execution
     *
     * @param executionId - Execution ID
     * @param limit - Maximum number of logs to return
     * @returns Array of logs
     */
    async getExecutionLogs(executionId, limit = 100) {
        try {
            const logs = await client_1.prisma.executionLog.findMany({
                where: { executionId },
                orderBy: { timestamp: 'asc' },
                take: limit,
            });
            return logs;
        }
        catch (error) {
            console.error('[ResultsPersistence] Error getting execution logs:', error);
            throw new Error(`Failed to get execution logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get traces for a specific execution
     *
     * @param executionId - Execution ID
     * @param limit - Maximum number of traces to return
     * @returns Array of traces
     */
    async getExecutionTraces(executionId, limit = 100) {
        try {
            const traces = await client_1.prisma.agentTrace.findMany({
                where: { executionId },
                orderBy: { timestamp: 'asc' },
                take: limit,
            });
            return traces;
        }
        catch (error) {
            console.error('[ResultsPersistence] Error getting execution traces:', error);
            throw new Error(`Failed to get execution traces: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete old results (cleanup)
     *
     * @param olderThan - Delete results older than this date
     * @returns Number of deleted results
     */
    async cleanupOldResults(olderThan) {
        try {
            const result = await client_1.prisma.agentResult.deleteMany({
                where: {
                    createdAt: { lt: olderThan },
                    status: { in: ['completed', 'failed'] },
                },
            });
            return result.count;
        }
        catch (error) {
            console.error('[ResultsPersistence] Error cleaning up old results:', error);
            throw new Error(`Failed to cleanup old results: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete old logs (cleanup)
     *
     * @param olderThan - Delete logs older than this date
     * @returns Number of deleted logs
     */
    async cleanupOldLogs(olderThan) {
        try {
            const result = await client_1.prisma.executionLog.deleteMany({
                where: {
                    timestamp: { lt: olderThan },
                },
            });
            return result.count;
        }
        catch (error) {
            console.error('[ResultsPersistence] Error cleaning up old logs:', error);
            throw new Error(`Failed to cleanup old logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete old traces (cleanup)
     *
     * @param olderThan - Delete traces older than this date
     * @returns Number of deleted traces
     */
    async cleanupOldTraces(olderThan) {
        try {
            const result = await client_1.prisma.agentTrace.deleteMany({
                where: {
                    timestamp: { lt: olderThan },
                },
            });
            return result.count;
        }
        catch (error) {
            console.error('[ResultsPersistence] Error cleaning up old traces:', error);
            throw new Error(`Failed to cleanup old traces: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.ResultsPersistenceService = ResultsPersistenceService;
/**
 * Singleton instance of results persistence service
 */
exports.resultsPersistence = new ResultsPersistenceService();
