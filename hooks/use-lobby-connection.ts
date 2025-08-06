import { useState, useEffect, useCallback, useRef } from "react";
import { ref, onValue, off } from "firebase/database";
import { rtdb } from "@/firebase/client";
import * as Sentry from "@sentry/nextjs";

// Hook return interface
interface UseLobbyConnectionReturn {
  connectionStatus:
    | "connected"
    | "connecting"
    | "disconnected"
    | "reconnecting";
  lastSeen: Date | null;
  reconnect: () => void;
  disconnect: () => void;
  isOnline: boolean;
  retryCount: number;
}

/**
 * Custom hook for managing lobby connection status and network resilience
 * Handles connection tracking, automatic reconnection, and offline/online state transitions
 */
export function useLobbyConnection(
  lobbyCode: string,
): UseLobbyConnectionReturn {
  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected" | "reconnecting"
  >(navigator.onLine ? "connecting" : "disconnected");
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);

  // Refs for cleanup and retry logic
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
      BASE_RETRY_DELAY * Math.pow(2, attempt),
      MAX_RETRY_DELAY,
    );
    // Add jitter (±25% of the delay)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.max(exponentialDelay + jitter, BASE_RETRY_DELAY);
  }, []);

  /**
   * Clean up all timers and subscriptions
   */
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Start heartbeat mechanism to detect connection issues
   */
  const startHeartbeat = useCallback(() => {
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
            message: "Connection lost - heartbeat timeout",
            data: {
              lobbyCode,
              timeSinceLastHeartbeat,
              timeout: CONNECTION_TIMEOUT,
            },
            level: "warning",
          });
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, [connectionStatus, lobbyCode]);

  /**
   * Establish connection to lobby
   */
  const connect = useCallback(() => {
    if (!lobbyCode || !isOnline) {
      return;
    }

    cleanup();
    setConnectionStatus("connecting");

    try {
      const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);

      unsubscribeRef.current = onValue(
        lobbyRef,
        (snapshot) => {
          const now = new Date();
          lastHeartbeatRef.current = now;
          setLastSeen(now);

          if (snapshot.exists()) {
            if (connectionStatus !== "connected") {
              setConnectionStatus("connected");
              setRetryCount(0);

              Sentry.addBreadcrumb({
                message: "Lobby connection established",
                data: { lobbyCode, retryCount },
                level: "info",
              });
            }
          } else {
            // Lobby doesn't exist
            setConnectionStatus("disconnected");
            Sentry.addBreadcrumb({
              message: "Lobby not found during connection",
              data: { lobbyCode },
              level: "warning",
            });
          }
        },
        (error) => {
          setConnectionStatus("disconnected");
          Sentry.captureException(error, {
            tags: {
              operation: "lobby_connection",
              lobbyCode,
            },
          });

          // Trigger automatic reconnection for network errors
          if (retryCount < MAX_RETRY_ATTEMPTS && isOnline) {
            const delay = calculateRetryDelay(retryCount);
            setRetryCount((prev) => prev + 1);
            setConnectionStatus("reconnecting");

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          }
        },
      );

      // Start heartbeat monitoring
      startHeartbeat();
    } catch (error) {
      setConnectionStatus("disconnected");
      Sentry.captureException(error, {
        tags: {
          operation: "lobby_connection_setup",
          lobbyCode,
        },
      });
    }
  }, [
    lobbyCode,
    isOnline,
    connectionStatus,
    retryCount,
    cleanup,
    calculateRetryDelay,
    startHeartbeat,
  ]);

  /**
   * Manual reconnect function for user-initiated recovery
   */
  const reconnect = useCallback(() => {
    setRetryCount(0);
    setConnectionStatus("connecting");

    Sentry.addBreadcrumb({
      message: "Manual reconnection initiated",
      data: { lobbyCode },
      level: "info",
    });

    connect();
  }, [connect, lobbyCode]);

  /**
   * Disconnect from lobby
   */
  const disconnect = useCallback(() => {
    cleanup();
    setConnectionStatus("disconnected");
    setLastSeen(null);
    setRetryCount(0);
    lastHeartbeatRef.current = null;

    Sentry.addBreadcrumb({
      message: "Manual disconnection",
      data: { lobbyCode },
      level: "info",
    });
  }, [cleanup, lobbyCode]);

  /**
   * Handle online/offline state transitions
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);

      Sentry.addBreadcrumb({
        message: "Network came online",
        data: { lobbyCode },
        level: "info",
      });

      // Automatically reconnect when coming back online
      if (connectionStatus === "disconnected" && lobbyCode) {
        setRetryCount(0);
        connect();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus("disconnected");
      cleanup();

      Sentry.addBreadcrumb({
        message: "Network went offline",
        data: { lobbyCode },
        level: "warning",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [connectionStatus, lobbyCode]);

  /**
   * Initial connection setup
   */
  useEffect(() => {
    if (lobbyCode && isOnline) {
      setConnectionStatus("connecting");
      connect();
    } else {
      setConnectionStatus("disconnected");
    }

    return cleanup;
  }, [lobbyCode, isOnline]);

  /**
   * Automatic reconnection for connection drops
   */
  useEffect(() => {
    if (
      connectionStatus === "disconnected" &&
      isOnline &&
      retryCount < MAX_RETRY_ATTEMPTS &&
      lobbyCode
    ) {
      const delay = calculateRetryDelay(retryCount);
      setConnectionStatus("reconnecting");

      reconnectTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        connect();
      }, delay);
    }
  }, [connectionStatus, isOnline, retryCount, lobbyCode, calculateRetryDelay]);

  return {
    connectionStatus,
    lastSeen,
    reconnect,
    disconnect,
    isOnline,
    retryCount,
  };
}
