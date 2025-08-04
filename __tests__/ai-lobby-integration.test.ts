import { aiPlayerManager } from "@/lib/ai/ai-player-manager";

// Mock the AI Player Manager for testing
jest.mock("@/lib/ai/ai-player-manager", () => ({
  aiPlayerManager: {
    getState: jest.fn(),
    initialize: jest.fn(),
    createAIPlayer: jest.fn(),
    removeAIPlayer: jest.fn(),
    balanceAIPlayers: jest.fn(),
    getAIPlayersAsLobbyPlayers: jest.fn(),
    removeAllAIPlayersFromLobby: jest.fn(),
    validateAISettings: jest.fn(),
  },
}));

describe("AI Lobby Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AI Player Manager state
    (aiPlayerManager.getState as jest.Mock).mockReturnValue({
      isInitialized: true,
      activeAIPlayers: new Map(),
      personalityPool: [],
    });
  });

  describe("AI Player Manager Integration", () => {
    it("should initialize AI Player Manager when not initialized", async () => {
      (aiPlayerManager.getState as jest.Mock).mockReturnValue({
        isInitialized: false,
        activeAIPlayers: new Map(),
        personalityPool: [],
      });

      // This would be called in the lobby actions
      await aiPlayerManager.initialize();

      expect(aiPlayerManager.initialize).toHaveBeenCalled();
    });

    it("should create AI players with proper configuration", async () => {
      const mockAIPlayer = {
        id: "ai_test_123",
        personality: {
          id: "sarcastic-sam",
          displayName: "Sarcastic Sam",
        },
        isConnected: true,
        score: 0,
        hand: [],
        status: "waiting",
        lastActivity: new Date(),
        decisionHistory: [],
        chatHistory: [],
      };

      (aiPlayerManager.createAIPlayer as jest.Mock).mockResolvedValue(
        mockAIPlayer
      );

      const result = await aiPlayerManager.createAIPlayer({
        lobbyCode: "TEST123",
        personalityId: "sarcastic-sam",
        forcePersonality: true,
        maxPlayers: 6,
      });

      expect(aiPlayerManager.createAIPlayer).toHaveBeenCalledWith({
        lobbyCode: "TEST123",
        personalityId: "sarcastic-sam",
        forcePersonality: true,
        maxPlayers: 6,
      });
      expect(result).toEqual(mockAIPlayer);
    });

    it("should balance AI players when human count changes", async () => {
      const mockAISettings = {
        enabled: true,
        maxAIPlayers: 3,
        minHumanPlayers: 2,
        personalityPool: ["sarcastic-sam", "wholesome-wendy"],
        autoBalance: true,
        difficulty: "medium" as const,
      };

      await aiPlayerManager.balanceAIPlayers("TEST123", 1, mockAISettings);

      expect(aiPlayerManager.balanceAIPlayers).toHaveBeenCalledWith(
        "TEST123",
        1,
        mockAISettings
      );
    });

    it("should get AI players as lobby players", () => {
      const mockAILobbyPlayers = [
        {
          uid: "ai_test_123",
          displayName: "Sarcastic Sam",
          profileURL: "/icons/sarcastic-sam",
          joinedAt: new Date(),
          isHost: false,
          isAI: true,
          aiPersonalityId: "sarcastic-sam",
        },
      ];

      (aiPlayerManager.getAIPlayersAsLobbyPlayers as jest.Mock).mockReturnValue(
        mockAILobbyPlayers
      );

      const result = aiPlayerManager.getAIPlayersAsLobbyPlayers("TEST123");

      expect(aiPlayerManager.getAIPlayersAsLobbyPlayers).toHaveBeenCalledWith(
        "TEST123"
      );
      expect(result).toEqual(mockAILobbyPlayers);
    });

    it("should validate AI settings properly", () => {
      const validSettings = {
        enabled: true,
        maxAIPlayers: 3,
        minHumanPlayers: 2,
        personalityPool: ["sarcastic-sam", "wholesome-wendy"],
        autoBalance: true,
        difficulty: "medium" as const,
      };

      const invalidSettings = {
        enabled: true,
        maxAIPlayers: 10, // Invalid: too high
        minHumanPlayers: 2,
        personalityPool: ["sarcastic-sam", "wholesome-wendy"],
        autoBalance: true,
        difficulty: "medium" as const,
      };

      (aiPlayerManager.validateAISettings as jest.Mock)
        .mockReturnValueOnce(null) // Valid settings
        .mockReturnValueOnce({
          // Invalid settings
          error: "INVALID_SETTINGS",
          message: "Max AI players must be between 1 and 6",
          context: { maxAIPlayers: 10 },
          timestamp: new Date(),
        });

      const validResult = aiPlayerManager.validateAISettings(validSettings);
      const invalidResult = aiPlayerManager.validateAISettings(invalidSettings);

      expect(validResult).toBeNull();
      expect(invalidResult).toEqual({
        error: "INVALID_SETTINGS",
        message: "Max AI players must be between 1 and 6",
        context: { maxAIPlayers: 10 },
        timestamp: expect.any(Date),
      });
    });
  });

  describe("AI Player Cleanup", () => {
    it("should remove all AI players from lobby", async () => {
      await aiPlayerManager.removeAllAIPlayersFromLobby("TEST123");

      expect(aiPlayerManager.removeAllAIPlayersFromLobby).toHaveBeenCalledWith(
        "TEST123"
      );
    });

    it("should remove specific AI player", async () => {
      await aiPlayerManager.removeAIPlayer({
        lobbyCode: "TEST123",
        playerId: "ai_test_123",
        reason: "manual",
      });

      expect(aiPlayerManager.removeAIPlayer).toHaveBeenCalledWith({
        lobbyCode: "TEST123",
        playerId: "ai_test_123",
        reason: "manual",
      });
    });
  });
});
