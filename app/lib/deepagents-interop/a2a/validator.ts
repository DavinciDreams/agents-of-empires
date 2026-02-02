/**
 * A2A Request and Response Validation
 */

import { z } from "zod";
import type { A2ARequest, A2AResponse } from "../types/a2a";

/**
 * Zod schema for A2A request validation
 */
export const A2ARequestSchema = z.object({
  task: z.string().min(1, "Task cannot be empty"),
  context: z.record(z.unknown()).optional(),
  config: z
    .object({
      recursionLimit: z.number().int().positive().max(200).optional(),
      streaming: z.boolean().optional(),
      checkpointId: z.string().optional(),
      threadId: z.string().optional(),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
});

/**
 * Validate an A2A request
 */
export function validateA2ARequest(
  data: unknown
): { valid: true; data: A2ARequest } | { valid: false; errors: string[] } {
  try {
    const validated = A2ARequestSchema.parse(data);
    return { valid: true, data: validated as A2ARequest };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
      };
    }

    return {
      valid: false,
      errors: ["Invalid request format"],
    };
  }
}

/**
 * Validate an A2A response
 */
export function validateA2AResponse(response: unknown): response is A2AResponse {
  if (!response || typeof response !== "object") {
    return false;
  }

  const resp = response as any;

  // Must have status
  if (!resp.status || !["success", "error", "pending", "cancelled"].includes(resp.status)) {
    return false;
  }

  // Must have metadata
  if (!resp.metadata || typeof resp.metadata !== "object") {
    return false;
  }

  // If success, must have result
  if (resp.status === "success" && !resp.result) {
    return false;
  }

  // If error, must have error
  if (resp.status === "error" && !resp.error) {
    return false;
  }

  return true;
}

/**
 * Sanitize request data (remove sensitive information)
 */
export function sanitizeRequest(request: A2ARequest): A2ARequest {
  // Create a copy
  const sanitized = { ...request };

  // Remove potentially sensitive context keys
  if (sanitized.context) {
    const { apiKey, token, password, secret, ...safeContext } = sanitized.context as any;
    sanitized.context = safeContext;
  }

  return sanitized;
}

/**
 * Sanitize response data (remove sensitive information)
 */
export function sanitizeResponse(response: A2AResponse): A2AResponse {
  // Create a copy
  const sanitized = { ...response };

  // Remove stack traces in production
  if (
    sanitized.error?.details?.stack &&
    process.env.NODE_ENV === "production"
  ) {
    delete sanitized.error.details.stack;
  }

  return sanitized;
}
