import * as Sentry from "@sentry/nextjs";

/**
 * Enhanced error handling utility with retry mechanisms and user-friendly messages
 */
export class ErrorHandler {
  private static readonly DEFAULT_RETRY_DELAYS = [1000, 2000, 4000, 8000]; // Exponential backoff
  private static readonly MAX_RETRIES = 3;

  /**
   * Execute a function with retry logic and exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelays?: number[];
      retryCondition?: (error: unknown) => boolean;
      onRetry?: (attempt: number, error: unknown) => void;
      operationName?: string;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = this.MAX_RETRIES,
      retryDelays = this.DEFAULT_RETRY_DELAYS,
      retryCondition = this.isRetryableError,
      onRetry,
      operationName = "operation",
    } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();

        // Log successful retry if this wasn't the first attempt
        if (attempt > 0) {
          Sentry.addBreadcrumb({
            message: `${operationName} succeeded after ${attempt} retries`,
            level: "info",
            data: { attempt, operationName },
          });
        }

        return result;
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt or error is not retryable
        if (attempt === maxRetries || !retryCondition(error)) {
          break;
        }

        // Calculate delay with jitter to prevent thundering herd
        const baseDelay =
          retryDelays[Math.min(attempt, retryDelays.length - 1)];
        const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
        const delay = baseDelay + jitter;

        // Log retry attempt
        Sentry.addBreadcrumb({
          message: `Retrying ${operationName} after error`,
          level: "warning",
          data: {
            attempt: attempt + 1,
            maxRetries,
            delay,
            error: ErrorHandler.getErrorMessage(error),
          },
        });

        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted, throw the last error
    throw lastError;
  }

  /**
   * Get error message safely from unknown error type
   */
  static getErrorMessage(error: unknown): string {
    if (error && typeof error === "object" && "message" in error) {
      return String((error as { message: unknown }).message);
    }
    return String(error);
  }

