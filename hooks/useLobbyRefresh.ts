import * as React from "react";
import { getLobbyData } from "@/lib/actions";
import * as Sentry from "@sentry/nextjs";

// Import types from global definitions

export function useLobbyRefresh({
  lobbyCode,
  enabled = true,
  refreshInterval = 5000, // 5 seconds
  onDataUpdate,
  onError,
}: UseLobbyRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = React.useRef(true);

  // Fetch lobby data using server action
  const fetchLobbyData = React.useCallback(async () => {
    if (!isMountedRef.current) return;

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Refresh Lobby Data",
      },
      async () => {
        try {
          setIsRefreshing(true);

          const response = await getLobbyData(lobbyCode);

          if (response.success && response.lobby) {
            onDataUpdate?.(response.lobby as SerializedLobbyData);
          } else {
            throw new Error("Failed to refresh lobby data");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to refresh lobby";
          onError?.(errorMessage);
          Sentry.captureException(error);
        } finally {
          setIsRefreshing(false);
        }
      }
    );
  }, [lobbyCode, onDataUpdate, onError]);

  // Start automatic refresh
  const startAutoRefresh = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (enabled) {
      intervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchLobbyData();
        }
      }, refreshInterval);
    }
  }, [enabled, refreshInterval, fetchLobbyData]);

  // Stop automatic refresh
  const stopAutoRefresh = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Manual refresh
  const refreshNow = React.useCallback(() => {
    fetchLobbyData();
  }, [fetchLobbyData]);

  // Start/stop auto refresh based on enabled state
  React.useEffect(() => {
    if (enabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [enabled, startAutoRefresh, stopAutoRefresh]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopAutoRefresh();
    };
  }, [stopAutoRefresh]);

  return {
    isRefreshing,
    refreshNow,
    startAutoRefresh,
    stopAutoRefresh,
  };
}
