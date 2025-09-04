import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Hook return interface
export interface UseXPProgressReturn {
  xpData: XPData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshXPData: () => Promise<void>;
  calculateXPGain: (gameResult: GameResult) => XPCalculation;
  simulateXPGain: (xpGain: number) => Promise<void>;

  // Derived Data
  currentLevel: number;
  currentXP: number;
  xpForNextLevel: number;
  totalXPForNextLevel: number;
  levelProgress: number;
  recentGains: XPHistoryEntry[];
  isNearLevelUp: boolean;
}

/**
 * Custom hook for XP progress tracking and level calculations
 * Handles XP data management, level progression, and gain calculations
 */
export function useXPProgress(
  playerUid?: string,
): UseXPProgressReturn {
  // Core state
  const [xpData, setXpData] = useState<XPData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [currentXP, setCurrentXP] = useState<number>(0);
  const [xpForNextLevel, setXpForNextLevel] = useState<number>(1000);
  const [totalXPForNextLevel, setTotalXPForNextLevel] = useState<number>(1000);
  const [levelProgress, setLevelProgress] = useState<number>(0);
  const [recentGains, setRecentGains] = useState<XPHistoryEntry[]>([]);
  const [isNearLevelUp, setIsNearLevelUp] = useState<boolean>(false);

  // Service references
  const { user } = useCurrentUser();
  const cacheRef = useRef<{
    data: XPData;
    timestamp: number;
  } | null>(null);

  // Use provided playerUid or current user's ID
  const targetPlayerUid = playerUid || user?.id;

  // Cache duration: 5 minutes for XP data
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Calculate level from total XP using exponential progression
   */
  const calculateLevelFromXP = useCallback((totalXP: number): { level: number; currentXP: number; xpForNext: number; totalForNext: number } => {
    if (totalXP <= 0) {
      return {
        level: 1,
        currentXP: 0,
        xpForNext: XP_CONSTANTS.XP_PER_LEVEL,
        totalForNext: XP_CONSTANTS.XP_PER_LEVEL,
      };
    }

    let level = 1;
    let totalXPRequired = 0;
    let xpForCurrentLevel = XP_CONSTANTS.XP_PER_LEVEL;

    // Calculate level using progressive XP requirements
    while (totalXPRequired + xpForCurrentLevel <= totalXP) {
      totalXPRequired += xpForCurrentLevel;
      level++;
      // Each level requires 10% more XP than the previous
      xpForCurrentLevel = Math.floor(XP_CONSTANTS.XP_PER_LEVEL * Math.pow(1.1, level - 1));
    }

    const currentXPInLevel = totalXP - totalXPRequired;
    const xpNeededForNext = xpForCurrentLevel - currentXPInLevel;
    const totalXPForNextLevel = totalXPRequired + xpForCurrentLevel;

    return {
      level,
      currentXP: currentXPInLevel,
      xpForNext: xpNeededForNext,
      totalForNext: totalXPForNextLevel,
    };
  }, []);

  /**
   * Calculate XP breakdown for a game result
   */
  const calculateXPGain = useCallback((gameResult: GameResult): XPCalculation => {
    const baseXP = XP_CONSTANTS.BASE_XP_PER_GAME;
    
    // Position bonus based on final placement
    const positionMultiplier = XP_CONSTANTS.POSITION_MULTIPLIERS[gameResult.position as keyof typeof XP_CONSTANTS.POSITION_MULTIPLIERS] || 0.2;
    const positionBonus = Math.floor(baseXP * (positionMultiplier - 1));
    
    // Rounds bonus for rounds won
    const roundsBonus = gameResult.roundsWon * XP_CONSTANTS.ROUNDS_BONUS_PER_WIN;
    
    const totalXP = baseXP + positionBonus + roundsBonus;

    // Calculate level progression
    const currentTotalXP = xpData?.totalXPEarned || 0;
    const levelBefore = calculateLevelFromXP(currentTotalXP).level;
    const levelAfter = calculateLevelFromXP(currentTotalXP + totalXP).level;

    return {
      baseXP,
      positionBonus,
      roundsBonus,
      totalXP,
      levelBefore,
      levelAfter,
      leveledUp: levelAfter > levelBefore,
    };
  }, [xpData?.totalXPEarned, calculateLevelFromXP]);

  /**
   * Handle errors with proper logging
   */
  const handleError = useCallback(
    (error: unknown, operation: string) => {
      let errorMessage = "Failed to load XP data. Please try again.";

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
   * Calculate derived data from XP information
   */
  const calculateDerivedData = useCallback(
    (xpInfo: XPData) => {
      const levelInfo = calculateLevelFromXP(xpInfo.totalXPEarned);
      
      setCurrentLevel(levelInfo.level);
      setCurrentXP(levelInfo.currentXP);
      setXpForNextLevel(levelInfo.xpForNext);
      setTotalXPForNextLevel(levelInfo.totalForNext);
      
      // Calculate progress percentage
      const totalXPForCurrentLevel = levelInfo.totalForNext - levelInfo.xpForNext;
      const progress = totalXPForCurrentLevel > 0 
        ? Math.round((levelInfo.currentXP / totalXPForCurrentLevel) * 100)
        : 0;
      setLevelProgress(progress);

      // Set recent gains (last 10 entries)
      const sortedGains = [...xpInfo.recentGains]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);
      setRecentGains(sortedGains);

      // Check if near level up (within 200 XP)
      setIsNearLevelUp(levelInfo.xpForNext <= 200);
    },
    [calculateLevelFromXP],
  );

  /**
   * Fetch player XP data
   */
  const fetchPlayerXPData = useCallback(async (uid: string): Promise<XPData> => {
    // Mock implementation - in real app, this would fetch from Firebase
    const mockXPData: XPData = {
      currentXP: 750, // XP within current level
      currentLevel: 5,
      xpForNextLevel: 250,
      totalXPForNextLevel: 6000,
      totalXPEarned: 5750,
      recentGains: [
        {
          gameId: "game_123",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          xpGained: 120,
          source: "battle_royale",
          details: {
            baseXP: 50,
            positionBonus: 50, // 2nd place
            roundsBonus: 20, // 2 rounds won
            totalXP: 120,
          },
        },
        {
          gameId: "game_122",
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          xpGained: 80,
          source: "battle_royale",
          details: {
            baseXP: 50,
            positionBonus: 10, // 4th place
            roundsBonus: 20, // 2 rounds won
            totalXP: 80,
          },
        },
      ],
    };

    return mockXPData;
  }, []);

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
   * Fetch XP data with caching
   */
  const fetchXPData = useCallback(
    async (useCache: boolean = true): Promise<void> => {
      if (!targetPlayerUid) {
        setXpData(null);
        return;
      }

      // Check cache first if requested
      if (useCache && isCacheValid() && cacheRef.current) {
        setXpData(cacheRef.current.data);
        calculateDerivedData(cacheRef.current.data);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const playerXPData = await fetchPlayerXPData(targetPlayerUid);

        // Update cache
        cacheRef.current = {
          data: playerXPData,
          timestamp: Date.now(),
        };

        setXpData(playerXPData);
        calculateDerivedData(playerXPData);

        setIsLoading(false);

        Sentry.addBreadcrumb({
          message: "Successfully fetched XP data",
          data: {
            playerUid: targetPlayerUid,
            totalXP: playerXPData.totalXPEarned,
            currentLevel: playerXPData.currentLevel,
          },
          level: "info",
        });
      } catch (error) {
        handleError(error, "fetch_xp_data");
      }
    },
    [targetPlayerUid, isCacheValid, fetchPlayerXPData, calculateDerivedData, handleError],
  );

  /**
   * Refresh XP data method
   */
  const refreshXPData = useCallback(async (): Promise<void> => {
    await fetchXPData(false);
  }, [fetchXPData]);

  /**
   * Simulate XP gain for testing/preview purposes
   */
  const simulateXPGain = useCallback(async (xpGain: number): Promise<void> => {
    if (!xpData) return;

    try {
      const newTotalXP = xpData.totalXPEarned + xpGain;
      const levelInfo = calculateLevelFromXP(newTotalXP);

      const updatedXPData: XPData = {
        ...xpData,
        totalXPEarned: newTotalXP,
        currentXP: levelInfo.currentXP,
        currentLevel: levelInfo.level,
        xpForNextLevel: levelInfo.xpForNext,
        totalXPForNextLevel: levelInfo.totalForNext,
      };

      setXpData(updatedXPData);
      calculateDerivedData(updatedXPData);

      Sentry.addBreadcrumb({
        message: "Simulated XP gain",
        data: {
          playerUid: targetPlayerUid,
          xpGain,
          newTotalXP,
          newLevel: levelInfo.level,
        },
        level: "info",
      });
    } catch (error) {
      handleError(error, "simulate_xp_gain");
    }
  }, [xpData, calculateLevelFromXP, calculateDerivedData, targetPlayerUid, handleError]);

  // Initial fetch when playerUid changes
  useEffect(() => {
    if (targetPlayerUid) {
      fetchXPData(true);
    } else {
      // Reset state for no user
      setXpData(null);
      setCurrentLevel(1);
      setCurrentXP(0);
      setXpForNextLevel(1000);
      setTotalXPForNextLevel(1000);
      setLevelProgress(0);
      setRecentGains([]);
      setIsNearLevelUp(false);
    }
  }, [targetPlayerUid, fetchXPData]);

  return {
    xpData,
    isLoading,
    error,

    // Actions
    refreshXPData,
    calculateXPGain,
    simulateXPGain,

    // Derived Data
    currentLevel,
    currentXP,
    xpForNextLevel,
    totalXPForNextLevel,
    levelProgress,
    recentGains,
    isNearLevelUp,
  };
}