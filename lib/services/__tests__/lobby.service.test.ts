import { LobbyService } from "../lobby.service";
import { get, set } from "firebase/database";
import * as Sentry from "@sentry/nextjs";
import type { DataSnapshot } from "firebase/database";

// Mock Firebase
jest.mock("firebase/database", () => ({
  ref: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
  remove: jest.fn(),
}));

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  startSpan: jest.fn((config, callback) => callback()),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock Firebase client
jest.mock("@/firebase/client", () => ({
  rtdb: {},
}));

describe("LobbyService - Atomic Code Generation", () => {
  let lobbyService: LobbyService;
  const mockGet = get as jest.MockedFunction<typeof get>;
  const mockSet = set as jest.MockedFunction<typeof set>;

  beforeEach(() => {
    lobbyService = LobbyService.getInstance();
    jest.clearAllMocks();
  });

  describe("generateUniqueLobbyCode", () => {
    it("should generate a unique 5-character code on first attempt", async () => {
      // Mock that the code doesn't exist
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);

      mockSet.mockResolvedValueOnce(undefined);

      const code = await lobbyService.generateUniqueLobbyCode();

      expect(code).toHaveLength(5);
      expect(code).toMatch(/^[A-Z0-9]+$/);
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockSet).toHaveBeenCalledTimes(1);
      // Check that set was called with the reservation data
      const setCall = mockSet.mock.calls[0];
      expect(setCall[1]).toMatchObject({
        reserved: true,
        reservedAt: expect.any(Number),
        reservedBy: "code_generation",
      });
    });

    it("should retry when code already exists and succeed on second attempt", async () => {
      // First attempt - code exists
      mockGet.mockResolvedValueOnce({
        exists: () => true,
      } as DataSnapshot);

      // Second attempt - code doesn't exist
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);

      mockSet.mockResolvedValueOnce(undefined);

      const code = await lobbyService.generateUniqueLobbyCode();

      expect(code).toHaveLength(5);
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(mockSet).toHaveBeenCalledTimes(1);
    });

    it("should implement exponential backoff with jitter", async () => {
      const startTime = Date.now();

      // Mock multiple collisions
      for (let i = 0; i < 3; i++) {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
        } as DataSnapshot);
      }

      // Final success
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);

      mockSet.mockResolvedValueOnce(undefined);

      const code = await lobbyService.generateUniqueLobbyCode();
      const duration = Date.now() - startTime;

      expect(code).toHaveLength(5);
      expect(mockGet).toHaveBeenCalledTimes(4);
      // Should have some delay due to backoff (at least 100ms + 200ms)
      expect(duration).toBeGreaterThan(250);
    });

    it("should throw CODE_GENERATION_FAILED after maximum attempts", async () => {
      // Mock all attempts as collisions
      for (let i = 0; i < 10; i++) {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
        } as DataSnapshot);
      }

      await expect(
        lobbyService.generateUniqueLobbyCode(),
      ).rejects.toMatchObject({
        type: "CODE_GENERATION_FAILED",
        retryable: true,
        userMessage: expect.stringContaining(
          "Unable to create a unique lobby code",
        ),
      });

      expect(mockGet).toHaveBeenCalledTimes(10);
      expect(mockSet).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Lobby code generation failed after maximum attempts",
        expect.objectContaining({
          level: "warning",
        }),
      );
    }, 15000); // Increase timeout to 15 seconds

    it("should handle network errors with retry logic", async () => {
      // First attempt fails with network error
      mockGet.mockRejectedValueOnce(new Error("Network error"));

      // Second attempt succeeds
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);

      mockSet.mockResolvedValueOnce(undefined);

      const code = await lobbyService.generateUniqueLobbyCode();

      expect(code).toHaveLength(5);
      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it("should throw NETWORK_ERROR after exhausting retries on network failures", async () => {
      // All attempts fail with network error
      for (let i = 0; i < 10; i++) {
        mockGet.mockRejectedValueOnce(new Error("Network error"));
      }

      await expect(
        lobbyService.generateUniqueLobbyCode(),
      ).rejects.toMatchObject({
        type: "NETWORK_ERROR",
        retryable: true,
        userMessage: expect.stringContaining("network issues"),
      });

      expect(mockGet).toHaveBeenCalledTimes(10);
      expect(Sentry.captureException).toHaveBeenCalledTimes(10);
    });

    it("should log successful generation with monitoring data", async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);

      mockSet.mockResolvedValueOnce(undefined);

      await lobbyService.generateUniqueLobbyCode();

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: "Lobby code generated successfully",
        data: {
          code: expect.any(String),
          attempts: 1,
          duration: expect.any(Number),
        },
        level: "info",
      });
    });
  });

  describe("checkLobbyCodeExists", () => {
    it("should return true when lobby exists", async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => true,
      } as DataSnapshot);

      const exists = await lobbyService.checkLobbyCodeExists("ABC12");

      expect(exists).toBe(true);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("should return false when lobby doesn't exist", async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);

      const exists = await lobbyService.checkLobbyCodeExists("ABC12");

      expect(exists).toBe(false);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("should throw NETWORK_ERROR on database failure", async () => {
      mockGet.mockRejectedValueOnce(new Error("Database error"));

      await expect(
        lobbyService.checkLobbyCodeExists("ABC12"),
      ).rejects.toMatchObject({
        type: "NETWORK_ERROR",
        retryable: true,
        userMessage: expect.stringContaining("Network error"),
      });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });
  });

  describe("validateLobbyCode", () => {
    it("should validate correct lobby code format", () => {
      const result = lobbyService.validateLobbyCode("ABC12");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty lobby code", () => {
      const result = lobbyService.validateLobbyCode("");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Lobby code is required");
    });

    it("should reject lobby code with wrong length", () => {
      const result = lobbyService.validateLobbyCode("ABC");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Lobby code must be exactly 5 characters",
      );
    });

    it("should reject lobby code with invalid characters", () => {
      const result = lobbyService.validateLobbyCode("abc12");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Lobby code can only contain uppercase letters and numbers",
      );
    });

    it("should reject lobby code with special characters", () => {
      const result = lobbyService.validateLobbyCode("AB-12");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Lobby code can only contain uppercase letters and numbers",
      );
    });
  });

  describe("isValidGameSettings", () => {
    it("should validate correct game settings", () => {
      const settings: GameSettings = {
        rounds: 8,
        timeLimit: 60,
        categories: ["general", "reaction"],
      };

      const result = lobbyService.isValidGameSettings(settings);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject rounds outside valid range", () => {
      const settings: GameSettings = {
        rounds: 2,
        timeLimit: 60,
        categories: ["general"],
      };

      const result = lobbyService.isValidGameSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Rounds must be between 3 and 15");
    });

    it("should reject time limit outside valid range", () => {
      const settings: GameSettings = {
        rounds: 8,
        timeLimit: 25,
        categories: ["general"],
      };

      const result = lobbyService.isValidGameSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Time limit must be between 30 and 120 seconds",
      );
    });

    it("should reject empty categories", () => {
      const settings: GameSettings = {
        rounds: 8,
        timeLimit: 60,
        categories: [],
      };

      const result = lobbyService.isValidGameSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("At least one category must be selected");
    });

    it("should accumulate multiple validation errors", () => {
      const settings: GameSettings = {
        rounds: 20,
        timeLimit: 200,
        categories: [],
      };

      const result = lobbyService.isValidGameSettings(settings);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });
});
