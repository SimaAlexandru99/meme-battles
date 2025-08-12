import { LobbyService } from "../lobby.service";
import { get, set, update, remove, ref } from "firebase/database";
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

describe("LobbyService", () => {
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
        id: "host123",
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
    mockRef.mockReturnValue({} as ReturnType<typeof ref>);
  });

  describe("Atomic Code Generation", () => {
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
        // Mock that the first code exists, but the second doesn't
        mockGet
          .mockResolvedValueOnce({
            exists: () => true, // First attempt - code exists
          } as DataSnapshot)
          .mockResolvedValueOnce({
            exists: () => false, // Second attempt - code doesn't exist
          } as DataSnapshot)
          .mockResolvedValueOnce({
            exists: () => false, // Third attempt - code doesn't exist
          } as DataSnapshot);

        mockSet.mockResolvedValueOnce(undefined);

        // Fast-forward timers to skip delays
        const codePromise = lobbyService.generateUniqueLobbyCode();
        jest.advanceTimersByTime(1000);
        const code = await codePromise;

        expect(code).toHaveLength(5);
        expect(mockGet).toHaveBeenCalledTimes(3);
        expect(mockSet).toHaveBeenCalledTimes(1);
      });

      it("should implement exponential backoff with jitter", async () => {
        // Mock multiple collisions
        mockGet
          .mockResolvedValueOnce({
            exists: () => true,
          } as DataSnapshot)
          .mockResolvedValueOnce({
            exists: () => true,
          } as DataSnapshot)
          .mockResolvedValueOnce({
            exists: () => true,
          } as DataSnapshot)
          .mockResolvedValueOnce({
            exists: () => false, // Final success
          } as DataSnapshot);

        mockSet.mockResolvedValueOnce(undefined);

        const codePromise = lobbyService.generateUniqueLobbyCode();
        // Fast-forward through all delays
        jest.advanceTimersByTime(5000);
        const code = await codePromise;

        expect(code).toHaveLength(5);
        expect(mockGet).toHaveBeenCalledTimes(4);
      });

      it("should throw CODE_GENERATION_FAILED after maximum attempts", async () => {
        // Mock all attempts as collisions
        for (let i = 0; i < 10; i++) {
          mockGet.mockResolvedValueOnce({
            exists: () => true,
          } as DataSnapshot);
        }

        const errorPromise = lobbyService.generateUniqueLobbyCode();
        jest.advanceTimersByTime(10000);

        await expect(errorPromise).rejects.toMatchObject({
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
      });

      it("should handle network errors with retry logic", async () => {
        // First attempt fails with network error
        mockGet.mockRejectedValueOnce(new Error("Network error"));

        // Second attempt succeeds
        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);

        mockSet.mockResolvedValueOnce(undefined);

        const codePromise = lobbyService.generateUniqueLobbyCode();
        jest.advanceTimersByTime(1000);
        const code = await codePromise;

        expect(code).toHaveLength(5);
        expect(mockGet).toHaveBeenCalledTimes(2);
        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      });

      it("should throw NETWORK_ERROR after exhausting retries on network failures", async () => {
        // All attempts fail with network error
        for (let i = 0; i < 10; i++) {
          mockGet.mockRejectedValueOnce(new Error("Network error"));
        }

        const errorPromise = lobbyService.generateUniqueLobbyCode();
        jest.advanceTimersByTime(10000);

        await expect(errorPromise).rejects.toMatchObject({
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
  });

  describe("Validation Methods", () => {
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
        expect(result.errors).toContain(
          "At least one category must be selected",
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
      });
    });
  });

  describe("CRUD Operations", () => {
    describe("createLobby", () => {
      it("should create a lobby successfully with default settings", async () => {
        // Mock successful code generation
        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);
        mockSet.mockResolvedValueOnce(undefined); // For code reservation
        mockSet.mockResolvedValueOnce(undefined); // For lobby creation

        const result = await lobbyService.createLobby(mockCreateLobbyParams);

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          code: expect.any(String),
          lobby: expect.objectContaining({
            hostUid: "host123",
            hostDisplayName: "HostPlayer",
            status: "waiting",
            maxPlayers: 8,
            settings: {
              rounds: 8,
              timeLimit: 60,
              categories: ["general", "reaction", "wholesome"],
            },
          }),
        });
        expect(mockSet).toHaveBeenCalledTimes(2);
      });

      it("should create a lobby with custom settings", async () => {
        const customParams = {
          ...mockCreateLobbyParams,
          maxPlayers: 6,
          settings: {
            rounds: 10,
            timeLimit: 90,
            categories: ["general"],
          },
        };

        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);
        mockSet.mockResolvedValueOnce(undefined);
        mockSet.mockResolvedValueOnce(undefined);

        const result = await lobbyService.createLobby(customParams);

        expect(result.success).toBe(true);
        expect(result.data?.lobby.maxPlayers).toBe(6);
        expect(result.data?.lobby.settings).toEqual({
          rounds: 10,
          timeLimit: 90,
          categories: ["general"],
        });
      });

      it("should reject invalid game settings", async () => {
        const invalidParams = {
          ...mockCreateLobbyParams,
          settings: {
            rounds: 2, // Invalid: too low
            timeLimit: 60,
            categories: ["general"],
          },
        };

        await expect(
          lobbyService.createLobby(invalidParams),
        ).rejects.toMatchObject({
          type: "VALIDATION_ERROR",
          userMessage: expect.stringContaining("Invalid settings"),
        });

        expect(mockGet).not.toHaveBeenCalled();
        expect(mockSet).not.toHaveBeenCalled();
      });

      it("should handle code generation failure", async () => {
        // Mock code generation failure
        for (let i = 0; i < 10; i++) {
          mockGet.mockResolvedValueOnce({
            exists: () => true,
          } as DataSnapshot);
        }

        const errorPromise = lobbyService.createLobby(mockCreateLobbyParams);
        jest.advanceTimersByTime(10000);

        await expect(errorPromise).rejects.toMatchObject({
          type: "CODE_GENERATION_FAILED",
          retryable: true,
        });
      });

      it("should handle database errors during lobby creation", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);
        mockSet.mockResolvedValueOnce(undefined); // Code reservation succeeds
        mockSet.mockRejectedValueOnce(new Error("Database error")); // Lobby creation fails

        await expect(
          lobbyService.createLobby(mockCreateLobbyParams),
        ).rejects.toMatchObject({
          type: "UNKNOWN_ERROR",
          retryable: true,
          userMessage: "Failed to create lobby. Please try again.",
        });

        expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      });
    });

    describe("joinLobby", () => {
      it("should join an existing lobby successfully", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        mockUpdate.mockResolvedValueOnce(undefined);

        // Mock updated lobby data after join
        const updatedLobbyData = {
          ...mockLobbyData,
          players: {
            ...mockLobbyData.players,
            player456: {
              displayName: "NewPlayer",
              avatarId: "cat-happy",
              profileURL: "https://example.com/player.jpg",
              joinedAt: expect.any(String),
              isHost: false,
              score: 0,
              status: "waiting",
              lastSeen: expect.any(String),
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => updatedLobbyData,
        } as DataSnapshot);

        const result = await lobbyService.joinLobby(
          "ABC12",
          mockJoinLobbyParams,
        );

        expect(result.success).toBe(true);
        expect(result.data?.players.player456).toMatchObject({
          displayName: "NewPlayer",
          avatarId: "cat-happy",
          isHost: false,
        });
        expect(mockUpdate).toHaveBeenCalledTimes(1);
      });

      it("should reject invalid lobby code format", async () => {
        await expect(
          lobbyService.joinLobby("abc", mockJoinLobbyParams),
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
          lobbyService.joinLobby("ABC12", mockJoinLobbyParams),
        ).rejects.toMatchObject({
          type: "LOBBY_NOT_FOUND",
          userMessage: "Lobby not found. Please check the code.",
        });
      });

      it("should reject joining full lobby", async () => {
        const fullLobbyData = {
          ...mockLobbyData,
          maxPlayers: 2,
          players: {
            host123: mockLobbyData.players.host123,
            player2: {
              displayName: "Player2",
              avatarId: "cat-happy",
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
          val: () => fullLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.joinLobby("ABC12", mockJoinLobbyParams),
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
          lobbyService.joinLobby("ABC12", mockJoinLobbyParams),
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
          mockJoinLobbyParams,
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(lobbyWithPlayer);
        expect(mockUpdate).not.toHaveBeenCalled();
      });
    });

    describe("updateLobbySettings", () => {
      it("should update lobby settings successfully", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        mockUpdate.mockResolvedValueOnce(undefined);

        const updatedLobbyData = {
          ...mockLobbyData,
          settings: {
            ...mockLobbyData.settings,
            rounds: 10,
          },
        };

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => updatedLobbyData,
        } as DataSnapshot);

        const settingsPromise = lobbyService.updateLobbySettings(
          "ABC12",
          { rounds: 10 },
          "host123",
        );

        // Fast-forward through debounce delay
        jest.advanceTimersByTime(500);
        const result = await settingsPromise;

        expect(result.success).toBe(true);
        expect(result.data?.settings.rounds).toBe(10);
        expect(mockUpdate).toHaveBeenCalledTimes(1);
      });

      it("should reject settings update from non-host", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.updateLobbySettings(
            "ABC12",
            { rounds: 10 },
            "player456",
          ),
        ).rejects.toMatchObject({
          type: "PERMISSION_DENIED",
          userMessage: "Only the host can change game settings.",
        });

        expect(mockUpdate).not.toHaveBeenCalled();
      });

      it("should reject settings update for non-existent lobby", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);

        await expect(
          lobbyService.updateLobbySettings("ABC12", { rounds: 10 }, "host123"),
        ).rejects.toMatchObject({
          type: "LOBBY_NOT_FOUND",
          userMessage: "Lobby not found. Please check the code.",
        });
      });

      it("should reject settings update for started lobby", async () => {
        const startedLobbyData = {
          ...mockLobbyData,
          status: "started" as const,
        };

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => startedLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.updateLobbySettings("ABC12", { rounds: 10 }, "host123"),
        ).rejects.toMatchObject({
          type: "LOBBY_ALREADY_STARTED",
          userMessage: "Cannot change settings after the game has started.",
        });
      });

      it("should reject invalid settings", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.updateLobbySettings("ABC12", { rounds: 2 }, "host123"),
        ).rejects.toMatchObject({
          type: "VALIDATION_ERROR",
          userMessage: expect.stringContaining("Invalid settings"),
        });
      });

      it("should debounce rapid settings changes", async () => {
        mockGet.mockResolvedValue({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        mockUpdate.mockResolvedValue(undefined);

        // Make multiple rapid calls
        const promise1 = lobbyService.updateLobbySettings(
          "ABC12",
          { rounds: 10 },
          "host123",
        );
        const promise2 = lobbyService.updateLobbySettings(
          "ABC12",
          { rounds: 12 },
          "host123",
        );
        const promise3 = lobbyService.updateLobbySettings(
          "ABC12",
          { rounds: 15 },
          "host123",
        );

        // Fast-forward through debounce delay
        jest.advanceTimersByTime(500);

        await Promise.all([promise1, promise2, promise3]);

        // Should only update once with the latest settings
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            "lobbies/ABC12/settings": expect.objectContaining({
              rounds: 15,
            }),
          }),
        );
      });
    });

    describe("kickPlayer", () => {
      const lobbyWithMultiplePlayers = {
        ...mockLobbyData,
        players: {
          ...mockLobbyData.players,
          player456: {
            displayName: "PlayerToKick",
            avatarId: "cat-happy",
            joinedAt: "2025-01-08T10:01:00.000Z",
            isHost: false,
            score: 0,
            status: "waiting" as const,
            lastSeen: "2025-01-08T10:01:00.000Z",
          },
        },
      };

      it("should kick player successfully", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => lobbyWithMultiplePlayers,
        } as DataSnapshot);

        mockUpdate.mockResolvedValueOnce(undefined);

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData, // Player removed
        } as DataSnapshot);

        const result = await lobbyService.kickPlayer(
          "ABC12",
          "player456",
          "host123",
        );

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            "lobbies/ABC12/players/player456": null,
          }),
        );
      });

      it("should reject kick from non-host", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => lobbyWithMultiplePlayers,
        } as DataSnapshot);

        await expect(
          lobbyService.kickPlayer("ABC12", "player456", "player789"),
        ).rejects.toMatchObject({
          type: "PERMISSION_DENIED",
          userMessage: "Only the host can kick players.",
        });
      });

      it("should reject kicking non-existent player", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.kickPlayer("ABC12", "nonexistent", "host123"),
        ).rejects.toMatchObject({
          type: "VALIDATION_ERROR",
          userMessage: "Player not found in this lobby.",
        });
      });

      it("should reject host kicking themselves", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.kickPlayer("ABC12", "host123", "host123"),
        ).rejects.toMatchObject({
          type: "VALIDATION_ERROR",
          userMessage: "You cannot kick yourself from the lobby.",
        });
      });
    });

    describe("transferHost", () => {
      const lobbyWithMultiplePlayers = {
        ...mockLobbyData,
        players: {
          host123: {
            displayName: "HostPlayer",
            avatarId: "doge-sunglasses",
            profileURL: "https://example.com/avatar.jpg",
            joinedAt: "2025-01-08T10:00:00.000Z",
            isHost: true,
            score: 0,
            status: "waiting" as const,
            lastSeen: "2025-01-08T10:00:00.000Z",
          },
          player456: {
            displayName: "NewHost",
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

      it("should transfer host successfully", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => lobbyWithMultiplePlayers,
        } as DataSnapshot);

        mockUpdate.mockResolvedValueOnce(undefined);

        const updatedLobbyData = {
          ...lobbyWithMultiplePlayers,
          hostUid: "player456",
          hostDisplayName: "NewHost",
          players: {
            ...lobbyWithMultiplePlayers.players,
            host123: {
              ...lobbyWithMultiplePlayers.players.host123,
              isHost: false,
            },
            player456: {
              ...lobbyWithMultiplePlayers.players.player456,
              isHost: true,
            },
          },
        };

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => updatedLobbyData,
        } as DataSnapshot);

        const result = await lobbyService.transferHost(
          "ABC12",
          "player456",
          "host123",
        );

        expect(result.success).toBe(true);
        expect(result.data?.hostUid).toBe("player456");
        expect(result.data?.hostDisplayName).toBe("NewHost");
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            "lobbies/ABC12/hostUid": "player456",
            "lobbies/ABC12/hostDisplayName": "NewHost",
            "lobbies/ABC12/players/host123/isHost": false,
            "lobbies/ABC12/players/player456/isHost": true,
          }),
        );
      });

      it("should reject transfer from non-host", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => lobbyWithMultiplePlayers,
        } as DataSnapshot);

        await expect(
          lobbyService.transferHost("ABC12", "player456", "player789"),
        ).rejects.toMatchObject({
          type: "PERMISSION_DENIED",
          userMessage: "Only the current host can transfer host privileges.",
        });
      });

      it("should reject transfer to non-existent player", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.transferHost("ABC12", "nonexistent", "host123"),
        ).rejects.toMatchObject({
          type: "VALIDATION_ERROR",
          userMessage: "Cannot transfer host to a player not in the lobby.",
        });
      });

      it("should reject transfer to self", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.transferHost("ABC12", "host123", "host123"),
        ).rejects.toMatchObject({
          type: "VALIDATION_ERROR",
          userMessage: "You are already the host.",
        });
      });
    });

    describe("updatePlayerStatus", () => {
      it("should update player status successfully", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        mockUpdate.mockResolvedValueOnce(undefined);

        const result = await lobbyService.updatePlayerStatus(
          "ABC12",
          "host123",
          "ready",
        );

        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            "lobbies/ABC12/players/host123/status": "ready",
            "lobbies/ABC12/players/host123/lastSeen": expect.any(String),
          }),
        );
      });

      it("should reject updating status for non-existent player", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.updatePlayerStatus("ABC12", "nonexistent", "ready"),
        ).rejects.toMatchObject({
          type: "VALIDATION_ERROR",
          userMessage: "Player not found in this lobby.",
        });
      });

      it("should reject updating status for non-existent lobby", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);

        await expect(
          lobbyService.updatePlayerStatus("ABC12", "host123", "ready"),
        ).rejects.toMatchObject({
          type: "LOBBY_NOT_FOUND",
          userMessage: "Lobby not found. Please check the code.",
        });
      });
    });

    describe("deleteLobby", () => {
      it("should delete lobby successfully", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        mockRemove.mockResolvedValueOnce(undefined);

        const result = await lobbyService.deleteLobby("ABC12", "host123");

        expect(result.success).toBe(true);
        expect(mockRemove).toHaveBeenCalledTimes(1);
      });

      it("should succeed when lobby doesn't exist", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => false,
        } as DataSnapshot);

        const result = await lobbyService.deleteLobby("ABC12", "host123");

        expect(result.success).toBe(true);
        expect(mockRemove).not.toHaveBeenCalled();
      });

      it("should reject deletion from non-host when lobby has players", async () => {
        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => mockLobbyData,
        } as DataSnapshot);

        await expect(
          lobbyService.deleteLobby("ABC12", "player456"),
        ).rejects.toMatchObject({
          type: "PERMISSION_DENIED",
          userMessage: "Only the host can delete the lobby.",
        });
      });

      it("should allow deletion of empty lobby by anyone", async () => {
        const emptyLobbyData = {
          ...mockLobbyData,
          players: {},
        };

        mockGet.mockResolvedValueOnce({
          exists: () => true,
          val: () => emptyLobbyData,
        } as DataSnapshot);

        mockRemove.mockResolvedValueOnce(undefined);

        const result = await lobbyService.deleteLobby("ABC12", "player456");

        expect(result.success).toBe(true);
        expect(mockRemove).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Error Handling and Retry Mechanisms", () => {
    it("should handle network errors with proper error classification", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network timeout"));

      await expect(
        lobbyService.checkLobbyCodeExists("ABC12"),
      ).rejects.toMatchObject({
        type: "NETWORK_ERROR",
        retryable: true,
        userMessage: expect.stringContaining("Network error"),
      });

      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    });

    it("should handle unknown errors with proper fallback", async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => false,
      } as DataSnapshot);
      mockSet.mockResolvedValueOnce(undefined);
      mockSet.mockRejectedValueOnce(new Error("Unexpected error"));

      await expect(
        lobbyService.createLobby(mockCreateLobbyParams),
      ).rejects.toMatchObject({
        type: "UNKNOWN_ERROR",
        retryable: true,
        userMessage: "Failed to create lobby. Please try again.",
      });
    });

    it("should preserve lobby error types through the chain", async () => {
      const lobbyError = new Error("Test error") as LobbyError;
      lobbyError.type = "LOBBY_NOT_FOUND";
      lobbyError.retryable = false;
      lobbyError.userMessage = "Custom message";

      mockGet.mockRejectedValueOnce(lobbyError);

      await expect(
        lobbyService.joinLobby("ABC12", mockJoinLobbyParams),
      ).rejects.toMatchObject({
        type: "LOBBY_NOT_FOUND",
        retryable: false,
        userMessage: "Custom message",
      });
    });
  });

  describe("Real-time Listener Management", () => {
    // Note: These tests would require more complex mocking of Firebase listeners
    // For now, we'll focus on the core CRUD operations and error handling
    it("should clean up pending timeouts on deletion", async () => {
      mockGet.mockResolvedValueOnce({
        exists: () => true,
        val: () => mockLobbyData,
      } as DataSnapshot);

      mockRemove.mockResolvedValueOnce(undefined);

      // First, create a pending settings update
      const settingsPromise = lobbyService.updateLobbySettings(
        "ABC12",
        { rounds: 10 },
        "host123",
      );

      // Then delete the lobby before the timeout completes
      await lobbyService.deleteLobby("ABC12", "host123");

      // Fast-forward past the debounce timeout
      jest.advanceTimersByTime(1000);

      // The settings update should still resolve (or be handled gracefully)
      await expect(settingsPromise).resolves.toBeDefined();
    });
  });
});
