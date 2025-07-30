import * as React from "react";
import { getLobbyData, joinLobby } from "@/lib/actions";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

// Import types from global definitions

export function useReconnection({
  lobbyCode,
  maxReconnectAttempts = 5,
  reconnectInterval = 3000,
  onReconnectSuccess,
  onReconnectFailure,
}: UseReconnectionOptions) {
  const [state, setState] = React.useState<ReconnectionState>({
    isConnected: true,
    isReconnecting: false,
    reconnectAttempts: 0,
    lastConnectionTime: new Date(),
    connectionError: null,
  });

  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = React.useRef(true);

  // Check if user is still in the lobby using server action
  const checkLobbyMembership = React.useCallback(async () => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Check Lobby Membership",
      },
      async () => {
        try {
          const response = await getLobbyData(lobbyCode);

          if (response.success && response.lobby) {
            return response.lobby;
          } else {
            throw new Error("Failed to check lobby membership");
          }
        } catch (error) {
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  }, [lobbyCode]);

  // Attempt to rejoin the lobby using server action
  const attemptRejoin = React.useCallback(async () => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Attempt Rejoin Lobby",
      },
      async () => {
        try {
          const response = await joinLobby(lobbyCode);

          if (response.success && response.lobby) {
            return response;
          } else {
            throw new Error("Failed to rejoin lobby");
          }
        } catch (error) {
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  }, [lobbyCode]);

  // Handle connection loss
  const handleConnectionLoss = React.useCallback(() => {
    if (!isMountedRef.current) return;

    setState((prev) => ({
      ...prev,
      isConnected: false,
      connectionError: "Connection lost. Attempting to reconnect...",
    }));

    toast.error("Connection lost. Attempting to reconnect...");
  }, []);

  // Start reconnection process
  const startReconnection = React.useCallback(async () => {
    if (!isMountedRef.current) return;

    setState((prev) => ({
      ...prev,
      isReconnecting: true,
      reconnectAttempts: prev.reconnectAttempts + 1,
    }));

    try {
      // First, check if we're still in the lobby
      await checkLobbyMembership();

      // If we're still in the lobby, we're good
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isReconnecting: false,
        connectionError: null,
        lastConnectionTime: new Date(),
      }));

      toast.success("Reconnected successfully!");
      onReconnectSuccess?.();
      return true;
    } catch {
      // If we're not in the lobby, try to rejoin
      try {
        await attemptRejoin();

        setState((prev) => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          connectionError: null,
          lastConnectionTime: new Date(),
        }));

        toast.success("Rejoined lobby successfully!");
        onReconnectSuccess?.();
        return true;
      } catch (rejoinError) {
        const errorMessage =
          rejoinError instanceof Error
            ? rejoinError.message
            : "Failed to rejoin";

        setState((prev) => ({
          ...prev,
          isReconnecting: false,
          connectionError: errorMessage,
        }));

        // If we've exceeded max attempts, give up
        if (state.reconnectAttempts >= maxReconnectAttempts) {
          toast.error(
            `Failed to reconnect after ${maxReconnectAttempts} attempts`
          );
          onReconnectFailure?.();
          return false;
        }

        // Schedule next reconnection attempt
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            startReconnection();
          }
        }, reconnectInterval);

        return false;
      }
    }
  }, [
    checkLobbyMembership,
    attemptRejoin,
    state.reconnectAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    onReconnectSuccess,
    onReconnectFailure,
  ]);

  // Manual reconnection trigger
  const triggerReconnection = React.useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setState((prev) => ({
      ...prev,
      reconnectAttempts: 0,
    }));

    startReconnection();
  }, [startReconnection]);

  // Reset connection state
  const resetConnectionState = React.useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setState({
      isConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastConnectionTime: new Date(),
      connectionError: null,
    });
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Auto-reconnect on connection loss
  React.useEffect(() => {
    if (
      !state.isConnected &&
      !state.isReconnecting &&
      state.reconnectAttempts < maxReconnectAttempts
    ) {
      startReconnection();
    }
  }, [
    state.isConnected,
    state.isReconnecting,
    state.reconnectAttempts,
    maxReconnectAttempts,
    startReconnection,
  ]);

  return {
    // State
    isConnected: state.isConnected,
    isReconnecting: state.isReconnecting,
    reconnectAttempts: state.reconnectAttempts,
    lastConnectionTime: state.lastConnectionTime,
    connectionError: state.connectionError,

    // Actions
    handleConnectionLoss,
    triggerReconnection,
    resetConnectionState,

    // Computed
    canReconnect: state.reconnectAttempts < maxReconnectAttempts,
    reconnectProgress: (state.reconnectAttempts / maxReconnectAttempts) * 100,
  };
}
