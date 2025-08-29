import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MatchmakingService } from "@/lib/services/matchmaking.service";

// Hook return interface
export interface UseMatchmakingSubscriptionsReturn {
  // Connection State
  connectionStatus: ConnectionStatus;
  isOnline: boolean;
  retryCount: number;
  lastSeen: Date | null;

  // Queue Data
  queueData: QueueEntry[];
  queueSize: number;
  playerPosition: number;

  // Match State
  matchFound: boolean;
  matchLobbyCode: string | null;

  // Actions
  subscribeToQueue: () => void;
  subscribeToQueuePosition: (playerUid: string) => void;
  subscribeToMatchFound: (playerUid: string) => void;
  unsubscribeAll: () => void;
  reconnect: () => void;
}

/**
 * Custom hook for managing real-time subscriptions to matchmaking data
 * Implements connection status tracking and automatic reconnection
 */
export function useMatchmakingSubscriptions(): UseMatchmakingSubscriptionsReturn {
  // Connection state
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  // Queue data state
  const [queueData, setQueueData] = useState<QueueEntry[]>([]);
  const [queueSize, setQueueSize] = useState(0);
  const [playerPosition, setPlayerPosition] = useState(-1);

  // Match state
  const [matchFound, setMatchFound] = useState(false);
  const [matchLobbyCode, setMatchLobbyCode] = useState<string | null>(null);

  // Service and user references
  const matchmakingService = useRef(MatchmakingService.getInstance());
  const { user } = useCurrentUser();

  // Subscription references for cleanup
  const queueSubscriptionRef = useRef<UnsubscribeFunction | null>(null);
  const positionSubscriptionRef = useRef<UnsubscribeFunction | null>(null);
  const matchFoundSubscriptionRef = useRef<UnsubscribeFunction | null>(null);

  // Reconnection management
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<Date | null>(null);

  // Constants for retry logic
  const MAX_RETRY_ATTEMPTS = 5;
  const BASE_RETRY_DELAY = 1000; // 1 second
  const MAX_RETRY_DELAY = 30000; // 30 seconds
  const HEARTBEAT_INTERVAL = 10000; // 10 seconds
  const CONNECTION_TIMEOUT = 15000; // 15 seconds

  /**
   * Calculate exponential backoff delay with jitter
   */
  const calculateRetryDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(
      BASE_RETRY_DELAY * 2 ** attempt,
      MAX_RETRY_DELAY,
    );
    // Add jitter (±25% of the delay)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.max(exponentialDelay + jitter, BASE_RETRY_DELAY);
  }, []);

  /**
   * Subscribe to queue updates for all players
   */
  const subscribeToQueue = useCallback(() => {
    if (queueSubscriptionRef.current) {
      queueSubscriptionRef.current();
    }

    setConnectionStatus("connecting");

    try {
      queueSubscriptionRef.current =
        matchmakingService.current.subscribeToQueue((queueEntries) => {
          const now = new Date();
          lastHeartbeatRef.current = now;
          setLastSeen(now);

          setQueueData(queueEntries);
          setQueueSize(queueEntries.length);

          if (connectionStatus !== "connected") {
            setConnectionStatus("connected");
            setRetryCount(0);

            Sentry.addBreadcrumb({
              message: "Queue subscription established",
              data: { queueSize: queueEntries.length },
              level: "info",
            });
          }
        });

      // Start heartbeat monitoring
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(() => {
        const now = new Date();
        const timeSinceLastHeartbeat = lastHeartbeatRef.current
          ? now.getTime() - lastHeartbeatRef.current.getTime()
          : CONNECTION_TIMEOUT + 1;

        // If we haven't received a heartbeat in the timeout period, consider connection lost
        if (timeSinceLastHeartbeat > CONNECTION_TIMEOUT) {
          if (connectionStatus === "connected") {
            setConnectionStatus("disconnected");
            Sentry.addBreadcrumb({
              message: "Matchmaking connection lost - heartbeat timeout",
              data: {
                timeSinceLastHeartbeat,
                timeout: CONNECTION_TIMEOUT,
              },
              level: "warning",
            });
          }
        }
      }, HEARTBEAT_INTERVAL);
    } catch (error) {
      setConnectionStatus("disconnected");

      Sentry.captureException(error, {
        tags: {
          operation: "matchmaking_subscription",
          subscription_type: "queue",
          userId: user?.id || "anonymous",
        },
      });

      // Trigger automatic reconnection for network errors
      if (retryCount < MAX_RETRY_ATTEMPTS && isOnline) {
        const delay = calculateRetryDelay(retryCount);
        setRetryCount((prev) => prev + 1);
        setConnectionStatus("reconnecting");

        reconnectTimeoutRef.current = setTimeout(() => {
          setRetryCount(0);
          setConnectionStatus("connecting");
        }, delay);
      }
    }
  }, [connectionStatus, user?.id, retryCount, isOnline, calculateRetryDelay]);

  /**
   * Subscribe to queue position updates for individual player position tracking
   */
  const subscribeToQueuePosition = useCallback(
    (playerUid: string) => {
      if (!playerUid) return;

      if (positionSubscriptionRef.current) {
        positionSubscriptionRef.current();
      }

      try {
        positionSubscriptionRef.current =
          matchmakingService.current.subscribeToQueuePosition(
            playerUid,
            (position) => {
              const now = new Date();
              lastHeartbeatRef.current = now;
              setLastSeen(now);

              setPlayerPosition(position);

              Sentry.addBreadcrumb({
                message: "Queue position updated",
                data: { playerUid, position },
                level: "debug",
              });
            },
          );
      } catch (error) {
        setConnectionStatus("disconnected");

        Sentry.captureException(error, {
          tags: {
            operation: "matchmaking_subscription",
            subscription_type: "queue_position",
            userId: user?.id || "anonymous",
          },
        });

        // Trigger automatic reconnection for network errors
        if (retryCount < MAX_RETRY_ATTEMPTS && isOnline) {
          const delay = calculateRetryDelay(retryCount);
          setRetryCount((prev) => prev + 1);
          setConnectionStatus("reconnecting");

          reconnectTimeoutRef.current = setTimeout(() => {
            setRetryCount(0);
            setConnectionStatus("connecting");
          }, delay);
        }
      }
    },
    [user?.id, retryCount, isOnline, calculateRetryDelay],
  );

  /**
   * Subscribe to match found notifications for instant match notifications
   */
  const subscribeToMatchFound = useCallback(
    (playerUid: string) => {
      if (!playerUid) return;

      if (matchFoundSubscriptionRef.current) {
        matchFoundSubscriptionRef.current();
      }

      try {
        matchFoundSubscriptionRef.current =
          matchmakingService.current.subscribeToMatchFound(
            playerUid,
            (lobbyCode) => {
              const now = new Date();
              lastHeartbeatRef.current = now;
              setLastSeen(now);

              setMatchFound(true);
              setMatchLobbyCode(lobbyCode);

              Sentry.addBreadcrumb({
                message: "Match found notification received",
                data: { playerUid, lobbyCode },
                level: "info",
              });
            },
          );
      } catch (error) {
        setConnectionStatus("disconnected");

        Sentry.captureException(error, {
          tags: {
            operation: "matchmaking_subscription",
            subscription_type: "match_found",
            userId: user?.id || "anonymous",
          },
        });

        // Trigger automatic reconnection for network errors
        if (retryCount < MAX_RETRY_ATTEMPTS && isOnline) {
          const delay = calculateRetryDelay(retryCount);
          setRetryCount((prev) => prev + 1);
          setConnectionStatus("reconnecting");

          reconnectTimeoutRef.current = setTimeout(() => {
            setRetryCount(0);
            setConnectionStatus("connecting");
          }, delay);
        }
      }
    },
    [user?.id, retryCount, isOnline, calculateRetryDelay],
  );

  /**
   * Clean up all subscriptions and timers
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
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Manual reconnect function for user-initiated recovery
   */
  const reconnect = useCallback(() => {
    setRetryCount(0);
    setConnectionStatus("connecting");

    Sentry.addBreadcrumb({
      message: "Manual matchmaking reconnection initiated",
      level: "info",
    });

    // Reestablish all active subscriptions
    subscribeToQueue();

    if (user?.id) {
      subscribeToQueuePosition(user.id);
      subscribeToMatchFound(user.id);
    }
  }, [
    subscribeToQueue,
    subscribeToQueuePosition,
    subscribeToMatchFound,
    user?.id,
  ]);

  /**
   * Unsubscribe from all subscriptions
   */
  const unsubscribeAll = useCallback(() => {
    cleanup();
    setConnectionStatus("disconnected");
    setLastSeen(null);
    setRetryCount(0);
    lastHeartbeatRef.current = null;

    // Reset state
    setQueueData([]);
    setQueueSize(0);
    setPlayerPosition(-1);
    setMatchFound(false);
    setMatchLobbyCode(null);

    Sentry.addBreadcrumb({
      message: "All matchmaking subscriptions unsubscribed",
      level: "info",
    });
  }, [cleanup]);

  /**
   * Handle online/offline state transitions
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);

      Sentry.addBreadcrumb({
        message: "Network came online",
        level: "info",
      });

      // Automatically reconnect when coming back online
      if (connectionStatus === "disconnected") {
        setRetryCount(0);
        reconnect();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus("disconnected");
      cleanup();

      Sentry.addBreadcrumb({
        message: "Network went offline",
        level: "warning",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [cleanup, reconnect, connectionStatus]);

  /**
   * Automatic reconnection for connection drops
   */
  useEffect(() => {
    if (
      connectionStatus === "disconnected" &&
      isOnline &&
      retryCount < MAX_RETRY_ATTEMPTS
    ) {
      const delay = calculateRetryDelay(retryCount);
      setConnectionStatus("reconnecting");

      reconnectTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        reconnect();
      }, delay);
    }
  }, [connectionStatus, isOnline, retryCount, calculateRetryDelay, reconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // Connection State
    connectionStatus,
    isOnline,
    retryCount,
    lastSeen,

    // Queue Data
    queueData,
    queueSize,
    playerPosition,

    // Match State
    matchFound,
    matchLobbyCode,

    // Actions
    subscribeToQueue,
    subscribeToQueuePosition,
    subscribeToMatchFound,
    unsubscribeAll,
    reconnect,
  };
}
