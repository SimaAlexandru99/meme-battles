import { useState, useEffect, useCallback, useRef } from 'react';
import { MatchmakingService } from '@/lib/services/matchmaking.service';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import * as Sentry from '@sentry/nextjs';

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

  // Actions
  joinQueue: (preferences?: Partial<QueuePreferences>) => Promise<void>;
  leaveQueue: () => Promise<void>;
  updatePreferences: (preferences: Partial<QueuePreferences>) => Promise<void>;

  // Utilities
  canJoinQueue: boolean;
  timeInQueue: number;
  clearError: () => void;
  retry: () => Promise<void>;
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
    useState<ConnectionStatus>('disconnected');

  // Match state
  const [matchFound, setMatchFound] = useState(false);
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);

  // Queue timing
  const [queueStartTime, setQueueStartTime] = useState<Date | null>(null);
  const [timeInQueue, setTimeInQueue] = useState(0);

  // Service and user references - reusing existing patterns
  const matchmakingService = useRef(MatchmakingService.getInstance());
  const { user } = useCurrentUser();

  // Subscription references for cleanup
  const queueSubscriptionRef = useRef<UnsubscribeFunction | null>(null);
  const positionSubscriptionRef = useRef<UnsubscribeFunction | null>(null);
  const matchFoundSubscriptionRef = useRef<UnsubscribeFunction | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const canJoinQueue = !!(user && !isInQueue && !isLoading && !matchFound);

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
      let errorMessage = 'An unexpected error occurred. Please try again.';
      let shouldRetry = false;

      if (error instanceof Error && 'type' in error) {
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
          userId: user?.id || 'anonymous',
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
    [user?.id, isInQueue]
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
    setConnectionStatus('disconnected');
  }, []);

  /**
   * Set up real-time subscriptions for queue updates
   * Leverages existing real-time subscription patterns from useLobbyManagement
   */
  const setupSubscriptions = useCallback(
    (playerUid: string) => {
      if (!playerUid) return;

      cleanup(); // Clean up existing subscriptions
      setConnectionStatus('connecting');

      try {
        // Subscribe to overall queue updates for queue size
        queueSubscriptionRef.current =
          matchmakingService.current.subscribeToQueue((queueData) => {
            setQueueSize(queueData.length);
            setConnectionStatus('connected');
            setError(null);
          });

        // Subscribe to individual queue position updates
        positionSubscriptionRef.current =
          matchmakingService.current.subscribeToQueuePosition(
            playerUid,
            (position) => {
              setQueuePosition(position);
              setIsInQueue(position > 0);

              if (position === -1) {
                // Player no longer in queue
                setIsInQueue(false);
                setQueueStartTime(null);
              }
            }
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

              Sentry.addBreadcrumb({
                message: 'Match found',
                data: {
                  playerUid,
                  lobbyCode: foundLobbyCode,
                  timeInQueue: queueStartTime
                    ? Date.now() - queueStartTime.getTime()
                    : 0,
                },
                level: 'info',
              });
            }
          );
      } catch (error) {
        setConnectionStatus('disconnected');
        handleError(error, 'setup_queue_subscriptions');
      }
    },
    [cleanup, handleError, queueStartTime]
  );

  /**
   * Join the matchmaking queue
   * Reuses existing error handling patterns
   */
  const joinQueue = useCallback(
    async (preferences?: Partial<QueuePreferences>): Promise<void> => {
      if (!user) {
        throw new Error('User must be authenticated to join the queue');
      }

      if (isInQueue) {
        throw new Error('Already in queue');
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
          avatarId: user.avatarId || 'default',
          profileURL: user.profileURL,
          skillRating: 1200, // Default rating, will be fetched from stats
          xpLevel: user.xp || 0,
          queuedAt: new Date().toISOString(),
          estimatedWaitTime: 60, // Will be calculated by service
          preferences: {
            maxWaitTime: 120,
            skillRangeFlexibility: 'medium',
            ...preferences,
          },
          connectionInfo: {
            region: 'us-east', // Default region
            latency: 25,
            connectionQuality: 'good',
          },
        };

        const result =
          await matchmakingService.current.addPlayerToQueue(queueEntry);

        if (!result.success) {
          throw new Error(result.error || 'Failed to join queue');
        }

        // Set up real-time subscriptions
        setupSubscriptions(user.id);

        setIsInQueue(true);
        setQueueStartTime(new Date());
        setIsLoading(false);

        // Start time tracking
        timeUpdateIntervalRef.current = setInterval(() => {
          if (queueStartTime) {
            setTimeInQueue(Date.now() - queueStartTime.getTime());
          }
        }, 1000);

        Sentry.addBreadcrumb({
          message: 'Successfully joined matchmaking queue',
          data: {
            playerUid: user.id,
            preferences,
          },
          level: 'info',
        });
      } catch (error) {
        handleError(error, 'join_queue');
        throw error;
      }
    },
    [user, isInQueue, setupSubscriptions, handleError, queueStartTime]
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
        user.id
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to leave queue');
      }

      // Clean up subscriptions and state
      cleanup();
      setIsInQueue(false);
      setQueuePosition(-1);
      setQueueStartTime(null);
      setTimeInQueue(0);
      setMatchFound(false);
      setLobbyCode(null);
      setIsLoading(false);

      Sentry.addBreadcrumb({
        message: 'Successfully left matchmaking queue',
        data: {
          playerUid: user.id,
          timeInQueue,
        },
        level: 'info',
      });
    } catch (error) {
      handleError(error, 'leave_queue');
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
        throw new Error('Must be in queue to update preferences');
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await matchmakingService.current.updateQueuePreferences(
          user.id,
          preferences
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to update preferences');
        }

        // Update estimated wait time
        const newWaitTime =
          await matchmakingService.current.getEstimatedWaitTime(user.id);
        setEstimatedWaitTime(newWaitTime);

        setIsLoading(false);

        Sentry.addBreadcrumb({
          message: 'Updated queue preferences',
          data: {
            playerUid: user.id,
            preferences,
          },
          level: 'info',
        });
      } catch (error) {
        handleError(error, 'update_preferences');
        throw error;
      }
    },
    [user, isInQueue, handleError]
  );

  /**
   * Retry the last failed operation
   * Reuses existing retry mechanisms
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!user) {
      return;
    }

    if (isInQueue) {
      // Reestablish subscriptions
      setupSubscriptions(user.id);
    } else {
      // Try to rejoin queue if we were in queue before
      if (queueStartTime) {
        await joinQueue();
      }
    }
  }, [user, isInQueue, setupSubscriptions, joinQueue, queueStartTime]);

  // Update estimated wait time periodically
  useEffect(() => {
    if (!user || !isInQueue) {
      return;
    }

    const updateWaitTime = async () => {
      try {
        const waitTime = await matchmakingService.current.getEstimatedWaitTime(
          user.id
        );
        setEstimatedWaitTime(waitTime);
      } catch (error) {
        // Silently handle wait time update errors
        console.warn('Failed to update estimated wait time:', error);
      }
    };

    // Update wait time every 30 seconds
    const interval = setInterval(updateWaitTime, 30000);

    // Initial update
    updateWaitTime();

    return () => clearInterval(interval);
  }, [user, isInQueue]);

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

    // Actions
    joinQueue,
    leaveQueue,
    updatePreferences,

    // Utilities
    canJoinQueue,
    timeInQueue,
    clearError,
    retry,
  };
}
