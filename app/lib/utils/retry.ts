/**
 * Retry Utility
 *
 * Implements exponential backoff retry logic for handling transient errors
 * in agent execution (network failures, timeouts, rate limits).
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (2-3 recommended for conservative retry) */
  maxRetries: number;

  /** Initial delay in milliseconds before first retry */
  baseDelay: number;

  /** Maximum delay in milliseconds (caps exponential backoff) */
  maxDelay: number;

  /** Function to determine if error should be retried */
  shouldRetry: (error: Error) => boolean;

  /** Optional callback for retry attempts */
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
}

/**
 * Default retry options for agent execution
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  shouldRetry: isTransientError,
};

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of successful execution
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      // Execute function
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = options.shouldRetry(lastError);
      const hasRetriesLeft = attempt < options.maxRetries;

      if (!shouldRetry || !hasRetriesLeft) {
        // Don't retry - throw error
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const exponentialDelay = options.baseDelay * Math.pow(2, attempt);
      const nextDelay = Math.min(exponentialDelay, options.maxDelay);

      // Call retry callback if provided
      if (options.onRetry) {
        options.onRetry(attempt + 1, lastError, nextDelay);
      }

      // Wait before retrying
      await sleep(nextDelay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Check if an error is transient and should be retried
 *
 * Transient errors include:
 * - Network errors (ECONNREFUSED, ENOTFOUND, ETIMEDOUT)
 * - Timeout errors
 * - Rate limit errors (429)
 * - Temporary server errors (502, 503, 504)
 *
 * @param error - Error to check
 * @returns True if error is transient
 */
export function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    message.includes('network') ||
    message.includes('socket')
  ) {
    return true;
  }

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out')
  ) {
    return true;
  }

  // Rate limit errors
  if (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  ) {
    return true;
  }

  // Temporary server errors
  if (
    message.includes('502') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('bad gateway') ||
    message.includes('service unavailable') ||
    message.includes('gateway timeout')
  ) {
    return true;
  }

  // LLM provider specific errors
  if (
    message.includes('overloaded') ||
    message.includes('capacity') ||
    message.includes('temporarily unavailable')
  ) {
    return true;
  }

  return false;
}

/**
 * Check if an error is permanent and should NOT be retried
 *
 * Permanent errors include:
 * - Validation errors (400, invalid input)
 * - Authentication errors (401, 403)
 * - Not found errors (404)
 * - Business logic errors
 *
 * @param error - Error to check
 * @returns True if error is permanent
 */
export function isPermanentError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Validation errors
  if (
    message.includes('invalid') ||
    message.includes('validation') ||
    message.includes('must be') ||
    message.includes('required') ||
    message.includes('400')
  ) {
    return true;
  }

  // Authentication/Authorization errors
  if (
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('401') ||
    message.includes('403')
  ) {
    return true;
  }

  // Not found errors
  if (
    message.includes('not found') ||
    message.includes('404')
  ) {
    return true;
  }

  // Recursion limit errors (should break task down, not retry)
  if (
    message.includes('recursion limit') ||
    message.includes('maximum recursion')
  ) {
    return true;
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry options for LLM API calls
 * More aggressive retry for LLM providers due to rate limits
 */
export const LLM_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 2000, // 2 seconds
  maxDelay: 30000, // 30 seconds
  shouldRetry: isTransientError,
};

/**
 * Retry options for network calls
 * Conservative retry for general network operations
 */
export const NETWORK_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 2,
  baseDelay: 1000, // 1 second
  maxDelay: 5000, // 5 seconds
  shouldRetry: isTransientError,
};
