import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MatchmakingService } from "@/lib/services/matchmaking.service";

// Hook return interface
export interface UseBattleRoyaleStatsReturn {
  stats: BattleRoyaleStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshStats: () => Promise<void>;

  // Derived Data
  rank: string;
  percentile: number;
  nextRankProgress: number;
  recentPerformance: "improving" | "declining" | "stable";
}

/**
 * Custom hook for Battle Royale player statistics and ranking display
 * Implements player statistics state management with real-time updates
 */
export function useBattleRoyaleStats(
  playerUid?: string,
): UseBattleRoyaleStatsReturn {
  // Core state
  const [stats, setStats] = useState<BattleRoyaleStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const [rank, setRank] = useState<string>("Unranked");
  const [percentile, setPercentile] = useState<number>(0);
  const [nextRankProgress, setNextRankProgress] = useState<number>(0);
  const [recentPerformance, setRecentPerformance] = useState<
    "improving" | "declining" | "stable"
  >("stable");

  // Service and user references
  const matchmakingService = useRef(MatchmakingService.getInstance());
  const { user } = useCurrentUser();
  const cacheRef = useRef<{
    data: BattleRoyaleStats | null;
    timestamp: number;
  } | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use provided playerUid or current user's ID
  const targetPlayerUid = playerUid || user?.id;

  // Cache duration: 5 minutes for frequently accessed stats
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Handle errors with proper logging
   */
  const handleError = useCallback(
    (error: unknown, operation: string) => {
      let errorMessage = "Failed to load statistics. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setIsLoading(false);

      // Log error for monitoring
      Sentry.captureException(error, {
        tags: {
          operation,
          playerUid: targetPlayerUid || "unknown",
        },
      });
    },
    [targetPlayerUid],
  );

  /**
   * Calculate derived data from stats
   */
  const calculateDerivedData = useCallback(
    async (statsData: BattleRoyaleStats) => {
      try {
        if (!targetPlayerUid) return;

        // Get ranking tier
        const rankingTier =
          await matchmakingService.current.getPlayerRankingTier(
            targetPlayerUid,
          );
        setRank(rankingTier.name);

        // Calculate percentile
        const playerPercentile =
          await matchmakingService.current.calculatePlayerPercentile(
            targetPlayerUid,
          );
        setPercentile(playerPercentile);

        // Calculate progress to next rank
        const currentRating = statsData.skillRating;
        const nextRankThreshold = rankingTier.maxRating;
        const currentRankThreshold = rankingTier.minRating;

        if (nextRankThreshold > currentRankThreshold) {
          const progress =
            ((currentRating - currentRankThreshold) /
              (nextRankThreshold - currentRankThreshold)) *
            100;
          setNextRankProgress(Math.min(100, Math.max(0, progress)));
        } else {
          setNextRankProgress(100); // Max rank achieved
        }

        // Analyze recent performance trends
        const recentGames = Math.min(10, statsData.gamesPlayed);
        if (recentGames >= 5) {
          // Simple trend analysis based on current streak and win rate
          const isOnWinStreak = statsData.currentStreak > 0;
          const hasGoodWinRate = statsData.winRate > 0.5;
          const isImproving =
            statsData.skillRating > statsData.skillRating * 0.95; // Simplified check

          if (isOnWinStreak && hasGoodWinRate) {
            setRecentPerformance("improving");
          } else if (statsData.currentStreak === 0 && statsData.winRate < 0.4) {
            setRecentPerformance("declining");
          } else {
            setRecentPerformance("stable");
          }
        } else {
          setRecentPerformance("stable");
        }
      } catch (error) {
        console.warn("Failed to calculate derived data:", error);
        // Set defaults on error
        setRank("Unranked");
        setPercentile(0);
        setNextRankProgress(0);
        setRecentPerformance("stable");
      }
    },
    [targetPlayerUid],
  );

  /**
   * Check if cached data is still valid
   */
  const isCacheValid = useCallback((): boolean => {
    if (!cacheRef.current) return false;

    const now = Date.now();
    const cacheAge = now - cacheRef.current.timestamp;
    return cacheAge < CACHE_DURATION;
  }, []);

  /**
   * Fetch player statistics with caching mechanism
   */
  const fetchStats = useCallback(
    async (useCache: boolean = true): Promise<void> => {
      if (!targetPlayerUid) {
        setStats(null);
        return;
      }

      // Check cache first if requested
      if (useCache && isCacheValid() && cacheRef.current) {
        setStats(cacheRef.current.data);
        if (cacheRef.current.data) {
          await calculateDerivedData(cacheRef.current.data);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const playerStats =
          await matchmakingService.current.getPlayerStats(targetPlayerUid);

        // Update cache
        cacheRef.current = {
          data: playerStats,
          timestamp: Date.now(),
        };

        setStats(playerStats);

        // Calculate derived data if stats exist
        if (playerStats) {
          await calculateDerivedData(playerStats);
        } else {
          // Reset derived data for new players
          setRank("Unranked");
          setPercentile(0);
          setNextRankProgress(0);
          setRecentPerformance("stable");
        }

        setIsLoading(false);

        Sentry.addBreadcrumb({
          message: "Successfully fetched Battle Royale stats",
          data: {
            playerUid: targetPlayerUid,
            hasStats: !!playerStats,
            gamesPlayed: playerStats?.gamesPlayed || 0,
            skillRating: playerStats?.skillRating || 0,
          },
          level: "info",
        });
      } catch (error) {
        handleError(error, "fetch_battle_royale_stats");
      }
    },
    [targetPlayerUid, isCacheValid, calculateDerivedData, handleError],
  );

  /**
   * Refresh stats method to fetch latest player performance data
   */
  const refreshStats = useCallback(async (): Promise<void> => {
    // Force refresh by bypassing cache
    await fetchStats(false);
  }, [fetchStats]);

  /**
   * Set up periodic refresh for real-time updates
   */
  const setupPeriodicRefresh = useCallback(() => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Set up periodic refresh every 2 minutes for active users
    refreshTimeoutRef.current = setTimeout(
      () => {
        if (targetPlayerUid) {
          fetchStats(true); // Use cache if valid
          setupPeriodicRefresh(); // Schedule next refresh
        }
      },
      2 * 60 * 1000,
    ); // 2 minutes
  }, [targetPlayerUid, fetchStats]);

  /**
   * Clean up timers
   */
  const cleanup = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  // Initial fetch when playerUid changes
  useEffect(() => {
    if (targetPlayerUid) {
      fetchStats(true);
      setupPeriodicRefresh();
    } else {
      setStats(null);
      setRank("Unranked");
      setPercentile(0);
      setNextRankProgress(0);
      setRecentPerformance("stable");
      cleanup();
    }

    return cleanup;
  }, [targetPlayerUid, fetchStats, setupPeriodicRefresh, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    stats,
    isLoading,
    error,

    // Actions
    refreshStats,

    // Derived Data
    rank,
    percentile,
    nextRankProgress,
    recentPerformance,
  };
}
