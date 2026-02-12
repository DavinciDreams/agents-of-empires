/**
 * Environment Variable Validation
 *
 * Validates required and optional environment variables on startup.
 * Provides clear error messages if configuration is missing.
 */

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 */
export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const required = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  };

  // Optional but recommended environment variables
  const optional = {
    NEXT_PUBLIC_RESEND_API_KEY: process.env.NEXT_PUBLIC_RESEND_API_KEY,
    NEXT_PUBLIC_WAITLIST_FROM_EMAIL: process.env.NEXT_PUBLIC_WAITLIST_FROM_EMAIL,
    NEXT_PUBLIC_WAITLIST_TO_EMAIL: process.env.NEXT_PUBLIC_WAITLIST_TO_EMAIL,
    LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };

  // Check required variables
  for (const [key, value] of Object.entries(required)) {
    if (!value || value === "your-api-key-here") {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Check optional variables
  for (const [key, value] of Object.entries(optional)) {
    if (!value || value.startsWith("your-") || value === "not-set") {
      warnings.push(`Optional environment variable not set: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log validation results
 */
export function logEnvValidation(result: EnvValidationResult): void {
  if (!result.valid) {
    console.error("\n🔴 Environment Configuration Errors:");
    result.errors.forEach(error => console.error(`  - ${error}`));
    console.error("\nPlease check your .env file and ensure all required variables are set.");
    console.error("See .env.example for reference.\n");
  }

  if (result.warnings.length > 0 && process.env.NODE_ENV === "development") {
    console.warn("\n⚠️  Environment Configuration Warnings:");
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
    console.warn("\nSome features may be disabled without these variables.");
    console.warn("See .env.example for reference.\n");
  }

  if (result.valid && result.warnings.length === 0) {
    console.log("✅ Environment configuration validated successfully");
  }
}

/**
 * Validate environment and throw if invalid
 */
export function validateEnvOrThrow(): void {
  const result = validateEnv();
  logEnvValidation(result);

  if (!result.valid) {
    throw new Error("Environment configuration is invalid. Please check the errors above.");
  }
}
