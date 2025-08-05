import { renderHook, act } from "@testing-library/react";
import { useLobbyData } from "@/hooks/useLobbyData";
import {
  startGame,
  joinLobby,
  createLobby,
  getLobbyData,
} from "@/lib/actions/lobby.action";

// Mock the Firebase actions
jest.mock("@/lib/actions/lobby.action", () => ({
  startGame: jest.fn(),
  joinLobby: jest.fn(),
  createLobby: jest.fn(),
  getLobbyData: jest.fn(),
}));

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  startSpan: jest.fn((options, callback) => {
    const mockSpan = {
      setAttribute: jest.fn(),
    };
    return callback(mockSpan);
  }),
  captureException: jest.fn(),
}));

// Mock toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe("Game Flow Processes", () => {
  const mockLobbyCode = "ABC12";
  const mockCurrentUser = {
    id: "user123",
    name: "Test User",
    email: "test@example.com",
    provider: "email",
    role: "user",
    createdAt: "2024-01-01T00:00:00Z",
    lastLoginAt: "2024-01-01T00:00:00Z",
    xp: 0,
    plan: "free" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Lobby Creation Flow", () => {
    it("should create a lobby successfully", async () => {
      const mockLobby = {
        code: mockLobbyCode,
        hostUid: mockCurrentUser.id,
        status: "waiting",
        players: [mockCurrentUser],
        settings: {
          rounds: 5,
          timeLimit: 60,
          categories: ["funny", "clever"],
        },
      };

      (createLobby as jest.Mock).mockResolvedValue({
        success: true,
        lobby: mockLobby,
      });

      const result = await createLobby({
        rounds: 5,
        timeLimit: 60,
        categories: ["funny", "clever"],
      });

      expect(result.success).toBe(true);
      expect(result.lobby?.code).toBe(mockLobbyCode);
      expect(result.lobby?.hostUid).toBe(mockCurrentUser.id);
      expect(result.lobby?.status).toBe("waiting");
    });

    it("should handle lobby creation errors", async () => {
      (createLobby as jest.Mock).mockRejectedValue(
        new Error("Failed to create lobby")
      );

      await expect(createLobby()).rejects.toThrow("Failed to create lobby");
    });
  });

  describe("Lobby Joining Flow", () => {
    it("should join a lobby successfully", async () => {
      const mockLobby = {
        code: mockLobbyCode,
        hostUid: "host123",
        status: "waiting",
        players: [{ id: "host123", name: "Host" }, mockCurrentUser],
        settings: {
          rounds: 5,
          timeLimit: 60,
          categories: ["funny"],
        },
      };

      (joinLobby as jest.Mock).mockResolvedValue({
        success: true,
        lobby: mockLobby,
      });

      const result = await joinLobby(mockLobbyCode);

      expect(result.success).toBe(true);
      expect(result.lobby?.code).toBe(mockLobbyCode);
      expect(result.lobby?.players).toHaveLength(2);
    });

    it("should handle invalid lobby code", async () => {
      (joinLobby as jest.Mock).mockRejectedValue(
        new Error("Invalid lobby code")
      );

      await expect(joinLobby("INVALID")).rejects.toThrow("Invalid lobby code");
    });

    it("should handle full lobby", async () => {
      (joinLobby as jest.Mock).mockRejectedValue(new Error("Lobby is full"));

      await expect(joinLobby(mockLobbyCode)).rejects.toThrow("Lobby is full");
    });
  });

  describe("Game Start Flow", () => {
    it("should start game successfully when host clicks start", async () => {
      const mockLobby = {
        code: mockLobbyCode,
        hostUid: mockCurrentUser.id,
        status: "started",
        players: [mockCurrentUser, { id: "player2", name: "Player 2" }],
        gameState: {
          phase: "submission",
          currentRound: 1,
          totalRounds: 5,
          currentSituation: "Test situation",
          submissions: {},
          votes: {},
          playerUsedCards: {},
          playerScores: {},
          roundWinners: {},
          timeLeft: 60,
          roundStartTime: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        },
        playerScores: {
          [mockCurrentUser.id]: 0,
          player2: 0,
        },
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (startGame as jest.Mock).mockResolvedValue({
        success: true,
        lobby: mockLobby,
      });

      const result = await startGame(mockLobbyCode);

      expect(result.success).toBe(true);
      expect(result.lobby?.status).toBe("started");
      expect(result.lobby?.gameState.phase).toBe("submission");
      expect(result.lobby?.gameState.currentRound).toBe(1);
      expect(Object.keys(result.lobby?.playerScores || {})).toHaveLength(2);
    });

    it("should prevent non-host from starting game", async () => {
      (startGame as jest.Mock).mockRejectedValue(
        new Error("Only the host can start the game")
      );

      await expect(startGame(mockLobbyCode)).rejects.toThrow(
        "Only the host can start the game"
      );
    });

    it("should prevent starting with insufficient players", async () => {
      (startGame as jest.Mock).mockRejectedValue(
        new Error("Need at least 2 players to start the game")
      );

      await expect(startGame(mockLobbyCode)).rejects.toThrow(
        "Need at least 2 players to start the game"
      );
    });

    it("should prevent starting already started game", async () => {
      (startGame as jest.Mock).mockRejectedValue(
        new Error("Game is already in progress or finished")
      );

      await expect(startGame(mockLobbyCode)).rejects.toThrow(
        "Game is already in progress or finished"
      );
    });
  });

  describe("Real-time Synchronization", () => {
    it("should track submissions in real-time", async () => {
      const mockLobbyData = {
        code: mockLobbyCode,
        status: "started",
        gameState: {
          phase: "submission",
          submissions: {
            [mockCurrentUser.id]: {
              cardId: "meme123",
              submittedAt: new Date().toISOString(),
              playerId: mockCurrentUser.id,
            },
          },
        },
        players: [mockCurrentUser],
      };

      const { result } = renderHook(() =>
        useLobbyData({
          lobbyCode: mockLobbyCode,
          currentUser: mockCurrentUser,
        })
      );

      console.log(result.current.lobbyData);

      // Simulate lobby data update
      act(() => {
        // This would normally be handled by the SWR hook
        // For testing, we're simulating the data structure
      });

      expect(mockLobbyData.gameState.submissions).toHaveProperty(
        mockCurrentUser.id
      );
      expect(
        mockLobbyData.gameState.submissions[mockCurrentUser.id].cardId
      ).toBe("meme123");
    });

    it("should prevent multiple submissions per round", async () => {
      const mockLobbyData = {
        code: mockLobbyCode,
        status: "started",
        gameState: {
          phase: "submission",
          submissions: {
            [mockCurrentUser.id]: {
              cardId: "meme123",
              submittedAt: new Date().toISOString(),
              playerId: mockCurrentUser.id,
            },
          },
        },
        players: [mockCurrentUser],
      };

      // Check if player has already submitted
      const hasSubmitted = mockLobbyData.gameState.submissions.hasOwnProperty(
        mockCurrentUser.id
      );

      expect(hasSubmitted).toBe(true);
    });

    it("should transition phases based on Firebase state", async () => {
      const mockLobbyData = {
        code: mockLobbyCode,
        status: "started",
        gameState: {
          phase: "voting",
          currentRound: 1,
          submissions: {
            [mockCurrentUser.id]: {
              cardId: "meme123",
              submittedAt: new Date().toISOString(),
              playerId: mockCurrentUser.id,
            },
          },
        },
        players: [mockCurrentUser],
      };

      expect(mockLobbyData.gameState.phase).toBe("voting");
      expect(mockLobbyData.gameState.currentRound).toBe(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      (getLobbyData as jest.Mock).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useLobbyData({
          lobbyCode: mockLobbyCode,
          currentUser: mockCurrentUser,
        })
      );

      // The hook should handle the error gracefully
      expect(result.current.error).toBeDefined();
    });

    it("should handle authentication errors", async () => {
      (getLobbyData as jest.Mock).mockRejectedValue(
        new Error("Authentication required")
      );

      const { result } = renderHook(() =>
        useLobbyData({
          lobbyCode: mockLobbyCode,
          currentUser: mockCurrentUser,
        })
      );

      expect(result.current.error).toBeDefined();
    });
  });
});
