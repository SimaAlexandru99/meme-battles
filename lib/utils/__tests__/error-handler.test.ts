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

      const promise = ErrorHandler.withRetry(operation, {
        maxRetries: 2,
        retryDelays: [100, 200], // Short delays for testing
      });

      // Advance timers to resolve the delay
      await jest.advanceTimersByTimeAsync(150);

      const result = await promise;

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("succeeded after 1 retries"),
        })
      );
    });

    it("should not retry on non-retryable errors", async () => {
      const error = { type: "PERMISSION_DENIED", message: "Access denied" };
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        ErrorHandler.withRetry(operation, { maxRetries: 2 })
      ).rejects.toEqual(error);

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should exhaust retries and throw last error", async () => {
      const error = new Error("persistent network error");
      const operation = jest.fn().mockRejectedValue(error);

      const promise = ErrorHandler.withRetry(operation, {
        maxRetries: 2,
        retryDelays: [100, 200], // Short delays for testing
      });

      // Advance timers through all retries
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);

      await expect(promise).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should call onRetry callback", async () => {
      const error = new Error("network error");
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce("success");
      const onRetry = jest.fn();

      const promise = ErrorHandler.withRetry(operation, {
        maxRetries: 1,
        retryDelays: [100],
        onRetry,
      });

      // Advance timers to resolve the delay
      await jest.advanceTimersByTimeAsync(150);

      await promise;

      expect(onRetry).toHaveBeenCalledWith(1, error);
    });

    it("should use operation name in logging", async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error("network error"))
        .mockResolvedValueOnce("success");

      const promise = ErrorHandler.withRetry(operation, {
        maxRetries: 1,
        retryDelays: [100],
        operationName: "test_operation",
      });

      // Advance timers to resolve the delay
      await jest.advanceTimersByTimeAsync(150);

      await promise;

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("test_operation"),
        })
      );
    });
  });

  describe("isRetryableError", () => {
    it("should identify retryable network errors", () => {
      const networkError = new Error("network error");
      const timeoutError = new Error("timeout");
      const permissionError = new Error("permission denied");

      expect(ErrorHandler.isRetryableError(networkError)).toBe(true);
      expect(ErrorHandler.isRetryableError(timeoutError)).toBe(true);
      expect(ErrorHandler.isRetryableError(permissionError)).toBe(false);
    });

    it("should identify non-retryable errors", () => {
      const validationError = new Error("validation failed");
      const authError = new Error("unauthorized");

      expect(ErrorHandler.isRetryableError(validationError)).toBe(false);
      expect(ErrorHandler.isRetryableError(authError)).toBe(false);
    });

    it("should check LobbyError retryable flag", () => {
      const retryableLobbyError = {
        type: "NETWORK_ERROR",
        message: "Connection failed",
        retryable: true,
      };
      const nonRetryableLobbyError = {
        type: "PERMISSION_DENIED",
        message: "Access denied",
        retryable: false,
      };

      expect(ErrorHandler.isRetryableError(retryableLobbyError)).toBe(true);
      expect(ErrorHandler.isRetryableError(nonRetryableLobbyError)).toBe(false);
    });

    it("should identify retryable error messages", () => {
      const retryableMessages = [
        "network error",
        "timeout",
        "connection failed",
        "server error",
        "temporary failure",
      ];

      retryableMessages.forEach((message) => {
        expect(ErrorHandler.isRetryableError(new Error(message))).toBe(true);
      });
    });
  });

  describe("getUserFriendlyMessage", () => {
    it("should return LobbyError user message", () => {
      const lobbyError = {
        type: "LOBBY_NOT_FOUND",
        message: "Lobby not found",
        userMessage: "This lobby doesn't exist",
      };

      const result = ErrorHandler.getUserFriendlyMessage(lobbyError);

      expect(result.message).toBe("This lobby doesn't exist");
      expect(result.canRetry).toBe(false);
    });

    it("should handle network errors", () => {
      const networkError = new Error("network error");

      const result = ErrorHandler.getUserFriendlyMessage(networkError);

      expect(result.message).toContain("connection");
      expect(result.canRetry).toBe(true);
    });

    it("should handle timeout errors", () => {
      const timeoutError = new Error("timeout");

      const result = ErrorHandler.getUserFriendlyMessage(timeoutError);

      expect(result.message).toContain("timeout");
      expect(result.canRetry).toBe(true);
    });

    it("should handle permission errors", () => {
      const permissionError = new Error("permission denied");

      const result = ErrorHandler.getUserFriendlyMessage(permissionError);

      expect(result.message).toContain("permission");
      expect(result.canRetry).toBe(false);
    });

    it("should provide generic fallback", () => {
      const unknownError = new Error("unknown error");

      const result = ErrorHandler.getUserFriendlyMessage(unknownError);

      expect(result.message).toContain("Something went wrong");
      expect(result.canRetry).toBe(false);
    });
  });

  describe("logError", () => {
    it("should log error with appropriate severity", () => {
      const error = new Error("test error");

      ErrorHandler.logError(error, { operation: "test" });

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it("should log warning for medium severity errors", () => {
      const error = new Error("validation failed");

      ErrorHandler.logError(error, { operation: "validation" });

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });

  describe("createErrorResponse", () => {
    it("should create standardized error response", () => {
      const error = new Error("test error");

      const response = ErrorHandler.createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error).toMatchObject({
        type: "UNKNOWN_ERROR",
        message: "test error",
        canRetry: false,
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
        "test_method"
      );

      const promise = wrappedMethod("arg1", "arg2");

      // Advance timers to resolve the delay
      await jest.advanceTimersByTimeAsync(150);

      const result = await promise;

      expect(result).toBe("success");
      expect(method).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should log errors from wrapped method", async () => {
      const method = jest.fn().mockRejectedValue(new Error("test error"));

      const wrappedMethod = ErrorHandler.wrapServiceMethod(
        method,
        "test_method"
      );

      await expect(wrappedMethod()).rejects.toThrow("test error");

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });
});
