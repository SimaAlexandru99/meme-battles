import { LobbyService } from "../lobby.service";
import { get, set, update, remove, ref } from "firebase/database";
import * as Sentry from "@sentry/nextjs";
import type { DataSnapshot } from "firebase/database";
import type {
  LobbyData,
  GameSettings,
  CreateLobbyParams,
  JoinLobbyParams,
} from "@/types";

// Mock Firebase
jest.mock("firebase/database", () => ({
  ref: jest.fn(() => ({})),
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
  remove: jest.fn(),
}));

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  startSpan: jest.fn((_, callback) => callback()),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock Firebase client
jest.mock("@/firebase/client", () => ({
  rtdb: {},
}));

describe("LobbyService - Unit Tests", () => {
  let lobbyService: LobbyService;
  const mockGet = get as jest.MockedFunction<typeof get>;
  const mockSet = set as jest.MockedFunction<typeof set>;
  const mockUpdate = update as jest.MockedFunction<typeof update>;
  const mockRemove = remove as jest.MockedFunction<typeof remove>;
  const mockRef = ref as jest.MockedFunction<typeof ref>;

  // Mock data
  const mockLobbyData: LobbyData = {
    code: "ABC12",
    hostUid: "host123",
    hostDisplayName: "HostPlayer",
    maxPlayers: 8,
    status: "waiting",
    settings: {
      rounds: 8,
      timeLimit: 60,
      categories: ["general", "reaction"],
    },
    players: {
      host123: {
        displayName: "HostPlayer",
        avatarId: "doge-sunglasses",
        profileURL: "https://example.com/avatar.jpg",
        joinedAt: "2025-01-08T10:00:00.000Z",
        isHost: true,
        score: 0,
        status: "waiting",
        lastSeen: "2025-01-08T10:00:00.000Z",
      },
    },
    createdAt: "2025-01-08T10:00:00.000Z",
    updatedAt: "2025-01-08T10:00:00.000Z",
  };

  const mockCreateLobbyParams: CreateLobbyParams = {
    hostUid: "host123",
    hostDisplayName: "HostPlayer",
    hostAvatarId: "doge-sunglasses",
    hostProfileURL: "https://example.com/avatar.jpg",
  };

  const mockJoinLobbyParams: JoinLobbyParams = {
    uid: "player456",
    displayName: "NewPlayer",
    avatarId: "cat-happy",
    profileURL: "https://example.com/player.jpg",
  };

  beforeEach(() => {
    lobbyService = LobbyService.getInstance();
    jest.clearAllMocks();
    mockRef.mockReturnValue({} as any);
  });

  describe("Code Generation and Validation", () => {
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
          "Lobby code must be exactly 5 characters"
        );
      });

      it("should reject lobby code with invalid characters", () => {
        const result = lobbyService.validateLobbyCode("abc12");
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Lobby code can only contain uppercase letters and numbers"
        );
      });

      it("should reject lobby code with special characters", () => {
        const result = lobbyService.validateLobbyCode("AB-12");
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          "Lobby code can only contain uppercase letters and numbers"
        );
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
          lobbyService.checkLobbyCodeExists("ABC12")
        ).rejects.toMatchObject({
          type: "NETWORK_ERROR",
          retryable: true,
          userMessage: expect.stringContaining("Network error"),
        });

        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      });
    });

    describe("generateUniqueLobbyCode", () => {
      it("should generate a unique 5-character code on first attempt", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);
        mockSet.mockResolvedValueOnce(undefined);

        const code = await lobbyService.generateUniqueLobbyCode();

        expect(code).toHaveLength(5);
        expect(code).toMatch(/^[A-Z0-9]+$/);
        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockSet).toHaveBeenCalledTimes(1);

        const setCall = mockSet.mock.calls[0];
        expect(setCall[1]).toMatchObject({
          reserved: true,
          reservedAt: expect.any(Number),
          reservedBy: "code_generation",
        });
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
  });

  describe("Game Settings Validation", () => {
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
          "Time limit must be between 30 and 120 seconds"
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
        expect(result.errors).toContain(
          "At least one category must be selected"
        );
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
        expect(result.errors).toContain("Rounds must be between 3 and 15");
        expect(result.errors).toContain(
          "Time limit must be between 30 and 120 seconds"
        );
        expect(result.errors).toContain(
          "At least one category must be selected"
        );
      });
    });
  });

  describe("Basic CRUD Operations", () => {
    describe("joinLobby - Validation", () => {
      it("should reject invalid lobby code format", async () => {
        await expect(
          lobbyService.joinLobby("abc", mockJoinLobbyParams)
        ).rejects.toMatchObject({
          type: "VALIDATION_ERROR",
          userMessage: expect.stringContaining("Invalid lobby code"),
        });

        expect(mockGet).not.toHaveBeenCalled();
      });

      it("should reject joining non-existent lobby", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);

        await expect(
          lobbyService.joinLobby("ABC12", mockJoinLobbyParams)
        ).rejects.toMatchObject({
          type: "LOBBY_NOT_FOUND",
          userMessage: "Lobby not found. Please check the code.",
        });
      });

      it("should reject joining full lobby", async () => {
        const fullLobbyData = {
          ...mockLobbyData,
          maxPlayers: 1, // Only host can fit
        };

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => fullLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.joinLobby("ABC12", mockJoinLobbyParams)
        ).rejects.toMatchObject({
          type: "LOBBY_FULL",
          userMessage: "This lobby is full. Try another one.",
        });
      });

      it("should reject joining started lobby", async () => {
        const startedLobbyData = {
          ...mockLobbyData,
          status: "started" as const,
        };

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => startedLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.joinLobby("ABC12", mockJoinLobbyParams)
        ).rejects.toMatchObject({
          type: "LOBBY_ALREADY_STARTED",
          userMessage: "This game has already started. You cannot join now.",
        });
      });

      it("should return existing lobby if player already joined", async () => {
        const lobbyWithPlayer = {
          ...mockLobbyData,
          players: {
            ...mockLobbyData.players,
            player456: {
              displayName: "NewPlayer",
              avatarId: "cat-happy",
              profileURL: "https://example.com/player.jpg",
              joinedAt: "2025-01-08T10:01:00.000Z",
              isHost: false,
              score: 0,
              status: "waiting" as const,
              lastSeen: "2025-01-08T10:01:00.000Z",
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => lobbyWithPlayer,
        } as DataSnapshot);

        const result = await lobbyService.joinLobby(
          "ABC12",
          mockJoinLobbyParams
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(lobbyWithPlayer);
        expect(mockUpdate).not.toHaveBeenCalled();
      });
    });

    describe("Error Handling", () => {
      it("should handle network errors with proper error classification", async () => {
        mockGet.mockRejectedValueOnce(new Error("Network timeout"));

        await expect(
          lobbyService.checkLobbyCodeExists("ABC12")
        ).rejects.toMatchObject({
          type: "NETWORK_ERROR",
          retryable: true,
          userMessage: expect.stringContaining("Network error"),
        });

        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      });

      it("should preserve lobby error types through the chain", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);

        await expect(
          lobbyService.joinLobby("ABC12", mockJoinLobbyParams)
        ).rejects.toMatchObject({
          type: "LOBBY_NOT_FOUND",
          retryable: false,
          userMessage: "Lobby not found. Please check the code.",
        });
      });
    });
  });

  describe("Data Transformation and Validation Logic", () => {
    it("should validate lobby code format correctly", () => {
      // Valid codes
      expect(lobbyService.validateLobbyCode("ABC12").isValid).toBe(true);
      expect(lobbyService.validateLobbyCode("12345").isValid).toBe(true);
      expect(lobbyService.validateLobbyCode("ZZZZZ").isValid).toBe(true);

      // Invalid codes
      expect(lobbyService.validateLobbyCode("").isValid).toBe(false);
      expect(lobbyService.validateLobbyCode("ABC").isValid).toBe(false);
      expect(lobbyService.validateLobbyCode("ABCDEF").isValid).toBe(false);
      expect(lobbyService.validateLobbyCode("abc12").isValid).toBe(false);
      expect(lobbyService.validateLobbyCode("AB-12").isValid).toBe(false);
      expect(lobbyService.validateLobbyCode("AB 12").isValid).toBe(false);
    });

    it("should validate game settings with proper constraints", () => {
      // Test boundary values
      expect(
        lobbyService.isValidGameSettings({
          rounds: 3,
          timeLimit: 30,
          categories: ["general"],
        }).isValid
      ).toBe(true);

      expect(
        lobbyService.isValidGameSettings({
          rounds: 15,
          timeLimit: 120,
          categories: ["general", "reaction", "wholesome"],
        }).isValid
      ).toBe(true);

      // Test invalid boundary values
      expect(
        lobbyService.isValidGameSettings({
          rounds: 2,
          timeLimit: 30,
          categories: ["general"],
        }).isValid
      ).toBe(false);

      expect(
        lobbyService.isValidGameSettings({
          rounds: 16,
          timeLimit: 30,
          categories: ["general"],
        }).isValid
      ).toBe(false);

      expect(
        lobbyService.isValidGameSettings({
          rounds: 8,
          timeLimit: 29,
          categories: ["general"],
        }).isValid
      ).toBe(false);

      expect(
        lobbyService.isValidGameSettings({
          rounds: 8,
          timeLimit: 121,
          categories: ["general"],
        }).isValid
      ).toBe(false);
    });
  });

  describe("Service Instance Management", () => {
    it("should return the same instance (singleton pattern)", () => {
      const instance1 = LobbyService.getInstance();
      const instance2 = LobbyService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should maintain state across getInstance calls", () => {
      const instance1 = LobbyService.getInstance();
      const instance2 = LobbyService.getInstance();

      // Both should have the same configuration
      expect(instance1.validateLobbyCode("ABC12")).toEqual(
        instance2.validateLobbyCode("ABC12")
      );
    });
  });
});
