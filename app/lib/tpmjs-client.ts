/**
 * TPMJS API Client
 *
 * Client for interacting with TPMJS (https://tpmjs.com) - an NPM-like registry for AI tools.
 * Implements rate limiting, caching, and error handling for the TPMJS API.
 */

// ============================================================================
// Types
// ============================================================================

export interface TPMJSTool {
  package: string;
  toolName: string;
  description: string;
  category: string;
  downloads: number;
  qualityScore: number; // 0-100
  official: boolean;
  inputSchema: Record<string, any>;
  healthStatus: 'healthy' | 'degraded' | 'down';
  version: string;
}

export interface TPMJSSearchResult {
  tools: TPMJSTool[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface TPMJSListOptions {
  category?: string;
  official?: boolean;
  limit?: number;
  offset?: number;
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

interface RateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}

// ============================================================================
// Client
// ============================================================================

export class TPMJSClient {
  private baseUrl = '/api/tpmjs'; // Use backend proxy instead of direct API calls
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private requestCount = 0;
  private windowStart = Date.now();
  private rateLimitInfo: RateLimitInfo | null = null;
  private rateLimitIntervalId: NodeJS.Timeout | null = null;

  // Rate limiting: FREE tier = 100 req/hour, we'll be conservative at 80 req/hour
  private readonly MAX_REQUESTS_PER_HOUR = 80;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Prevent unbounded cache growth
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  constructor() {
    // Reset rate limit window every hour (only in browser environment)
    if (typeof window !== 'undefined') {
      this.rateLimitIntervalId = setInterval(() => {
        this.requestCount = 0;
        this.windowStart = Date.now();
      }, 60 * 60 * 1000);
    }
  }

  /**
   * Cleanup method to clear interval and prevent memory leaks
   * Call this when the client is no longer needed
   */
  destroy(): void {
    if (this.rateLimitIntervalId) {
      clearInterval(this.rateLimitIntervalId);
      this.rateLimitIntervalId = null;
    }
    this.clearCache();
  }

  /**
   * Search tools using BM25 semantic search
   */
  async searchTools(query: string, limit = 20, abortSignal?: AbortSignal): Promise<TPMJSSearchResult> {
    const cacheKey = `search:${query}:${limit}`;
    const cached = this.getCached<TPMJSSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      action: 'search',
      q: query,
      limit: String(limit),
    });

    const endpoint = `?${params.toString()}`;
    const data = await this.queueRequest(() => this.fetch(endpoint, {}, abortSignal));

    // TPMJS returns data in data.results.tools, not data.tools
    const result: TPMJSSearchResult = {
      tools: data.results?.tools || data.tools || [],
      pagination: {
        limit: data.pagination?.limit || limit,
        offset: data.pagination?.offset || 0,
        hasMore: data.pagination?.hasMore || false,
      },
    };

    this.setCached(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  /**
   * List tools with optional filters
   */
  async listTools(options: TPMJSListOptions = {}): Promise<TPMJSSearchResult> {
    const { category, official, limit = 20, offset = 0 } = options;

    const params = new URLSearchParams({ action: 'list' });
    if (category) params.append('category', category);
    if (official !== undefined) params.append('official', String(official));
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    const cacheKey = `list:${params.toString()}`;
    const cached = this.getCached<TPMJSSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const endpoint = `?${params.toString()}`;
    const data = await this.queueRequest(() => this.fetch(endpoint));

    // TPMJS returns data in data.results.tools, not data.tools
    const result: TPMJSSearchResult = {
      tools: data.results?.tools || data.tools || [],
      pagination: {
        limit: data.pagination?.limit || limit,
        offset: data.pagination?.offset || offset,
        hasMore: data.pagination?.hasMore || false,
      },
    };

    this.setCached(cacheKey, result, this.CACHE_TTL_MS);
    return result;
  }

  /**
   * Get detailed information about a specific tool
   */
  async getToolDetails(packageName: string, toolName: string): Promise<TPMJSTool> {
    const cacheKey = `details:${packageName}/${toolName}`;
    const cached = this.getCached<TPMJSTool>(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      action: 'details',
      package: packageName,
      tool: toolName,
    });

    const endpoint = `?${params.toString()}`;
    const data = await this.queueRequest(() => this.fetch(endpoint));

    this.setCached(cacheKey, data, this.CACHE_TTL_MS);
    return data;
  }

  /**
   * Execute a tool (for testing purposes)
   * Returns a ReadableStream for streaming results
   */
  async executeTool(
    packageName: string,
    toolName: string,
    params: Record<string, any>
  ): Promise<ReadableStream> {
    // Validate params before sending
    if (!params || typeof params !== 'object') {
      throw new Error('Invalid params: must be an object');
    }

    const response = await this.queueRequest(() =>
      this.fetch('', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute',
          packageName,
          toolName,
          params,
        }),
      })
    );

    if (!response.body) {
      throw new Error('No response body received from tool execution');
    }

    return response.body;
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo {
    const elapsed = Date.now() - this.windowStart;
    const remaining = Math.max(0, this.MAX_REQUESTS_PER_HOUR - this.requestCount);
    const reset = this.windowStart + (60 * 60 * 1000);

    return this.rateLimitInfo || {
      remaining,
      reset,
      limit: this.MAX_REQUESTS_PER_HOUR,
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Internal fetch wrapper with error handling
   */
  private async fetch(endpoint: string, options: RequestInit = {}, externalAbortSignal?: AbortSignal): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    // If an external abort signal is provided, listen to it
    if (externalAbortSignal) {
      externalAbortSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Update rate limit info from headers if available
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const reset = response.headers.get('X-RateLimit-Reset');
      const limit = response.headers.get('X-RateLimit-Limit');

      if (remaining && reset && limit) {
        this.rateLimitInfo = {
          remaining: parseInt(remaining, 10),
          reset: parseInt(reset, 10),
          limit: parseInt(limit, 10),
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorText = errorData?.error || 'Unknown error';
        throw new Error(
          `TPMJS API error (${response.status}): ${errorText}`
        );
      }

      // For streaming responses (POST requests), return the response directly
      if (options.method === 'POST') {
        return response;
      }

      // For JSON responses, parse and return
      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`TPMJS API request timeout after ${this.REQUEST_TIMEOUT_MS}ms`);
        }
        throw error;
      }
      throw new Error('Unknown error occurred during TPMJS API request');
    }
  }

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache with TTL
   * Implements LRU-like eviction when cache exceeds MAX_CACHE_SIZE
   */
  private setCached<T>(key: string, data: T, ttl: number): void {
    // If cache is full, remove oldest entries (first ones in Map)
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const entriesToDelete = this.cache.size - this.MAX_CACHE_SIZE + 1;
      let deleted = 0;
      for (const [cacheKey] of this.cache) {
        if (deleted >= entriesToDelete) break;
        this.cache.delete(cacheKey);
        deleted++;
      }
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Queue a request to respect rate limits
   */
  private async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we're approaching rate limit
    const elapsed = Date.now() - this.windowStart;
    const hourlyRate = (this.requestCount / elapsed) * (60 * 60 * 1000);

    if (hourlyRate > this.MAX_REQUESTS_PER_HOUR * 0.9) {
      // We're at 90% of rate limit, wait a bit
      const waitTime = 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requestCount++;

    try {
      return await fn();
    } catch (error) {
      // If rate limited, throw a more informative error
      if (error instanceof Error && error.message.includes('429')) {
        const info = this.getRateLimitInfo();
        throw new Error(
          `TPMJS rate limit exceeded. ${info.remaining} requests remaining. Resets at ${new Date(info.reset).toLocaleTimeString()}`
        );
      }
      throw error;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let tpmjsClientInstance: TPMJSClient | null = null;

/**
 * Get or create the TPMJS client singleton
 * API key is now handled server-side in the /api/tpmjs proxy route
 */
export function getTPMJSClient(): TPMJSClient {
  if (!tpmjsClientInstance) {
    tpmjsClientInstance = new TPMJSClient();
  }

  return tpmjsClientInstance;
}

/**
 * Destroy the TPMJS client singleton (cleanup)
 * Useful for hot module replacement or cleanup
 */
export function destroyTPMJSClient(): void {
  if (tpmjsClientInstance) {
    tpmjsClientInstance.destroy();
    tpmjsClientInstance = null;
  }
}
