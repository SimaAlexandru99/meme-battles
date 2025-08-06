"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLobbyManagement } from "@/hooks/use-lobby-management";
import { useLobbyConnection } from "@/hooks/use-lobby-connection";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PlayerList } from "./player-list";
import { GameSettings } from "./game-settings";
import { ConnectionStatus } from "./connection-status";
import { LobbyHeader } from "./lobby-header";
import { LobbyActions } from "./lobby-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

interface LobbyInterfaceProps {
  lobbyCode: string;
  className?: string;
}

/**
 * Main lobby interface component that serves as the primary container
 * for all lobby sub-components with responsive layout and accessibility features
 */
export function LobbyInterface({ lobbyCode, className }: LobbyInterfaceProps) {
  const { user } = useCurrentUser();
  const {
    lobby,
    players,
    isLoading,
    error,
    connectionStatus: managementConnectionStatus,
    isHost,
    canStartGame,
    playerCount,
    clearError,
    retry,
    startGame,
    leaveLobby,
  } = useLobbyManagement(lobbyCode);

  const {
    connectionStatus: networkConnectionStatus,
    isOnline,
    reconnect,
  } = useLobbyConnection(lobbyCode);

  // Determine overall connection status
  const connectionStatus = !isOnline
    ? "disconnected"
    : networkConnectionStatus === "connected" &&
        managementConnectionStatus === "connected"
      ? "connected"
      : "connecting";

  // Error boundary state
  const [hasError, setHasError] = React.useState(false);
  const [errorInfo, setErrorInfo] = React.useState<string | null>(null);

  /**
   * Handle keyboard navigation for accessibility
   */
  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    // Handle Escape key to clear focus and close any open dialogs
    if (event.key === "Escape") {
      (document.activeElement as HTMLElement)?.blur();

      // Dispatch custom event for components to handle escape
      const escapeEvent = new CustomEvent("lobby-escape", {
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);
    }

    // Handle Tab navigation enhancement for screen readers
    if (event.key === "Tab") {
      // Announce navigation context for screen readers
      const activeElement = document.activeElement;
      if (activeElement && activeElement.getAttribute("aria-label")) {
        // Screen readers will naturally announce the focused element
        // No additional action needed
      }
    }
  }, []);

  /**
   * Set up keyboard event listeners
   */
  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /**
   * Handle connection errors with user-friendly messages
   */
  React.useEffect(() => {
    if (error) {
      toast.error(error);
      Sentry.captureMessage(`Lobby interface error: ${error}`, {
        level: "error",
        tags: {
          lobbyCode,
          userId: user?.id || "anonymous",
          connectionStatus,
        },
      });
    }
  }, [error, lobbyCode, user?.id, connectionStatus]);

  /**
   * Error boundary effect
   */
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setErrorInfo(event.error?.message || "An unexpected error occurred");
      Sentry.captureException(event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setHasError(true);
      setErrorInfo(event.reason?.message || "An unexpected error occurred");
      Sentry.captureException(event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  /**
   * Reset error boundary
   */
  const resetError = React.useCallback(() => {
    setHasError(false);
    setErrorInfo(null);
    clearError();
  }, [clearError]);

  /**
   * Handle retry with connection recovery
   */
  const handleRetry = React.useCallback(async () => {
    resetError();

    if (!isOnline) {
      toast.info("Please check your internet connection");
      return;
    }

    try {
      if (connectionStatus === "disconnected") {
        reconnect();
      }
      await retry();
    } catch (error) {
      Sentry.captureException(error);
      toast.error("Failed to reconnect. Please try again.");
    }
  }, [resetError, isOnline, connectionStatus, reconnect, retry]);

  // Show error boundary if there's a critical error
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-red-500/10">
            <CardContent className="p-6 text-center space-y-6">
              <motion.div
                className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AlertCircle className="w-8 h-8 text-red-400" />
              </motion.div>

              <div>
                <h2 className="text-xl font-bangers text-white mb-2">
                  Something went wrong
                </h2>
                <p className="text-purple-200/70 text-sm font-bangers tracking-wide">
                  {errorInfo || "An unexpected error occurred"}
                </p>
              </div>

              <Button
                onClick={resetError}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bangers tracking-wide"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Show offline state
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-red-500/10">
            <CardContent className="p-6 text-center space-y-6">
              <motion.div
                className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <WifiOff className="w-8 h-8 text-red-400" />
              </motion.div>

              <div>
                <h2 className="text-xl font-bangers text-white mb-2">
                  You&apos;re Offline
                </h2>
                <p className="text-purple-200/70 text-sm font-bangers tracking-wide">
                  Please check your internet connection and try again.
                </p>
              </div>

              <Button
                onClick={handleRetry}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bangers tracking-wide"
              >
                Retry Connection
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
        className
      )}
      role="main"
      aria-label="Game lobby interface"
    >
      {/* Connection Status - Always visible when not connected */}
      <AnimatePresence>
        {connectionStatus !== "connected" && (
          <ConnectionStatus
            status={connectionStatus}
            onReconnect={handleRetry}
            isOnline={isOnline}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <LobbyHeader
        lobbyCode={lobbyCode}
        playerCount={playerCount}
        maxPlayers={lobby?.maxPlayers || 8}
        connectionStatus={connectionStatus}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Left Column - Lobby Info & Settings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Game Settings */}
            {lobby && (
              <GameSettings
                lobbyData={lobby}
                isHost={isHost}
                canModifySettings={canStartGame}
                disabled={isLoading || connectionStatus !== "connected"}
              />
            )}

            {/* Lobby Actions */}
            {lobby && (
              <LobbyActions
                lobbyCode={lobbyCode}
                lobbyStatus={lobby.status}
                playerCount={playerCount}
                isHost={isHost}
                isLoading={isLoading || connectionStatus !== "connected"}
                onStartGame={startGame}
                onLeaveLobby={leaveLobby}
              />
            )}
          </motion.div>

          {/* Right Column - Players List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <PlayerList
              players={players}
              currentUserId={user?.id || ""}
              isHost={isHost}
              lobbyCode={lobbyCode}
              maxPlayers={lobby?.maxPlayers || 8}
              disabled={isLoading || connectionStatus !== "connected"}
            />
          </motion.div>
        </div>
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            role="status"
            aria-label="Loading"
          >
            <motion.div
              className="bg-slate-800/90 rounded-2xl p-6 flex items-center gap-4"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <span className="text-white font-bangers tracking-wide">
                Loading...
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