  /**
   * Determine if an error is retryable based on its type and characteristics
   */
  static isRetryableError(error: unknown): boolean {
    // Network-related errors are generally retryable
    if (error && typeof error === "object" && "code" in error) {
      const errorCode = (error as { code: unknown }).code;
      if (errorCode === "NETWORK_ERROR" || errorCode === "TIMEOUT") {
        return true;
      }

      // Firebase-specific retryable errors
      if (
        errorCode === "PERMISSION_DENIED" ||
        errorCode === "UNAUTHENTICATED"
      ) {
        return false; // Don't retry auth errors
      }
    }

    // HTTP status codes that are retryable
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as { status: unknown }).status;
      if (typeof status === "number") {
        const retryableStatuses = [408, 429, 500, 502, 503, 504];
        return retryableStatuses.includes(status);
      }
    }

    // LobbyError types that are retryable
    if (error && typeof error === "object" && "type" in error) {
      const errorType = (error as { type: unknown; retryable?: unknown }).type;
      const retryable = (error as { type: unknown; retryable?: unknown })
        .retryable;

      if (typeof errorType === "string") {
        const retryableTypes: LobbyErrorType[] = [
          "NETWORK_ERROR",
          "CODE_GENERATION_FAILED",
          "UNKNOWN_ERROR",
        ];
        return (
          retryableTypes.includes(errorType as LobbyErrorType) &&
          Boolean(retryable)
        );
      }
    }

    // Generic network error patterns
    const retryableMessages = [
      "network",
      "timeout",
      "connection",
      "unavailable",
      "temporary",
    ];

    const errorMessage = ErrorHandler.getErrorMessage(error).toLowerCase();
    return retryableMessages.some((pattern) => errorMessage.includes(pattern));
  }

  /**
   * Get user-friendly error message with recovery suggestions
   */
  static getUserFriendlyMessage(error: unknown): {
    message: string;
    action?: string;
    canRetry: boolean;
  } {
    // Handle LobbyError types
    if (error && typeof error === "object" && "type" in error) {
      const lobbyError = error as LobbyError;
      return {
        message: lobbyError.userMessage || lobbyError.message,
        action: this.getRecoveryAction(lobbyError.type),
        canRetry: lobbyError.retryable || false,
      };
    }

    // Handle common error patterns
    const errorMessage = ErrorHandler.getErrorMessage(error).toLowerCase();

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("connection")
    ) {
      return {
        message:
          "Network connection issue. Please check your internet connection.",
        action: "Check your internet connection and try again.",
        canRetry: true,
      };
    }

    if (errorMessage.includes("timeout")) {
      return {
        message: "Request timed out. The server might be busy.",
        action: "Please wait a moment and try again.",
        canRetry: true,
      };
    }

    if (
      errorMessage.includes("permission") ||
      errorMessage.includes("unauthorized")
    ) {
      return {
        message: "You don't have permission to perform this action.",
        action: "Please sign in again or contact support.",
        canRetry: false,
      };
    }

    if (errorMessage.includes("not found")) {
      return {
        message: "The requested resource was not found.",
        action: "Please check the information and try again.",
        canRetry: false,
      };
    }

    // Generic fallback
    return {
      message: "Something went wrong. Please try again.",
      action: "If the problem persists, please contact support.",
      canRetry: true,
    };
  }

  /**
   * Get recovery action suggestion based on error type
   */
  private static getRecoveryAction(errorType: LobbyErrorType): string {
    switch (errorType) {
      case "NETWORK_ERROR":
        return "Check your internet connection and try again.";
      case "LOBBY_NOT_FOUND":
        return "Double-check the lobby code and try again.";
      case "LOBBY_FULL":
        return "Try joining a different lobby or create your own.";
      case "LOBBY_ALREADY_STARTED":
        return "This game has already begun. Try joining a different lobby.";
      case "PERMISSION_DENIED":
        return "You don't have permission for this action. Contact the host.";
      case "VALIDATION_ERROR":
        return "Please check your input and try again.";
      case "CODE_GENERATION_FAILED":
        return "Please wait a moment and try creating the lobby again.";
      default:
        return "If the problem persists, please contact support.";
    }
  }

  /**
   * Log error with appropriate level and context
   */
  static logError(
    error: unknown,
    context: {
      operation?: string;
      userId?: string;
      lobbyCode?: string;
      additionalData?: Record<string, unknown>;
    } = {}
  ): void {
    const { operation, userId, lobbyCode, additionalData } = context;

    // Determine error severity
    const severity = this.getErrorSeverity(error);

    // Prepare error context
    const lobbyError =
      error && typeof error === "object" && "type" in error
        ? (error as LobbyError)
        : null;
    const errorContext = {
      operation,
      userId,
      lobbyCode,
      errorType: lobbyError?.type,
      retryable: lobbyError?.retryable,
      ...additionalData,
    };

    // Log to Sentry with appropriate level
    if (severity === "error") {
      Sentry.captureException(
        error instanceof Error
          ? error
          : new Error(ErrorHandler.getErrorMessage(error)),
        {
          level: "error",
          extra: errorContext,
          tags: {
            operation,
            errorType: lobbyError?.type,
          },
        }
      );
    } else {
      const message =
        lobbyError?.message ||
        ErrorHandler.getErrorMessage(error) ||
        "Unknown error";
      Sentry.captureMessage(message, {
        level: severity,
        extra: errorContext,
        tags: {
          operation,
          errorType: lobbyError?.type,
        },
      });
    }
  }

  /**
   * Determine error severity for logging
   */
  private static getErrorSeverity(
    error: unknown
  ): "error" | "warning" | "info" {
    if (error && typeof error === "object" && "type" in error) {
      const lobbyError = error as LobbyError;
      const highSeverityTypes: LobbyErrorType[] = [
        "UNKNOWN_ERROR",
        "NETWORK_ERROR",
      ];

      const mediumSeverityTypes: LobbyErrorType[] = [
        "CODE_GENERATION_FAILED",
        "PERMISSION_DENIED",
      ];

      if (highSeverityTypes.includes(lobbyError.type)) {
        return "error";
      } else if (mediumSeverityTypes.includes(lobbyError.type)) {
        return "warning";
      } else {
        return "info";
      }
    }

    // Default to error for unknown error types
    return "error";
  }

  /**
   * Create a standardized error response for API endpoints
   */
  static createErrorResponse(error: unknown): {
    success: false;
    error: {
      type: string;
      message: string;
      userMessage: string;
      canRetry: boolean;
      action?: string;
    };
  } {
    const friendlyError = this.getUserFriendlyMessage(error);
    const lobbyError =
      error && typeof error === "object" && "type" in error
        ? (error as LobbyError)
        : null;
    const errorMessage =
      lobbyError?.message ||
      ErrorHandler.getErrorMessage(error) ||
      "Unknown error occurred";

    return {
      success: false,
      error: {
        type: lobbyError?.type || "UNKNOWN_ERROR",
        message: errorMessage,
        userMessage: friendlyError.message,
        canRetry: friendlyError.canRetry,
        action: friendlyError.action,
      },
    };
  }

  /**
   * Wrap a service method with comprehensive error handling
   */
  static wrapServiceMethod<T extends unknown[], R>(
    method: (...args: T) => Promise<R>,
    operationName: string
  ) {
    return async (...args: T): Promise<R> => {
      try {
        return await this.withRetry(() => method(...args), {
          operationName,
          onRetry: (attempt, error) => {
            this.logError(error, {
              operation: operationName,
              additionalData: { retryAttempt: attempt },
            });
          },
        });
      } catch (error) {
        this.logError(error, { operation: operationName });
        throw error;
      }
    };
  }
}
