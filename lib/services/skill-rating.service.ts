import * as Sentry from "@sentry/nextjs";

/**
 * Skill Rating System using modified Elo algorithm for multiplayer Battle Royale games
 * Handles rating calculations, ranking tiers, and percentile calculations
 */
export class SkillRatingSystem {
  private readonly BASE_RATING = 1200;
  private readonly MIN_RATING = 100;
  private readonly MAX_RATING = 3000;
  private readonly BASE_K_FACTOR = 32;
  private readonly MIN_K_FACTOR = 16;
  private readonly MAX_K_FACTOR = 64;

  // Ranking tiers configuration
  private readonly RANKING_TIERS: RankingTier[] = [
    {
      name: "Bronze",
      minRating: 100,
      maxRating: 799,
      color: "#CD7F32",
      icon: "bronze",
      percentile: 0,
    },
    {
      name: "Silver",
      minRating: 800,
      maxRating: 1099,
      color: "#C0C0C0",
      icon: "silver",
      percentile: 25,
    },
    {
      name: "Gold",
      minRating: 1100,
      maxRating: 1399,
      color: "#FFD700",
      icon: "gold",
      percentile: 50,
    },
    {
      name: "Platinum",
      minRating: 1400,
      maxRating: 1699,
      color: "#E5E4E2",
      icon: "platinum",
      percentile: 75,
    },
    {
      name: "Diamond",
      minRating: 1700,
      maxRating: 2199,
      color: "#B9F2FF",
      icon: "diamond",
      percentile: 90,
    },
    {
      name: "Master",
      minRating: 2200,
      maxRating: 3000,
      color: "#FF6B6B",
      icon: "master",
      percentile: 98,
    },
  ];

  /**
   * Calculate rating change for a player based on game result
   */
  calculateRatingChange(
    currentRating: number,
    gameResult: GameResult,
    opponentRatings: number[],
  ): SkillRatingCalculation {
    return Sentry.startSpan(
      {
        op: "skill_rating.calculate_change",
        name: "Calculate Skill Rating Change",
      },
      () => {
        try {
          // Validate inputs
          if (opponentRatings.length === 0) {
            throw new Error("No opponent ratings provided");
          }

          if (
            gameResult.position < 1 ||
            gameResult.position > gameResult.totalPlayers
          ) {
            throw new Error("Invalid game position");
          }

          // Calculate K-factor based on player experience
          const kFactor = this.getKFactor(gameResult.totalPlayers);

          // Calculate position multiplier (1st place gets bonus, last place gets penalty)
          const positionMultiplier = this.getPositionMultiplier(
            gameResult.position,
            gameResult.totalPlayers,
          );

          // Calculate average opponent rating
          const opponentRatingAverage =
            opponentRatings.reduce((sum, rating) => sum + rating, 0) /
            opponentRatings.length;

          // Calculate expected score using Elo formula adapted for multiplayer
          const expectedScore = this.calculateExpectedScore(
            currentRating,
            opponentRatingAverage,
          );

          // Calculate actual score based on position (1st = 1.0, last = 0.0)
          const actualScore = this.calculateActualScore(
            gameResult.position,
            gameResult.totalPlayers,
          );

          // Calculate base rating change
          const baseRatingChange = kFactor * (actualScore - expectedScore);

          // Apply position multiplier and round to nearest integer
          const ratingChange = Math.round(
            baseRatingChange * positionMultiplier,
          );

          // Ensure rating stays within bounds
          const newRating = Math.max(
            this.MIN_RATING,
            Math.min(this.MAX_RATING, currentRating + ratingChange),
          );

          const finalRatingChange = newRating - currentRating;

          const calculation: SkillRatingCalculation = {
            baseRating: currentRating,
            kFactor,
            positionMultiplier,
            opponentRatingAverage,
            expectedScore,
            actualScore,
            ratingChange: finalRatingChange,
          };

          // Add breadcrumb for monitoring
          Sentry.addBreadcrumb({
            message: "Skill rating calculated",
            data: {
              playerUid: gameResult.playerUid,
              oldRating: currentRating,
              newRating,
              ratingChange: finalRatingChange,
              position: gameResult.position,
              totalPlayers: gameResult.totalPlayers,
              kFactor,
              positionMultiplier,
            },
            level: "info",
          });

          return calculation;
        } catch (error) {
          Sentry.captureException(error, {
            tags: {
              operation: "skill_rating_calculation",
            },
            extra: {
              currentRating,
              gameResult,
              opponentRatings,
            },
          });
          throw error;
        }
      },
    );
  }

  /**
   * Get K-factor based on player experience (games played)
   * New players have higher volatility, experienced players have lower volatility
   */
  getKFactor(gamesPlayed: number): number {
    if (gamesPlayed < 10) {
      return this.MAX_K_FACTOR; // High volatility for new players
    } else if (gamesPlayed < 50) {
      return this.BASE_K_FACTOR; // Standard volatility
    } else {
      return this.MIN_K_FACTOR; // Low volatility for experienced players
    }
  }

