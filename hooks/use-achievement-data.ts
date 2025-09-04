import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Hook return interface
export interface UseAchievementDataReturn {
  achievements: Achievement[];
  unlockedAchievements: string[];
  achievementProgress: Record<string, AchievementProgress>;
  recentUnlocks: AchievementUnlock[];
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshAchievements: () => Promise<void>;
  markAchievementSeen: (achievementId: string) => Promise<void>;

  // Derived Data
  totalUnlocked: number;
  totalAvailable: number;
  completionPercentage: number;
  achievementsByCategory: Record<AchievementCategory, Achievement[]>;
  achievementsByRarity: Record<AchievementRarity, Achievement[]>;
}

/**
 * Custom hook for achievement data management
 * Handles fetching, caching, and real-time updates of player achievements
 */
export function useAchievementData(
  playerUid?: string,
): UseAchievementDataReturn {
  // Core state
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(
    [],
  );
  const [achievementProgress, setAchievementProgress] = useState<
    Record<string, AchievementProgress>
  >({});
  const [recentUnlocks, setRecentUnlocks] = useState<AchievementUnlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const [totalUnlocked, setTotalUnlocked] = useState<number>(0);
  const [totalAvailable, setTotalAvailable] = useState<number>(0);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [achievementsByCategory, setAchievementsByCategory] = useState<
    Record<AchievementCategory, Achievement[]>
  >({
    win_streaks: [],
    skill_milestones: [],
    games_played: [],
  });
  const [achievementsByRarity, setAchievementsByRarity] = useState<
    Record<AchievementRarity, Achievement[]>
  >({
    common: [],
    rare: [],
    epic: [],
  });

  // Service references
  const { user } = useCurrentUser();
  const cacheRef = useRef<{
    achievements: Achievement[];
    playerData: {
      unlocked: string[];
      progress: Record<string, AchievementProgress>;
      recentUnlocks: AchievementUnlock[];
    };
    timestamp: number;
  } | null>(null);

  // Use provided playerUid or current user's ID
  const targetPlayerUid = playerUid || user?.id;

  // Cache duration: 10 minutes for achievement definitions, 2 minutes for player data
  const ACHIEVEMENT_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  const PLAYER_DATA_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  /**
   * Handle errors with proper logging
   */
  const handleError = useCallback(
    (error: unknown, operation: string) => {
      let errorMessage = "Failed to load achievements. Please try again.";

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
   * Calculate derived data from achievements and player progress
   */
  const calculateDerivedData = useCallback(
    (achievementList: Achievement[], unlockedList: string[]) => {
      // Calculate totals
      const totalAchievements = achievementList.length;
      const totalUnlockedCount = unlockedList.length;
      const completionPercent =
        totalAchievements > 0
          ? Math.round((totalUnlockedCount / totalAchievements) * 100)
          : 0;

      setTotalAvailable(totalAchievements);
      setTotalUnlocked(totalUnlockedCount);
      setCompletionPercentage(completionPercent);

      // Group by category
      const byCategory: Record<AchievementCategory, Achievement[]> = {
        win_streaks: [],
        skill_milestones: [],
        games_played: [],
      };

      // Group by rarity
      const byRarity: Record<AchievementRarity, Achievement[]> = {
        common: [],
        rare: [],
        epic: [],
      };

      achievementList.forEach((achievement) => {
        byCategory[achievement.category].push(achievement);
        byRarity[achievement.rarity].push(achievement);
      });

      setAchievementsByCategory(byCategory);
      setAchievementsByRarity(byRarity);
    },
    [],
  );

  /**
   * Fetch all available achievements (cached globally)
   */
  const fetchAchievementDefinitions = useCallback(async (): Promise<
    Achievement[]
  > => {
    // For now, return mock achievement definitions
    // In a real implementation, this would fetch from Firebase or a service
    const mockAchievements: Achievement[] = [
      {
        id: "first_win",
        name: "First Victory",
        description: "Win your first Battle Royale match",
        icon: "Trophy",
        rarity: "common",
        category: "win_streaks",
        criteria: {
          type: "total_wins",
          target: 1,
          trackable: true,
        },
      },
      {
        id: "hat_trick",
        name: "Hat Trick",
        description: "Win 3 matches in a row",
        icon: "Crown",
        rarity: "rare",
        category: "win_streaks",
        criteria: {
          type: "win_streak",
          target: 3,
          trackable: true,
        },
      },
      {
        id: "veteran_player",
        name: "Veteran Player",
        description: "Play 100 Battle Royale matches",
        icon: "Shield",
        rarity: "epic",
        category: "games_played",
        criteria: {
          type: "games_played",
          target: 100,
          trackable: true,
        },
      },
      {
        id: "skilled_competitor",
        name: "Skilled Competitor",
        description: "Reach 1500 skill rating",
        icon: "Target",
        rarity: "rare",
        category: "skill_milestones",
        criteria: {
          type: "skill_rating",
          target: 1500,
          trackable: true,
        },
      },
      {
        id: "perfect_round",
        name: "Perfect Round",
        description: "Win a round with all votes",
        icon: "Star",
        rarity: "epic",
        category: "skill_milestones",
        criteria: {
          type: "perfect_rounds",
          target: 1,
          trackable: true,
        },
      },
    ];

    return mockAchievements;
  }, []);

  /**
   * Fetch player achievement data
   */
  const fetchPlayerAchievementData = useCallback(async (_uid: string) => {
    // Mock implementation - in real app, this would fetch from Firebase
    // For now, return some sample data based on user stats
    const mockPlayerData = {
      unlocked: ["first_win"], // Sample unlocked achievement
      progress: {
        hat_trick: { current: 1, target: 3, percentage: 33.33 },
        veteran_player: { current: 25, target: 100, percentage: 25 },
        skilled_competitor: { current: 1200, target: 1500, percentage: 80 },
        perfect_round: { current: 0, target: 1, percentage: 0 },
      },
      recentUnlocks: [
        {
          achievementId: "first_win",
          unlockedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        },
      ],
    };

    return mockPlayerData;
  }, []);

  /**
   * Check if cached data is still valid
   */
  const isCacheValid = useCallback(
    (cacheType: "achievements" | "player"): boolean => {
      if (!cacheRef.current) return false;

      const now = Date.now();
      const cacheAge = now - cacheRef.current.timestamp;
      const maxAge =
        cacheType === "achievements"
          ? ACHIEVEMENT_CACHE_DURATION
          : PLAYER_DATA_CACHE_DURATION;

      return cacheAge < maxAge;
    },
    [],
  );

  /**
   * Fetch achievement data with caching
   */
  const fetchAchievements = useCallback(
    async (useCache: boolean = true): Promise<void> => {
      if (!targetPlayerUid) {
        setAchievements([]);
        setUnlockedAchievements([]);
        setAchievementProgress({});
        setRecentUnlocks([]);
        return;
      }

      // Check cache first if requested
      if (useCache && isCacheValid("achievements") && cacheRef.current) {
        setAchievements(cacheRef.current.achievements);
        setUnlockedAchievements(cacheRef.current.playerData.unlocked);
        setAchievementProgress(cacheRef.current.playerData.progress);
        setRecentUnlocks(cacheRef.current.playerData.recentUnlocks);
        calculateDerivedData(
          cacheRef.current.achievements,
          cacheRef.current.playerData.unlocked,
        );
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch achievement definitions and player data in parallel
        const [achievementDefs, playerData] = await Promise.all([
          fetchAchievementDefinitions(),
          fetchPlayerAchievementData(targetPlayerUid),
        ]);

        // Update cache
        cacheRef.current = {
          achievements: achievementDefs,
          playerData,
          timestamp: Date.now(),
        };

        // Update state
        setAchievements(achievementDefs);
        setUnlockedAchievements(playerData.unlocked);
        setAchievementProgress(playerData.progress);
        setRecentUnlocks(playerData.recentUnlocks);

        // Calculate derived data
        calculateDerivedData(achievementDefs, playerData.unlocked);

        setIsLoading(false);

        Sentry.addBreadcrumb({
          message: "Successfully fetched achievement data",
          data: {
            playerUid: targetPlayerUid,
            totalAchievements: achievementDefs.length,
            unlockedCount: playerData.unlocked.length,
          },
          level: "info",
        });
      } catch (error) {
        handleError(error, "fetch_achievements");
      }
    },
    [
      targetPlayerUid,
      isCacheValid,
      fetchAchievementDefinitions,
      fetchPlayerAchievementData,
      calculateDerivedData,
      handleError,
    ],
  );

  /**
   * Refresh achievements method
   */
  const refreshAchievements = useCallback(async (): Promise<void> => {
    await fetchAchievements(false);
  }, [fetchAchievements]);

  /**
   * Mark achievement as seen (for notification management)
   */
  const markAchievementSeen = useCallback(
    async (achievementId: string): Promise<void> => {
      try {
        // In real implementation, this would update Firebase
        // For now, just update local state
        setRecentUnlocks((prev) =>
          prev.filter((unlock) => unlock.achievementId !== achievementId),
        );

        Sentry.addBreadcrumb({
          message: "Marked achievement as seen",
          data: { achievementId, playerUid: targetPlayerUid },
          level: "info",
        });
      } catch (error) {
        handleError(error, "mark_achievement_seen");
      }
    },
    [targetPlayerUid, handleError],
  );

  // Initial fetch when playerUid changes
  useEffect(() => {
    if (targetPlayerUid) {
      fetchAchievements(true);
    } else {
      // Reset state for no user
      setAchievements([]);
      setUnlockedAchievements([]);
      setAchievementProgress({});
      setRecentUnlocks([]);
      setTotalUnlocked(0);
      setTotalAvailable(0);
      setCompletionPercentage(0);
    }
  }, [targetPlayerUid, fetchAchievements]);

  return {
    achievements,
    unlockedAchievements,
    achievementProgress,
    recentUnlocks,
    isLoading,
    error,

    // Actions
    refreshAchievements,
    markAchievementSeen,

    // Derived Data
    totalUnlocked,
    totalAvailable,
    completionPercentage,
    achievementsByCategory,
    achievementsByRarity,
  };
}
