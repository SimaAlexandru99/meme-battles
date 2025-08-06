import { ErrorHandler } from "../error-handler";
import * as Sentry from "@sentry/nextjs";

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

describe("ErrorHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("withRetry", () => {
    it("should succeed on first attempt", async () => {
      const operation = jest.fn().mockResolvedValue("success");

      const result = await ErrorHandler.withRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValueOnce("success");

      const result = await ErrorHandler.withRetry(operation, {
        maxRetries: 2,
        retryDelays: [1, 2], // Very short delays for testing
      });

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("succeeded after 1 retries"),
        }),
      );
    });

    it("should not retry on non-retryable errors", async () => {
      const error = { type: "PERMISSION_DENIED", message: "Access denied" };
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        ErrorHandler.withRetry(operation, { maxRetries: 2 }),
      ).rejects.toEqual(error);

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should exhaust retries and throw last error", async () => {
      const error = new Error("persistent network error");
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        ErrorHandler.withRetry(operation, {
          maxRetries: 2,
          retryDelays: [1, 2],
        }),
      ).rejects.toEqual(error);

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should call onRetry callback", async () => {
      const error = new Error("network error");
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce("success");
      const onRetry = jest.fn();

      await ErrorHandler.withRetry(operation, {
        maxRetries: 1,
        retryDelays: [1],
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledWith(1, error);
    });

    it("should use operation name in logging", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValueOnce("success");

      await ErrorHandler.withRetry(operation, {
        maxRetries: 1,
        retryDelays: [1],
        operationName: "test_operation",
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "test_operation succeeded after 1 retries",
        }),
      );
    });
  });

  describe("isRetryableError", () => {
    it("should identify retryable network errors", () => {
      expect(ErrorHandler.isRetryableError({ code: "NETWORK_ERROR" })).toBe(
        true,
      );
      expect(ErrorHandler.isRetryableError({ code: "TIMEOUT" })).toBe(true);
      expect(ErrorHandler.isRetryableError({ status: 500 })).toBe(true);
      expect(ErrorHandler.isRetryableError({ status: 502 })).toBe(true);
      expect(ErrorHandler.isRetryableError({ status: 503 })).toBe(true);
    });

    it("should identify non-retryable errors", () => {
      expect(ErrorHandler.isRetryableError({ code: "PERMISSION_DENIED" })).toBe(
        false,
      );
      expect(ErrorHandler.isRetryableError({ code: "UNAUTHENTICATED" })).toBe(
        false,
      );
      expect(ErrorHandler.isRetryableError({ status: 400 })).toBe(false);
      expect(ErrorHandler.isRetryableError({ status: 404 })).toBe(false);
    });

    it("should check LobbyError retryable flag", () => {
      expect(
        ErrorHandler.isRetryableError({
          type: "NETWORK_ERROR",
          retryable: true,
        }),
      ).toBe(true);

      expect(
        ErrorHandler.isRetryableError({
          type: "NETWORK_ERROR",
          retryable: false,
        }),
      ).toBe(false);
    });

    it("should identify retryable error messages", () => {
      expect(
        ErrorHandler.isRetryableError({
          message: "Network connection failed",
        }),
      ).toBe(true);

      expect(
        ErrorHandler.isRetryableError({
          message: "Request timeout occurred",
        }),
      ).toBe(true);

      expect(
        ErrorHandler.isRetryableError({
          message: "Service temporarily unavailable",
        }),
      ).toBe(true);
    });
  });

  describe("getUserFriendlyMessage", () => {
    it("should return LobbyError user message", () => {
      const error = {
        type: "LOBBY_NOT_FOUND",
        userMessage: "Lobby not found. Please check the code.",
        retryable: false,
      };

      const result = ErrorHandler.getUserFriendlyMessage(error);

      expect(result).toEqual({
        message: "Lobby not found. Please check the code.",
        action: "Double-check the lobby code and try again.",
        canRetry: false,
      });
    });

    it("should handle network errors", () => {
      const error = { message: "Network connection failed" };

      const result = ErrorHandler.getUserFriendlyMessage(error);

      expect(result).toEqual({
        message:
          "Network connection issue. Please check your internet connection.",
        action: "Check your internet connection and try again.",
        canRetry: true,
      });
    });

    it("should handle timeout errors", () => {
      const error = { message: "Request timeout" };

      const result = ErrorHandler.getUserFriendlyMessage(error);

      expect(result).toEqual({
        message: "Request timed out. The server might be busy.",
        action: "Please wait a moment and try again.",
        canRetry: true,
      });
    });

    it("should handle permission errors", () => {
      const error = { message: "Permission denied" };

      const result = ErrorHandler.getUserFriendlyMessage(error);

      expect(result).toEqual({
        message: "You don't have permission to perform this action.",
        action: "Please sign in again or contact support.",
        canRetry: false,
      });
    });

    it("should provide generic fallback", () => {
      const error = { message: "Unknown error" };

      const result = ErrorHandler.getUserFriendlyMessage(error);

      expect(result).toEqual({
        message: "Something went wrong. Please try again.",
        action: "If the problem persists, please contact support.",
        canRetry: true,
      });
    });
  });

  describe("logError", () => {
    it("should log error with appropriate severity", () => {
      const error = {
        type: "NETWORK_ERROR",
        message: "Network failed",
      };

      ErrorHandler.logError(error, {
        operation: "test_operation",
        userId: "user123",
        lobbyCode: "ABC12",
      });

      expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
        level: "error",
        extra: {
          operation: "test_operation",
          userId: "user123",
          lobbyCode: "ABC12",
          errorType: "NETWORK_ERROR",
          retryable: undefined,
        },
        tags: {
          operation: "test_operation",
          errorType: "NETWORK_ERROR",
        },
      });
    });

    it("should log warning for medium severity errors", () => {
      const error = {
        type: "PERMISSION_DENIED",
        message: "Access denied",
      };

      ErrorHandler.logError(error);

      expect(Sentry.captureMessage).toHaveBeenCalledWith("Access denied", {
        level: "warning",
        extra: {
          operation: undefined,
          userId: undefined,
          lobbyCode: undefined,
          errorType: "PERMISSION_DENIED",
          retryable: undefined,
        },
        tags: {
          operation: undefined,
          errorType: "PERMISSION_DENIED",
        },
      });
    });
  });

  describe("createErrorResponse", () => {
    it("should create standardized error response", () => {
      const error = {
        type: "LOBBY_NOT_FOUND",
        message: "Lobby ABC12 not found",
        userMessage: "Lobby not found. Please check the code.",
        retryable: false,
      };

      const result = ErrorHandler.createErrorResponse(error);

      expect(result).toEqual({
        success: false,
        error: {
          type: "LOBBY_NOT_FOUND",
          message: "Lobby ABC12 not found",
          userMessage: "Lobby not found. Please check the code.",
          canRetry: false,
          action: "Double-check the lobby code and try again.",
        },
      });
    });
  });

  describe("wrapServiceMethod", () => {
    it("should wrap method with retry logic", async () => {
      const method = jest
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValueOnce("success");

      const wrappedMethod = ErrorHandler.wrapServiceMethod(
        method,
        "test_operation",
      );

      const result = await wrappedMethod("arg1", "arg2");

      expect(result).toBe("success");
      expect(method).toHaveBeenCalledTimes(2);
      expect(method).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should log errors from wrapped method", async () => {
      const error = new Error("persistent error");
      const method = jest.fn().mockRejectedValue(error);

      const wrappedMethod = ErrorHandler.wrapServiceMethod(
        method,
        "test_operation",
      );

      await expect(wrappedMethod()).rejects.toEqual(error);
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });
});