  /**
   * Get position multiplier based on final position in the game
   * Winners get bonus, losers get penalty
   */
  getPositionMultiplier(position: number, totalPlayers: number): number {
    // Convert position to a 0-1 scale (1st place = 1.0, last place = 0.0)
    const normalizedPosition = (totalPlayers - position) / (totalPlayers - 1);

    // Apply exponential curve to reward top positions more
    // 1st place gets 1.5x multiplier, middle gets 1.0x, last gets 0.5x
    const multiplier = 0.5 + normalizedPosition ** 0.7 * 1.0;

    return Math.max(0.3, Math.min(1.8, multiplier)); // Clamp between 0.3x and 1.8x
  }

  /**
   * Calculate expected score using modified Elo formula for multiplayer games
   */
  private calculateExpectedScore(
    playerRating: number,
    opponentAverageRating: number,
  ): number {
    // Standard Elo expected score formula
    const ratingDifference = opponentAverageRating - playerRating;
    const expectedWinProbability = 1 / (1 + 10 ** (ratingDifference / 400));

    // Adjust for multiplayer context
    // In a multiplayer game, "winning" means finishing in the top half
    const expectedScore = expectedWinProbability;

    return Math.max(0.01, Math.min(0.99, expectedScore)); // Clamp to avoid extreme values
  }

  /**
   * Calculate actual score based on final position
   */
  private calculateActualScore(position: number, totalPlayers: number): number {
    // Convert position to score (1st = 1.0, 2nd = 0.8, 3rd = 0.6, etc.)
    // Use a curve that rewards top positions more heavily
    const normalizedPosition = (totalPlayers - position) / (totalPlayers - 1);

    // Apply square root curve to make top positions more valuable
    return Math.sqrt(normalizedPosition);
  }

  /**
   * Get ranking tier for a given skill rating
   */
  getRankingTier(rating: number): RankingTier {
    // Find the appropriate tier for this rating
    for (let i = this.RANKING_TIERS.length - 1; i >= 0; i--) {
      const tier = this.RANKING_TIERS[i];
      if (rating >= tier.minRating) {
        return tier;
      }
    }

    // Fallback to Bronze if rating is below minimum
    return this.RANKING_TIERS[0];
  }

  /**
   * Calculate percentile ranking based on rating and all player ratings
   */
  calculatePercentile(rating: number, allRatings: number[]): number {
    if (allRatings.length === 0) {
      return 50; // Default to 50th percentile if no data
    }

    // Count how many players have lower ratings
    const playersBelow = allRatings.filter((r) => r < rating).length;

    // Calculate percentile (0-100)
    const percentile = (playersBelow / allRatings.length) * 100;

    return Math.round(percentile);
  }

  /**
   * Get all available ranking tiers
   */
  getAllRankingTiers(): RankingTier[] {
    return [...this.RANKING_TIERS];
  }

  /**
   * Validate skill rating is within acceptable bounds
   */
  validateRating(rating: number): boolean {
    return rating >= this.MIN_RATING && rating <= this.MAX_RATING;
  }

  /**
   * Get default starting rating for new players
   */
  getDefaultRating(): number {
    return this.BASE_RATING;
  }

  /**
   * Calculate rating bounds (min/max possible ratings)
   */
  getRatingBounds(): { min: number; max: number } {
    return {
      min: this.MIN_RATING,
      max: this.MAX_RATING,
    };
  }

  /**
   * Estimate rating change preview before game completion
   * Useful for showing potential rating changes to players
   */
  estimateRatingChange(
    currentRating: number,
    opponentRatings: number[],
    estimatedPosition: number,
    totalPlayers: number,
  ): { bestCase: number; worstCase: number; expected: number } {
    try {
      // Create mock game results for different scenarios
      const mockGameResult: Partial<GameResult> = {
        totalPlayers,
        playerUid: "preview",
        position: estimatedPosition,
      };

      // Best case: 1st place
      const bestCaseResult = { ...mockGameResult, position: 1 } as GameResult;
      const bestCase = this.calculateRatingChange(
        currentRating,
        bestCaseResult,
        opponentRatings,
      ).ratingChange;

      // Worst case: last place
      const worstCaseResult = {
        ...mockGameResult,
        position: totalPlayers,
      } as GameResult;
      const worstCase = this.calculateRatingChange(
        currentRating,
        worstCaseResult,
        opponentRatings,
      ).ratingChange;

      // Expected case: estimated position
      const expectedResult = {
        ...mockGameResult,
        position: estimatedPosition,
      } as GameResult;
      const expected = this.calculateRatingChange(
        currentRating,
        expectedResult,
        opponentRatings,
      ).ratingChange;

      return { bestCase, worstCase, expected };
    } catch (error) {
      Sentry.captureException(error);
      return { bestCase: 0, worstCase: 0, expected: 0 };
    }
  }
}
