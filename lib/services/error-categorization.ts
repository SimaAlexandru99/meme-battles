/**
 * Error categorization and retry logic for Firebase operations
 * Differentiates between temporary and permanent errors for better UX
 */

export type ErrorCategory =
  | "temporary"
  | "permanent"
  | "rate_limited"
  | "network"
  | "authentication";

export interface CategorizedError extends Error {
  category: ErrorCategory;
  retryable: boolean;
  retryAfter?: number; // seconds to wait before retry
  userMessage: string;
  technicalMessage: string;
}

/**
 * Categorizes Firebase errors for appropriate retry behavior
 */
export function categorizeError(error: Error | unknown): CategorizedError {
  const errorObj = error as Error & { code?: string };
  const code = errorObj.code || errorObj.message || "";

  // Network-related errors (retryable)
  if (
    code.includes("network") ||
    code.includes("timeout") ||
    code.includes("offline")
  ) {
    return {
      ...errorObj,
      category: "network",
      retryable: true,
      userMessage: "Connection issue detected. Retrying automatically...",
      technicalMessage: `Network error: ${code}`,
    };
  }

  // Firebase-specific temporary errors
  if (
    code.includes("unavailable") ||
    code.includes("deadline-exceeded") ||
    code.includes("internal")
  ) {
    return {
      ...errorObj,
      category: "temporary",
      retryable: true,
      userMessage: "Server temporarily unavailable. Retrying...",
      technicalMessage: `Firebase temporary error: ${code}`,
    };
  }

  // Rate limiting errors
  if (code.includes("too-many-requests") || code.includes("quota-exceeded")) {
    return {
      ...errorObj,
      category: "rate_limited",
      retryable: true,
      retryAfter: 60, // Wait 1 minute
      userMessage: "Too many requests. Please wait a moment...",
      technicalMessage: `Rate limited: ${code}`,
    };
  }

  // Authentication errors (not retryable)
  if (code.includes("permission-denied") || code.includes("unauthenticated")) {
    return {
      ...errorObj,
      category: "authentication",
      retryable: false,
      userMessage: "Authentication required. Please sign in again.",
      technicalMessage: `Auth error: ${code}`,
    };
  }

  // Validation errors (not retryable)
  if (
    code.includes("invalid-argument") ||
    code.includes("already-exists") ||
    code.includes("not-found")
  ) {
    return {
      ...errorObj,
      category: "permanent",
      retryable: false,
      userMessage: "Invalid request. Please check your input.",
      technicalMessage: `Validation error: ${code}`,
    };
  }

  // Default to temporary for unknown errors
  return {
    ...errorObj,
    category: "temporary",
    retryable: true,
    userMessage: "An unexpected error occurred. Retrying...",
    technicalMessage: `Unknown error: ${code}`,
  };
}

/**
 * Enhanced retry operation with error categorization
 */
export async function retryWithCategorization<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 5,
  onRetry?: (attempt: number, error: CategorizedError) => void,
): Promise<T> {
  let lastError: CategorizedError | undefined;
  const retryDelays = [100, 200, 400, 800, 1600]; // Exponential backoff

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const categorizedError = categorizeError(error);
      lastError = categorizedError;

      // Don't retry permanent errors
      if (!categorizedError.retryable) {
        throw categorizedError;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      // Calculate delay with respect to error category
      let delay = retryDelays[Math.min(attempt, retryDelays.length - 1)];

      if (categorizedError.retryAfter) {
        delay = categorizedError.retryAfter * 1000; // Convert to ms
      }

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 100;
      delay += jitter;

      // Notify caller about retry
      if (onRetry) {
        onRetry(attempt + 1, categorizedError);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw (
    lastError ||
    new Error(`Operation ${operationName} failed after ${maxRetries} attempts`)
  );
}
