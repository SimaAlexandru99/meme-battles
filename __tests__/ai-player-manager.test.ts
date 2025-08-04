import { AIPlayerManager, aiPlayerManager } from "../lib/ai/ai-player-manager";
import {
  getPersonalityById,
  getAllPersonalities,
  selectRandomPersonality,
} from "../lib/ai/personalities";

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  startSpan: jest.fn((options, callback) =>
    callback({ setAttribute: jest.fn() }),
  ),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock personalities module
jest.mock("../lib/ai/personalities", () => ({
  getPersonalityById: jest.fn(),
  selectRandomPersonality: jest.fn(),
  getAllPersonalities: jest.fn(),
}));

describe("AIPlayerManager", () => {
  let manager: AIPlayerManager;
  const mockPersonalities = [
    {
      id: "sarcastic-sam",
      name: "Sarcastic Sam",
      displayName: "Sarcastic Sam",
      avatarId: "cool-pepe.png",
      description: "A witty AI that loves edgy humor",
      traits: {
        humorStyle: "sarcastic" as const,
        responseTime: { min: 8, max: 20 },
        chatFrequency: "high" as const,
        memePreference: "shocking" as const,
        votingStyle: "humor-focused" as const,
      },
      chatTemplates: {
        thinking: ["Hmm, let me think about this... 🤔"],
        submission: ["Here's my masterpiece of sarcasm 😏"],
        voting: ["That's actually... not terrible 🤔"],
        winning: ["Obviously, I won. What did you expect? 😎"],
        losing: ["Well, that was unexpected... but I'm not mad 😤"],
        general: ["This game is getting interesting... 👀"],
      },
    },
    {
      id: "wholesome-wendy",
      name: "Wholesome Wendy",
      displayName: "Wholesome Wendy",
      avatarId: "baby-yoda.png",
      description: "A kind and positive AI",
      traits: {
        humorStyle: "wholesome" as const,
        responseTime: { min: 5, max: 15 },
        chatFrequency: "medium" as const,
        memePreference: "funny" as const,
        votingStyle: "humor-focused" as const,
      },
      chatTemplates: {
        thinking: [
          "Let me think of something that will make everyone smile! 😊",
        ],
        submission: ["Here's something to brighten your day! ☀️"],
        voting: ["That's absolutely adorable! 🥰"],
        winning: ["Yay! Spreading joy and winning! 🎉"],
        losing: ["That's okay! Everyone's a winner when we're having fun! 😊"],
        general: ["This game is so much fun! 😄"],
      },
    },
  ];

  beforeEach(() => {
    // Reset the singleton instance
    (AIPlayerManager as unknown as { instance?: AIPlayerManager }).instance =
      undefined;
    manager = AIPlayerManager.getInstance();
    manager.reset();

    // Mock getAllPersonalities
    (getAllPersonalities as jest.Mock).mockReturnValue(mockPersonalities);

    // Mock getPersonalityById
    (getPersonalityById as jest.Mock).mockImplementation((id: string) =>
      mockPersonalities.find((p) => p.id === id),
    );

    // Mock selectRandomPersonality
    (selectRandomPersonality as jest.Mock).mockImplementation(
      (excludeIds: string[] = []) => {
        const availablePersonalities = mockPersonalities.filter(
          (p) => !excludeIds.includes(p.id),
        );
        return availablePersonalities[0] || mockPersonalities[0];
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = AIPlayerManager.getInstance();
      const instance2 = AIPlayerManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should return the exported singleton instance", () => {
      expect(aiPlayerManager).toStrictEqual(AIPlayerManager.getInstance());
    });
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      await manager.initialize();

      expect(manager.getState().isInitialized).toBe(true);
      expect(manager.getState().personalityPool).toEqual(mockPersonalities);
    });

    it("should handle initialization errors", async () => {
      (getAllPersonalities as jest.Mock).mockImplementation(() => {
        throw new Error("Failed to load personalities");
      });

      await expect(manager.initialize()).rejects.toThrow(
        "Failed to load personalities",
      );
    });
  });

  describe("AI Player Creation", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should create an AI player successfully", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
        maxPlayers: 6,
      });

      expect(aiPlayer).toBeDefined();
      expect(aiPlayer.id).toMatch(/^ai_TEST123_\d+_[a-z0-9]+$/);
      expect(aiPlayer.personality).toBeDefined();
      expect(aiPlayer.isConnected).toBe(true);
      expect(aiPlayer.score).toBe(0);
      expect(aiPlayer.hand).toEqual([]);
      expect(aiPlayer.status).toBe("waiting");
      expect(aiPlayer.lastActivity).toBeInstanceOf(Date);
      expect(aiPlayer.decisionHistory).toEqual([]);
      expect(aiPlayer.chatHistory).toEqual([]);
    });

    it("should create AI player with specific personality when forced", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
        personalityId: "sarcastic-sam",
        forcePersonality: true,
      });

      expect(aiPlayer.personality.id).toBe("sarcastic-sam");
    });

    it("should throw error when personality not found", async () => {
      await expect(
        manager.createAIPlayer({
          lobbyCode: "TEST123",
          personalityId: "non-existent",
          forcePersonality: true,
        }),
      ).rejects.toThrow("Personality non-existent not found");
    });

    it("should throw error when lobby is at maximum capacity", async () => {
      // Create max players
      for (let i = 0; i < 6; i++) {
        await manager.createAIPlayer({
          lobbyCode: "TEST123",
          maxPlayers: 6,
        });
      }

      await expect(
        manager.createAIPlayer({
          lobbyCode: "TEST123",
          maxPlayers: 6,
        }),
      ).rejects.toThrow("Lobby is at maximum capacity");
    });

    it("should avoid duplicate personalities in same lobby", async () => {
      const aiPlayer1 = await manager.createAIPlayer({
        lobbyCode: "TEST123",
        personalityId: "sarcastic-sam",
        forcePersonality: true,
      });

      const aiPlayer2 = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      expect(aiPlayer1.personality.id).toBe("sarcastic-sam");
      expect(aiPlayer2.personality.id).toBe("wholesome-wendy"); // Different personality
    });
  });

  describe("AI Player Removal", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should remove AI player successfully", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      const initialCount = manager.getAIPlayersForLobby("TEST123").length;
      expect(initialCount).toBe(1);

      await manager.removeAIPlayer({
        lobbyCode: "TEST123",
        playerId: aiPlayer.id,
        reason: "manual",
      });

      const finalCount = manager.getAIPlayersForLobby("TEST123").length;
      expect(finalCount).toBe(0);
    });

    it("should handle removal of non-existent player gracefully", async () => {
      await expect(
        manager.removeAIPlayer({
          lobbyCode: "TEST123",
          playerId: "non-existent",
          reason: "manual",
        }),
      ).resolves.not.toThrow();
    });

    it("should handle removal from non-existent lobby gracefully", async () => {
      await expect(
        manager.removeAIPlayer({
          lobbyCode: "NON_EXISTENT",
          playerId: "some-player",
          reason: "manual",
        }),
      ).resolves.not.toThrow();
    });

    it("should clean up empty lobby after removal", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      await manager.removeAIPlayer({
        lobbyCode: "TEST123",
        playerId: aiPlayer.id,
        reason: "manual",
      });

      // Lobby should be removed from active lobbies
      expect(manager.getState().activeAIPlayers.has("TEST123")).toBe(false);
    });
  });

  describe("AI Player Balancing", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should balance AI players when lobby is full", async () => {
      // Create 3 AI players
      for (let i = 0; i < 3; i++) {
        await manager.createAIPlayer({
          lobbyCode: "TEST123",
        });
      }

      const aiSettings: AISettings = {
        enabled: true,
        maxAIPlayers: 2,
        minHumanPlayers: 1,
        personalityPool: ["sarcastic-sam", "wholesome-wendy"],
        autoBalance: true,
        difficulty: "medium",
      };

      await manager.balanceAIPlayers("TEST123", 2, aiSettings);

      // Should have removed 1 AI player (3 AI + 2 human = 5, but max is 4)
      const aiPlayerCount = manager.getAIPlayersForLobby("TEST123").length;
      expect(aiPlayerCount).toBe(2);
    });

    it("should add AI players when auto-balance is enabled", async () => {
      const aiSettings: AISettings = {
        enabled: true,
        maxAIPlayers: 3,
        minHumanPlayers: 2,
        personalityPool: ["sarcastic-sam", "wholesome-wendy"],
        autoBalance: true,
        difficulty: "medium",
      };

      await manager.balanceAIPlayers("TEST123", 1, aiSettings);

      // Should have added 1 AI player (1 human < 2 min, so add 1 AI)
      const aiPlayerCount = manager.getAIPlayersForLobby("TEST123").length;
      expect(aiPlayerCount).toBe(1);
    });

    it("should not add AI players when auto-balance is disabled", async () => {
      const aiSettings: AISettings = {
        enabled: true,
        maxAIPlayers: 3,
        minHumanPlayers: 2,
        personalityPool: ["sarcastic-sam", "wholesome-wendy"],
        autoBalance: false,
        difficulty: "medium",
      };

      await manager.balanceAIPlayers("TEST123", 1, aiSettings);

      // Should not have added any AI players
      const aiPlayerCount = manager.getAIPlayersForLobby("TEST123").length;
      expect(aiPlayerCount).toBe(0);
    });
  });

  describe("AI Player Queries", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should get AI players for lobby", async () => {
      const aiPlayer1 = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });
      const aiPlayer2 = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      const players = manager.getAIPlayersForLobby("TEST123");
      expect(players).toHaveLength(2);
      expect(players.map((p) => p.id)).toContain(aiPlayer1.id);
      expect(players.map((p) => p.id)).toContain(aiPlayer2.id);
    });

    it("should return empty array for non-existent lobby", () => {
      const players = manager.getAIPlayersForLobby("NON_EXISTENT");
      expect(players).toEqual([]);
    });

    it("should get specific AI player", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      const foundPlayer = manager.getAIPlayer("TEST123", aiPlayer.id);
      expect(foundPlayer).toEqual(aiPlayer);
    });

    it("should return undefined for non-existent player", async () => {
      await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      const foundPlayer = manager.getAIPlayer("TEST123", "non-existent");
      expect(foundPlayer).toBeUndefined();
    });

    it("should check if player is AI", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      expect(manager.isAIPlayer(aiPlayer.id)).toBe(true);
      expect(manager.isAIPlayer("human-player")).toBe(false);
    });

    it("should get AI player by ID across all lobbies", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      const result = manager.getAIPlayerById(aiPlayer.id);
      expect(result).toEqual({
        player: aiPlayer,
        lobbyCode: "TEST123",
      });
    });

    it("should return null for non-existent AI player", () => {
      const result = manager.getAIPlayerById("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("AI Player Updates", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should update AI player successfully", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      const originalScore = aiPlayer.score;
      const originalStatus = aiPlayer.status;

      manager.updateAIPlayer("TEST123", aiPlayer.id, {
        score: 100,
        status: "playing",
      });

      const updatedPlayer = manager.getAIPlayer("TEST123", aiPlayer.id);
      expect(updatedPlayer?.score).toBe(100);
      expect(updatedPlayer?.status).toBe("playing");
      expect(updatedPlayer?.lastActivity).toBeInstanceOf(Date);
    });

    it("should throw error when updating non-existent player", () => {
      expect(() => {
        manager.updateAIPlayer("TEST123", "non-existent", {
          score: 100,
        });
      }).toThrow("No AI players found for lobby TEST123");
    });

    it("should throw error when updating player in non-existent lobby", () => {
      expect(() => {
        manager.updateAIPlayer("NON_EXISTENT", "some-player", {
          score: 100,
        });
      }).toThrow("No AI players found for lobby NON_EXISTENT");
    });
  });

  describe("LobbyPlayer Conversion", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should convert AI player to LobbyPlayer format", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      const lobbyPlayer = manager.convertToLobbyPlayer(aiPlayer);

      expect(lobbyPlayer.uid).toBe(aiPlayer.id);
      expect(lobbyPlayer.displayName).toBe(aiPlayer.personality.displayName);
      expect(lobbyPlayer.profileURL).toBe(
        `/icons/${aiPlayer.personality.avatarId}`,
      );
      expect(lobbyPlayer.joinedAt).toBe(aiPlayer.lastActivity);
      expect(lobbyPlayer.isHost).toBe(false);
      expect(lobbyPlayer.isAI).toBe(true);
      expect(lobbyPlayer.aiPersonalityId).toBe(aiPlayer.personality.id);
      expect(lobbyPlayer.aiPlayer).toBe(aiPlayer);
    });

    it("should get AI players as LobbyPlayer format", async () => {
      await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });
      await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      const lobbyPlayers = manager.getAIPlayersAsLobbyPlayers("TEST123");
      expect(lobbyPlayers).toHaveLength(2);
      expect(lobbyPlayers[0].isAI).toBe(true);
      expect(lobbyPlayers[1].isAI).toBe(true);
    });
  });

  describe("Bulk Operations", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should remove all AI players from lobby", async () => {
      await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });
      await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      expect(manager.getAIPlayersForLobby("TEST123")).toHaveLength(2);

      await manager.removeAllAIPlayersFromLobby("TEST123");

      expect(manager.getAIPlayersForLobby("TEST123")).toHaveLength(0);
    });

    it("should handle removing all players from empty lobby", async () => {
      await expect(
        manager.removeAllAIPlayersFromLobby("EMPTY_LOBBY"),
      ).resolves.not.toThrow();
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should get AI player statistics", async () => {
      await manager.createAIPlayer({
        lobbyCode: "TEST123",
        personalityId: "sarcastic-sam",
        forcePersonality: true,
      });
      await manager.createAIPlayer({
        lobbyCode: "TEST456",
        personalityId: "wholesome-wendy",
        forcePersonality: true,
      });

      const stats = manager.getAIPlayerStats();

      expect(stats.totalAIPlayers).toBe(2);
      expect(stats.activeLobbies).toBe(2);
      expect(stats.personalityUsage["sarcastic-sam"]).toBe(1);
      expect(stats.personalityUsage["wholesome-wendy"]).toBe(1);
    });

    it("should return zero statistics for empty state", () => {
      const stats = manager.getAIPlayerStats();

      expect(stats.totalAIPlayers).toBe(0);
      expect(stats.activeLobbies).toBe(0);
      expect(stats.personalityUsage).toEqual({});
    });
  });

  describe("AI Settings Validation", () => {
    it("should validate AI settings successfully", () => {
      const validSettings: AISettings = {
        enabled: true,
        maxAIPlayers: 3,
        minHumanPlayers: 1,
        personalityPool: ["sarcastic-sam", "wholesome-wendy"],
        autoBalance: true,
        difficulty: "medium",
      };

      const result = manager.validateAISettings(validSettings);
      expect(result).toBeNull();
    });

    it("should return null when AI is disabled", () => {
      const disabledSettings: AISettings = {
        enabled: false,
        maxAIPlayers: 3,
        minHumanPlayers: 1,
        personalityPool: ["sarcastic-sam"],
        autoBalance: true,
        difficulty: "medium",
      };

      const result = manager.validateAISettings(disabledSettings);
      expect(result).toBeNull();
    });

    it("should validate max AI players", () => {
      const invalidSettings: AISettings = {
        enabled: true,
        maxAIPlayers: 0, // Invalid
        minHumanPlayers: 1,
        personalityPool: ["sarcastic-sam"],
        autoBalance: true,
        difficulty: "medium",
      };

      const result = manager.validateAISettings(invalidSettings);
      expect(result?.error).toBe("INVALID_SETTINGS");
      expect(result?.message).toContain(
        "Max AI players must be between 1 and 6",
      );
    });

    it("should validate min human players", () => {
      const invalidSettings: AISettings = {
        enabled: true,
        maxAIPlayers: 3,
        minHumanPlayers: 0, // Invalid
        personalityPool: ["sarcastic-sam"],
        autoBalance: true,
        difficulty: "medium",
      };

      const result = manager.validateAISettings(invalidSettings);
      expect(result?.error).toBe("INVALID_SETTINGS");
      expect(result?.message).toContain("Min human players must be at least 1");
    });

    it("should validate personality pool", () => {
      const invalidSettings: AISettings = {
        enabled: true,
        maxAIPlayers: 3,
        minHumanPlayers: 1,
        personalityPool: [], // Invalid
        autoBalance: true,
        difficulty: "medium",
      };

      const result = manager.validateAISettings(invalidSettings);
      expect(result?.error).toBe("INVALID_SETTINGS");
      expect(result?.message).toContain("Personality pool cannot be empty");
    });

    it("should validate personality IDs exist", () => {
      const invalidSettings: AISettings = {
        enabled: true,
        maxAIPlayers: 3,
        minHumanPlayers: 1,
        personalityPool: ["non-existent-personality"],
        autoBalance: true,
        difficulty: "medium",
      };

      const result = manager.validateAISettings(invalidSettings);
      expect(result?.error).toBe("PERSONALITY_NOT_FOUND");
      expect(result?.message).toContain(
        "Personality non-existent-personality not found",
      );
    });
  });

  describe("Cleanup Operations", () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it("should cleanup inactive AI players", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      // Manually set lastActivity to be old
      manager.updateAIPlayer("TEST123", aiPlayer.id, {
        lastActivity: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
      });

      await manager.cleanupInactiveAIPlayers(30); // 30 minute threshold

      expect(manager.getAIPlayersForLobby("TEST123")).toHaveLength(0);
    });

    it("should not cleanup active AI players", async () => {
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      // lastActivity is recent by default
      await manager.cleanupInactiveAIPlayers(30);

      expect(manager.getAIPlayersForLobby("TEST123")).toHaveLength(1);
    });
  });

  describe("State Management", () => {
    it("should get current state", async () => {
      await manager.initialize();
      const aiPlayer = await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      const state = manager.getState();

      expect(state.isInitialized).toBe(true);
      expect(state.personalityPool).toEqual(mockPersonalities);
      expect(state.activeAIPlayers.has("TEST123")).toBe(true);
      expect(state.activeAIPlayers.get("TEST123")?.has(aiPlayer.id)).toBe(true);
    });

    it("should reset state", async () => {
      await manager.initialize();
      await manager.createAIPlayer({
        lobbyCode: "TEST123",
      });

      manager.reset();

      const state = manager.getState();
      expect(state.isInitialized).toBe(false);
      expect(state.personalityPool).toEqual([]);
      expect(state.activeAIPlayers.size).toBe(0);
    });
  });
});
