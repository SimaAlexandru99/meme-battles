/**
 * Tests for lobby validation utilities and type definitions
 */

import {
  GAME_SETTINGS_CONSTRAINTS,
  isValidLobbyData,
  isValidPlayerData,
  validateDisplayName,
  validateGameSettings,
  validateLobbyCode,
} from "../lobby-validation";

describe("Lobby Validation", () => {
  describe("validateLobbyCode", () => {
    it("should validate correct lobby codes", () => {
      const result = validateLobbyCode("ABC12");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid lobby codes", () => {
      const result = validateLobbyCode("abc12");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Lobby code must contain only uppercase letters and numbers",
      );
    });

    it("should reject codes with wrong length", () => {
      const result = validateLobbyCode("ABC1");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Lobby code must be exactly 5 characters",
      );
    });
  });

  describe("validateGameSettings", () => {
    it("should validate correct game settings", () => {
      const settings: Partial<GameSettings> = {
        rounds: 8,
        timeLimit: 60,
        categories: ["general", "reaction"],
      };
      const result = validateGameSettings(settings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid rounds", () => {
      const settings: Partial<GameSettings> = { rounds: 2 };
      const result = validateGameSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Minimum rounds is ${GAME_SETTINGS_CONSTRAINTS.rounds.min}`,
      );
    });

    it("should reject invalid time limit", () => {
      const settings: Partial<GameSettings> = { timeLimit: 25 };
      const result = validateGameSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Minimum time limit is ${GAME_SETTINGS_CONSTRAINTS.timeLimit.min} seconds`,
      );
    });

    it("should reject empty categories", () => {
      const settings: Partial<GameSettings> = { categories: [] };
      const result = validateGameSettings(settings);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("At least 1 category must be selected");
    });
  });

  describe("validateDisplayName", () => {
    it("should validate correct display names", () => {
      const result = validateDisplayName("Player123");
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty display names", () => {
      const result = validateDisplayName("");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Display name is required");
    });

    it("should reject names that are too long", () => {
      const result = validateDisplayName("ThisNameIsTooLongForTheSystem");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Display name must be no more than 20 characters",
      );
    });
  });

  describe("Type Guards", () => {
    it("should validate correct LobbyData", () => {
      const lobbyData: LobbyData = {
        code: "ABC12",
        hostUid: "user123",
        hostDisplayName: "Host",
        maxPlayers: 8,
        status: "waiting",
        settings: {
          rounds: 8,
          timeLimit: 60,
          categories: ["general"],
        },
        players: {},
        createdAt: "2025-01-08T10:00:00.000Z",
        updatedAt: "2025-01-08T10:00:00.000Z",
      };

      expect(isValidLobbyData(lobbyData)).toBe(true);
    });

    it("should validate correct PlayerData", () => {
      const playerData: PlayerData = {
        id: "player1",
        displayName: "Player1",
        avatarId: "doge-sunglasses",
        joinedAt: "2025-01-08T10:01:00.000Z",
        isHost: false,
        score: 0,
        status: "waiting",
        lastSeen: "2025-01-08T10:05:00.000Z",
      };

      expect(isValidPlayerData(playerData)).toBe(true);
    });

    it("should reject invalid objects", () => {
      expect(isValidLobbyData({})).toBe(false);
      expect(isValidPlayerData({})).toBe(false);
      expect(isValidLobbyData(null)).toBe(false);
      expect(isValidPlayerData(null)).toBe(false);
    });
  });
});
