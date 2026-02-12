/**
 * Tests for Persistence Service
 */

import {
  saveCheckpoint,
  loadCheckpoint,
  checkpointExists,
  deleteCheckpoint,
  getAgentCheckpoints,
  saveExecutionResult,
  updateExecutionResult,
  type CheckpointData,
} from '../persistence';

// Mock Prisma client
jest.mock('@/app/lib/db/client', () => ({
  prisma: {
    checkpointState: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    agentResult: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '@/app/lib/db/client';

describe('persistence service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveCheckpoint', () => {
    it('should save checkpoint data', async () => {
      const checkpointData: CheckpointData = {
        step: 5,
        task: 'Test task',
        partialResults: ['result1', 'result2'],
        toolOutputs: [
          {
            toolName: 'search',
            input: 'query',
            output: 'result',
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
        agentState: { foo: 'bar' },
        timestamp: '2024-01-01T00:00:00Z',
      };

      (prisma.checkpointState.upsert as jest.Mock).mockResolvedValue({});

      await saveCheckpoint('agent1', 'checkpoint1', 'thread1', checkpointData);

      expect(prisma.checkpointState.upsert).toHaveBeenCalledWith({
        where: { checkpointId: 'checkpoint1' },
        update: {
          state: checkpointData,
          agentId: 'agent1',
          threadId: 'thread1',
        },
        create: {
          checkpointId: 'checkpoint1',
          agentId: 'agent1',
          threadId: 'thread1',
          state: checkpointData,
        },
      });
    });

    it('should throw error on database failure', async () => {
      (prisma.checkpointState.upsert as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        saveCheckpoint('agent1', 'checkpoint1', 'thread1', {} as CheckpointData)
      ).rejects.toThrow('Failed to save checkpoint');
    });
  });

  describe('loadCheckpoint', () => {
    it('should load checkpoint data', async () => {
      const checkpointData: CheckpointData = {
        step: 5,
        task: 'Test task',
        partialResults: [],
        toolOutputs: [],
        agentState: {},
        timestamp: '2024-01-01T00:00:00Z',
      };

      (prisma.checkpointState.findUnique as jest.Mock).mockResolvedValue({
        checkpointId: 'checkpoint1',
        state: checkpointData,
      });

      const result = await loadCheckpoint('checkpoint1');

      expect(result).toEqual(checkpointData);
      expect(prisma.checkpointState.findUnique).toHaveBeenCalledWith({
        where: { checkpointId: 'checkpoint1' },
      });
    });

    it('should return null if checkpoint not found', async () => {
      (prisma.checkpointState.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await loadCheckpoint('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('checkpointExists', () => {
    it('should return true if checkpoint exists', async () => {
      (prisma.checkpointState.count as jest.Mock).mockResolvedValue(1);

      const result = await checkpointExists('checkpoint1');

      expect(result).toBe(true);
    });

    it('should return false if checkpoint does not exist', async () => {
      (prisma.checkpointState.count as jest.Mock).mockResolvedValue(0);

      const result = await checkpointExists('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      (prisma.checkpointState.count as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await checkpointExists('checkpoint1');

      expect(result).toBe(false);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete checkpoint', async () => {
      (prisma.checkpointState.delete as jest.Mock).mockResolvedValue({});

      await deleteCheckpoint('checkpoint1');

      expect(prisma.checkpointState.delete).toHaveBeenCalledWith({
        where: { checkpointId: 'checkpoint1' },
      });
    });

    it('should not throw on deletion error', async () => {
      (prisma.checkpointState.delete as jest.Mock).mockRejectedValue(
        new Error('Not found')
      );

      // Should not throw
      await expect(deleteCheckpoint('checkpoint1')).resolves.not.toThrow();
    });
  });

  describe('getAgentCheckpoints', () => {
    it('should return agent checkpoints', async () => {
      const checkpoints = [
        {
          checkpointId: 'checkpoint1',
          threadId: 'thread1',
          createdAt: new Date('2024-01-01'),
        },
        {
          checkpointId: 'checkpoint2',
          threadId: 'thread2',
          createdAt: new Date('2024-01-02'),
        },
      ];

      (prisma.checkpointState.findMany as jest.Mock).mockResolvedValue(checkpoints);

      const result = await getAgentCheckpoints('agent1');

      expect(result).toEqual(checkpoints);
      expect(prisma.checkpointState.findMany).toHaveBeenCalledWith({
        where: { agentId: 'agent1' },
        select: {
          checkpointId: true,
          threadId: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array on error', async () => {
      (prisma.checkpointState.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await getAgentCheckpoints('agent1');

      expect(result).toEqual([]);
    });
  });

  describe('saveExecutionResult', () => {
    it('should save execution result', async () => {
      const metadata = { foo: 'bar' };

      (prisma.agentResult.create as jest.Mock).mockResolvedValue({
        id: 'result1',
      });

      const resultId = await saveExecutionResult(
        'agent1',
        'output',
        'success',
        metadata,
        'checkpoint1',
        'quest1'
      );

      expect(resultId).toBe('result1');
      expect(prisma.agentResult.create).toHaveBeenCalledWith({
        data: {
          agentId: 'agent1',
          checkpointId: 'checkpoint1',
          questId: 'quest1',
          result: 'output',
          status: 'success',
          metadata: metadata,
          completedAt: expect.any(Date),
        },
      });
    });

    it('should throw error on database failure', async () => {
      (prisma.agentResult.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        saveExecutionResult('agent1', 'output', 'success', {})
      ).rejects.toThrow('Failed to save execution result');
    });
  });

  describe('updateExecutionResult', () => {
    it('should update execution result', async () => {
      const existingMetadata = { existing: 'value' };
      const additionalMetadata = { new: 'value' };

      (prisma.agentResult.findUnique as jest.Mock).mockResolvedValue({
        id: 'result1',
        metadata: existingMetadata,
      });
      (prisma.agentResult.update as jest.Mock).mockResolvedValue({});

      await updateExecutionResult('result1', 'failed_permanent', additionalMetadata);

      expect(prisma.agentResult.update).toHaveBeenCalledWith({
        where: { id: 'result1' },
        data: {
          status: 'failed_permanent',
          metadata: { ...existingMetadata, ...additionalMetadata },
          completedAt: expect.any(Date),
        },
      });
    });

    it('should throw if result not found', async () => {
      (prisma.agentResult.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        updateExecutionResult('nonexistent', 'success')
      ).rejects.toThrow('Result nonexistent not found');
    });
  });
});
