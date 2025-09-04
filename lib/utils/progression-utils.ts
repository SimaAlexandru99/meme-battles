import type { 
  Achievement, 
  AchievementCategory, 
  AchievementRarity, 
  AchievementProgress,
  XPCalculation,
  XPBreakdown,
  LevelDefinition,
  NotificationQueueItem,
  GameResult,
} from "@/types";

/**
 * Achievement filtering and sorting utilities
 */
export class AchievementUtils {
  /**
   * Filter achievements by category
   */
  static filterByCategory(achievements: Achievement[], category: AchievementCategory): Achievement[] {
    return achievements.filter(achievement => achievement.category === category);
  }

  /**
   * Filter achievements by rarity
   */
  static filterByRarity(achievements: Achievement[], rarity: AchievementRarity): Achievement[] {
    return achievements.filter(achievement => achievement.rarity === rarity);
  }

  /**
   * Filter achievements by unlock status
   */
  static filterByUnlockStatus(
    achievements: Achievement[], 
    unlockedIds: string[], 
    showUnlocked: boolean = true
  ): Achievement[] {
    return achievements.filter(achievement => 
      showUnlocked ? unlockedIds.includes(achievement.id) : !unlockedIds.includes(achievement.id)
    );
  }

  /**
   * Search achievements by name or description
   */
  static searchAchievements(achievements: Achievement[], query: string): Achievement[] {
    if (!query.trim()) return achievements;
    
    const lowercaseQuery = query.toLowerCase();
    return achievements.filter(achievement => 
      achievement.name.toLowerCase().includes(lowercaseQuery) ||
      achievement.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Sort achievements by rarity (epic > rare > common)
   */
  static sortByRarity(achievements: Achievement[]): Achievement[] {
    const rarityOrder: Record<AchievementRarity, number> = {
      epic: 3,
      rare: 2,
      common: 1,
    };

    return [...achievements].sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
  }

  /**
   * Sort achievements by unlock date (most recent first)
   */
  static sortByUnlockDate(achievements: Achievement[]): Achievement[] {
    return [...achievements].sort((a, b) => {
      if (!a.unlockedAt && !b.unlockedAt) return 0;
      if (!a.unlockedAt) return 1;
      if (!b.unlockedAt) return -1;
      return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
    });
  }

  /**
   * Sort achievements by progress (closest to completion first)
   */
  static sortByProgress(achievements: Achievement[], progressData: Record<string, AchievementProgress>): Achievement[] {
    return [...achievements].sort((a, b) => {
      const progressA = progressData[a.id]?.percentage || 0;
      const progressB = progressData[b.id]?.percentage || 0;
      return progressB - progressA;
    });
  }

  /**
   * Group achievements by category
   */
  static groupByCategory(achievements: Achievement[]): Record<AchievementCategory, Achievement[]> {
    const grouped: Record<AchievementCategory, Achievement[]> = {
      win_streaks: [],
      skill_milestones: [],
      games_played: [],
    };

    achievements.forEach(achievement => {
      grouped[achievement.category].push(achievement);
    });

    return grouped;
  }

  /**
   * Group achievements by rarity
   */
  static groupByRarity(achievements: Achievement[]): Record<AchievementRarity, Achievement[]> {
    const grouped: Record<AchievementRarity, Achievement[]> = {
      common: [],
      rare: [],
      epic: [],
    };

    achievements.forEach(achievement => {
      grouped[achievement.rarity].push(achievement);
    });

    return grouped;
  }

  /**
   * Calculate achievement completion statistics
   */
  static calculateCompletionStats(achievements: Achievement[], unlockedIds: string[]): {
    totalAchievements: number;
    unlockedCount: number;
    completionPercentage: number;
    byCategory: Record<AchievementCategory, { total: number; unlocked: number; percentage: number }>;
    byRarity: Record<AchievementRarity, { total: number; unlocked: number; percentage: number }>;
  } {
    const totalAchievements = achievements.length;
    const unlockedCount = unlockedIds.length;
    const completionPercentage = totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0;

    // Calculate by category
    const byCategory: Record<AchievementCategory, { total: number; unlocked: number; percentage: number }> = {
      win_streaks: { total: 0, unlocked: 0, percentage: 0 },
      skill_milestones: { total: 0, unlocked: 0, percentage: 0 },
      games_played: { total: 0, unlocked: 0, percentage: 0 },
    };

    // Calculate by rarity
    const byRarity: Record<AchievementRarity, { total: number; unlocked: number; percentage: number }> = {
      common: { total: 0, unlocked: 0, percentage: 0 },
      rare: { total: 0, unlocked: 0, percentage: 0 },
      epic: { total: 0, unlocked: 0, percentage: 0 },
    };

    achievements.forEach(achievement => {
      const isUnlocked = unlockedIds.includes(achievement.id);
      
      // Count by category
      byCategory[achievement.category].total++;
      if (isUnlocked) byCategory[achievement.category].unlocked++;
      
      // Count by rarity
      byRarity[achievement.rarity].total++;
      if (isUnlocked) byRarity[achievement.rarity].unlocked++;
    });

    // Calculate percentages
    Object.keys(byCategory).forEach(category => {
      const cat = category as AchievementCategory;
      const stats = byCategory[cat];
      stats.percentage = stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;
    });

    Object.keys(byRarity).forEach(rarity => {
      const rar = rarity as AchievementRarity;
      const stats = byRarity[rar];
      stats.percentage = stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;
    });

    return {
      totalAchievements,
      unlockedCount,
      completionPercentage,
      byCategory,
      byRarity,
    };
  }
}

/**
 * XP calculation and level progression utilities
 */
export class XPUtils {
  /**
   * Calculate XP breakdown for a game result
   */
  static calculateXPGain(gameResult: GameResult): XPCalculation {
    const baseXP = 50; // Base XP per game
    
    // Position multipliers based on placement
    const positionMultipliers: Record<number, number> = {
      1: 2.0,  // 1st place: 100% bonus
      2: 1.5,  // 2nd place: 50% bonus
      3: 1.2,  // 3rd place: 20% bonus
      4: 1.0,  // 4th place: no bonus
      5: 0.8,  // 5th place: -20%
      6: 0.6,  // 6th place: -40%
      7: 0.4,  // 7th place: -60%
      8: 0.2,  // 8th place: -80%
    };
    
    const positionMultiplier = positionMultipliers[gameResult.position] || 0.2;
    const positionBonus = Math.floor(baseXP * (positionMultiplier - 1));
    
    // Rounds bonus for rounds won
    const roundsBonus = gameResult.roundsWon * 10; // 10 XP per round won
    
    const totalXP = baseXP + positionBonus + roundsBonus;

    return {
      baseXP,
      positionBonus,
      roundsBonus,
      totalXP,
      levelBefore: 0, // Will be calculated by the hook
      levelAfter: 0,  // Will be calculated by the hook
      leveledUp: false, // Will be calculated by the hook
    };
  }

  /**
   * Calculate level from total XP using progressive system
   */
  static calculateLevelFromXP(totalXP: number): {
    level: number;
    currentXP: number;
    xpForNext: number;
    totalForNext: number;
    xpForCurrentLevel: number;
  } {
    if (totalXP <= 0) {
      return {
        level: 1,
        currentXP: 0,
        xpForNext: 1000,
        totalForNext: 1000,
        xpForCurrentLevel: 1000,
      };
    }

    let level = 1;
    let totalXPRequired = 0;
    let xpForCurrentLevel = 1000; // Base XP for level 1

    // Calculate level using progressive XP requirements (10% increase per level)
    while (totalXPRequired + xpForCurrentLevel <= totalXP) {
      totalXPRequired += xpForCurrentLevel;
      level++;
      xpForCurrentLevel = Math.floor(1000 * Math.pow(1.1, level - 1));
    }

    const currentXPInLevel = totalXP - totalXPRequired;
    const xpNeededForNext = xpForCurrentLevel - currentXPInLevel;
    const totalXPForNextLevel = totalXPRequired + xpForCurrentLevel;

    return {
      level,
      currentXP: currentXPInLevel,
      xpForNext: xpNeededForNext,
      totalForNext: totalXPForNextLevel,
      xpForCurrentLevel,
    };
  }

  /**
   * Generate level definitions for a range of levels
   */
  static generateLevelDefinitions(maxLevel: number = 100): LevelDefinition[] {
    const levels: LevelDefinition[] = [];
    let totalXPRequired = 0;

    for (let level = 1; level <= maxLevel; level++) {
      const xpForLevel = Math.floor(1000 * Math.pow(1.1, level - 1));
      totalXPRequired += xpForLevel;

      levels.push({
        level,
        xpRequired: xpForLevel,
        totalXPRequired,
        rewards: XPUtils.getLevelRewards(level),
      });
    }

    return levels;
  }

  /**
   * Get rewards for a specific level
   */
  static getLevelRewards(level: number): LevelReward[] {
    const rewards: LevelReward[] = [];

    // Every 5 levels gets a cosmetic reward
    if (level % 5 === 0) {
      rewards.push({
        type: "cosmetic",
        id: `avatar_${level}`,
        name: `Level ${level} Avatar`,
        description: `Exclusive avatar unlocked at level ${level}`,
      });
    }

    // Every 10 levels gets a title
    if (level % 10 === 0) {
      rewards.push({
        type: "title",
        id: `title_${level}`,
        name: `Level ${level} Master`,
        description: `Special title for reaching level ${level}`,
      });
    }

    // Milestone achievements at certain levels
    if ([25, 50, 75, 100].includes(level)) {
      rewards.push({
        type: "achievement",
        id: `milestone_${level}`,
        name: `Level ${level} Milestone`,
        description: `Achievement for reaching level ${level}`,
      });
    }

    return rewards;
  }

  /**
   * Format XP numbers for display
   */
  static formatXP(xp: number): string {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M`;
    }
    if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K`;
    }
    return xp.toString();
  }

  /**
   * Calculate XP progress percentage within current level
   */
  static calculateLevelProgress(currentXP: number, totalXPForLevel: number): number {
    if (totalXPForLevel <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((currentXP / totalXPForLevel) * 100)));
  }

