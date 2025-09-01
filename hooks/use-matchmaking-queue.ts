import * as Sentry from "@sentry/nextjs";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MatchmakingService } from "@/lib/services/matchmaking.service";

// Hook return interface
export interface UseMatchmakingQueueReturn {
  // Queue State
  isInQueue: boolean;
  queuePosition: number;
  estimatedWaitTime: number;
  queueSize: number;
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;

  // Match State
  matchFound: boolean;
  lobbyCode: string | null;

  // Retry State
  retryCount: number;
  nextRetryTime: Date | null;
  isRetrying: boolean;

  // Actions
  joinQueue: (preferences?: Partial<QueuePreferences>) => Promise<void>;
  leaveQueue: () => Promise<void>;
  updatePreferences: (preferences: Partial<QueuePreferences>) => Promise<void>;

  // Utilities
  canJoinQueue: boolean;
  timeInQueue: number;
  clearError: () => void;
  retry: () => Promise<void>;
  manualRetry: () => Promise<void>;
}

/**
 * Custom hook for complete matchmaking queue lifecycle management
 * Extends existing useLobbyManagement hook patterns for queue state management
 */
export function useMatchmakingQueue(): UseMatchmakingQueueReturn {
  // Core state - reusing existing state management patterns
  const [isInQueue, setIsInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(-1);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState(0);
  const [queueSize, setQueueSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Match state
  const [matchFound, setMatchFound] = useState(false);
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);

  // Queue timing
  const [queueStartTime, setQueueStartTime] = useState<Date | null>(null);
  const [timeInQueue, setTimeInQueue] = useState(0);
  const queueStartTimeRef = useRef<Date | null>(null);

  // Fallback position tracking
  const [fallbackPosition, setFallbackPosition] = useState<number>(-1);
  const [lastSuccessfulPositionUpdate, setLastSuccessfulPositionUpdate] =
    useState<Date | null>(null);

  // Service and user references - reusing existing patterns
  const matchmakingService = useRef(MatchmakingService.getInstance());
  const { user } = useCurrentUser();

  // Keep ref in sync with state
  React.useEffect(() => {
    queueStartTimeRef.current = queueStartTime;
  }, [queueStartTime]);

  // Subscription references for cleanup
  const queueSubscriptionRef = useRef<UnsubscribeFunction | null>(null);
  const positionSubscriptionRef = useRef<UnsubscribeFunction | null>(null);
  const matchFoundSubscriptionRef = useRef<UnsubscribeFunction | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Retry state management
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryTime, setNextRetryTime] = useState<Date | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Derived state
  const canJoinQueue = !!(user && !isInQueue && !isLoading && !matchFound);

  // Fallback position calculation
  const getFallbackPosition = useCallback(async (): Promise<number> => {
    if (!user || !isInQueue) return -1;

    try {
      // Try to get position directly from service
      const position = await matchmakingService.current.getQueuePosition(
        user.id,
      );
      if (position > 0) {
        setLastSuccessfulPositionUpdate(new Date());
        setFallbackPosition(position);
        return position;
      }
      return fallbackPosition > 0 ? fallbackPosition : 0;
    } catch (error) {
      console.warn("Fallback position calculation failed:", error);
      return fallbackPosition > 0 ? fallbackPosition : 0;
    }
  }, [user, isInQueue, fallbackPosition]);

  // Check if we should use fallback position
  const shouldUseFallbackPosition = useCallback((): boolean => {
    if (!lastSuccessfulPositionUpdate) return false;

    const timeSinceLastUpdate =
      Date.now() - lastSuccessfulPositionUpdate.getTime();
    const fallbackThreshold = 30000; // 30 seconds

    return timeSinceLastUpdate > fallbackThreshold;
  }, [lastSuccessfulPositionUpdate]);

  /**
   * Clear error state - reusing existing error handling patterns
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle errors with proper classification and user messages
   * Extends existing error handling with Battle Royale specific user messages
   */
  const handleError = useCallback(
    (error: unknown, operation: string) => {
      let errorMessage = "An unexpected error occurred. Please try again.";
      let shouldRetry = false;

      if (error instanceof Error && "type" in error) {
        const battleRoyaleError = error as BattleRoyaleError;
        errorMessage =
          battleRoyaleError.userMessage || battleRoyaleError.message;
        shouldRetry = battleRoyaleError.retryable;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setIsLoading(false);

      // Log error for monitoring - reusing existing Sentry patterns
      Sentry.captureException(error, {
        tags: {
          operation,
          userId: user?.id || "anonymous",
          isInQueue: isInQueue.toString(),
        },
      });

      // Auto-retry for retryable errors after delay
      if (shouldRetry && retryTimeoutRef.current === null) {
        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          // Retry will be handled by the retry function
        }, 2000);
      }
    },
    [user?.id, isInQueue],
  );

  /**
   * Clean up all subscriptions and timers
   * Reuses existing cleanup mechanisms
   */
  const cleanup = useCallback(() => {
    if (queueSubscriptionRef.current) {
      queueSubscriptionRef.current();
      queueSubscriptionRef.current = null;
    }
    if (positionSubscriptionRef.current) {
      positionSubscriptionRef.current();
      positionSubscriptionRef.current = null;
    }
    if (matchFoundSubscriptionRef.current) {
      matchFoundSubscriptionRef.current();
      matchFoundSubscriptionRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    setConnectionStatus("disconnected");
  }, []);

  /**
   * Set up real-time subscriptions for queue updates
   * Leverages existing real-time subscription patterns from useLobbyManagement
   */
  const setupSubscriptions = useCallback(
    (playerUid: string) => {
      if (!playerUid) return;

      cleanup(); // Clean up existing subscriptions
      setConnectionStatus("connecting");

      try {
        // Subscribe to overall queue updates for queue size
        queueSubscriptionRef.current =
          matchmakingService.current.subscribeToQueue((queueData) => {
            setQueueSize(queueData.length);
            setConnectionStatus("connected");
            setError(null);
          });

        // Subscribe to individual queue position updates
        positionSubscriptionRef.current =
          matchmakingService.current.subscribeToQueuePosition(
            playerUid,
            async (position) => {
              // Handle different position states:
              // -1: Player not in queue
              // 0: Position unknown (network issues) - try fallback
              // >0: Actual position in queue
              let finalPosition = position;

              if (position === 0 && shouldUseFallbackPosition()) {
                // Try fallback position calculation
                const fallbackPos = await getFallbackPosition();
                if (fallbackPos > 0) {
                  finalPosition = fallbackPos;
                  setError(null); // Clear network error when fallback works
                } else {
                  finalPosition = 0;
                  if (!error || !error.includes("network")) {
                    setError(
                      "Connection issues detected. Using estimated queue position.",
                    );
                  }
                }
              } else if (position > 0) {
                // Valid position - update fallback tracking
                setLastSuccessfulPositionUpdate(new Date());
                setFallbackPosition(position);
                setError(null); // Clear network error when position is available
              }

              setQueuePosition(finalPosition);

              if (finalPosition === -1) {
                // Player no longer in queue
                setIsInQueue(false);
                setQueueStartTime(null);
                queueStartTimeRef.current = null;
                setError(null); // Clear any previous errors
              } else if (finalPosition === 0) {
                // Position still unknown
                setIsInQueue(true); // Assume still in queue
              } else {
                // Valid position
                setIsInQueue(true);
              }
            },
          );

        // Subscribe to match found notifications
        matchFoundSubscriptionRef.current =
          matchmakingService.current.subscribeToMatchFound(
            playerUid,
            (foundLobbyCode) => {
              setMatchFound(true);
              setLobbyCode(foundLobbyCode);
              setIsInQueue(false);
              setQueueStartTime(null);
              queueStartTimeRef.current = null;

              Sentry.addBreadcrumb({
                message: "Match found",
                data: {
                  playerUid,
                  lobbyCode: foundLobbyCode,
                  timeInQueue: queueStartTime
                    ? Date.now() - queueStartTime.getTime()
                    : 0,
                },
                level: "info",
              });
            },
          );
      } catch (error) {
        setConnectionStatus("disconnected");
        handleError(error, "setup_queue_subscriptions");
      }
    },
    [
      cleanup,
      handleError,
      queueStartTime,
      shouldUseFallbackPosition,
      getFallbackPosition,
      error,
    ],
  );

  /**
   * Join the matchmaking queue
   * Reuses existing error handling patterns
   */
  const joinQueue = useCallback(
    async (preferences?: Partial<QueuePreferences>): Promise<void> => {
      if (!user) {
        throw new Error("User must be authenticated to join the queue");
      }

      if (isInQueue) {
        throw new Error("Already in queue");
      }

      setIsLoading(true);
      setError(null);
      setMatchFound(false);
      setLobbyCode(null);

      try {
        // Create queue entry with user data
        const queueEntry: QueueEntry = {
          playerUid: user.id,
          displayName: user.name,
          avatarId: user.avatarId || "default",
          profileURL: user.profileURL,
          skillRating: 1200, // Default rating, will be fetched from stats
          xpLevel: user.xp || 0,
          queuedAt: new Date().toISOString(),
          estimatedWaitTime: 60, // Will be calculated by service
          preferences: {
            maxWaitTime: 120,
            skillRangeFlexibility: "medium",
            ...preferences,
          },
          connectionInfo: {
            region: "us-east", // Default region
            latency: 25,
            connectionQuality: "good",
          },
        };

        const result =
          await matchmakingService.current.addPlayerToQueue(queueEntry);

        if (!result.success) {
          throw new Error(result.error || "Failed to join queue");
        }

        // Set up real-time subscriptions
        setupSubscriptions(user.id);

        setIsInQueue(true);
        const startTime = new Date();
        setQueueStartTime(startTime);
        queueStartTimeRef.current = startTime;
        setIsLoading(false);

        // Start time tracking
        timeUpdateIntervalRef.current = setInterval(() => {
          if (queueStartTimeRef.current) {
            setTimeInQueue(Date.now() - queueStartTimeRef.current.getTime());
          }
        }, 1000);

        Sentry.addBreadcrumb({
          message: "Successfully joined matchmaking queue",
          data: {
            playerUid: user.id,
            preferences,
          },
          level: "info",
        });
      } catch (error) {
        handleError(error, "join_queue");
        throw error;
      }
    },
    [user, isInQueue, setupSubscriptions, handleError],
  );

  /**
   * Leave the matchmaking queue
   * Reuses existing cleanup mechanisms
   */
  const leaveQueue = useCallback(async (): Promise<void> => {
    if (!user || !isInQueue) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await matchmakingService.current.removePlayerFromQueue(
        user.id,
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to leave queue");
      }

      // Clean up subscriptions and state
      cleanup();
      setIsInQueue(false);
      setQueuePosition(-1);
      setQueueStartTime(null);
      queueStartTimeRef.current = null;
      setTimeInQueue(0);
      setMatchFound(false);
      setLobbyCode(null);
      setIsLoading(false);

      Sentry.addBreadcrumb({
        message: "Successfully left matchmaking queue",
        data: {
          playerUid: user.id,
          timeInQueue,
        },
        level: "info",
      });
    } catch (error) {
      handleError(error, "leave_queue");
      throw error;
    }
  }, [user, isInQueue, cleanup, handleError, timeInQueue]);

  /**
   * Update queue preferences
   * Uses existing settings update patterns
   */
  const updatePreferences = useCallback(
    async (preferences: Partial<QueuePreferences>): Promise<void> => {
      if (!user || !isInQueue) {
        throw new Error("Must be in queue to update preferences");
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await matchmakingService.current.updateQueuePreferences(
          user.id,
          preferences,
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to update preferences");
        }

        // Update estimated wait time
        const newWaitTime =
          await matchmakingService.current.getEstimatedWaitTime(user.id);
        setEstimatedWaitTime(newWaitTime);

        setIsLoading(false);

        Sentry.addBreadcrumb({
          message: "Updated queue preferences",
          data: {
            playerUid: user.id,
            preferences,
          },
          level: "info",
        });
      } catch (error) {
        handleError(error, "update_preferences");
        throw error;
      }
    },
    [user, isInQueue, handleError],
  );

  /**
   * Enhanced retry function with exponential backoff and user feedback
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!user || isRetrying) {
      return;
    }

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    try {
      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      setError(null); // Clear current error
      setConnectionStatus("connecting");

      if (isInQueue) {
        // Reestablish subscriptions with enhanced error handling
        await setupSubscriptions(user.id);
        setError("Reconnected to matchmaking service");
      } else if (queueStartTime) {
        // Try to rejoin queue if we were in queue before
        await joinQueue();
        setError("Successfully rejoined the queue");
      }

      // Clear success message after 3 seconds
      const currentError = error;
      setTimeout(() => {
        if (
          currentError?.includes("Reconnected") ||
          currentError?.includes("Successfully")
        ) {
          setError(null);
        }
      }, 3000);

      setRetryCount(0); // Reset retry count on success
      setNextRetryTime(null);
    } catch {
      const retryDelay = Math.min(1000 * 2 ** retryCount, 30000); // Max 30 seconds
      const nextRetry = new Date(Date.now() + retryDelay);

      setNextRetryTime(nextRetry);
      setError(
        `Connection failed. Retrying in ${Math.ceil(retryDelay / 1000)} seconds...`,
      );

      // Schedule automatic retry
      retryTimeoutRef.current = setTimeout(async () => {
        if (retryCount < 5) {
          // Max 5 retries
          await retry();
        } else {
          setError(
            "Connection issues persist. Please check your internet connection and try again.",
          );
          setRetryCount(0);
          setNextRetryTime(null);
        }
      }, retryDelay);
    } finally {
      setIsRetrying(false);
    }
  }, [
    user,
    isRetrying,
    retryCount,
    isInQueue,
    queueStartTime,
    setupSubscriptions,
    joinQueue,
    error,
  ]);

  /**
   * Manual retry function for user-initiated retries
   */
  const manualRetry = useCallback(async (): Promise<void> => {
    setRetryCount(0); // Reset retry count for manual retry
    setNextRetryTime(null);
    await retry();
  }, [retry]);

  // Update estimated wait time and check position fallback periodically
  useEffect(() => {
    if (!user || !isInQueue) {
      return;
    }

    const updateWaitTime = async () => {
      try {
        const waitTime = await matchmakingService.current.getEstimatedWaitTime(
          user.id,
        );
        setEstimatedWaitTime(waitTime);
      } catch (error) {
        // Silently handle wait time update errors
        console.warn("Failed to update estimated wait time:", error);
      }
    };

    const checkPositionFallback = async () => {
      // Only check fallback if we have network issues and it's been a while since last successful update
      if (queuePosition === 0 && shouldUseFallbackPosition()) {
        try {
          const fallbackPos = await getFallbackPosition();
          if (fallbackPos > 0 && fallbackPos !== queuePosition) {
            console.log(`Using fallback position: ${fallbackPos}`);
            setQueuePosition(fallbackPos);
            setError(null); // Clear network error when fallback works
          }
        } catch (error) {
          console.warn("Fallback position check failed:", error);
        }
      }
    };

    // Update wait time every 30 seconds
    const waitTimeInterval = setInterval(updateWaitTime, 30000);

    // Check position fallback every 15 seconds (more frequent than wait time updates)
    const positionCheckInterval = setInterval(checkPositionFallback, 15000);

    // Initial updates
    updateWaitTime();
    checkPositionFallback();

    return () => {
      clearInterval(waitTimeInterval);
      clearInterval(positionCheckInterval);
    };
  }, [
    user,
    isInQueue,
    queuePosition,
    shouldUseFallbackPosition,
    getFallbackPosition,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // Queue State
    isInQueue,
    queuePosition,
    estimatedWaitTime,
    queueSize,
    isLoading,
    error,
    connectionStatus,

    // Match State
    matchFound,
    lobbyCode,

    // Retry State
    retryCount,
    nextRetryTime,
    isRetrying,

    // Actions
    joinQueue,
    leaveQueue,
    updatePreferences,

    // Utilities
    canJoinQueue,
    timeInQueue,
    clearError,
    retry,
    manualRetry,
  };
}
