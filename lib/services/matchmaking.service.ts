import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  query,
  orderByChild,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "@/firebase/client";
import * as Sentry from "@sentry/nextjs";
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
  private readonly MAX_PLAYERS_PER_MATCH = 8;
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
    }
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
    maxRetries: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error;

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

    throw lastError!;
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
              `${this.QUEUE_PATH}/${playerData.playerUid}`
            );
            const snapshot = await get(queueRef);
            return snapshot.exists() ? snapshot.val() : null;
          }, "check_existing_queue_entry");

          if (existingEntry) {
            throw this.createBattleRoyaleError(
              "ALREADY_IN_QUEUE",
              `Player ${playerData.playerUid} is already in queue`,
              "You are already in the matchmaking queue.",
              false
            );
          }

          // Add timestamp and calculate initial estimated wait time
          const queueEntry: QueueEntry = {
            ...playerData,
            queuedAt: new Date().toISOString(),
            estimatedWaitTime: await this.calculateEstimatedWaitTime(
              playerData.skillRating
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
            true
          );
        }
      }
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
            true
          );
        }
      }
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
            orderByChild("queuedAt")
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
            true
          );
        }
      }
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
    skillRating: number
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
    preferences: Partial<QueuePreferences>
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
              false
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
            true
          );
        }
      }
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
    callback: (queueData: QueueEntry[]) => void
  ): UnsubscribeFunction {
    const queueRef = query(
      ref(rtdb, this.QUEUE_PATH),
      orderByChild("queuedAt")
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
      }
    );

    return () => off(queueRef, "value", unsubscribe);
  }

  /**
   * Subscribe to queue position updates for a specific player
   */
  subscribeToQueuePosition(
    playerUid: string,
    callback: (position: number) => void
  ): UnsubscribeFunction {
    // Subscribe to the entire queue to calculate position
    return this.subscribeToQueue((queueData) => {
      const playerEntry = queueData.find(
        (entry) => entry.playerUid === playerUid
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
    callback: (lobbyCode: string) => void
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
      }
    );

    return () => off(playerQueueRef, "value", unsubscribe);
  }

  /**
   * Find recent lobby for a player (placeholder implementation)
   */
  private async findRecentLobbyForPlayer(
    playerUid: string
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
    gameResult: GameResult
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
            playerUid
          );

          // Calculate new skill rating
          const ratingCalculation =
            this.skillRatingSystem.calculateRatingChange(
              currentStats.skillRating,
              gameResult,
              opponentRatings
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
              currentStats.skillRating + ratingCalculation.ratingChange
            ),
            currentStreak: isWin ? currentStats.currentStreak + 1 : 0,
            longestWinStreak: isWin
              ? Math.max(
                  currentStats.longestWinStreak,
                  currentStats.currentStreak + 1
                )
              : currentStats.longestWinStreak,
            averagePosition: this.calculateNewAveragePosition(
              currentStats.averagePosition,
              currentStats.gamesPlayed,
              gameResult.position
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
            true
          );
        }
      }
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
    gameResult: GameResult
  ): Promise<number> {
    try {
      const currentStats = await this.getPlayerStats(playerUid);
      const currentRating =
        currentStats?.skillRating || this.skillRatingSystem.getDefaultRating();

      const opponentRatings = await this.getOpponentRatings(
        gameResult.lobbyCode,
        playerUid
      );

      const calculation = this.skillRatingSystem.calculateRatingChange(
        currentRating,
        gameResult,
        opponentRatings
      );

      return currentRating + calculation.ratingChange;
    } catch (error) {
      Sentry.captureException(error);
      throw this.createBattleRoyaleError(
        "SKILL_RATING_UNAVAILABLE",
        `Failed to calculate skill rating: ${error}`,
        "Unable to calculate your skill rating. Please try again.",
        true
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
        allRatings
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
    playerUid: string
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
    newPosition: number
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

  // ===== QUEUE MANAGEMENT AND CLEANUP METHODS =====

  /**
   * Clean up disconnected players from the queue
   * Removes players who have been inactive for more than the specified timeout
   */
  async cleanupDisconnectedPlayers(
    timeoutMinutes: number = 5
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
            true
          );
        }
      }
    );
  }

  /**
   * Batch remove multiple players from queue
   */
  async batchRemovePlayersFromQueue(
    playerUids: string[]
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
            true
          );
        }
      }
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
    preferences: Partial<QueuePreferences>
  ): Promise<ServiceResult> {
    try {
      // Validate preferences
      const validationErrors: string[] = [];

      if (preferences.maxWaitTime !== undefined) {
        if (preferences.maxWaitTime < 30 || preferences.maxWaitTime > 600) {
          validationErrors.push(
            "Max wait time must be between 30 seconds and 10 minutes"
          );
        }
      }

      if (preferences.skillRangeFlexibility !== undefined) {
        const validFlexibilities = ["strict", "medium", "flexible"];
        if (!validFlexibilities.includes(preferences.skillRangeFlexibility)) {
          validationErrors.push(
            "Skill range flexibility must be strict, medium, or flexible"
          );
        }
      }

      if (validationErrors.length > 0) {
        throw this.createBattleRoyaleError(
          "VALIDATION_ERROR",
          `Invalid queue preferences: ${validationErrors.join(", ")}`,
          `Invalid preferences: ${validationErrors.join(", ")}`,
          false
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
        true
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
    }) => void
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
      }
    );

    return () => off(metricsRef, "value", unsubscribe);
  }
}
