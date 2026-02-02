/**
 * A2A API Middleware
 *
 * Provides rate limiting, authentication, and other request processing.
 */

import { NextRequest, NextResponse } from "next/server";
import type { A2AErrorCode } from "../types/a2a";

/**
 * Rate limit store (in-memory for simplicity)
 * In production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;

  /** Window duration in milliseconds */
  windowMs: number;

  /** Key function (defaults to IP address) */
  keyFn?: (req: NextRequest) => string;
}

/**
 * Rate limiting middleware
 */
export function rateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs, keyFn = getClientIp } = config;

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const key = keyFn(req);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    // Reset if window has expired
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    // Check if rate limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

      return NextResponse.json(
        {
          error: {
            code: "rate_limit_exceeded" as A2AErrorCode,
            message: "Rate limit exceeded",
            details: {
              limit: maxRequests,
              window: windowMs,
              retryAfter,
            },
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": entry.resetAt.toString(),
            "Retry-After": retryAfter.toString(),
          },
        }
      );
    }

    // Add rate limit headers
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", maxRequests.toString());
    response.headers.set("X-RateLimit-Remaining", (maxRequests - entry.count).toString());
    response.headers.set("X-RateLimit-Reset", entry.resetAt.toString());

    return null; // Continue to next middleware/handler
  };
}

/**
 * API key authentication middleware
 */
export function apiKeyAuth(options?: {
  headerName?: string;
  envVarName?: string;
  required?: boolean;
}) {
  const {
    headerName = "X-API-Key",
    envVarName = "A2A_API_KEY",
    required = false,
  } = options || {};

  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Get expected API key from environment
    const expectedKey = process.env[envVarName];

    // If no key is configured and not required, allow through
    if (!expectedKey && !required) {
      return null;
    }

    // Get API key from request
    const providedKey = req.headers.get(headerName);

    // Check if key is provided
    if (!providedKey) {
      return NextResponse.json(
        {
          error: {
            code: "authentication_failed" as A2AErrorCode,
            message: "API key required",
            details: {
              header: headerName,
            },
          },
        },
        { status: 401 }
      );
    }

    // Verify key
    if (providedKey !== expectedKey) {
      return NextResponse.json(
        {
          error: {
            code: "authentication_failed" as A2AErrorCode,
            message: "Invalid API key",
          },
        },
        { status: 401 }
      );
    }

    // Authentication successful
    return null;
  };
}

/**
 * Request logging middleware
 */
export function requestLogger() {
  return async (req: NextRequest): Promise<null> => {
    const start = Date.now();
    const method = req.method;
    const url = req.url;
    const ip = getClientIp(req);

    console.log(`[${new Date().toISOString()}] ${method} ${url} from ${ip}`);

    // Log completion on response (this is a simplified version)
    // In production, use actual response monitoring
    setTimeout(() => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] Completed in ${duration}ms`);
    }, 0);

    return null;
  };
}

/**
 * CORS middleware
 */
export function corsMiddleware(options?: {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
}) {
  const {
    allowedOrigins = ["*"],
    allowedMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders = ["Content-Type", "Authorization", "X-API-Key"],
  } = options || {};

  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Handle OPTIONS request
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigins.join(", "),
          "Access-Control-Allow-Methods": allowedMethods.join(", "),
          "Access-Control-Allow-Headers": allowedHeaders.join(", "),
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    return null;
  };
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(...middlewares: Array<(req: NextRequest) => Promise<NextResponse | null>>) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    for (const middleware of middlewares) {
      const response = await middleware(req);
      if (response) {
        return response;
      }
    }
    return null;
  };
}

/**
 * Get client IP address from request
 */
function getClientIp(req: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address (if available)
  return "unknown";
}

/**
 * Clean up rate limit store (remove expired entries)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Schedule periodic cleanup
setInterval(cleanupRateLimitStore, 60000); // Every minute
