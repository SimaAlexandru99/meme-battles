import * as React from "react";
import { useLobbyData } from "./useLobbyData";

/**
 * Legacy hook that now uses SWR under the hood
 * Maintains backward compatibility while leveraging SWR's optimizations
 *
 * @deprecated Consider using useLobbyData directly for new code
 */
export function useLobbyRefresh({
  lobbyCode,
  enabled = true,
  refreshInterval = 5000, // 5 seconds
  onDataUpdate,
  onError,
}: UseLobbyRefreshOptions) {
  // Use the new SWR-based hook
  const { lobbyData, error, isValidating, refresh } = useLobbyData(lobbyCode, {
    enabled,
    refreshInterval,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Convert dates to strings for backward compatibility if needed
  const processedLobbyData = React.useMemo(() => {
    if (!lobbyData) return null;

    // If dates are already strings, return as-is; otherwise convert to strings
    return {
      ...lobbyData,
      createdAt:
        lobbyData.createdAt instanceof Date
          ? lobbyData.createdAt.toISOString()
          : lobbyData.createdAt,
      updatedAt:
        lobbyData.updatedAt instanceof Date
          ? lobbyData.updatedAt.toISOString()
          : lobbyData.updatedAt,
    } as LobbyData;
  }, [lobbyData]);

  // Handle data updates - call callback when data changes
  React.useEffect(() => {
    if (processedLobbyData && onDataUpdate) {
      onDataUpdate(processedLobbyData);
    }
  }, [processedLobbyData, onDataUpdate]);

  // Handle errors - call callback when error occurs
  React.useEffect(() => {
    if (error && onError) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to refresh lobby";
      onError(errorMessage);
    }
  }, [error, onError]);

  // Legacy interface compatibility
  return {
    isRefreshing: isValidating,
    refreshNow: refresh,
    // These are now no-ops since SWR handles it automatically
    startAutoRefresh: React.useCallback(() => {
      // SWR handles this automatically based on refreshInterval
    }, []),
    stopAutoRefresh: React.useCallback(() => {
      // SWR handles this automatically based on enabled state
    }, []),
  };
}
