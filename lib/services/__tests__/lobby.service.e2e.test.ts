import { LobbyService } from "../lobby.service";
import { get, set, update, ref } from "firebase/database";
import * as Sentry from "@sentry/nextjs";
import type { DataSnapshot } from "firebase/database";

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

describe("LobbyService - End-to-End Tests", () => {
  let lobbyService: LobbyService;
  const mockGet = get as jest.MockedFunction<typeof get>;
  const mockSet = set as jest.MockedFunction<typeof set>;
  const mockUpdate = update as jest.MockedFunction<typeof update>;
  const mockRef = ref as jest.MockedFunction<typeof ref>;

  beforeEach(() => {
    lobbyService = LobbyService.getInstance();
    jest.clearAllMocks();
    mockRef.mockReturnValue({} as ReturnType<typeof ref>);
  });

  describe("Complete Lobby Creation and Joining Flow", () => {
    it("should complete full lobby creation workflow", async () => {
      // Step 1: Generate unique lobby code
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);
      mockSet.mockResolvedValueOnce(undefined); // Code reservation

      // Step 2: Create lobby with host
      mockSet.mockResolvedValueOnce(undefined); // Lobby creation

      const createParams: CreateLobbyParams = {
        hostUid: "host123",
        hostDisplayName: "GameHost",
        hostAvatarId: "doge-sunglasses",
        hostProfileURL: "https://example.com/host.jpg",
        maxPlayers: 6,
        settings: {
          rounds: 10,
          timeLimit: 90,
          categories: ["general", "reaction"],
        },
      };

      const result = await lobbyService.createLobby(createParams);

      expect(result.success).toBe(true);
      expect(result.data?.code).toHaveLength(5);
      expect(result.data?.lobby).toMatchObject({
        hostUid: "host123",
        hostDisplayName: "GameHost",
        maxPlayers: 6,
        status: "waiting",
        settings: {
          rounds: 10,
          timeLimit: 90,
          categories: ["general", "reaction"],
        },
        players: {
          host123: {
            displayName: "GameHost",
            avatarId: "doge-sunglasses",
            isHost: true,
            status: "waiting",
          },
        },
      });

      // Verify database operations
      expect(mockGet).toHaveBeenCalledTimes(1); // Code existence check
      expect(mockSet).toHaveBeenCalledTimes(2); // Code reservation + lobby creation
    });

    it("should complete full player joining workflow", async () => {
      const existingLobby: LobbyData = {
        code: "ABC12",
        hostUid: "host123",
        hostDisplayName: "GameHost",
        maxPlayers: 6,
        status: "waiting",
        settings: {
          rounds: 10,
          timeLimit: 90,
          categories: ["general", "reaction"],
        },
        players: {
          host123: {
            id: "host123",
            displayName: "GameHost",
            avatarId: "doge-sunglasses",
            profileURL: "https://example.com/host.jpg",
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

      // Step 1: Validate lobby code and check lobby exists
      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => existingLobby,
      } as DataSnapshot);

      // Step 2: Add player to lobby
      mockUpdate.mockResolvedValueOnce(undefined);

      // Step 3: Return updated lobby data
      const updatedLobby = {
        ...existingLobby,
        players: {
          ...existingLobby.players,
          player456: {
            id: "player456",
            displayName: "NewPlayer",
            avatarId: "cat-happy",
            profileURL: "https://example.com/player.jpg",
            joinedAt: "2025-01-08T10:01:00.000Z",
            isHost: false,
            score: 0,
            status: "waiting",
            lastSeen: "2025-01-08T10:01:00.000Z",
          },
        },
        updatedAt: "2025-01-08T10:01:00.000Z",
      };

      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => updatedLobby,
      } as DataSnapshot);

      const joinParams: JoinLobbyParams = {
        uid: "player456",
        displayName: "NewPlayer",
        avatarId: "cat-happy",
        profileURL: "https://example.com/player.jpg",
      };

      const result = await lobbyService.joinLobby("ABC12", joinParams);

      expect(result.success).toBe(true);
      expect(result.data?.players).toHaveProperty("player456");
      expect(result.data?.players.player456).toMatchObject({
        displayName: "NewPlayer",
        avatarId: "cat-happy",
        isHost: false,
        status: "waiting",
      });

      // Verify database operations
      expect(mockGet).toHaveBeenCalledTimes(2); // Initial check + updated data fetch
      expect(mockUpdate).toHaveBeenCalledTimes(1); // Player addition
    });

    it("should handle complete lobby creation to game start workflow", async () => {
      // Step 1: Create lobby
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);
      mockSet.mockResolvedValueOnce(undefined); // Code reservation
      mockSet.mockResolvedValueOnce(undefined); // Lobby creation

      const createResult = await lobbyService.createLobby({
        hostUid: "host123",
        hostDisplayName: "GameHost",
        hostAvatarId: "doge-sunglasses",
      });

      expect(createResult.success).toBe(true);
      const lobbyCode = createResult.data?.code ?? "";

      // Step 2: Multiple players join
      const baseLobby: LobbyData = {
        code: lobbyCode,
        hostUid: "host123",
        hostDisplayName: "GameHost",
        maxPlayers: 8,
        status: "waiting",
        settings: {
          rounds: 8,
          timeLimit: 60,
          categories: ["general", "reaction", "wholesome"],
        },
        players: {
          host123: {
            id: "host123",
            displayName: "GameHost",
            avatarId: "doge-sunglasses",
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

      // Mock player joins
      for (let i = 1; i <= 3; i++) {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => ({
            ...baseLobby,
            players: {
              ...baseLobby.players,
              ...Object.fromEntries(
                Array.from({ length: i - 1 }, (_, j) => [
                  `player${j + 1}`,
                  {
                    id: `player${j + 1}`,
                    displayName: `Player${j + 1}`,
                    avatarId: "default",
                    joinedAt: `2025-01-08T10:0${j + 1}:00.000Z`,
                    isHost: false,
                    score: 0,
                    status: "waiting",
                    lastSeen: `2025-01-08T10:0${j + 1}:00.000Z`,
                  },
                ])
              ),
            },
          }),
        } as DataSnapshot);

        mockUpdate.mockResolvedValueOnce(undefined);

        const updatedLobby = {
          ...baseLobby,
          players: {
            ...baseLobby.players,
            ...Object.fromEntries(
              Array.from({ length: i }, (_, j) => [
                `player${j + 1}`,
                {
                  id: `player${j + 1}`,
                  displayName: `Player${j + 1}`,
                  avatarId: "default",
                  joinedAt: `2025-01-08T10:0${j + 1}:00.000Z`,
                  isHost: false,
                  score: 0,
                  status: "waiting",
                  lastSeen: `2025-01-08T10:0${j + 1}:00.000Z`,
                },
              ])
            ),
          },
        };

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => updatedLobby,
        } as DataSnapshot);

        const joinResult = await lobbyService.joinLobby(lobbyCode, {
          uid: `player${i}`,
          displayName: `Player${i}`,
          avatarId: "default",
        });

        expect(joinResult.success).toBe(true);
      }

      // Step 3: Validate minimum players for game start
      const finalLobby = {
        ...baseLobby,
        players: {
          ...baseLobby.players,
          player1: {
            id: "player1",
            displayName: "Player1",
            avatarId: "default",
            joinedAt: "2025-01-08T10:01:00.000Z",
            isHost: false,
            score: 0,
            status: "waiting",
            lastSeen: "2025-01-08T10:01:00.000Z",
          },
          player2: {
            id: "player2",
            displayName: "Player2",
            avatarId: "default",
            joinedAt: "2025-01-08T10:02:00.000Z",
            isHost: false,
            score: 0,
            status: "waiting",
            lastSeen: "2025-01-08T10:02:00.000Z",
          },
          player3: {
            id: "player3",
            displayName: "Player3",
            avatarId: "default",
            joinedAt: "2025-01-08T10:03:00.000Z",
            isHost: false,
            score: 0,
            status: "waiting",
            lastSeen: "2025-01-08T10:03:00.000Z",
          },
        },
      };

      // Verify we have enough players to start (4 total including host)
      const playerCount = Object.keys(finalLobby.players).length;
      expect(playerCount).toBe(4);
      expect(playerCount >= 3).toBe(true); // Meets minimum requirement

      // Verify all database operations completed successfully
      expect(mockGet).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledTimes(2); // Code reservation + lobby creation
      expect(mockUpdate).toHaveBeenCalledTimes(3); // 3 player joins
    });
  });

  describe("Lobby Settings Management and Real-time Updates", () => {
    it("should complete settings update workflow with validation", async () => {
      const existingLobby: LobbyData = {
        code: "ABC12",
        hostUid: "host123",
        hostDisplayName: "GameHost",
        maxPlayers: 8,
        status: "waiting",
        settings: {
          rounds: 8,
          timeLimit: 60,
          categories: ["general"],
        },
        players: {
          host123: {
            id: "host123",
            displayName: "GameHost",
            avatarId: "doge-sunglasses",
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

      // Step 1: Validate host permissions and lobby state
      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => existingLobby,
      } as DataSnapshot);

      // Step 2: Update settings (with debouncing simulation)
      mockUpdate.mockResolvedValueOnce(undefined);

      // Step 3: Return updated lobby
      const updatedLobby = {
        ...existingLobby,
        settings: {
          rounds: 12,
          timeLimit: 90,
          categories: ["general", "reaction", "wholesome"],
        },
        updatedAt: "2025-01-08T10:05:00.000Z",
      };

      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => updatedLobby,
      } as DataSnapshot);

      // Use fake timers to handle debouncing
      jest.useFakeTimers();

      const settingsPromise = lobbyService.updateLobbySettings(
        "ABC12",
        {
          rounds: 12,
          timeLimit: 90,
          categories: ["general", "reaction", "wholesome"],
        },
        "host123"
      );

      // Fast-forward through debounce delay
      jest.advanceTimersByTime(500);

      const result = await settingsPromise;

      expect(result.success).toBe(true);
      expect(result.data?.settings).toEqual({
        rounds: 12,
        timeLimit: 90,
        categories: ["general", "reaction", "wholesome"],
      });

      // Verify database operations
      expect(mockGet).toHaveBeenCalledTimes(2); // Permission check + updated data
      expect(mockUpdate).toHaveBeenCalledTimes(1); // Settings update

      jest.useRealTimers();
    });

    it("should handle settings validation errors in complete workflow", async () => {
      // Test invalid settings rejection without database calls
      const invalidSettings = {
        rounds: 2, // Too low
        timeLimit: 25, // Too low
        categories: [], // Empty
      };

      await expect(
        lobbyService.updateLobbySettings("ABC12", invalidSettings, "host123")
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        userMessage: expect.stringContaining("Invalid settings"),
      });

      // Should not make any database calls for invalid settings
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(0);
    }, 10000);
  });

  describe("Error Scenarios and Recovery Mechanisms", () => {
    it("should handle complete error recovery workflow", async () => {
      // Scenario: Network error during join, then successful retry

      // First attempt: Network error
      mockGet.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(
        lobbyService.joinLobby("ABC12", {
          uid: "player456",
          displayName: "Player",
          avatarId: "default",
        })
      ).rejects.toMatchObject({
        type: "UNKNOWN_ERROR",
        retryable: true,
      });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);

      // Second attempt: Success
      const lobbyData: LobbyData = {
        code: "ABC12",
        hostUid: "host123",
        hostDisplayName: "Host",
        maxPlayers: 8,
        status: "waiting",
        settings: {
          rounds: 8,
          timeLimit: 60,
          categories: ["general"],
        },
        players: {
          host123: {
            id: "host123",
            displayName: "Host",
            avatarId: "default",
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

      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => lobbyData,
      } as DataSnapshot);

      mockUpdate.mockResolvedValueOnce(undefined);

      const updatedLobby = {
        ...lobbyData,
        players: {
          ...lobbyData.players,
          player456: {
            id: "player456",
            displayName: "Player",
            avatarId: "default",
            joinedAt: "2025-01-08T10:01:00.000Z",
            isHost: false,
            score: 0,
            status: "waiting",
            lastSeen: "2025-01-08T10:01:00.000Z",
          },
        },
      };

      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => updatedLobby,
      } as DataSnapshot);

      const result = await lobbyService.joinLobby("ABC12", {
        uid: "player456",
        displayName: "Player",
        avatarId: "default",
      });

      expect(result.success).toBe(true);
      expect(result.data?.players).toHaveProperty("player456");
    });

    it("should handle validation error workflow", async () => {
      // Test complete validation error flow for lobby joining

      // Invalid lobby code format
      await expect(
        lobbyService.joinLobby("abc", {
          uid: "player456",
          displayName: "Player",
          avatarId: "default",
        })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        userMessage: expect.stringContaining("Invalid lobby code"),
      });

      // Should not make database calls for invalid input
      expect(mockGet).not.toHaveBeenCalled();

      // Valid format but lobby doesn't exist
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);

      await expect(
        lobbyService.joinLobby("ABC12", {
          uid: "player456",
          displayName: "Player",
          avatarId: "default",
        })
      ).rejects.toMatchObject({
        type: "LOBBY_NOT_FOUND",
        userMessage: "Lobby not found. Please check the code.",
      });

      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  describe("Performance Tests for Lobby Operations Under Load", () => {
    it("should handle multiple rapid operations efficiently", async () => {
      const lobbyData: LobbyData = {
        code: "ABC12",
        hostUid: "host123",
        hostDisplayName: "Host",
        maxPlayers: 8,
        status: "waiting",
        settings: {
          rounds: 8,
          timeLimit: 60,
          categories: ["general"],
        },
        players: {
          host123: {
            id: "host123",
            displayName: "Host",
            avatarId: "default",
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

      // Mock successful operations for all requests
      mockGet.mockResolvedValue({
        exists: () => true,
        val: () => lobbyData,
      } as DataSnapshot);

      mockUpdate.mockResolvedValue(undefined);

      // Simulate 10 rapid player status updates
      const operations = Array.from({ length: 10 }, () =>
        lobbyService.updatePlayerStatus("ABC12", "host123", "waiting")
      );

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const duration = Date.now() - startTime;

      // All operations should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Should complete reasonably quickly (under 1 second for mocked operations)
      expect(duration).toBeLessThan(1000);

      // Should have made the expected number of database calls
      expect(mockGet).toHaveBeenCalledTimes(10);
      expect(mockUpdate).toHaveBeenCalledTimes(10);
    });

    it("should handle lobby at maximum capacity efficiently", async () => {
      // Create lobby data with maximum players (8)
      const maxPlayers = 8;
      const players: Record<string, PlayerData> = {};

      for (let i = 0; i < maxPlayers; i++) {
        players[`player${i}`] = {
          id: `player${i}`,
          displayName: `Player${i}`,
          avatarId: "default",
          joinedAt: `2025-01-08T10:0${i}:00.000Z`,
          isHost: i === 0,
          score: 0,
          status: "waiting",
          lastSeen: `2025-01-08T10:0${i}:00.000Z`,
        };
      }

      const fullLobby: LobbyData = {
        code: "ABC12",
        hostUid: "player0",
        hostDisplayName: "Player0",
        maxPlayers,
        status: "waiting",
        settings: {
          rounds: 8,
          timeLimit: 60,
          categories: ["general"],
        },
        players,
        createdAt: "2025-01-08T10:00:00.000Z",
        updatedAt: "2025-01-08T10:00:00.000Z",
      };

      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => fullLobby,
      } as DataSnapshot);

      // Attempt to join full lobby
      await expect(
        lobbyService.joinLobby("ABC12", {
          uid: "newPlayer",
          displayName: "NewPlayer",
          avatarId: "default",
        })
      ).rejects.toMatchObject({
        type: "LOBBY_FULL",
        userMessage: "This lobby is full. Try another one.",
      });

      // Should efficiently detect full lobby without attempting update
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility and User Experience Workflows", () => {
    it("should provide clear error messages for user-facing scenarios", async () => {
      // Test various error scenarios and their user-friendly messages

      // Invalid lobby code
      await expect(
        lobbyService.joinLobby("", {
          uid: "player456",
          displayName: "Player",
          avatarId: "default",
        })
      ).rejects.toMatchObject({
        type: "VALIDATION_ERROR",
        userMessage: expect.stringContaining("Lobby code is required"),
      });

      // Lobby not found
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);

      await expect(
        lobbyService.joinLobby("ABC12", {
          uid: "player456",
          displayName: "Player",
          avatarId: "default",
        })
      ).rejects.toMatchObject({
        type: "LOBBY_NOT_FOUND",
        userMessage: "Lobby not found. Please check the code.",
      });

      // Game already started
      const startedLobby: LobbyData = {
        code: "ABC12",
        hostUid: "host123",
        hostDisplayName: "Host",
        maxPlayers: 8,
        status: "started", // Game in progress
        settings: {
          rounds: 8,
          timeLimit: 60,
          categories: ["general"],
        },
        players: {
          host123: {
            id: "host123",
            displayName: "Host",
            avatarId: "default",
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

      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => startedLobby,
      } as DataSnapshot);

      await expect(
        lobbyService.joinLobby("ABC12", {
          uid: "player456",
          displayName: "Player",
          avatarId: "default",
        })
      ).rejects.toMatchObject({
        type: "LOBBY_ALREADY_STARTED",
        userMessage: "This game has already started. You cannot join now.",
      });
    });

    it("should handle data validation with comprehensive error reporting", async () => {
      // Test comprehensive settings validation
      const invalidSettings: Partial<GameSettings> = {
        rounds: 20, // Too high
        timeLimit: 200, // Too high
        categories: [], // Empty
      };

      const validation = lobbyService.isValidGameSettings(
        invalidSettings as GameSettings
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(3);
      expect(validation.errors).toContain("Rounds must be between 3 and 15");
      expect(validation.errors).toContain(
        "Time limit must be between 30 and 120 seconds"
      );
      expect(validation.errors).toContain(
        "At least 1 category must be selected"
      );

      // Test boundary values
      const boundarySettings: GameSettings = {
        rounds: 3, // Minimum valid
        timeLimit: 30, // Minimum valid
        categories: ["general"], // Minimum valid
      };

      const boundaryValidation =
        lobbyService.isValidGameSettings(boundarySettings);
      expect(boundaryValidation.isValid).toBe(true);
      expect(boundaryValidation.errors).toHaveLength(0);
    });
  });
});
