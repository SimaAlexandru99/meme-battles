/**
 * Post-game processing service for Battle Royale matches
 * Handles statistics updates, skill rating calculations, and achievements
 */

import * as Sentry from "@sentry/nextjs";
import { get, ref, update } from "firebase/database";
import { rtdb } from "@/firebase/client";
import { retryWithCategorization } from "./error-categorization";
import { SkillRatingSystem } from "./skill-rating.service";

export class BattleRoyalePostGameService {
  private static instance: BattleRoyalePostGameService;
  private readonly STATS_PATH = "battleRoyaleStats";
  private readonly HISTORY_PATH = "matchmakingHistory";

  private skillRatingSystem: SkillRatingSystem;

  private constructor() {
    this.skillRatingSystem = new SkillRatingSystem();
  }

  static getInstance(): BattleRoyalePostGameService {
    if (!BattleRoyalePostGameService.instance) {
      BattleRoyalePostGameService.instance = new BattleRoyalePostGameService();
    }
    return BattleRoyalePostGameService.instance;
  }

  /**
   * Process complete Battle Royale match results
   */
  async processMatchResults(
    matchResults: BattleRoyaleMatchResult,
  ): Promise<ServiceResult> {
    return Sentry.startSpan(
      {
        op: "battle_royale.process_match_results",
        name: "Process Battle Royale Match Results",
      },
      async () => {
        try {
          const updates: Record<string, unknown> = {};
          const playerUpdates: PlayerStatsUpdate[] = [];

          // Process each player's results
          for (const playerResult of matchResults.playerResults) {
            const statsUpdate = await this.calculatePlayerStatsUpdate(
              playerResult,
              matchResults.totalPlayers,
              matchResults.competitiveSettings,
            );

            playerUpdates.push(statsUpdate);

            // Prepare batch updates
            this.addPlayerStatsToUpdates(updates, statsUpdate);
          }

          // Add match history record
          updates[`${this.HISTORY_PATH}/${matchResults.matchId}`] = {
            matchId: matchResults.matchId,
            lobbyCode: matchResults.lobbyCode,
            completedAt: matchResults.completedAt,
            totalPlayers: matchResults.totalPlayers,
            averageSkillRating: this.calculateAverageSkillRating(playerUpdates),
            matchDuration: matchResults.matchDuration,
            competitiveSettings: matchResults.competitiveSettings,
            playerResults: matchResults.playerResults.map((result) => ({
              playerUid: result.playerUid,
              finalPosition: result.finalPosition,
              skillRatingChange:
                playerUpdates.find((u) => u.playerUid === result.playerUid)
                  ?.skillRatingChange || 0,
              xpEarned: result.xpEarned,
            })),
          };

          // Execute batch updates with retry logic
          await retryWithCategorization(
            async () => {
              await update(ref(rtdb), updates);
            },
            "process_battle_royale_results",
            3,
            (attempt, error) => {
              Sentry.addBreadcrumb({
                message: `Retrying Battle Royale results processing (attempt ${attempt})`,
                data: {
                  matchId: matchResults.matchId,
                  totalUpdates: Object.keys(updates).length,
                  error: error.userMessage,
                },
                level: "info",
              });
            },
          );

          // Check for new achievements
          const achievementPromises = playerUpdates.map((update) =>
            this.checkAndUnlockAchievements(update),
          );

          await Promise.allSettled(achievementPromises);

          return {
            success: true,
            data: {
              matchId: matchResults.matchId,
              playersProcessed: playerUpdates.length,
              averageRatingChange:
                this.calculateAverageRatingChange(playerUpdates),
            },
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          Sentry.captureException(error, {
            tags: {
              operation: "battle_royale_post_game",
              match_id: matchResults.matchId,
            },
            extra: {
              totalPlayers: matchResults.totalPlayers,
              lobbyCode: matchResults.lobbyCode,
            },
          });

          throw new Error(
            `Failed to process Battle Royale match results: ${error}`,
          );
        }
      },
    );
  }

  /**
   * Calculate updated statistics for a single player
   */
  private async calculatePlayerStatsUpdate(
    playerResult: PlayerMatchResult,
    totalPlayers: number,
    _competitiveSettings: CompetitiveSettings,
  ): Promise<PlayerStatsUpdate> {
    return Sentry.startSpan(
      {
        op: "battle _royale.calculate_player_stats",
        name: "Calculate Player Stats Update",
      },
      async () => {
        try {
          // Get current player stats
          const statsRef = ref(
            rtdb,
            `${this.STATS_PATH}/${playerResult.playerUid}`,
          );
          const snapshot = await get(statsRef);

          const currentStats: BattleRoyaleStats = snapshot.exists()
            ? snapshot.val()
            : {
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                skillRating: 1200,
                highestRating: 1200,
                currentStreak: 0,
                longestWinStreak: 0,
                averagePosition: 0,
                totalXpEarned: 0,
                achievements: [],
                lastPlayed: new Date().toISOString(),
                seasonStats: {},
              };

          // Calculate new values
          const isWin = playerResult.finalPosition === 1;
          const isTopThree = playerResult.finalPosition <= 3;

          const newStats: BattleRoyaleStats = {
            ...currentStats,
            gamesPlayed: currentStats.gamesPlayed + 1,
            wins: currentStats.wins + (isWin ? 1 : 0),
            losses: currentStats.losses + (!isTopThree ? 1 : 0),
            lastPlayed: new Date().toISOString(),
            totalXpEarned: currentStats.totalXpEarned + playerResult.xpEarned,
          };

          // Update win rate
          newStats.winRate = (newStats.wins / newStats.gamesPlayed) * 100;

          // Update average position
          newStats.averagePosition =
            (currentStats.averagePosition * currentStats.gamesPlayed +
              playerResult.finalPosition) /
            newStats.gamesPlayed;

          // Calculate skill rating change
          const gameResult: GameResult = {
            lobbyCode: "", // Not available in this context
            matchId: "", // Not available in this context
            playerUid: playerResult.playerUid,
            position: playerResult.finalPosition,
            totalPlayers: totalPlayers,
            score: 0,
            roundsWon: 0,
            totalRounds: 0,
            gameMode: "battle_royale",
            duration: 0,
            xpEarned: 0,
            skillRatingChange: 0,
          };

          const ratingCalculation =
            this.skillRatingSystem.calculateRatingChange(
              currentStats.skillRating,
              gameResult,
              playerResult.opponentSkillRatings || [],
            );

          newStats.skillRating = Math.max(
            100,
            Math.min(
              3000,
              currentStats.skillRating + ratingCalculation.ratingChange,
            ),
          );
          newStats.highestRating = Math.max(
            newStats.highestRating,
            newStats.skillRating,
          );

          // Update streaks
          if (isWin) {
            newStats.currentStreak =
              currentStats.currentStreak >= 0
                ? currentStats.currentStreak + 1
                : 1;
            newStats.longestWinStreak = Math.max(
              newStats.longestWinStreak,
              newStats.currentStreak,
            );
          } else {
            newStats.currentStreak =
              currentStats.currentStreak <= 0
                ? currentStats.currentStreak - 1
                : -1;
          }

          return {
            playerUid: playerResult.playerUid,
            previousStats: currentStats,
            newStats,
            skillRatingChange: ratingCalculation.ratingChange,
            matchResult: playerResult,
          };
        } catch (error) {
          Sentry.captureException(error);
          throw error;
        }
      },
    );
  }

  /**
   * Add player statistics updates to the batch updates object
   */
  private addPlayerStatsToUpdates(
    updates: Record<string, unknown>,
    statsUpdate: PlayerStatsUpdate,
  ): void {
    const basePath = `${this.STATS_PATH}/${statsUpdate.playerUid}`;

    // Update all stat fields
    Object.entries(statsUpdate.newStats).forEach(([key, value]) => {
      updates[`${basePath}/${key}`] = value;
    });
  }

  /**
   * Check and unlock achievements for a player
   */
  private async checkAndUnlockAchievements(
    statsUpdate: PlayerStatsUpdate,
  ): Promise<void> {
    const achievements = await this.evaluateAchievements(statsUpdate);

    if (achievements.length > 0) {
      const updates: Record<string, unknown> = {};

      achievements.forEach((achievement) => {
        updates[
          `${this.STATS_PATH}/${statsUpdate.playerUid}/achievements/${achievement.id}`
        ] = {
          id: achievement.id,
          unlockedAt: new Date().toISOString(),
          name: achievement.name,
          description: achievement.description,
        };
      });

      await update(ref(rtdb), updates);

      // Log achievement unlocks
      Sentry.addBreadcrumb({
        message: "Battle Royale achievements unlocked",
        data: {
          playerUid: statsUpdate.playerUid,
          achievements: achievements.map((a) => a.name),
        },
        level: "info",
      });
    }
  }

  /**
   * Evaluate potential achievements for a player
   */
  private async evaluateAchievements(
    statsUpdate: PlayerStatsUpdate,
  ): Promise<Achievement[]> {
    const { newStats, previousStats } = statsUpdate;
    const unlockedAchievements: Achievement[] = [];

    // First Win
    if (newStats.wins === 1 && previousStats.wins === 0) {
      unlockedAchievements.push({
        id: "first_victory",
        name: "First Victory",
        description: "Win your first Battle Royale match",
        rarity: "common",
      });
    }

    // Win Streaks
    if (newStats.currentStreak === 3) {
      unlockedAchievements.push({
        id: "triple_threat",
        name: "Triple Threat",
        description: "Win 3 matches in a row",
        rarity: "rare",
      });
    }

    if (newStats.currentStreak === 5) {
      unlockedAchievements.push({
        id: "dominator",
        name: "Dominator",
        description: "Win 5 matches in a row",
        rarity: "epic",
      });
    }

    // Skill Rating Milestones
    if (newStats.skillRating >= 1500 && previousStats.skillRating < 1500) {
      unlockedAchievements.push({
        id: "skilled_player",
        name: "Skilled Player",
        description: "Reach 1500 skill rating",
        rarity: "rare",
      });
    }

    if (newStats.skillRating >= 2000 && previousStats.skillRating < 2000) {
      unlockedAchievements.push({
        id: "elite_competitor",
        name: "Elite Competitor",
        description: "Reach 2000 skill rating",
        rarity: "epic",
      });
    }

    // Games Played Milestones
    if (newStats.gamesPlayed === 10) {
      unlockedAchievements.push({
        id: "battle_tested",
        name: "Battle Tested",
        description: "Play 10 Battle Royale matches",
        rarity: "common",
      });
    }

    if (newStats.gamesPlayed === 50) {
      unlockedAchievements.push({
        id: "veteran",
        name: "Veteran",
        description: "Play 50 Battle Royale matches",
        rarity: "rare",
      });
    }

    return unlockedAchievements;
  }

  /**
   * Calculate average skill rating for match history
   */
  private calculateAverageSkillRating(
    playerUpdates: PlayerStatsUpdate[],
  ): number {
    const totalRating = playerUpdates.reduce(
      (sum, update) => sum + update.previousStats.skillRating,
      0,
    );
    return Math.round(totalRating / playerUpdates.length);
  }

  /**
   * Calculate average rating change for the match
   */
  private calculateAverageRatingChange(
    playerUpdates: PlayerStatsUpdate[],
  ): number {
    const totalChange = playerUpdates.reduce(
      (sum, update) => sum + update.skillRatingChange,
      0,
    );
    return Math.round(totalChange / playerUpdates.length);
  }
}

// Type definitions for the service
interface BattleRoyaleMatchResult {
  matchId: string;
  lobbyCode: string;
  completedAt: string;
  matchDuration: number;
  totalPlayers: number;
  competitiveSettings: CompetitiveSettings;
  playerResults: PlayerMatchResult[];
}

interface PlayerMatchResult {
  playerUid: string;
  finalPosition: number;
  xpEarned: number;
  opponentSkillRatings?: number[];
}

interface PlayerStatsUpdate {
  playerUid: string;
  previousStats: BattleRoyaleStats;
  newStats: BattleRoyaleStats;
  skillRatingChange: number;
  matchResult: PlayerMatchResult;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}