  /**
   * Estimate time to next level based on recent XP gains
   */
  static estimateTimeToNextLevel(
    xpNeeded: number, 
    recentGains: { xpGained: number; timestamp: string }[]
  ): string {
    if (recentGains.length === 0) return "Unknown";

    // Calculate average XP per day from recent gains
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const recentDailyGains = recentGains.filter(gain => 
      new Date(gain.timestamp).getTime() > oneDayAgo
    );

    if (recentDailyGains.length === 0) return "Unknown";

    const totalRecentXP = recentDailyGains.reduce((sum, gain) => sum + gain.xpGained, 0);
    const averageXPPerDay = totalRecentXP; // Already filtered to last 24 hours

    if (averageXPPerDay <= 0) return "Unknown";

    const daysNeeded = Math.ceil(xpNeeded / averageXPPerDay);
    
    if (daysNeeded === 1) return "1 day";
    if (daysNeeded < 7) return `${daysNeeded} days`;
    if (daysNeeded < 30) return `${Math.ceil(daysNeeded / 7)} weeks`;
    return `${Math.ceil(daysNeeded / 30)} months`;
  }
}

/**
 * Notification queue management utilities
 */
export class NotificationUtils {
  /**
   * Sort notifications by priority and timestamp
   */
  static sortNotificationQueue(notifications: NotificationQueueItem[]): NotificationQueueItem[] {
    return [...notifications].sort((a, b) => {
      // First sort by priority (higher first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Then by timestamp (older first for same priority)
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  /**
   * Filter notifications by type
   */
  static filterNotificationsByType(
    notifications: NotificationQueueItem[], 
    type: NotificationQueueItem["type"]
  ): NotificationQueueItem[] {
    return notifications.filter(notification => notification.type === type);
  }

  /**
   * Get notification display duration based on type and data
   */
  static getNotificationDuration(notification: NotificationQueueItem): number {
    switch (notification.type) {
      case "achievement":
        const achievement = notification.data as Achievement;
        // Epic achievements get longer display time
        return achievement.rarity === "epic" ? 7000 : achievement.rarity === "rare" ? 6000 : 5000;
      
      case "level_up":
        return 7000; // Level ups get celebration time
      
      case "skill_rating":
        const skillData = notification.data as any;
        // Tier changes get longer display time
        return skillData.tierChange ? 6000 : 4000;
      
      default:
        return 5000;
    }
  }

  /**
   * Create notification priority based on type and data
   */
  static calculateNotificationPriority(
    type: NotificationQueueItem["type"], 
    data: any
  ): number {
    switch (type) {
      case "achievement":
        const achievement = data as Achievement;
        return achievement.rarity === "epic" ? 5 : achievement.rarity === "rare" ? 4 : 3;
      
      case "level_up":
        return 4; // High priority for level ups
      
      case "skill_rating":
        const skillData = data as any;
        return skillData.tierChange ? 5 : 2; // Tier changes are highest priority
      
      default:
        return 1;
    }
  }

  /**
   * Deduplicate notifications (remove duplicates of same type/data)
   */
  static deduplicateNotifications(notifications: NotificationQueueItem[]): NotificationQueueItem[] {
    const seen = new Set<string>();
    return notifications.filter(notification => {
      const key = `${notification.type}_${JSON.stringify(notification.data)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Limit queue size to prevent memory issues
   */
  static limitQueueSize(notifications: NotificationQueueItem[], maxSize: number = 50): NotificationQueueItem[] {
    if (notifications.length <= maxSize) return notifications;
    
    // Keep highest priority notifications
    const sorted = NotificationUtils.sortNotificationQueue(notifications);
    return sorted.slice(0, maxSize);
  }
}

/**
 * General progression formatting utilities
 */
export class ProgressionFormatUtils {
  /**
   * Format skill rating with appropriate precision
   */
  static formatSkillRating(rating: number): string {
    return Math.round(rating).toString();
  }

  /**
   * Format skill rating change with sign and color indication
   */
  static formatSkillRatingChange(change: number): { text: string; isPositive: boolean; isNeutral: boolean } {
    const isPositive = change > 0;
    const isNeutral = change === 0;
    const sign = isPositive ? "+" : "";
    
    return {
      text: `${sign}${Math.round(change)}`,
      isPositive,
      isNeutral,
    };
  }

  /**
   * Format percentage with appropriate precision
   */
  static formatPercentage(percentage: number): string {
    return `${Math.round(percentage)}%`;
  }

  /**
   * Format time duration in human-readable format
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  }

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  static formatRelativeTime(timestamp: string): string {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  }

  /**
   * Get rarity color class for styling
   */
  static getRarityColorClass(rarity: AchievementRarity): string {
    switch (rarity) {
      case "common":
        return "text-gray-500";
      case "rare":
        return "text-blue-500";
      case "epic":
        return "text-purple-500";
      default:
        return "text-gray-500";
    }
  }

  /**
   * Get rarity background color class for styling
   */
  static getRarityBgColorClass(rarity: AchievementRarity): string {
    switch (rarity) {
      case "common":
        return "bg-gray-100 dark:bg-gray-800";
      case "rare":
        return "bg-blue-100 dark:bg-blue-900";
      case "epic":
        return "bg-purple-100 dark:bg-purple-900";
      default:
        return "bg-gray-100 dark:bg-gray-800";
    }
  }
}