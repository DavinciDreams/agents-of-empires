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
  private apiKey: string;
  private baseUrl = 'https://tpmjs.com/api';
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private requestCount = 0;
  private windowStart = Date.now();
  private rateLimitInfo: RateLimitInfo | null = null;

  // Rate limiting: FREE tier = 100 req/hour, we'll be conservative at 80 req/hour
  private readonly MAX_REQUESTS_PER_HOUR = 80;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  constructor(apiKey: string) {
    this.apiKey = apiKey;

    // Reset rate limit window every hour
    setInterval(() => {
      this.requestCount = 0;
      this.windowStart = Date.now();
    }, 60 * 60 * 1000);
  }

  /**
   * Search tools using BM25 semantic search
   */
  async searchTools(query: string, limit = 20): Promise<TPMJSSearchResult> {
    const cacheKey = `search:${query}:${limit}`;
    const cached = this.getCached<TPMJSSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const endpoint = `/tools/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const data = await this.queueRequest(() => this.fetch(endpoint));

    const result: TPMJSSearchResult = {
      tools: data.tools || [],
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

    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (official !== undefined) params.append('official', String(official));
    params.append('limit', String(limit));
    params.append('offset', String(offset));

    const cacheKey = `list:${params.toString()}`;
    const cached = this.getCached<TPMJSSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const endpoint = `/tools?${params.toString()}`;
    const data = await this.queueRequest(() => this.fetch(endpoint));

    const result: TPMJSSearchResult = {
      tools: data.tools || [],
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

    const endpoint = `/tools/${encodeURIComponent(packageName)}/${encodeURIComponent(toolName)}`;
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
    const endpoint = `/tools/execute/${encodeURIComponent(packageName)}/${encodeURIComponent(toolName)}`;

    const response = await this.queueRequest(() =>
      this.fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
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
   * Internal fetch wrapper with authentication and error handling
   */
  private async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(
          `TPMJS API error (${response.status}): ${errorText}`
        );
      }

      // For streaming responses (execute endpoint), return the response directly
      if (endpoint.includes('/execute/')) {
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
   */
  private setCached<T>(key: string, data: T, ttl: number): void {
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
 */
export function getTPMJSClient(): TPMJSClient {
  if (!tpmjsClientInstance) {
    const apiKey = process.env.NEXT_PUBLIC_TPMJS_API_KEY;

    if (!apiKey || apiKey === 'your-api-key-here') {
      throw new Error(
        'TPMJS API key not configured. Please set NEXT_PUBLIC_TPMJS_API_KEY in your .env file.'
      );
    }

    tpmjsClientInstance = new TPMJSClient(apiKey);
  }

  return tpmjsClientInstance;
}
