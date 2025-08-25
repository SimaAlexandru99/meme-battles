import { SkillRatingSystem } from "../skill-rating.service";

describe("SkillRatingSystem", () => {
  let skillRatingSystem: SkillRatingSystem;

  beforeEach(() => {
    skillRatingSystem = new SkillRatingSystem();
  });

  describe("calculateRatingChange", () => {
    it("should calculate positive rating change for 1st place finish", () => {
      const currentRating = 1200;
      const gameResult: GameResult = {
        lobbyCode: "TEST1",
        matchId: "match1",
        playerUid: "player1",
        position: 1,
        totalPlayers: 6,
        score: 100,
        roundsWon: 5,
        totalRounds: 8,
        gameMode: "battle_royale",
        duration: 480,
        xpEarned: 150,
        skillRatingChange: 0, // Will be calculated
      };
      const opponentRatings = [1180, 1220, 1150, 1250, 1190];

      const result = skillRatingSystem.calculateRatingChange(
        currentRating,
        gameResult,
        opponentRatings,
      );

      expect(result.ratingChange).toBeGreaterThan(0);
      expect(result.baseRating).toBe(currentRating);
      expect(result.positionMultiplier).toBeGreaterThan(1);
    });

    it("should calculate negative rating change for last place finish", () => {
      const currentRating = 1200;
      const gameResult: GameResult = {
        lobbyCode: "TEST1",
        matchId: "match1",
        playerUid: "player1",
        position: 6,
        totalPlayers: 6,
        score: 20,
        roundsWon: 1,
        totalRounds: 8,
        gameMode: "battle_royale",
        duration: 480,
        xpEarned: 50,
        skillRatingChange: 0,
      };
      const opponentRatings = [1180, 1220, 1150, 1250, 1190];

      const result = skillRatingSystem.calculateRatingChange(
        currentRating,
        gameResult,
        opponentRatings,
      );

      expect(result.ratingChange).toBeLessThan(0);
      expect(result.positionMultiplier).toBeLessThan(1);
    });

    it("should handle edge case with single opponent", () => {
      const currentRating = 1200;
      const gameResult: GameResult = {
        lobbyCode: "TEST1",
        matchId: "match1",
        playerUid: "player1",
        position: 1,
        totalPlayers: 2,
        score: 100,
        roundsWon: 5,
        totalRounds: 8,
        gameMode: "battle_royale",
        duration: 480,
        xpEarned: 150,
        skillRatingChange: 0,
      };
      const opponentRatings = [1150];

      const result = skillRatingSystem.calculateRatingChange(
        currentRating,
        gameResult,
        opponentRatings,
      );

      expect(result.ratingChange).toBeDefined();
      expect(result.opponentRatingAverage).toBe(1150);
    });

    it("should throw error for invalid position", () => {
      const currentRating = 1200;
      const gameResult: GameResult = {
        lobbyCode: "TEST1",
        matchId: "match1",
        playerUid: "player1",
        position: 0, // Invalid position
        totalPlayers: 6,
        score: 100,
        roundsWon: 5,
        totalRounds: 8,
        gameMode: "battle_royale",
        duration: 480,
        xpEarned: 150,
        skillRatingChange: 0,
      };
      const opponentRatings = [1180, 1220, 1150, 1250, 1190];

      expect(() => {
        skillRatingSystem.calculateRatingChange(
          currentRating,
          gameResult,
          opponentRatings,
        );
      }).toThrow("Invalid game position");
    });

    it("should throw error for empty opponent ratings", () => {
      const currentRating = 1200;
      const gameResult: GameResult = {
        lobbyCode: "TEST1",
        matchId: "match1",
        playerUid: "player1",
        position: 1,
        totalPlayers: 6,
        score: 100,
        roundsWon: 5,
        totalRounds: 8,
        gameMode: "battle_royale",
        duration: 480,
        xpEarned: 150,
        skillRatingChange: 0,
      };
      const opponentRatings: number[] = [];

      expect(() => {
        skillRatingSystem.calculateRatingChange(
          currentRating,
          gameResult,
          opponentRatings,
        );
      }).toThrow("No opponent ratings provided");
    });
  });

  describe("getKFactor", () => {
    it("should return high K-factor for new players", () => {
      const kFactor = skillRatingSystem.getKFactor(5);
      expect(kFactor).toBe(64);
    });

    it("should return standard K-factor for intermediate players", () => {
      const kFactor = skillRatingSystem.getKFactor(25);
      expect(kFactor).toBe(32);
    });

    it("should return low K-factor for experienced players", () => {
      const kFactor = skillRatingSystem.getKFactor(100);
      expect(kFactor).toBe(16);
    });
  });

  describe("getPositionMultiplier", () => {
    it("should return multiplier greater than 1 for 1st place", () => {
      const multiplier = skillRatingSystem.getPositionMultiplier(1, 6);
      expect(multiplier).toBeGreaterThan(1);
    });

    it("should return multiplier less than 1 for last place", () => {
      const multiplier = skillRatingSystem.getPositionMultiplier(6, 6);
      expect(multiplier).toBeLessThan(1);
    });

    it("should return multiplier around 1 for middle positions", () => {
      const multiplier = skillRatingSystem.getPositionMultiplier(3, 6);
      expect(multiplier).toBeGreaterThan(0.8);
      expect(multiplier).toBeLessThan(1.2);
    });

    it("should handle 2-player games correctly", () => {
      const winnerMultiplier = skillRatingSystem.getPositionMultiplier(1, 2);
      const loserMultiplier = skillRatingSystem.getPositionMultiplier(2, 2);

      expect(winnerMultiplier).toBeGreaterThan(loserMultiplier);
    });
  });

  describe("getRankingTier", () => {
    it("should return Bronze for low ratings", () => {
      const tier = skillRatingSystem.getRankingTier(500);
      expect(tier.name).toBe("Bronze");
    });

    it("should return Silver for mid-low ratings", () => {
      const tier = skillRatingSystem.getRankingTier(900);
      expect(tier.name).toBe("Silver");
    });

    it("should return Gold for average ratings", () => {
      const tier = skillRatingSystem.getRankingTier(1200);
      expect(tier.name).toBe("Gold");
    });

    it("should return Platinum for high ratings", () => {
      const tier = skillRatingSystem.getRankingTier(1500);
      expect(tier.name).toBe("Platinum");
    });

    it("should return Diamond for very high ratings", () => {
      const tier = skillRatingSystem.getRankingTier(1800);
      expect(tier.name).toBe("Diamond");
    });

    it("should return Master for top ratings", () => {
      const tier = skillRatingSystem.getRankingTier(2500);
      expect(tier.name).toBe("Master");
    });

    it("should return Bronze for ratings below minimum", () => {
      const tier = skillRatingSystem.getRankingTier(50);
      expect(tier.name).toBe("Bronze");
    });
  });

  describe("calculatePercentile", () => {
    it("should calculate correct percentile", () => {
      const allRatings = [1000, 1100, 1200, 1300, 1400];
      const percentile = skillRatingSystem.calculatePercentile(
        1250,
        allRatings,
      );
      expect(percentile).toBe(60); // 3 out of 5 players have lower rating
    });

    it("should return 0 percentile for lowest rating", () => {
      const allRatings = [1000, 1100, 1200, 1300, 1400];
      const percentile = skillRatingSystem.calculatePercentile(900, allRatings);
      expect(percentile).toBe(0);
    });

    it("should return 100 percentile for highest rating", () => {
      const allRatings = [1000, 1100, 1200, 1300, 1400];
      const percentile = skillRatingSystem.calculatePercentile(
        1500,
        allRatings,
      );
      expect(percentile).toBe(100);
    });

    it("should return 50 percentile for empty ratings array", () => {
      const percentile = skillRatingSystem.calculatePercentile(1200, []);
      expect(percentile).toBe(50);
    });
  });

  describe("validateRating", () => {
    it("should validate ratings within bounds", () => {
      expect(skillRatingSystem.validateRating(1200)).toBe(true);
      expect(skillRatingSystem.validateRating(100)).toBe(true);
      expect(skillRatingSystem.validateRating(3000)).toBe(true);
    });

    it("should reject ratings outside bounds", () => {
      expect(skillRatingSystem.validateRating(50)).toBe(false);
      expect(skillRatingSystem.validateRating(3500)).toBe(false);
    });
  });

  describe("estimateRatingChange", () => {
    it("should provide rating change estimates", () => {
      const currentRating = 1200;
      const opponentRatings = [1180, 1220, 1150, 1250, 1190];
      const estimates = skillRatingSystem.estimateRatingChange(
        currentRating,
        opponentRatings,
        3, // Estimated 3rd place
        6,
      );

      expect(estimates.bestCase).toBeGreaterThan(estimates.expected);
      expect(estimates.expected).toBeGreaterThan(estimates.worstCase);
      expect(typeof estimates.bestCase).toBe("number");
      expect(typeof estimates.worstCase).toBe("number");
      expect(typeof estimates.expected).toBe("number");
    });

    it("should handle errors gracefully", () => {
      const estimates = skillRatingSystem.estimateRatingChange(
        1200,
        [], // Empty opponent ratings should cause error
        3,
        6,
      );

      expect(estimates.bestCase).toBe(0);
      expect(estimates.worstCase).toBe(0);
      expect(estimates.expected).toBe(0);
    });
  });

  describe("utility methods", () => {
    it("should return correct default rating", () => {
      expect(skillRatingSystem.getDefaultRating()).toBe(1200);
    });

    it("should return correct rating bounds", () => {
      const bounds = skillRatingSystem.getRatingBounds();
      expect(bounds.min).toBe(100);
      expect(bounds.max).toBe(3000);
    });

    it("should return all ranking tiers", () => {
      const tiers = skillRatingSystem.getAllRankingTiers();
      expect(tiers).toHaveLength(6);
      expect(tiers[0].name).toBe("Bronze");
      expect(tiers[5].name).toBe("Master");
    });
  });
});
