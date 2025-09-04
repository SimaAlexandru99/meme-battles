import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Hook return interface
export interface UseProgressionNotificationsReturn {
  notificationQueue: NotificationQueueItem[];
  currentNotification: NotificationQueueItem | null;
  isProcessing: boolean;
  queueLength: number;

  // Actions
  addNotification: (notification: Omit<NotificationQueueItem, "id" | "timestamp">) => void;
  dismissCurrentNotification: () => void;
  clearQueue: () => void;
  processNextNotification: () => void;

  // Queue Management
  hasAchievementNotifications: boolean;
  hasLevelUpNotifications: boolean;
  hasSkillRatingNotifications: boolean;
}

/**
 * Custom hook for managing progression notification queue
 * Handles achievement unlocks, level ups, and skill rating changes
 */
export function useProgressionNotifications(): UseProgressionNotificationsReturn {
  // Core state
  const [notificationQueue, setNotificationQueue] = useState<NotificationQueueItem[]>([]);
  const [currentNotification, setCurrentNotification] = useState<NotificationQueueItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Processing references
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queueProcessorRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useCurrentUser();

  // Derived state
  const queueLength = notificationQueue.length;
  const hasAchievementNotifications = notificationQueue.some(n => n.type === "achievement");
  const hasLevelUpNotifications = notificationQueue.some(n => n.type === "level_up");
  const hasSkillRatingNotifications = notificationQueue.some(n => n.type === "skill_rating");

  /**
   * Generate unique notification ID
   */
  const generateNotificationId = useCallback((): string => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Add notification to queue with proper priority sorting
   */
  const addNotification = useCallback((notification: Omit<NotificationQueueItem, "id" | "timestamp">) => {
    const newNotification: NotificationQueueItem = {
      ...notification,
      id: generateNotificationId(),
      timestamp: new Date().toISOString(),
    };

    setNotificationQueue(prev => {
      // Add to queue and sort by priority (higher priority first)
      const updatedQueue = [...prev, newNotification].sort((a, b) => b.priority - a.priority);
      
      Sentry.addBreadcrumb({
        message: "Added notification to queue",
        data: {
          notificationId: newNotification.id,
          type: newNotification.type,
          priority: newNotification.priority,
          queueLength: updatedQueue.length,
          userId: user?.id,
        },
        level: "info",
      });

      return updatedQueue;
    });

    // Start processing if not already processing
    if (!isProcessing && !currentNotification) {
      processNextNotification();
    }
  }, [generateNotificationId, isProcessing, currentNotification, user?.id]);

  /**
   * Process the next notification in the queue
   */
  const processNextNotification = useCallback(() => {
    setNotificationQueue(prev => {
      if (prev.length === 0) {
        setIsProcessing(false);
        return prev;
      }

      // Get the highest priority notification
      const [nextNotification, ...remainingQueue] = prev;
      
      setCurrentNotification(nextNotification);
      setIsProcessing(true);

      Sentry.addBreadcrumb({
        message: "Processing notification",
        data: {
          notificationId: nextNotification.id,
          type: nextNotification.type,
          remainingInQueue: remainingQueue.length,
          userId: user?.id,
        },
        level: "info",
      });

      // Auto-dismiss after duration based on notification type
      const autoDismissDelay = getNotificationDuration(nextNotification.type);
      
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }

      processingTimeoutRef.current = setTimeout(() => {
        dismissCurrentNotification();
      }, autoDismissDelay);

      return remainingQueue;
    });
  }, [user?.id]);

  /**
   * Get notification display duration based on type
   */
  const getNotificationDuration = useCallback((type: NotificationQueueItem["type"]): number => {
    switch (type) {
      case "achievement":
        return 5000; // 5 seconds for achievements
      case "level_up":
        return 7000; // 7 seconds for level ups (more celebration time)
      case "skill_rating":
        return 4000; // 4 seconds for skill rating changes
      default:
        return 5000;
    }
  }, []);

  /**
   * Dismiss current notification and process next
   */
  const dismissCurrentNotification = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    const dismissedNotification = currentNotification;
    setCurrentNotification(null);

    if (dismissedNotification) {
      Sentry.addBreadcrumb({
        message: "Dismissed notification",
        data: {
          notificationId: dismissedNotification.id,
          type: dismissedNotification.type,
          userId: user?.id,
        },
        level: "info",
      });
    }

    // Process next notification after a brief delay to prevent overwhelming
    if (queueProcessorRef.current) {
      clearTimeout(queueProcessorRef.current);
    }

    queueProcessorRef.current = setTimeout(() => {
      processNextNotification();
    }, 500); // 500ms delay between notifications
  }, [currentNotification, processNextNotification, user?.id]);

  /**
   * Clear entire notification queue
   */
  const clearQueue = useCallback(() => {
    setNotificationQueue([]);
    setCurrentNotification(null);
    setIsProcessing(false);

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    if (queueProcessorRef.current) {
      clearTimeout(queueProcessorRef.current);
      queueProcessorRef.current = null;
    }

    Sentry.addBreadcrumb({
      message: "Cleared notification queue",
      data: { userId: user?.id },
      level: "info",
    });
  }, [user?.id]);

  /**
   * Helper function to create achievement notification
   */
  const createAchievementNotification = useCallback((achievement: Achievement): Omit<NotificationQueueItem, "id" | "timestamp"> => {
    const priority = achievement.rarity === "epic" ? 3 : achievement.rarity === "rare" ? 2 : 1;
    
    return {
      type: "achievement",
      data: achievement,
      priority,
    };
  }, []);

  /**
   * Helper function to create level up notification
   */
  const createLevelUpNotification = useCallback((newLevel: number, rewards?: LevelReward[]): Omit<NotificationQueueItem, "id" | "timestamp"> => {
    return {
      type: "level_up",
      data: { level: newLevel, rewards: rewards || [] },
      priority: 2, // High priority for level ups
    };
  }, []);

  /**
   * Helper function to create skill rating notification
   */
  const createSkillRatingNotification = useCallback((skillRatingData: SkillRatingData): Omit<NotificationQueueItem, "id" | "timestamp"> => {
    // Higher priority for tier changes
    const priority = skillRatingData.nextTier ? 3 : 1;
    
    return {
      type: "skill_rating",
      data: skillRatingData,
      priority,
    };
  }, []);

  /**
   * Cleanup timers on unmount
   */
  const cleanup = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    if (queueProcessorRef.current) {
      clearTimeout(queueProcessorRef.current);
      queueProcessorRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Expose helper functions for easy notification creation
  const notificationHelpers = {
    createAchievementNotification,
    createLevelUpNotification,
    createSkillRatingNotification,
  };

  return {
    notificationQueue,
    currentNotification,
    isProcessing,
    queueLength,

    // Actions
    addNotification,
    dismissCurrentNotification,
    clearQueue,
    processNextNotification,

    // Queue Management
    hasAchievementNotifications,
    hasLevelUpNotifications,
    hasSkillRatingNotifications,

    // Helper functions (exposed for convenience)
    ...notificationHelpers,
  };
}