/**
 * Tests for Retry Utility
 */

import {
  retryWithBackoff,
  isTransientError,
  isPermanentError,
  DEFAULT_RETRY_OPTIONS,
  LLM_RETRY_OPTIONS,
  type RetryOptions,
} from '../retry';

describe('retry utility', () => {
  describe('retryWithBackoff', () => {
    it('should succeed on first attempt if no error', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn, DEFAULT_RETRY_OPTIONS);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry transient errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success');

      const onRetry = jest.fn();
      const result = await retryWithBackoff(fn, {
        ...DEFAULT_RETRY_OPTIONS,
        baseDelay: 10, // Fast retry for tests
        onRetry,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should not retry permanent errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Invalid request - 400'));

      await expect(
        retryWithBackoff(fn, DEFAULT_RETRY_OPTIONS)
      ).rejects.toThrow('Invalid request - 400');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries limit', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(
        retryWithBackoff(fn, {
          ...DEFAULT_RETRY_OPTIONS,
          maxRetries: 2,
          baseDelay: 10,
        })
      ).rejects.toThrow('timeout');

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      const fn = jest.fn().mockRejectedValue(new Error('rate limit'));

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 3,
          baseDelay: 100,
          maxDelay: 1000,
          shouldRetry: isTransientError,
          onRetry: (attempt, error, nextDelay) => {
            delays.push(nextDelay);
          },
        })
      ).rejects.toThrow();

      // Delays should be: 100, 200, 400 (exponential)
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
      expect(delays[2]).toBe(400);
    });

    it('should cap delay at maxDelay', async () => {
      const delays: number[] = [];
      const fn = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 5,
          baseDelay: 1000,
          maxDelay: 2000,
          shouldRetry: isTransientError,
          onRetry: (attempt, error, nextDelay) => {
            delays.push(nextDelay);
          },
        })
      ).rejects.toThrow();

      // All delays should be capped at 2000
      expect(Math.max(...delays)).toBe(2000);
    });

    it('should call onRetry callback with correct parameters', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const onRetry = jest.fn();

      await retryWithBackoff(fn, {
        ...DEFAULT_RETRY_OPTIONS,
        baseDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledWith(
        1, // attempt
        expect.objectContaining({ message: 'timeout' }), // error
        expect.any(Number) // nextDelay
      );
    });
  });

  describe('isTransientError', () => {
    it('should identify network errors as transient', () => {
      expect(isTransientError(new Error('ECONNREFUSED'))).toBe(true);
      expect(isTransientError(new Error('ENOTFOUND'))).toBe(true);
      expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isTransientError(new Error('ECONNRESET'))).toBe(true);
      expect(isTransientError(new Error('network error occurred'))).toBe(true);
      expect(isTransientError(new Error('socket hang up'))).toBe(true);
    });

    it('should identify timeout errors as transient', () => {
      expect(isTransientError(new Error('request timeout'))).toBe(true);
      expect(isTransientError(new Error('operation timed out'))).toBe(true);
    });

    it('should identify rate limit errors as transient', () => {
      expect(isTransientError(new Error('rate limit exceeded'))).toBe(true);
      expect(isTransientError(new Error('too many requests'))).toBe(true);
      expect(isTransientError(new Error('HTTP 429'))).toBe(true);
    });

    it('should identify server errors as transient', () => {
      expect(isTransientError(new Error('502 Bad Gateway'))).toBe(true);
      expect(isTransientError(new Error('503 Service Unavailable'))).toBe(true);
      expect(isTransientError(new Error('504 Gateway Timeout'))).toBe(true);
    });

    it('should identify LLM provider errors as transient', () => {
      expect(isTransientError(new Error('Server overloaded'))).toBe(true);
      expect(isTransientError(new Error('At capacity'))).toBe(true);
      expect(isTransientError(new Error('temporarily unavailable'))).toBe(true);
    });

    it('should not identify permanent errors as transient', () => {
      expect(isTransientError(new Error('Invalid request'))).toBe(false);
      expect(isTransientError(new Error('400 Bad Request'))).toBe(false);
      expect(isTransientError(new Error('401 Unauthorized'))).toBe(false);
      expect(isTransientError(new Error('404 Not Found'))).toBe(false);
    });
  });

  describe('isPermanentError', () => {
    it('should identify validation errors as permanent', () => {
      expect(isPermanentError(new Error('Invalid input'))).toBe(true);
      expect(isPermanentError(new Error('Validation failed'))).toBe(true);
      expect(isPermanentError(new Error('Field must be provided'))).toBe(true);
      expect(isPermanentError(new Error('400 Bad Request'))).toBe(true);
    });

    it('should identify auth errors as permanent', () => {
      expect(isPermanentError(new Error('Unauthorized'))).toBe(true);
      expect(isPermanentError(new Error('Forbidden'))).toBe(true);
      expect(isPermanentError(new Error('401'))).toBe(true);
      expect(isPermanentError(new Error('403'))).toBe(true);
    });

    it('should identify not found errors as permanent', () => {
      expect(isPermanentError(new Error('Not found'))).toBe(true);
      expect(isPermanentError(new Error('404'))).toBe(true);
    });

    it('should identify recursion errors as permanent', () => {
      expect(isPermanentError(new Error('Recursion limit exceeded'))).toBe(true);
      expect(isPermanentError(new Error('Maximum recursion depth'))).toBe(true);
    });

    it('should not identify transient errors as permanent', () => {
      expect(isPermanentError(new Error('timeout'))).toBe(false);
      expect(isPermanentError(new Error('network error'))).toBe(false);
      expect(isPermanentError(new Error('503'))).toBe(false);
    });
  });

  describe('retry options presets', () => {
    it('DEFAULT_RETRY_OPTIONS should have conservative settings', () => {
      expect(DEFAULT_RETRY_OPTIONS.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_OPTIONS.baseDelay).toBe(1000);
      expect(DEFAULT_RETRY_OPTIONS.maxDelay).toBe(10000);
      expect(DEFAULT_RETRY_OPTIONS.shouldRetry).toBe(isTransientError);
    });

    it('LLM_RETRY_OPTIONS should have longer delays', () => {
      expect(LLM_RETRY_OPTIONS.maxRetries).toBe(3);
      expect(LLM_RETRY_OPTIONS.baseDelay).toBe(2000);
      expect(LLM_RETRY_OPTIONS.maxDelay).toBe(30000);
    });
  });
});
