import * as Sentry from "@sentry/nextjs";
import {
  get,
  off,
  onValue,
  orderByChild,
  query,
  ref,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { rtdb } from "@/firebase/client";
import { LobbyService } from "./lobby.service";
import { SkillRatingSystem } from "./skill-rating.service";

/**
 * Enhanced service for managing Battle Royale matchmaking operations
 * Extends existing LobbyService patterns for queue management and skill-based matching
 */
export class MatchmakingService {
  private static instance: MatchmakingService;
  private readonly QUEUE_PATH = "battleRoyaleQueue";
  private readonly STATS_PATH = "battleRoyaleStats";
  private readonly METRICS_PATH = "queueMetrics";
  private readonly HISTORY_PATH = "matchmakingHistory";
  private readonly MIN_PLAYERS_PER_MATCH = 3;
  private readonly OPTIMAL_PLAYERS_PER_MATCH = 6;
  private readonly RETRY_DELAYS = [100, 200, 400, 800, 1600]; // Exponential backoff in ms
  private readonly MAX_RETRY_ATTEMPTS = 5;

  private lobbyService: LobbyService;
  private skillRatingSystem: SkillRatingSystem;

  private constructor() {
    this.lobbyService = LobbyService.getInstance();
    this.skillRatingSystem = new SkillRatingSystem();
  }

  static getInstance(): MatchmakingService {
    if (!MatchmakingService.instance) {
      MatchmakingService.instance = new MatchmakingService();
    }
    return MatchmakingService.instance;
  }

  /**
   * Create a Battle Royale specific error with proper typing and user-friendly messages
   * Automatically reports to Sentry for monitoring
   */
  private createBattleRoyaleError(
    type: BattleRoyaleErrorType | LobbyErrorType,
    message: string,
    userMessage: string,
    retryable: boolean = false,
    additionalData?: {
      queuePosition?: number;
      estimatedWaitTime?: number;
      alternativeOptions?: string[];
    },
  ): BattleRoyaleError {
    const error = new Error(message) as BattleRoyaleError;
    error.type = type;
    error.userMessage = userMessage;
    error.retryable = retryable;
    error.name = "BattleRoyaleError";

    if (additionalData) {
      error.queuePosition = additionalData.queuePosition;
      error.estimatedWaitTime = additionalData.estimatedWaitTime;
      error.alternativeOptions = additionalData.alternativeOptions;
    }

    // Automatically report to Sentry for monitoring
    Sentry.captureException(error, {
      tags: {
        operation: "matchmaking_service",
        error_type: type,
        retryable: retryable.toString(),
      },
      extra: {
        message,
        userMessage,
        type,
        retryable,
        ...additionalData,
      },
    });

    return error;
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.MAX_RETRY_ATTEMPTS,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries - 1) {
          break;
        }

        // Calculate delay with jitter
        const baseDelay =
          this.RETRY_DELAYS[Math.min(attempt, this.RETRY_DELAYS.length - 1)];
        const jitter = Math.random() * 100;
        const delay = baseDelay + jitter;

        Sentry.addBreadcrumb({
          message: `Retrying ${operationName}`,
          data: {
            attempt: attempt + 1,
            maxRetries,
            delay,
            error: lastError.message,
          },
          level: "info",
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw (
      lastError || new Error("Unknown error occurred during retry operation")
    );
  }

  /**
   * Add a player to the matchmaking queue with atomic operations
   */
  async addPlayerToQueue(playerData: QueueEntry): Promise<ServiceResult> {
    return Sentry.startSpan(
      {
        op: "db.matchmaking.add_to_queue",
        name: "Add Player to Queue",
      },
      async () => {
        try {
          // Add breadcrumb for queue join start
          Sentry.addBreadcrumb({
            message: "Starting queue join",
            data: {
              playerUid: playerData.playerUid,
              displayName: playerData.displayName,
              skillRating: playerData.skillRating,
              xpLevel: playerData.xpLevel,
            },
            level: "info",
          });

          // Check if player is already in queue
          const existingEntry = await this.retryOperation(async () => {
            const queueRef = ref(
              rtdb,
              `${this.QUEUE_PATH}/${playerData.playerUid}`,
            );
            const snapshot = await get(queueRef);
            return snapshot.exists() ? snapshot.val() : null;
          }, "check_existing_queue_entry");

          if (existingEntry) {
            throw this.createBattleRoyaleError(
              "ALREADY_IN_QUEUE",
              `Player ${playerData.playerUid} is already in queue`,
              "You are already in the matchmaking queue.",
              false,
            );
          }

          // Add timestamp and calculate initial estimated wait time
          const queueEntry: QueueEntry = {
            ...playerData,
            queuedAt: new Date().toISOString(),
            estimatedWaitTime: await this.calculateEstimatedWaitTime(
              playerData.skillRating,
            ),
          };

          // Atomic queue addition with retry mechanism
          await this.retryOperation(async () => {
            const updates: Record<string, unknown> = {};
            updates[`${this.QUEUE_PATH}/${playerData.playerUid}`] = queueEntry;
            updates[`${this.METRICS_PATH}/lastUpdated`] = serverTimestamp();

            await update(ref(rtdb), updates);
          }, "add_player_to_queue");

          // Update queue metrics
          await this.updateQueueMetrics();

          Sentry.addBreadcrumb({
            message: "Player added to queue successfully",
            data: {
              playerUid: playerData.playerUid,
              queuePosition: await this.getQueuePosition(playerData.playerUid),
              estimatedWaitTime: queueEntry.estimatedWaitTime,
            },
            level: "info",
          });

          return {
            success: true,
            data: queueEntry,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as BattleRoyaleError).type
          ) {
            throw error;
          }

          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "UNKNOWN_ERROR",
            `Failed to add player to queue: ${error}`,
            "Failed to join the matchmaking queue. Please try again.",
            true,
          );
        }
      },
    );
  }

  /**
   * Remove a player from the matchmaking queue with cleanup
   */
  async removePlayerFromQueue(playerUid: string): Promise<ServiceResult> {
    return Sentry.startSpan(
      {
        op: "db.matchmaking.remove_from_queue",
        name: "Remove Player from Queue",
      },
      async () => {
        try {
          // Check if player is in queue
          const queueEntry = await this.retryOperation(async () => {
            const queueRef = ref(rtdb, `${this.QUEUE_PATH}/${playerUid}`);
            const snapshot = await get(queueRef);
            return snapshot.exists() ? snapshot.val() : null;
          }, "check_queue_entry_exists");

          if (!queueEntry) {
            // Player not in queue, return success (idempotent operation)
            return {
              success: true,
              data: { message: "Player was not in queue" },
              timestamp: new Date().toISOString(),
            };
          }

          // Remove player from queue with atomic operation
          await this.retryOperation(async () => {
            const updates: Record<string, unknown> = {};
            updates[`${this.QUEUE_PATH}/${playerUid}`] = null;
            updates[`${this.METRICS_PATH}/lastUpdated`] = serverTimestamp();

            await update(ref(rtdb), updates);
          }, "remove_player_from_queue");

          // Update queue metrics
          await this.updateQueueMetrics();

          Sentry.addBreadcrumb({
            message: "Player removed from queue successfully",
            data: {
              playerUid,
              timeInQueue: Date.now() - new Date(queueEntry.queuedAt).getTime(),
            },
            level: "info",
          });

          return {
            success: true,
            data: { message: "Successfully removed from queue" },
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "UNKNOWN_ERROR",
            `Failed to remove player from queue: ${error}`,
            "Failed to leave the matchmaking queue. Please try again.",
            true,
          );
        }
      },
    );
  }

  /**
   * Get the current queue position for a player
   */
  async getQueuePosition(playerUid: string): Promise<number> {
    return Sentry.startSpan(
      {
        op: "db.matchmaking.get_queue_position",
        name: "Get Queue Position",
      },
      async () => {
        try {
          // Get player's queue entry to find their queue time
          const playerQueueRef = ref(rtdb, `${this.QUEUE_PATH}/${playerUid}`);
          const playerSnapshot = await get(playerQueueRef);

          if (!playerSnapshot.exists()) {
            return -1; // Player not in queue
          }

          const playerEntry = playerSnapshot.val() as QueueEntry;
          const playerQueueTime = new Date(playerEntry.queuedAt).getTime();

          // Query all players who joined before this player
          const queueRef = query(
            ref(rtdb, this.QUEUE_PATH),
            orderByChild("queuedAt"),
          );

          const queueSnapshot = await get(queueRef);

          if (!queueSnapshot.exists()) {
            return 1; // Only player in queue
          }

          let position = 1;
          queueSnapshot.forEach((childSnapshot) => {
            const entry = childSnapshot.val() as QueueEntry;
            const entryTime = new Date(entry.queuedAt).getTime();

            if (entryTime < playerQueueTime) {
              position++;
            }
          });

          return position;
        } catch (error) {
          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "NETWORK_ERROR",
            `Failed to get queue position: ${error}`,
            "Unable to get your queue position. Please try again.",
            true,
          );
        }
      },
    );
  }

  /**
   * Calculate estimated wait time based on current queue metrics and skill rating
   */
  async getEstimatedWaitTime(playerUid: string): Promise<number> {
    try {
      const playerQueueRef = ref(rtdb, `${this.QUEUE_PATH}/${playerUid}`);
      const playerSnapshot = await get(playerQueueRef);

      if (!playerSnapshot.exists()) {
        return 0; // Player not in queue
      }

      const playerEntry = playerSnapshot.val() as QueueEntry;
      return this.calculateEstimatedWaitTime(playerEntry.skillRating);
    } catch (error) {
      Sentry.captureException(error);
      return 60; // Default 1 minute estimate on error
    }
  }

  /**
   * Calculate estimated wait time based on skill rating and current queue state
   */
  private async calculateEstimatedWaitTime(
    skillRating: number,
  ): Promise<number> {
    try {
      // Get current queue metrics
      const metricsRef = ref(rtdb, this.METRICS_PATH);
      const metricsSnapshot = await get(metricsRef);

      let baseWaitTime = 45; // Default 45 seconds

      if (metricsSnapshot.exists()) {
        const metrics = metricsSnapshot.val();
        baseWaitTime = metrics.averageWaitTime || 45;
      }

      // Get current queue size
      const queueRef = ref(rtdb, this.QUEUE_PATH);
      const queueSnapshot = await get(queueRef);
      const queueSize = queueSnapshot.exists()
        ? Object.keys(queueSnapshot.val()).length
        : 0;

      // Adjust wait time based on queue size
      let adjustedWaitTime = baseWaitTime;

      if (queueSize < this.MIN_PLAYERS_PER_MATCH) {
        adjustedWaitTime = baseWaitTime * 1.5; // Longer wait if not enough players
      } else if (queueSize >= this.OPTIMAL_PLAYERS_PER_MATCH) {
        adjustedWaitTime = baseWaitTime * 0.7; // Shorter wait if optimal queue size
      }

      // Adjust for skill rating (extreme ratings may wait longer)
      const averageRating = 1200;
      const ratingDifference = Math.abs(skillRating - averageRating);
      const ratingMultiplier = 1 + (ratingDifference / 1000) * 0.3;

      adjustedWaitTime *= ratingMultiplier;

      return Math.round(Math.max(15, Math.min(300, adjustedWaitTime))); // Clamp between 15s and 5min
    } catch (error) {
      Sentry.captureException(error);
      return 60; // Default 1 minute on error
    }
  }

  /**
   * Update queue preferences for a player
   */
  async updateQueuePreferences(
    playerUid: string,
    preferences: Partial<QueuePreferences>,
  ): Promise<ServiceResult> {
    return Sentry.startSpan(
      {
        op: "db.matchmaking.update_preferences",
        name: "Update Queue Preferences",
      },
      async () => {
        try {
          // Check if player is in queue
          const queueRef = ref(rtdb, `${this.QUEUE_PATH}/${playerUid}`);
          const snapshot = await get(queueRef);

          if (!snapshot.exists()) {
            throw this.createBattleRoyaleError(
              "VALIDATION_ERROR",
              `Player ${playerUid} is not in queue`,
              "You must be in the queue to update preferences.",
              false,
            );
          }

          const currentEntry = snapshot.val() as QueueEntry;
          const updatedPreferences = {
            ...currentEntry.preferences,
            ...preferences,
          };

          // Update preferences atomically
          await this.retryOperation(async () => {
            const updates: Record<string, unknown> = {};
            updates[`${this.QUEUE_PATH}/${playerUid}/preferences`] =
              updatedPreferences;
            updates[`${this.QUEUE_PATH}/${playerUid}/estimatedWaitTime`] =
              await this.calculateEstimatedWaitTime(currentEntry.skillRating);

            await update(ref(rtdb), updates);
          }, "update_queue_preferences");

          return {
            success: true,
            data: { preferences: updatedPreferences },
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as BattleRoyaleError).type
          ) {
            throw error;
          }

          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "UNKNOWN_ERROR",
            `Failed to update queue preferences: ${error}`,
            "Failed to update your preferences. Please try again.",
            true,
          );
        }
      },
    );
  }

  /**
   * Update queue metrics for monitoring and wait time calculations
   */
  private async updateQueueMetrics(): Promise<void> {
    try {
      const queueRef = ref(rtdb, this.QUEUE_PATH);
      const queueSnapshot = await get(queueRef);

      const currentQueueSize = queueSnapshot.exists()
        ? Object.keys(queueSnapshot.val()).length
        : 0;

      // Calculate average wait time from recent matches (simplified)
      const averageWaitTime = await this.calculateAverageWaitTime();

      const metrics = {
        currentQueueSize,
        averageWaitTime,
        lastUpdated: serverTimestamp(),
        peakHours: ["19:00", "20:00", "21:00"], // Static for now, could be dynamic
      };

      const metricsRef = ref(rtdb, this.METRICS_PATH);
      await set(metricsRef, metrics);
    } catch (error) {
      // Don't throw on metrics update failure, just log
      Sentry.captureException(error, {
        tags: { operation: "update_queue_metrics" },
      });
    }
  }

  /**
   * Calculate average wait time from recent queue history
   */
  private async calculateAverageWaitTime(): Promise<number> {
    try {
      // This is a simplified implementation
      // In a real system, you'd track actual match creation times
      const metricsRef = ref(rtdb, this.METRICS_PATH);
      const snapshot = await get(metricsRef);

      if (snapshot.exists()) {
        const metrics = snapshot.val();
        return metrics.averageWaitTime || 45;
      }

      return 45; // Default 45 seconds
    } catch {
      return 45; // Default on error
    }
  }

  /**
   * Subscribe to queue updates for real-time position tracking
   */
  subscribeToQueue(
    callback: (queueData: QueueEntry[]) => void,
  ): UnsubscribeFunction {
    const queueRef = query(
      ref(rtdb, this.QUEUE_PATH),
      orderByChild("queuedAt"),
    );

    const unsubscribe = onValue(
      queueRef,
      (snapshot) => {
        const queueData: QueueEntry[] = [];

        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            queueData.push(childSnapshot.val() as QueueEntry);
          });
        }

        callback(queueData);
      },
      (error) => {
        Sentry.captureException(error, {
          tags: { operation: "queue_subscription" },
        });
      },
    );

    return () => off(queueRef, "value", unsubscribe);
  }

  /**
   * Subscribe to queue position updates for a specific player
   */
  subscribeToQueuePosition(
    playerUid: string,
    callback: (position: number) => void,
  ): UnsubscribeFunction {
    // Subscribe to the entire queue to calculate position
    return this.subscribeToQueue((queueData) => {
      const playerEntry = queueData.find(
        (entry) => entry.playerUid === playerUid,
      );

      if (!playerEntry) {
        callback(-1); // Player not in queue
        return;
      }

      const playerQueueTime = new Date(playerEntry.queuedAt).getTime();
      let position = 1;

      queueData.forEach((entry) => {
        const entryTime = new Date(entry.queuedAt).getTime();
        if (entryTime < playerQueueTime) {
          position++;
        }
      });

      callback(position);
    });
  }

  /**
   * Subscribe to match found notifications for a specific player
   */
  subscribeToMatchFound(
    playerUid: string,
    callback: (lobbyCode: string) => void,
  ): UnsubscribeFunction {
    // Monitor if player is removed from queue (indicating match found)
    const playerQueueRef = ref(rtdb, `${this.QUEUE_PATH}/${playerUid}`);

    let wasInQueue = false;

    const unsubscribe = onValue(
      playerQueueRef,
      async (snapshot) => {
        const isInQueue = snapshot.exists();

        if (wasInQueue && !isInQueue) {
          // Player was removed from queue, check if they were added to a lobby
          // This is a simplified implementation - in practice you'd track match assignments
          try {
            // Look for recent Battle Royale lobbies where this player might have been added
            // This is a placeholder - actual implementation would track match assignments
            const recentLobbyCode =
              await this.findRecentLobbyForPlayer(playerUid);
            if (recentLobbyCode) {
              callback(recentLobbyCode);
            }
          } catch (error) {
            Sentry.captureException(error);
          }
        }

        wasInQueue = isInQueue;
      },
      (error) => {
        Sentry.captureException(error, {
          tags: { operation: "match_found_subscription" },
        });
      },
    );

    return () => off(playerQueueRef, "value", unsubscribe);
  }

  /**
   * Find recent lobby for a player (placeholder implementation)
   */
  private async findRecentLobbyForPlayer(
    playerUid: string,
  ): Promise<string | null> {
    // This is a simplified placeholder implementation
    // In practice, you'd maintain a mapping of player -> lobby assignments
    try {
      // Check recent lobbies for this player
      const lobbiesRef = ref(rtdb, "lobbies");
      const snapshot = await get(lobbiesRef);

      if (!snapshot.exists()) {
        return null;
      }

      const lobbies = snapshot.val();
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      for (const [lobbyCode, lobbyData] of Object.entries(lobbies)) {
        const lobby = lobbyData as LobbyData;
        const createdAt = new Date(lobby.createdAt).getTime();

        // Check if lobby was created recently and contains this player
        if (createdAt > fiveMinutesAgo && lobby.players[playerUid]) {
          return lobbyCode;
        }
      }

      return null;
    } catch (error) {
      Sentry.captureException(error);
      return null;
    }
  }

  // ===== SKILL RATING SYSTEM METHODS =====

  /**
   * Update player statistics and skill rating after a Battle Royale match
   */
  async updatePlayerStats(
    playerUid: string,
    gameResult: GameResult,
  ): Promise<ServiceResult> {
    return Sentry.startSpan(
      {
        op: "db.matchmaking.update_stats",
        name: "Update Player Stats",
      },
      async () => {
        try {
          // Get current player stats
          const statsRef = ref(rtdb, `${this.STATS_PATH}/${playerUid}`);
          const statsSnapshot = await get(statsRef);

          let currentStats: BattleRoyaleStats;
          if (statsSnapshot.exists()) {
            currentStats = statsSnapshot.val() as BattleRoyaleStats;
          } else {
            // Initialize new player stats
            currentStats = {
              gamesPlayed: 0,
              wins: 0,
              losses: 0,
              winRate: 0,
              skillRating: this.skillRatingSystem.getDefaultRating(),
              highestRating: this.skillRatingSystem.getDefaultRating(),
              currentStreak: 0,
              longestWinStreak: 0,
              averagePosition: 0,
              totalXpEarned: 0,
              achievements: [],
              lastPlayed: new Date().toISOString(),
              seasonStats: {},
            };
          }

          // Get opponent ratings for skill rating calculation
          const opponentRatings = await this.getOpponentRatings(
            gameResult.lobbyCode,
            playerUid,
          );

          // Calculate new skill rating
          const ratingCalculation =
            this.skillRatingSystem.calculateRatingChange(
              currentStats.skillRating,
              gameResult,
              opponentRatings,
            );

          // Update stats
          const isWin = gameResult.position === 1;
          const newStats: BattleRoyaleStats = {
            ...currentStats,
            gamesPlayed: currentStats.gamesPlayed + 1,
            wins: currentStats.wins + (isWin ? 1 : 0),
            losses: currentStats.losses + (isWin ? 0 : 1),
            winRate:
              (currentStats.wins + (isWin ? 1 : 0)) /
              (currentStats.gamesPlayed + 1),
            skillRating:
              currentStats.skillRating + ratingCalculation.ratingChange,
            highestRating: Math.max(
              currentStats.highestRating,
              currentStats.skillRating + ratingCalculation.ratingChange,
            ),
            currentStreak: isWin ? currentStats.currentStreak + 1 : 0,
            longestWinStreak: isWin
              ? Math.max(
                  currentStats.longestWinStreak,
                  currentStats.currentStreak + 1,
                )
              : currentStats.longestWinStreak,
            averagePosition: this.calculateNewAveragePosition(
              currentStats.averagePosition,
              currentStats.gamesPlayed,
              gameResult.position,
            ),
            totalXpEarned: currentStats.totalXpEarned + gameResult.xpEarned,
            lastPlayed: new Date().toISOString(),
          };

          // Update game result with calculated skill rating change
          gameResult.skillRatingChange = ratingCalculation.ratingChange;

          // Save updated stats atomically
          await this.retryOperation(async () => {
            const updates: Record<string, unknown> = {};
            updates[`${this.STATS_PATH}/${playerUid}`] = newStats;
            updates[
              `${this.HISTORY_PATH}/${gameResult.matchId}/players/${playerUid}`
            ] = gameResult;

            await update(ref(rtdb), updates);
          }, "update_player_stats");

          Sentry.addBreadcrumb({
            message: "Player stats updated successfully",
            data: {
              playerUid,
              oldRating: currentStats.skillRating,
              newRating: newStats.skillRating,
              ratingChange: ratingCalculation.ratingChange,
              position: gameResult.position,
              isWin,
            },
            level: "info",
          });

          return {
            success: true,
            data: { stats: newStats, ratingCalculation },
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "STATS_UPDATE_FAILED",
            `Failed to update player stats: ${error}`,
            "Failed to update your statistics. Your progress may not be saved.",
            true,
          );
        }
      },
    );
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(playerUid: string): Promise<BattleRoyaleStats | null> {
    try {
      const statsRef = ref(rtdb, `${this.STATS_PATH}/${playerUid}`);
      const snapshot = await get(statsRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.val() as BattleRoyaleStats;
    } catch (error) {
      Sentry.captureException(error);
      return null;
    }
  }

  /**
   * Calculate skill rating for a player based on game result
   */
  async calculateSkillRating(
    playerUid: string,
    gameResult: GameResult,
  ): Promise<number> {
    try {
      const currentStats = await this.getPlayerStats(playerUid);
      const currentRating =
        currentStats?.skillRating || this.skillRatingSystem.getDefaultRating();

      const opponentRatings = await this.getOpponentRatings(
        gameResult.lobbyCode,
        playerUid,
      );

      const calculation = this.skillRatingSystem.calculateRatingChange(
        currentRating,
        gameResult,
        opponentRatings,
      );

      return currentRating + calculation.ratingChange;
    } catch (error) {
      Sentry.captureException(error);
      throw this.createBattleRoyaleError(
        "SKILL_RATING_UNAVAILABLE",
        `Failed to calculate skill rating: ${error}`,
        "Unable to calculate your skill rating. Please try again.",
        true,
      );
    }
  }

  /**
   * Get ranking tier for a player's current skill rating
   */
  async getPlayerRankingTier(playerUid: string): Promise<RankingTier> {
    const stats = await this.getPlayerStats(playerUid);
    const rating =
      stats?.skillRating || this.skillRatingSystem.getDefaultRating();
    return this.skillRatingSystem.getRankingTier(rating);
  }

  /**
   * Calculate percentile ranking for a player
   */
  async calculatePlayerPercentile(playerUid: string): Promise<number> {
    try {
      const stats = await this.getPlayerStats(playerUid);
      const playerRating =
        stats?.skillRating || this.skillRatingSystem.getDefaultRating();

      // Get all player ratings for percentile calculation
      const allRatings = await this.getAllPlayerRatings();

      return this.skillRatingSystem.calculatePercentile(
        playerRating,
        allRatings,
      );
    } catch (error) {
      Sentry.captureException(error);
      return 50; // Default to 50th percentile on error
    }
  }

  /**
   * Get opponent ratings from a completed game
   */
  private async getOpponentRatings(
    lobbyCode: string,
    playerUid: string,
  ): Promise<number[]> {
    try {
      const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
      const snapshot = await get(lobbyRef);

      if (!snapshot.exists()) {
        return [this.skillRatingSystem.getDefaultRating()]; // Fallback
      }

      const lobby = snapshot.val() as LobbyData;
      const opponentRatings: number[] = [];

      // Get ratings for all players except the current player
      for (const [uid] of Object.entries(lobby.players)) {
        if (uid !== playerUid) {
          const playerStats = await this.getPlayerStats(uid);
          const rating =
            playerStats?.skillRating ||
            this.skillRatingSystem.getDefaultRating();
          opponentRatings.push(rating);
        }
      }

      return opponentRatings.length > 0
        ? opponentRatings
        : [this.skillRatingSystem.getDefaultRating()];
    } catch (error) {
      Sentry.captureException(error);
      return [this.skillRatingSystem.getDefaultRating()]; // Fallback
    }
  }

  /**
   * Get all player ratings for percentile calculations
   */
  private async getAllPlayerRatings(): Promise<number[]> {
    try {
      const statsRef = ref(rtdb, this.STATS_PATH);
      const snapshot = await get(statsRef);

      if (!snapshot.exists()) {
        return [];
      }

      const allStats = snapshot.val();
      const ratings: number[] = [];

      Object.values(allStats).forEach((stats) => {
        const playerStats = stats as BattleRoyaleStats;
        ratings.push(playerStats.skillRating);
      });

      return ratings;
    } catch (error) {
      Sentry.captureException(error);
      return [];
    }
  }

  /**
   * Calculate new average position
   */
  private calculateNewAveragePosition(
    currentAverage: number,
    gamesPlayed: number,
    newPosition: number,
  ): number {
    if (gamesPlayed === 0) {
      return newPosition;
    }

    return (currentAverage * gamesPlayed + newPosition) / (gamesPlayed + 1);
  }

  /**
   * Get skill rating system instance for external use
   */
  getSkillRatingSystem(): SkillRatingSystem {
    return this.skillRatingSystem;
  }

  // ===== MATCHMAKING ENGINE METHODS =====

  /**
   * Find matches using skill-based grouping with sliding window approach
   * Implements task 2.1 requirements for core matchmaking algorithm
   */
  async findMatches(): Promise<MatchmakingResult[]> {
    return Sentry.startSpan(
      {
        op: "matchmaking.find_matches",
        name: "Find Matches",
      },
      async () => {
        try {
          // Get all queued players sorted by queue time (FIFO)
          const queueRef = query(
            ref(rtdb, this.QUEUE_PATH),
            orderByChild("queuedAt"),
          );
          const snapshot = await get(queueRef);

          if (!snapshot.exists()) {
            return [];
          }

          const queuedPlayers: QueueEntry[] = [];
          snapshot.forEach((childSnapshot) => {
            queuedPlayers.push(childSnapshot.val() as QueueEntry);
          });

          if (queuedPlayers.length < this.MIN_PLAYERS_PER_MATCH) {
            return [];
          }

          // Sort players by skill rating for sliding window approach
          const playersBySkill = [...queuedPlayers].sort(
            (a, b) => a.skillRating - b.skillRating,
          );

          // Find optimal player groups using sliding window
          const matches = this.optimizePlayerGroups(playersBySkill);

          // Calculate match quality and create MatchmakingResult objects
          const matchmakingResults: MatchmakingResult[] = [];

          for (const playerGroup of matches) {
            const matchQuality = this.calculateMatchQuality(playerGroup);

            // Only create matches with acceptable quality (>= 0.3)
            if (matchQuality >= 0.3) {
              const matchId = this.generateMatchId();
              const averageSkillRating =
                this.calculateAverageSkillRating(playerGroup);
              const skillRatingRange =
                this.calculateSkillRatingRange(playerGroup);

              matchmakingResults.push({
                matchId,
                players: playerGroup,
                averageSkillRating,
                skillRatingRange,
                matchQuality,
                estimatedGameDuration: this.estimateGameDuration(playerGroup),
              });
            }
          }

          Sentry.addBreadcrumb({
            message: "Matches found",
            data: {
              totalQueuedPlayers: queuedPlayers.length,
              matchesFound: matchmakingResults.length,
              averageMatchQuality:
                matchmakingResults.reduce(
                  (sum, match) => sum + match.matchQuality,
                  0,
                ) / matchmakingResults.length || 0,
            },
            level: "info",
          });

          return matchmakingResults;
        } catch (error) {
          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "MATCHMAKING_TIMEOUT",
            `Failed to find matches: ${error}`,
            "Matchmaking is currently unavailable. Please try again.",
            true,
          );
        }
      },
    );
  }

  /**
   * Calculate match quality score based on skill balance and connection quality
   * Returns a score between 0 and 1 (higher is better)
   */
  private calculateMatchQuality(players: QueueEntry[]): number {
    if (players.length < this.MIN_PLAYERS_PER_MATCH) {
      return 0;
    }

    // Skill rating balance (40% weight)
    const skillRatings = players.map((p) => p.skillRating);
    const avgRating =
      skillRatings.reduce((sum, rating) => sum + rating, 0) /
      skillRatings.length;
    const skillVariance =
      skillRatings.reduce((sum, rating) => sum + (rating - avgRating) ** 2, 0) /
      skillRatings.length;
    const skillBalance = Math.max(0, 1 - skillVariance / 100000); // Normalize variance

    // Connection quality (30% weight)
    const connectionQualities = players.map((p) => {
      switch (p.connectionInfo.connectionQuality) {
        case "excellent":
          return 1.0;
        case "good":
          return 0.8;
        case "fair":
          return 0.6;
        case "poor":
          return 0.3;
        default:
          return 0.5;
      }
    });
    const avgConnectionQuality =
      connectionQualities.reduce((sum, quality) => sum + quality, 0) /
      connectionQualities.length;

    // Wait time fairness (20% weight)
    const now = Date.now();
    const waitTimes = players.map((p) => now - new Date(p.queuedAt).getTime());
    const avgWaitTime =
      waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
    const waitTimeFairness = Math.min(1, avgWaitTime / (2 * 60 * 1000)); // Normalize to 2 minutes

    // Player count bonus (10% weight)
    const playerCountBonus = Math.min(
      1,
      players.length / this.OPTIMAL_PLAYERS_PER_MATCH,
    );

    // Calculate weighted score
    const matchQuality =
      skillBalance * 0.4 +
      avgConnectionQuality * 0.3 +
      waitTimeFairness * 0.2 +
      playerCountBonus * 0.1;

    return Math.max(0, Math.min(1, matchQuality));
  }

  /**
   * Optimize player groups using sliding window approach for balanced teams
   * Creates groups of 3-8 players with similar skill levels
   */
  private optimizePlayerGroups(sortedPlayers: QueueEntry[]): QueueEntry[][] {
    const groups: QueueEntry[][] = [];
    let currentIndex = 0;

    while (currentIndex < sortedPlayers.length) {
      const remainingPlayers = sortedPlayers.length - currentIndex;

      // Determine optimal group size
      let groupSize: number;
      if (remainingPlayers >= this.OPTIMAL_PLAYERS_PER_MATCH) {
        groupSize = this.OPTIMAL_PLAYERS_PER_MATCH;
      } else if (remainingPlayers >= this.MIN_PLAYERS_PER_MATCH) {
        groupSize = remainingPlayers;
      } else {
        // Not enough players for another group
        break;
      }

      // Create group with sliding window approach
      const group = this.createOptimalGroup(
        sortedPlayers,
        currentIndex,
        groupSize,
      );

      if (group.length >= this.MIN_PLAYERS_PER_MATCH) {
        groups.push(group);
        currentIndex += group.length;
      } else {
        break;
      }
    }

    return groups;
  }

  /**
   * Create optimal group starting from a specific index
   */
  private createOptimalGroup(
    players: QueueEntry[],
    startIndex: number,
    targetSize: number,
  ): QueueEntry[] {
    const group: QueueEntry[] = [];
    const basePlayer = players[startIndex];

    // Add base player
    group.push(basePlayer);

    // Find players with similar skill ratings and good connections
    for (
      let i = startIndex + 1;
      i < players.length && group.length < targetSize;
      i++
    ) {
      const candidate = players[i];

      // Check if player should be included based on skill range expansion
      if (this.shouldIncludePlayerInGroup(basePlayer, candidate, group)) {
        group.push(candidate);
      }
    }

    return group;
  }

  /**
   * Determine if a player should be included in a group based on skill and wait time
   */
  private shouldIncludePlayerInGroup(
    basePlayer: QueueEntry,
    candidate: QueueEntry,
    currentGroup: QueueEntry[],
  ): boolean {
    const skillDifference = Math.abs(
      basePlayer.skillRating - candidate.skillRating,
    );
    const maxSkillDifference = this.getMaxSkillDifference(basePlayer);

    // Check skill range
    if (skillDifference > maxSkillDifference) {
      return false;
    }

    // Check connection quality compatibility
    const connectionCompatible = this.areConnectionsCompatible(
      basePlayer,
      candidate,
    );
    if (!connectionCompatible) {
      return false;
    }

    // Check if adding this player improves group balance
    const currentBalance = this.calculateGroupBalance(currentGroup);
    const newGroup = [...currentGroup, candidate];
    const newBalance = this.calculateGroupBalance(newGroup);

    return newBalance >= currentBalance;
  }

  /**
   * Get maximum skill difference based on player's wait time and preferences
   */
  private getMaxSkillDifference(player: QueueEntry): number {
    const waitTime = Date.now() - new Date(player.queuedAt).getTime();
    const waitMinutes = waitTime / (60 * 1000);

    // Base skill range based on flexibility preference
    let baseRange: number;
    switch (player.preferences.skillRangeFlexibility) {
      case "strict":
        baseRange = 100;
        break;
      case "medium":
        baseRange = 200;
        break;
      case "flexible":
        baseRange = 400;
        break;
      default:
        baseRange = 200;
    }

    // Expand range based on wait time (every minute adds 50 rating points)
    const timeExpansion = Math.min(300, waitMinutes * 50);

    return baseRange + timeExpansion;
  }

  /**
   * Check if two players have compatible connections
   */
  private areConnectionsCompatible(
    player1: QueueEntry,
    player2: QueueEntry,
  ): boolean {
    // Check region compatibility
    if (player1.connectionInfo.region !== player2.connectionInfo.region) {
      // Allow cross-region if both have good connections
      const bothGoodConnections =
        (player1.connectionInfo.connectionQuality === "excellent" ||
          player1.connectionInfo.connectionQuality === "good") &&
        (player2.connectionInfo.connectionQuality === "excellent" ||
          player2.connectionInfo.connectionQuality === "good");

      if (!bothGoodConnections) {
        return false;
      }
    }

    // Check latency difference
    const latencyDifference = Math.abs(
      player1.connectionInfo.latency - player2.connectionInfo.latency,
    );
    return latencyDifference <= 100; // Max 100ms latency difference
  }

  /**
   * Calculate group balance score
   */
  private calculateGroupBalance(group: QueueEntry[]): number {
    if (group.length === 0) return 0;

    const skillRatings = group.map((p) => p.skillRating);
    const avgRating =
      skillRatings.reduce((sum, rating) => sum + rating, 0) /
      skillRatings.length;
    const variance =
      skillRatings.reduce((sum, rating) => sum + (rating - avgRating) ** 2, 0) /
      skillRatings.length;

    // Lower variance = better balance
    return Math.max(0, 1 - variance / 50000);
  }

  /**
   * Calculate average skill rating for a group of players
   */
  private calculateAverageSkillRating(players: QueueEntry[]): number {
    const totalRating = players.reduce(
      (sum, player) => sum + player.skillRating,
      0,
    );
    return Math.round(totalRating / players.length);
  }

  /**
   * Calculate skill rating range (difference between highest and lowest)
   */
  private calculateSkillRatingRange(players: QueueEntry[]): number {
    const ratings = players.map((p) => p.skillRating);
    return Math.max(...ratings) - Math.min(...ratings);
  }

  /**
   * Estimate game duration based on player skill levels
   */
  private estimateGameDuration(players: QueueEntry[]): number {
    const avgSkillRating = this.calculateAverageSkillRating(players);
    const playerCount = players.length;

    // Base duration: 8 rounds * 45 seconds + transitions
    const baseDuration = 8 * 45 + 8 * 15; // 45s per round + 15s transitions

    // Adjust for skill level (higher skill = slightly longer games due to closer competition)
    const skillMultiplier = 1 + ((avgSkillRating - 1200) / 2000) * 0.2;

    // Adjust for player count (more players = slightly longer voting phases)
    const playerMultiplier = 1 + ((playerCount - 3) / 5) * 0.1;

    return Math.round(baseDuration * skillMultiplier * playerMultiplier);
  }

  /**
   * Generate unique match ID
   */
  private generateMatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `match_${timestamp}_${random}`;
  }

  /**
   * Create Battle Royale lobby when sufficient players are matched
   * Implements task 2.2 requirements for automatic lobby creation
   */
  async createBattleRoyaleLobby(
    match: MatchmakingResult,
  ): Promise<ServiceResult<string>> {
    return Sentry.startSpan(
      {
        op: "matchmaking.create_lobby",
        name: "Create Battle Royale Lobby",
      },
      async () => {
        try {
          // Select host (first player in queue order)
          const hostPlayer = match.players.reduce((earliest, player) => {
            return new Date(player.queuedAt).getTime() <
              new Date(earliest.queuedAt).getTime()
              ? player
              : earliest;
          });

          // Create competitive settings preset
          const competitiveSettings: CompetitiveSettings = {
            rounds: 8,
            timeLimit: 45,
            categories: [
              "general",
              "reaction",
              "wholesome",
              "gaming",
              "pop_culture",
            ],
            autoStart: true,
            autoStartCountdown: 30,
            xpMultiplier: 1.5,
            rankingEnabled: true,
          };

          // Create Battle Royale lobby parameters
          const lobbyParams: BattleRoyaleLobbyParams = {
            hostUid: hostPlayer.playerUid,
            hostDisplayName: hostPlayer.displayName,
            hostAvatarId: hostPlayer.avatarId,
            hostProfileURL: hostPlayer.profileURL,
            maxPlayers: 8,
            settings: competitiveSettings,
            type: "battle_royale",
            matchId: match.matchId,
            competitiveSettings,
            autoStart: true,
            autoStartCountdown: 30,
          };

          // Create lobby using existing LobbyService
          const lobbyResult = await this.lobbyService.createLobby(lobbyParams);

          if (!lobbyResult.success || !lobbyResult.data) {
            throw this.createBattleRoyaleError(
              "MATCH_CREATION_FAILED",
              "Failed to create Battle Royale lobby",
              "Failed to create your match. Please try joining the queue again.",
              true,
            );
          }

          const { code: lobbyCode } = lobbyResult.data;

          // Add all matched players to the lobby
          await this.addPlayersToLobby(lobbyCode, match.players);

          // Remove players from queue (batch operation)
          await this.batchRemovePlayersFromQueue(
            match.players.map((p) => p.playerUid),
          );

          // Store match history
          await this.storeMatchHistory(match, lobbyCode);

          // Update queue metrics
          await this.updateQueueMetrics();

          Sentry.addBreadcrumb({
            message: "Battle Royale lobby created successfully",
            data: {
              lobbyCode,
              matchId: match.matchId,
              playerCount: match.players.length,
              averageSkillRating: match.averageSkillRating,
              matchQuality: match.matchQuality,
            },
            level: "info",
          });

          return {
            success: true,
            data: lobbyCode,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as BattleRoyaleError).type
          ) {
            throw error;
          }

          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "MATCH_CREATION_FAILED",
            `Failed to create Battle Royale lobby: ${error}`,
            "Failed to create your match. Please try joining the queue again.",
            true,
          );
        }
      },
    );
  }

  /**
   * Add multiple players to a Battle Royale lobby
   */
  private async addPlayersToLobby(
    lobbyCode: string,
    players: QueueEntry[],
  ): Promise<void> {
    // Add players one by one using existing joinLobby method
    for (const player of players) {
      // Skip the host as they're already in the lobby
      const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
      const snapshot = await get(lobbyRef);

      if (snapshot.exists()) {
        const lobby = snapshot.val() as LobbyData;
        if (lobby.players[player.playerUid]) {
          continue; // Player already in lobby (likely the host)
        }
      }

      const joinParams: JoinLobbyParams = {
        uid: player.playerUid,
        displayName: player.displayName,
        avatarId: player.avatarId,
        profileURL: player.profileURL,
      };

      try {
        await this.lobbyService.joinLobby(lobbyCode, joinParams);
      } catch (error) {
        // Log error but continue with other players
        Sentry.captureException(error, {
          tags: { operation: "add_player_to_battle_royale_lobby" },
          extra: { lobbyCode, playerUid: player.playerUid },
        });
      }
    }
  }

  /**
   * Store match history for analytics and quality tracking
   */
  private async storeMatchHistory(
    match: MatchmakingResult,
    lobbyCode: string,
  ): Promise<void> {
    try {
      const matchHistory = {
        matchId: match.matchId,
        players: match.players.map((p) => p.playerUid),
        averageSkillRating: match.averageSkillRating,
        skillRatingRange: match.skillRatingRange,
        matchQuality: match.matchQuality,
        createdAt: new Date().toISOString(),
        lobbyCode,
        estimatedDuration: match.estimatedGameDuration,
      };

      const historyRef = ref(rtdb, `${this.HISTORY_PATH}/${match.matchId}`);
      await set(historyRef, matchHistory);
    } catch (error) {
      // Don't throw on history storage failure, just log
      Sentry.captureException(error, {
        tags: { operation: "store_match_history" },
      });
    }
  }

  // ===== QUEUE MANAGEMENT AND CLEANUP METHODS =====

  /**
   * Clean up disconnected players from the queue
   * Removes players who have been inactive for more than the specified timeout
   */
  async cleanupDisconnectedPlayers(
    timeoutMinutes: number = 5,
  ): Promise<ServiceResult> {
    return Sentry.startSpan(
      {
        op: "db.matchmaking.cleanup_queue",
        name: "Cleanup Disconnected Players",
      },
      async () => {
        try {
          const queueRef = ref(rtdb, this.QUEUE_PATH);
          const snapshot = await get(queueRef);

          if (!snapshot.exists()) {
            return {
              success: true,
              data: { removedPlayers: 0 },
              timestamp: new Date().toISOString(),
            };
          }

          const queueData = snapshot.val();
          const now = Date.now();
          const timeoutMs = timeoutMinutes * 60 * 1000;
          const playersToRemove: string[] = [];

          // Find players who have been in queue too long
          Object.entries(queueData).forEach(([playerUid, entry]) => {
            const queueEntry = entry as QueueEntry;
            const queueTime = new Date(queueEntry.queuedAt).getTime();

            if (now - queueTime > timeoutMs) {
              playersToRemove.push(playerUid);
            }
          });

          // Remove disconnected players in batch
          if (playersToRemove.length > 0) {
            await this.batchRemovePlayersFromQueue(playersToRemove);
          }

          Sentry.addBreadcrumb({
            message: "Queue cleanup completed",
            data: {
              removedPlayers: playersToRemove.length,
              timeoutMinutes,
            },
            level: "info",
          });

          return {
            success: true,
            data: { removedPlayers: playersToRemove.length },
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "UNKNOWN_ERROR",
            `Failed to cleanup queue: ${error}`,
            "Failed to cleanup the queue. Some disconnected players may remain.",
            true,
          );
        }
      },
    );
  }

  /**
   * Batch remove multiple players from queue
   */
  async batchRemovePlayersFromQueue(
    playerUids: string[],
  ): Promise<ServiceResult> {
    return Sentry.startSpan(
      {
        op: "db.matchmaking.batch_remove",
        name: "Batch Remove Players from Queue",
      },
      async () => {
        try {
          if (playerUids.length === 0) {
            return {
              success: true,
              data: { removedCount: 0 },
              timestamp: new Date().toISOString(),
            };
          }

          // Prepare batch updates
          const updates: Record<string, unknown> = {};
          playerUids.forEach((playerUid) => {
            updates[`${this.QUEUE_PATH}/${playerUid}`] = null;
          });
          updates[`${this.METRICS_PATH}/lastUpdated`] = serverTimestamp();

          // Execute batch removal
          await this.retryOperation(async () => {
            await update(ref(rtdb), updates);
          }, "batch_remove_players");

          // Update queue metrics
          await this.updateQueueMetrics();

          return {
            success: true,
            data: { removedCount: playerUids.length },
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "UNKNOWN_ERROR",
            `Failed to batch remove players: ${error}`,
            "Failed to remove players from queue. Please try again.",
            true,
          );
        }
      },
    );
  }

  /**
   * Get comprehensive queue metrics for monitoring
   */
  async getQueueMetrics(): Promise<{
    currentQueueSize: number;
    averageWaitTime: number;
    peakHours: string[];
    playersBySkillRange: Record<string, number>;
    averageSkillRating: number;
    connectionQualityDistribution: Record<string, number>;
  }> {
    try {
      const queueRef = ref(rtdb, this.QUEUE_PATH);
      const snapshot = await get(queueRef);

      if (!snapshot.exists()) {
        return {
          currentQueueSize: 0,
          averageWaitTime: 0,
          peakHours: [],
          playersBySkillRange: {},
          averageSkillRating: 0,
          connectionQualityDistribution: {},
        };
      }

      const queueData = snapshot.val();
      const players = Object.values(queueData) as QueueEntry[];

      // Calculate metrics
      const currentQueueSize = players.length;
      const averageWaitTime = await this.calculateAverageWaitTime();

      // Skill rating distribution
      const skillRatings = players.map((p) => p.skillRating);
      const averageSkillRating =
        skillRatings.reduce((sum, rating) => sum + rating, 0) /
        skillRatings.length;

      const playersBySkillRange: Record<string, number> = {
        "Bronze (100-799)": 0,
        "Silver (800-1099)": 0,
        "Gold (1100-1399)": 0,
        "Platinum (1400-1699)": 0,
        "Diamond (1700-2199)": 0,
        "Master (2200+)": 0,
      };

      players.forEach((player) => {
        const rating = player.skillRating;
        if (rating < 800) playersBySkillRange["Bronze (100-799)"]++;
        else if (rating < 1100) playersBySkillRange["Silver (800-1099)"]++;
        else if (rating < 1400) playersBySkillRange["Gold (1100-1399)"]++;
        else if (rating < 1700) playersBySkillRange["Platinum (1400-1699)"]++;
        else if (rating < 2200) playersBySkillRange["Diamond (1700-2199)"]++;
        else playersBySkillRange["Master (2200+)"]++;
      });

      // Connection quality distribution
      const connectionQualityDistribution: Record<string, number> = {
        poor: 0,
        fair: 0,
        good: 0,
        excellent: 0,
      };

      players.forEach((player) => {
        connectionQualityDistribution[
          player.connectionInfo.connectionQuality
        ]++;
      });

      return {
        currentQueueSize,
        averageWaitTime,
        peakHours: ["19:00", "20:00", "21:00"], // Static for now
        playersBySkillRange,
        averageSkillRating,
        connectionQualityDistribution,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        currentQueueSize: 0,
        averageWaitTime: 0,
        peakHours: [],
        playersBySkillRange: {},
        averageSkillRating: 0,
        connectionQualityDistribution: {},
      };
    }
  }

  /**
   * Get queue position history for a player (for analytics)
   */
  async getPlayerQueueHistory(playerUid: string): Promise<{
    averageWaitTime: number;
    totalQueues: number;
    successfulMatches: number;
    averagePosition: number;
  }> {
    try {
      // This would typically be stored in a separate analytics collection
      // For now, return basic stats from player's Battle Royale stats
      const stats = await this.getPlayerStats(playerUid);

      if (!stats) {
        return {
          averageWaitTime: 0,
          totalQueues: 0,
          successfulMatches: 0,
          averagePosition: 0,
        };
      }

      return {
        averageWaitTime: 60, // Placeholder - would track actual wait times
        totalQueues: stats.gamesPlayed, // Assuming each game started from queue
        successfulMatches: stats.gamesPlayed,
        averagePosition: stats.averagePosition,
      };
    } catch (error) {
      Sentry.captureException(error);
      return {
        averageWaitTime: 0,
        totalQueues: 0,
        successfulMatches: 0,
        averagePosition: 0,
      };
    }
  }

  /**
   * Update queue preferences with validation
   */
  async validateAndUpdateQueuePreferences(
    playerUid: string,
    preferences: Partial<QueuePreferences>,
  ): Promise<ServiceResult> {
    try {
      // Validate preferences
      const validationErrors: string[] = [];

      if (preferences.maxWaitTime !== undefined) {
        if (preferences.maxWaitTime < 30 || preferences.maxWaitTime > 600) {
          validationErrors.push(
            "Max wait time must be between 30 seconds and 10 minutes",
          );
        }
      }

      if (preferences.skillRangeFlexibility !== undefined) {
        const validFlexibilities = ["strict", "medium", "flexible"];
        if (!validFlexibilities.includes(preferences.skillRangeFlexibility)) {
          validationErrors.push(
            "Skill range flexibility must be strict, medium, or flexible",
          );
        }
      }

      if (validationErrors.length > 0) {
        throw this.createBattleRoyaleError(
          "VALIDATION_ERROR",
          `Invalid queue preferences: ${validationErrors.join(", ")}`,
          `Invalid preferences: ${validationErrors.join(", ")}`,
          false,
        );
      }

      // Update preferences
      return await this.updateQueuePreferences(playerUid, preferences);
    } catch (error) {
      if (
        error instanceof Error &&
        "type" in error &&
        (error as BattleRoyaleError).type
      ) {
        throw error;
      }

      Sentry.captureException(error);
      throw this.createBattleRoyaleError(
        "UNKNOWN_ERROR",
        `Failed to validate and update preferences: ${error}`,
        "Failed to update your preferences. Please try again.",
        true,
      );
    }
  }

  /**
   * Get real-time queue status for monitoring dashboard
   */
  subscribeToQueueMetrics(
    callback: (metrics: {
      queueSize: number;
      averageWaitTime: number;
      recentMatches: number;
    }) => void,
  ): UnsubscribeFunction {
    const metricsRef = ref(rtdb, this.METRICS_PATH);

    const unsubscribe = onValue(
      metricsRef,
      async (snapshot) => {
        try {
          let queueSize = 0;
          let averageWaitTime = 45;
          let recentMatches = 0;

          if (snapshot.exists()) {
            const metrics = snapshot.val();
            queueSize = metrics.currentQueueSize || 0;
            averageWaitTime = metrics.averageWaitTime || 45;
            recentMatches = metrics.matchesCreatedToday || 0;
          }

          callback({
            queueSize,
            averageWaitTime,
            recentMatches,
          });
        } catch (error) {
          Sentry.captureException(error);
        }
      },
      (error) => {
        Sentry.captureException(error, {
          tags: { operation: "queue_metrics_subscription" },
        });
      },
    );

    return () => off(metricsRef, "value", unsubscribe);
  }

  // ===== EXISTING LOBBY FILLING METHODS =====

  /**
   * Fill existing Battle Royale lobbies before creating new ones
   * Implements task 2.3 requirements for existing lobby filling logic
   */
  async fillExistingLobbies(players: QueueEntry[]): Promise<{
    filledLobbies: Array<{ lobbyCode: string; playersAdded: QueueEntry[] }>;
    remainingPlayers: QueueEntry[];
  }> {
    return Sentry.startSpan(
      {
        op: "matchmaking.fill_existing_lobbies",
        name: "Fill Existing Lobbies",
      },
      async () => {
        try {
          const availableLobbies =
            await this.findAvailableBattleRoyaleLobbies();
          const filledLobbies: Array<{
            lobbyCode: string;
            playersAdded: QueueEntry[];
          }> = [];
          let remainingPlayers = [...players];

          // Sort lobbies by creation time (oldest first) to fill them fairly
          availableLobbies.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );

          for (const lobby of availableLobbies) {
            if (remainingPlayers.length === 0) break;

            const availableSlots = lobby.maxPlayers - lobby.currentPlayerCount;
            if (availableSlots <= 0) continue;

            // Find compatible players for this lobby
            const compatiblePlayers = this.findCompatiblePlayersForLobby(
              remainingPlayers,
              lobby,
              availableSlots,
            );

            if (compatiblePlayers.length > 0) {
              try {
                // Add players to the existing lobby
                await this.addPlayersToExistingLobby(
                  lobby.code,
                  compatiblePlayers,
                );

                filledLobbies.push({
                  lobbyCode: lobby.code,
                  playersAdded: compatiblePlayers,
                });

                // Remove added players from remaining players
                remainingPlayers = remainingPlayers.filter(
                  (player) =>
                    !compatiblePlayers.some(
                      (cp) => cp.playerUid === player.playerUid,
                    ),
                );

                // Check if lobby should start countdown after adding players
                await this.checkAutoCountdownTrigger(lobby.code);

                Sentry.addBreadcrumb({
                  message: "Players added to existing lobby",
                  data: {
                    lobbyCode: lobby.code,
                    playersAdded: compatiblePlayers.length,
                    remainingSlots: availableSlots - compatiblePlayers.length,
                  },
                  level: "info",
                });
              } catch (error) {
                // Log error but continue with other lobbies
                Sentry.captureException(error, {
                  tags: { operation: "add_players_to_existing_lobby" },
                  extra: {
                    lobbyCode: lobby.code,
                    playerCount: compatiblePlayers.length,
                  },
                });
              }
            }
          }

          return {
            filledLobbies,
            remainingPlayers,
          };
        } catch (error) {
          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "MATCHMAKING_TIMEOUT",
            `Failed to fill existing lobbies: ${error}`,
            "Failed to find available matches. Please try again.",
            true,
          );
        }
      },
    );
  }

  /**
   * Find available Battle Royale lobbies that can accept new players
   */
  private async findAvailableBattleRoyaleLobbies(): Promise<
    Array<{
      code: string;
      maxPlayers: number;
      currentPlayerCount: number;
      averageSkillRating: number;
      createdAt: string;
      status: LobbyStatus;
    }>
  > {
    try {
      const lobbiesRef = ref(rtdb, "lobbies");
      const snapshot = await get(lobbiesRef);

      if (!snapshot.exists()) {
        return [];
      }

      const lobbies = snapshot.val();
      const availableLobbies: Array<{
        code: string;
        maxPlayers: number;
        currentPlayerCount: number;
        averageSkillRating: number;
        createdAt: string;
        status: LobbyStatus;
      }> = [];

      for (const [code, lobbyData] of Object.entries(lobbies)) {
        const lobby = lobbyData as LobbyData & { type?: string };

        // Only consider Battle Royale lobbies in waiting status
        if (
          lobby.type === "battle_royale" &&
          lobby.status === "waiting" &&
          lobby.players
        ) {
          const currentPlayerCount = Object.keys(lobby.players).length;
          const hasAvailableSlots = currentPlayerCount < lobby.maxPlayers;

          if (hasAvailableSlots) {
            // Calculate average skill rating of current players
            const playerStats = await Promise.all(
              Object.keys(lobby.players).map((uid) => this.getPlayerStats(uid)),
            );

            const skillRatings = playerStats
              .filter((stats) => stats !== null)
              .map((stats) => stats?.skillRating);

            const averageSkillRating =
              skillRatings.length > 0
                ? skillRatings.reduce((sum, rating) => sum + rating, 0) /
                  skillRatings.length
                : this.skillRatingSystem.getDefaultRating();

            availableLobbies.push({
              code,
              maxPlayers: lobby.maxPlayers,
              currentPlayerCount,
              averageSkillRating,
              createdAt: lobby.createdAt,
              status: lobby.status,
            });
          }
        }
      }

      return availableLobbies;
    } catch (error) {
      Sentry.captureException(error);
      return [];
    }
  }

  /**
   * Find compatible players for a specific lobby based on skill rating and connection
   */
  private findCompatiblePlayersForLobby(
    players: QueueEntry[],
    lobby: {
      code: string;
      averageSkillRating: number;
      currentPlayerCount: number;
    },
    maxPlayers: number,
  ): QueueEntry[] {
    const compatiblePlayers: QueueEntry[] = [];

    // Sort players by queue time (FIFO) and skill compatibility
    const sortedPlayers = [...players].sort((a, b) => {
      const timeA = new Date(a.queuedAt).getTime();
      const timeB = new Date(b.queuedAt).getTime();

      // Primary sort: queue time (earlier first)
      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // Secondary sort: skill rating compatibility
      const skillDiffA = Math.abs(a.skillRating - lobby.averageSkillRating);
      const skillDiffB = Math.abs(b.skillRating - lobby.averageSkillRating);
      return skillDiffA - skillDiffB;
    });

    for (const player of sortedPlayers) {
      if (compatiblePlayers.length >= maxPlayers) break;

      // Check skill rating compatibility
      const skillDifference = Math.abs(
        player.skillRating - lobby.averageSkillRating,
      );
      const maxSkillDifference = this.getMaxSkillDifferenceForLobby(
        player,
        lobby,
      );

      if (skillDifference <= maxSkillDifference) {
        // Check if adding this player maintains good balance
        const currentSkillRatings = compatiblePlayers.map((p) => p.skillRating);
        currentSkillRatings.push(player.skillRating);

        const skillBalance = this.calculateSkillBalance(currentSkillRatings);

        // Accept player if skill balance is reasonable (>= 0.4)
        if (skillBalance >= 0.4) {
          compatiblePlayers.push(player);
        }
      }
    }

    return compatiblePlayers;
  }

  /**
   * Get maximum skill difference allowed for joining an existing lobby
   */
  private getMaxSkillDifferenceForLobby(
    player: QueueEntry,
    lobby: { averageSkillRating: number; currentPlayerCount: number },
  ): number {
    const waitTime = Date.now() - new Date(player.queuedAt).getTime();
    const waitMinutes = waitTime / (60 * 1000);

    // Base skill range based on player preferences
    let baseRange: number;
    switch (player.preferences.skillRangeFlexibility) {
      case "strict":
        baseRange = 150; // Slightly more flexible for existing lobbies
        break;
      case "medium":
        baseRange = 250;
        break;
      case "flexible":
        baseRange = 450;
        break;
      default:
        baseRange = 250;
    }

    // Expand range based on wait time and lobby fill status
    const timeExpansion = Math.min(200, waitMinutes * 30);
    const lobbyFillBonus = lobby.currentPlayerCount >= 6 ? 100 : 0; // More flexible for nearly full lobbies

    return baseRange + timeExpansion + lobbyFillBonus;
  }

  /**
   * Calculate skill balance for a group of skill ratings
   */
  private calculateSkillBalance(skillRatings: number[]): number {
    if (skillRatings.length === 0) return 1;
    if (skillRatings.length === 1) return 1;

    const avgRating =
      skillRatings.reduce((sum, rating) => sum + rating, 0) /
      skillRatings.length;
    const variance =
      skillRatings.reduce((sum, rating) => sum + (rating - avgRating) ** 2, 0) /
      skillRatings.length;

    // Convert variance to balance score (0-1, higher is better)
    return Math.max(0, Math.min(1, 1 - variance / 100000));
  }

  /**
   * Add players to an existing Battle Royale lobby
   */
  private async addPlayersToExistingLobby(
    lobbyCode: string,
    players: QueueEntry[],
  ): Promise<void> {
    for (const player of players) {
      const joinParams: JoinLobbyParams = {
        uid: player.playerUid,
        displayName: player.displayName,
        avatarId: player.avatarId,
        profileURL: player.profileURL,
      };

      try {
        await this.lobbyService.joinLobby(lobbyCode, joinParams);

        // Remove player from queue after successful join
        await this.removePlayerFromQueue(player.playerUid);
      } catch (error) {
        // Log error but don't throw - continue with other players
        Sentry.captureException(error, {
          tags: { operation: "add_player_to_existing_lobby" },
          extra: { lobbyCode, playerUid: player.playerUid },
        });

        // If join failed, don't remove from queue
        throw error;
      }
    }
  }

  /**
   * Check if lobby should trigger auto countdown after adding players
   */
  private async checkAutoCountdownTrigger(lobbyCode: string): Promise<void> {
    try {
      const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
      const snapshot = await get(lobbyRef);

      if (!snapshot.exists()) return;

      const lobby = snapshot.val() as LobbyData;
      const playerCount = Object.keys(lobby.players || {}).length;

      // Trigger countdown if we have minimum players and no countdown is active
      if (playerCount >= 3 && lobby.status === "waiting") {
        const hasActiveCountdown = lobby.autoCountdown?.active;

        if (!hasActiveCountdown) {
          await this.lobbyService.startAutoCountdown(lobbyCode);
        }
      }
    } catch (error) {
      // Don't throw on countdown trigger failure, just log
      Sentry.captureException(error, {
        tags: { operation: "check_auto_countdown_trigger" },
        extra: { lobbyCode },
      });
    }
  }

  /**
   * Main matchmaking orchestration method that prioritizes filling existing lobbies
   */
  async processMatchmaking(): Promise<
    ServiceResult<{
      filledLobbies: Array<{ lobbyCode: string; playersAdded: number }>;
      newMatches: Array<{
        lobbyCode: string;
        matchId: string;
        players: number;
      }>;
      totalPlayersMatched: number;
    }>
  > {
    return Sentry.startSpan(
      {
        op: "matchmaking.process",
        name: "Process Matchmaking",
      },
      async () => {
        try {
          // Get all queued players
          const queueRef = query(
            ref(rtdb, this.QUEUE_PATH),
            orderByChild("queuedAt"),
          );
          const snapshot = await get(queueRef);

          if (!snapshot.exists()) {
            return {
              success: true,
              data: {
                filledLobbies: [],
                newMatches: [],
                totalPlayersMatched: 0,
              },
              timestamp: new Date().toISOString(),
            };
          }

          const queuedPlayers: QueueEntry[] = [];
          snapshot.forEach((childSnapshot) => {
            queuedPlayers.push(childSnapshot.val() as QueueEntry);
          });

          // Step 1: Fill existing lobbies first
          const { filledLobbies, remainingPlayers } =
            await this.fillExistingLobbies(queuedPlayers);

          // Step 2: Create new matches for remaining players
          const newMatches: Array<{
            lobbyCode: string;
            matchId: string;
            players: number;
          }> = [];

          if (remainingPlayers.length >= this.MIN_PLAYERS_PER_MATCH) {
            const matchmakingResults = await this.findMatches();

            for (const match of matchmakingResults) {
              try {
                const lobbyResult = await this.createBattleRoyaleLobby(match);

                if (lobbyResult.success && lobbyResult.data) {
                  newMatches.push({
                    lobbyCode: lobbyResult.data,
                    matchId: match.matchId,
                    players: match.players.length,
                  });
                }
              } catch (error) {
                Sentry.captureException(error, {
                  tags: { operation: "create_new_match" },
                  extra: { matchId: match.matchId },
                });
              }
            }
          }

          const totalPlayersMatched =
            filledLobbies.reduce(
              (sum, lobby) => sum + lobby.playersAdded.length,
              0,
            ) + newMatches.reduce((sum, match) => sum + match.players, 0);

          Sentry.addBreadcrumb({
            message: "Matchmaking process completed",
            data: {
              totalQueuedPlayers: queuedPlayers.length,
              filledLobbies: filledLobbies.length,
              newMatches: newMatches.length,
              totalPlayersMatched,
            },
            level: "info",
          });

          return {
            success: true,
            data: {
              filledLobbies: filledLobbies.map((lobby) => ({
                lobbyCode: lobby.lobbyCode,
                playersAdded: lobby.playersAdded.length,
              })),
              newMatches,
              totalPlayersMatched,
            },
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          Sentry.captureException(error);
          throw this.createBattleRoyaleError(
            "MATCHMAKING_TIMEOUT",
            `Failed to process matchmaking: ${error}`,
            "Matchmaking is currently unavailable. Please try again.",
            true,
          );
        }
      },
    );
  }
}
