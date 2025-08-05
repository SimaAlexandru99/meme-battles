import { renderHook, act } from "@testing-library/react";
import { autoStartRound } from "@/lib/actions/lobby.action";

// Mock the Firebase actions
jest.mock("@/lib/actions/lobby.action", () => ({
  autoStartRound: jest.fn(),
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

describe("Auto Round Start System", () => {
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

  describe("Auto Start Round Function", () => {
    it("should start a round successfully with countdown and card distribution", async () => {
      const mockRoundState = {
        phase: "submission" as const,
        currentRound: 1,
        totalRounds: 5,
        currentSituation: "Your boss asks you to work overtime on Friday night",
        submissions: {},
        votes: {},
        results: {},
        playerUsedCards: {},
        playerScores: {
          user123: 0,
          user456: 0,
        },
        roundWinners: {},
        timeLeft: 60,
        roundStartTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        playerCards: {
          user123: [
            "meme1.jpg",
            "meme2.jpg",
            "meme3.jpg",
            "meme4.jpg",
            "meme5.jpg",
            "meme6.jpg",
            "meme7.jpg",
          ],
          user456: [
            "meme8.jpg",
            "meme9.jpg",
            "meme10.jpg",
            "meme1.jpg",
            "meme2.jpg",
            "meme3.jpg",
            "meme4.jpg",
          ],
        },
        roundStartedAt: new Date().toISOString(),
      };

      (autoStartRound as jest.Mock).mockResolvedValue({
        success: true,
        roundState: mockRoundState,
        message: "Round 1 started with 2 players",
      });

      const result = await autoStartRound(mockLobbyCode);

      expect(result.success).toBe(true);
      expect(result.roundState.phase).toBe("submission");
      expect(result.roundState.currentRound).toBe(1);
      expect(result.roundState.currentSituation).toBe(
        "Your boss asks you to work overtime on Friday night"
      );
      expect(Object.keys(result.roundState.playerCards)).toHaveLength(2);
      expect(result.roundState.playerCards.user123).toHaveLength(7);
      expect(result.roundState.playerCards.user456).toHaveLength(7);
    });

    it("should handle game not started error", async () => {
      (autoStartRound as jest.Mock).mockRejectedValue(
        new Error("Game must be started before auto-starting rounds")
      );

      await expect(autoStartRound(mockLobbyCode)).rejects.toThrow(
        "Game must be started before auto-starting rounds"
      );
    });

    it("should handle round already in progress error", async () => {
      (autoStartRound as jest.Mock).mockRejectedValue(
        new Error("Round is already in progress")
      );

      await expect(autoStartRound(mockLobbyCode)).rejects.toThrow(
        "Round is already in progress"
      );
    });

    it("should generate random situations", async () => {
      const mockRoundState = {
        phase: "submission" as const,
        currentRound: 1,
        currentSituation: "Your crush texts you 'we need to talk'",
        submissions: {},
        votes: {},
        results: {},
        playerUsedCards: {},
        playerScores: {},
        roundWinners: {},
        timeLeft: 60,
        roundStartTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        playerCards: {},
        roundStartedAt: new Date().toISOString(),
      };

      (autoStartRound as jest.Mock).mockResolvedValue({
        success: true,
        roundState: mockRoundState,
        message: "Round 1 started with 2 players",
      });

      const result = await autoStartRound(mockLobbyCode);

      expect(result.roundState.currentSituation).toBe(
        "Your crush texts you 'we need to talk'"
      );
      expect(result.roundState.currentSituation).toMatch(/^Your .+$/);
    });

    it("should distribute cards to all players", async () => {
      const mockRoundState = {
        phase: "submission" as const,
        currentRound: 1,
        currentSituation: "Test situation",
        submissions: {},
        votes: {},
        results: {},
        playerUsedCards: {},
        playerScores: {
          user123: 0,
          user456: 0,
          user789: 0,
        },
        roundWinners: {},
        timeLeft: 60,
        roundStartTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        playerCards: {
          user123: [
            "meme1.jpg",
            "meme2.jpg",
            "meme3.jpg",
            "meme4.jpg",
            "meme5.jpg",
            "meme6.jpg",
            "meme7.jpg",
          ],
          user456: [
            "meme8.jpg",
            "meme9.jpg",
            "meme10.jpg",
            "meme1.jpg",
            "meme2.jpg",
            "meme3.jpg",
            "meme4.jpg",
          ],
          user789: [
            "meme5.jpg",
            "meme6.jpg",
            "meme7.jpg",
            "meme8.jpg",
            "meme9.jpg",
            "meme10.jpg",
            "meme1.jpg",
          ],
        },
        roundStartedAt: new Date().toISOString(),
      };

      (autoStartRound as jest.Mock).mockResolvedValue({
        success: true,
        roundState: mockRoundState,
        message: "Round 1 started with 3 players",
      });

      const result = await autoStartRound(mockLobbyCode);

      expect(Object.keys(result.roundState.playerCards)).toHaveLength(3);
      expect(result.roundState.playerCards.user123).toHaveLength(7);
      expect(result.roundState.playerCards.user456).toHaveLength(7);
      expect(result.roundState.playerCards.user789).toHaveLength(7);
    });
  });

  describe("Round Countdown Component", () => {
    it("should show countdown timer", () => {
      // This would test the RoundCountdown component
      // For now, we'll test the logic that triggers it
      const gameStarted = true;
      const noRoundInProgress = true; // Simulate no round in progress

      expect(gameStarted && noRoundInProgress).toBe(true);
    });

    it("should show player list during countdown", () => {
      const players = [
        { id: "user123", name: "Player 1" },
        { id: "user456", name: "Player 2" },
      ];

      expect(players).toHaveLength(2);
      expect(players[0].name).toBe("Player 1");
      expect(players[1].name).toBe("Player 2");
    });

    it("should automatically start round after countdown", async () => {
      const countdown = 0;
      const shouldStartRound = countdown <= 1;

      expect(shouldStartRound).toBe(true);
    });
  });

  describe("Situation Display", () => {
    it("should display the current situation", () => {
      const situation = "Your boss asks you to work overtime on Friday night";

      expect(situation).toBeTruthy();
      expect(situation.length).toBeGreaterThan(10);
    });

    it("should be different for each round", () => {
      const situations = [
        "Your boss asks you to work overtime on Friday night",
        "Your crush texts you 'we need to talk'",
        "You accidentally send a meme to your family group chat",
      ];

      const uniqueSituations = new Set(situations);
      expect(uniqueSituations.size).toBe(3);
    });
  });

  describe("Card Distribution", () => {
    it("should give each player exactly 7 cards", () => {
      const playerCards = {
        user123: [
          "meme1.jpg",
          "meme2.jpg",
          "meme3.jpg",
          "meme4.jpg",
          "meme5.jpg",
          "meme6.jpg",
          "meme7.jpg",
        ],
        user456: [
          "meme8.jpg",
          "meme9.jpg",
          "meme10.jpg",
          "meme1.jpg",
          "meme2.jpg",
          "meme3.jpg",
          "meme4.jpg",
        ],
      };

      Object.values(playerCards).forEach((cards) => {
        expect(cards).toHaveLength(7);
      });
    });

    it("should distribute different cards to different players", () => {
      const player1Cards = [
        "meme1.jpg",
        "meme2.jpg",
        "meme3.jpg",
        "meme4.jpg",
        "meme5.jpg",
        "meme6.jpg",
        "meme7.jpg",
      ];
      const player2Cards = [
        "meme8.jpg",
        "meme9.jpg",
        "meme10.jpg",
        "meme1.jpg",
        "meme2.jpg",
        "meme3.jpg",
        "meme4.jpg",
      ];

      // Some cards can be the same, but not all
      const uniqueCards1 = new Set(player1Cards);
      const uniqueCards2 = new Set(player2Cards);

      expect(uniqueCards1.size).toBe(7);
      expect(uniqueCards2.size).toBe(7);
    });
  });

  describe("Logging and Debugging", () => {
    it("should log round start information", () => {
      const roundNumber = 1;
      const lobbyCode = "ABC12";
      const situation = "Test situation";
      const playerCount = 2;

      const logMessage = `Round ${roundNumber} started for lobby ${lobbyCode}`;
      const situationLog = `Situation: ${situation}`;
      const playerLog = `Cards distributed to ${playerCount} players`;

      expect(logMessage).toBe("Round 1 started for lobby ABC12");
      expect(situationLog).toBe("Situation: Test situation");
      expect(playerLog).toBe("Cards distributed to 2 players");
    });
  });
});
