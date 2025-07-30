import {
  createMockUser,
  createMockAnonymousUser,
  createMockGuestUser,
  createMockGameData,
  createMockPlayer,
  createMockMeme,
  createMockApiSuccess,
  createMockApiError,
} from "./mock-data";

describe("Mock Data Factories", () => {
  describe("User Mocks", () => {
    it("should create a mock user with default values", () => {
      const user = createMockUser();

      expect(user.uid).toBeDefined();
      expect(user.email).toBe("test@example.com");
      expect(user.displayName).toBe("Test User");
      expect(user.isAnonymous).toBe(false);
      expect(user.emailVerified).toBe(true);
    });

    it("should create a mock user with overrides", () => {
      const user = createMockUser({
        email: "custom@example.com",
        displayName: "Custom User",
      });

      expect(user.email).toBe("custom@example.com");
      expect(user.displayName).toBe("Custom User");
    });

    it("should create a mock anonymous user", () => {
      const user = createMockAnonymousUser();

      expect(user.isAnonymous).toBe(true);
      expect(user.email).toBeNull();
      expect(user.emailVerified).toBe(false);
    });

    it("should create a mock guest user with meme name", () => {
      const user = createMockGuestUser();

      expect(user.isAnonymous).toBe(true);
      expect(user.displayName).toBeDefined();
      expect(typeof user.displayName).toBe("string");
    });
  });

  describe("Game Data Mocks", () => {
    it("should create mock game data with default values", () => {
      const game = createMockGameData();

      expect(game.id).toBeDefined();
      expect(game.title).toBe("Epic Meme Battle");
      expect(game.status).toBe("waiting");
      expect(game.maxPlayers).toBe(8);
      expect(game.players).toHaveLength(1);
      expect(game.players[0].isHost).toBe(true);
    });

    it("should create mock player with default values", () => {
      const player = createMockPlayer();

      expect(player.uid).toBeDefined();
      expect(player.displayName).toBeDefined();
      expect(player.isHost).toBe(false);
      expect(player.isReady).toBe(false);
      expect(player.score).toBe(0);
    });
  });

  describe("Meme Mocks", () => {
    it("should create a mock meme", () => {
      const meme = createMockMeme();

      expect(meme.id).toBeDefined();
      expect(meme.name).toBeDefined();
      expect(meme.url).toBeDefined();
      expect(Array.isArray(meme.tags)).toBe(true);
      expect(meme.category).toBeDefined();
      expect(typeof meme.popularity).toBe("number");
    });
  });

  describe("API Response Mocks", () => {
    it("should create a successful API response", () => {
      const response = createMockApiSuccess({ message: "Success" });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ message: "Success" });
      expect(response.error).toBeUndefined();
    });

    it("should create an error API response", () => {
      const response = createMockApiError("Something went wrong", 500);

      expect(response.status).toBe(500);
      expect(response.error).toBe("Something went wrong");
      expect(response.data).toBeNull();
    });
  });
});
