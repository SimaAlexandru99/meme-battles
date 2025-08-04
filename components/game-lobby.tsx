"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiArrowLeftLine,
  RiFileCopyLine,
  RiShareLine,
  RiPlayLine,
  RiSettings3Line,
  RiWifiOffLine,
  RiRefreshLine,
  RiUserLine,
  RiTimeLine,
  RiGamepadLine,
  RiAlertLine,
  RiRobotLine,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, formatJoinTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { useReconnection } from "@/hooks/useReconnection";

import { GameRedirect } from "@/components/game-redirect";
import { AuthError } from "@/components/auth-error";
import { startGame, leaveLobby } from "@/lib/actions";
import { useLobbyData } from "@/hooks/useLobbyData";
import { GameSettingsModal } from "@/components/game-settings/GameSettingsModal";
import { AddBotButton } from "@/components/game-settings/AddBotButton";
import { KickPlayerButton } from "@/components/kick-player-button";
import { updateLobbySettingsService } from "@/lib/services/lobby.service";
import { addAIPlayerToLobbyService } from "@/lib/services/lobby.service";
import { GameSettingsFormData } from "@/components/game-settings/types";
import {
  buttonVariants,
  errorVariants,
  badgeVariants,
  microInteractionVariants,
  successVariants,
  loadingVariants,
} from "@/lib/animations/private-lobby-variants";

// Import types from global definitions

export function GameLobby({ lobbyCode, currentUser }: GameLobbyProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = React.useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
  const [settingsError, setSettingsError] = React.useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const [showExitDialog, setShowExitDialog] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);
  const [isAddingBot, setIsAddingBot] = React.useState(false);
  const [botError, setBotError] = React.useState<string | null>(null);

  // SWR hook for lobby data with real-time updates
  const { lobbyData, error, isLoading, isValidating, refresh, isHost } =
    useLobbyData(lobbyCode, {
      refreshInterval: 5000, // 5 seconds auto-refresh
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      enabled: true, // Will be controlled by reconnection logic below
    });

  // Reconnection hook
  const {
    isConnected,
    isReconnecting,
    reconnectAttempts,
    connectionError,
    handleConnectionLoss,
    triggerReconnection,
    resetConnectionState,
    canReconnect,
    reconnectProgress,
  } = useReconnection({
    lobbyCode,
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
    onReconnectSuccess: () => {
      // Refresh lobby data after successful reconnection
      refresh();
      resetConnectionState();
    },
    onReconnectFailure: () => {
      // Redirect to main menu if reconnection fails
      toast.error("Failed to reconnect. Redirecting to main menu...");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    },
  });

  // Handle beforeunload event to show confirmation dialog
  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (lobbyData && lobbyData.status === "waiting") {
        event.preventDefault();
        event.returnValue = "";
        return "";
      }
    };

    // Handle visibility change (tab switching, minimizing)
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        lobbyData &&
        lobbyData.status === "waiting"
      ) {
        // Log that user left the tab while in lobby
        Sentry.addBreadcrumb({
          category: "navigation",
          message: "User left tab while in game lobby",
          level: "info",
          data: {
            lobbyCode,
            lobbyStatus: lobbyData.status,
            playerCount: lobbyData.players.length,
          },
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [lobbyData, lobbyCode]);

  // Handle errors and connection issues
  React.useEffect(() => {
    if (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load lobby";

      // Handle connection loss for specific errors
      if (
        errorMessage.includes("Failed to load lobby") ||
        errorMessage.includes("You are not a member of this lobby") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("unauthorized")
      ) {
        handleConnectionLoss();
      }
    }
  }, [error, handleConnectionLoss]);

  // Check if current user is the host (now using the helper from hook)
  const isCurrentUserHost = isHost(currentUser.id);

  // Copy invitation code to clipboard
  const handleCopyCode = React.useCallback(async () => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Copy Invitation Code",
      },
      async () => {
        try {
          await navigator.clipboard.writeText(lobbyCode);
          toast.success("Invitation code copied to clipboard!");
        } catch (err) {
          console.error("Failed to copy invitation code", err);
          toast.error("Failed to copy invitation code");
          Sentry.captureException(err);
        }
      },
    );
  }, [lobbyCode]);

  // Share invitation link
  const handleShareLink = React.useCallback(async () => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Share Lobby Link",
      },
      async () => {
        const shareUrl = `${window.location.origin}/game/${lobbyCode}`;

        if (navigator.share) {
          try {
            await navigator.share({
              title: "Join my Meme Battle lobby!",
              text: `Join my private meme battle lobby! Code: ${lobbyCode}`,
              url: shareUrl,
            });
          } catch (err) {
            console.error("Failed to share lobby link", err);
            // User cancelled sharing
            console.log("Share cancelled");
          }
        } else {
          // Fallback to copying link
          try {
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Lobby link copied to clipboard!");
          } catch (err) {
            console.error("Failed to copy lobby link", err);
            toast.error("Failed to copy lobby link");
            Sentry.captureException(err);
          }
        }
      },
    );
  }, [lobbyCode]);

  // Start the game using server action
  const handleStartGame = React.useCallback(async () => {
    if (!isCurrentUserHost) return;

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Start Game",
      },
      async () => {
        setIsStarting(true);
        try {
          await startGame(lobbyCode);

          // Redirect to game page
          router.push(`/game/${lobbyCode}/play`);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to start game";
          toast.error(errorMessage);
          Sentry.captureException(err);
        } finally {
          setIsStarting(false);
        }
      },
    );
  }, [lobbyCode, isCurrentUserHost, router]);

  // Handle back navigation with confirmation
  const handleBackToMain = React.useCallback(() => {
    if (lobbyData && lobbyData.status === "waiting") {
      setShowExitDialog(true);
    } else {
      router.push("/");
    }
  }, [router, lobbyData]);

  // Handle leaving the lobby
  const handleLeaveLobby = React.useCallback(async () => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Leave Lobby",
      },
      async () => {
        setIsLeaving(true);
        try {
          await leaveLobby(lobbyCode);
          toast.success("Successfully left the lobby");
          router.push("/");
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to leave lobby";
          toast.error(errorMessage);
          Sentry.captureException(err);
        } finally {
          setIsLeaving(false);
          setShowExitDialog(false);
        }
      },
    );
  }, [lobbyCode, router]);

  // Handle canceling exit
  const handleCancelExit = React.useCallback(() => {
    setShowExitDialog(false);
  }, []);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showExitDialog) {
        handleCancelExit();
      }
    };

    if (showExitDialog) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showExitDialog, handleCancelExit]);

  // Handle opening settings modal
  const handleOpenSettings = React.useCallback(() => {
    if (!isCurrentUserHost) return;
    setSettingsError(null);
    setIsSettingsModalOpen(true);
  }, [isCurrentUserHost]);

  // Handle closing settings modal
  const handleCloseSettings = React.useCallback(() => {
    setIsSettingsModalOpen(false);
    setSettingsError(null);
  }, []);

  // Handle saving settings
  const handleSaveSettings = React.useCallback(
    async (settings: GameSettingsFormData) => {
      if (!isCurrentUserHost) return;

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Save Game Settings",
        },
        async () => {
          setIsSavingSettings(true);
          setSettingsError(null);

          try {
            await updateLobbySettingsService(lobbyCode, settings);

            // Refresh lobby data to show updated settings
            await refresh();

            // Show success notification
            toast.success("Game settings updated successfully!");

            // Close modal
            setIsSettingsModalOpen(false);
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : "Failed to update settings";
            setSettingsError(errorMessage);
            toast.error(errorMessage);
            Sentry.captureException(err);
            throw err; // Re-throw to let the form handle it
          } finally {
            setIsSavingSettings(false);
          }
        },
      );
    },
    [lobbyCode, isCurrentUserHost, refresh],
  );

  // Handle adding AI player
  const handleAddBot = React.useCallback(
    async (botConfig: {
      personalityId: string;
      difficulty: "easy" | "medium" | "hard";
    }) => {
      if (!isCurrentUserHost) return;

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Add AI Player",
        },
        async () => {
          setIsAddingBot(true);
          setBotError(null);

          try {
            await addAIPlayerToLobbyService(lobbyCode, botConfig);

            // Refresh lobby data to show new AI player
            await refresh();

            // Show success notification
            toast.success("AI player added successfully!");
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : "Failed to add AI player";
            setBotError(errorMessage);
            toast.error(errorMessage);
            Sentry.captureException(err);
            throw err; // Re-throw to let the dialog handle it
          } finally {
            setIsAddingBot(false);
          }
        },
      );
    },
    [lobbyCode, isCurrentUserHost, refresh],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-6 p-8"
          variants={microInteractionVariants}
          initial="initial"
          animate="animate"
        >
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30"
            variants={loadingVariants}
            animate="animate"
          >
            <RiGamepadLine className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bangers text-white tracking-wide mb-2">
              Loading lobby...
            </h2>
            <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide">
              Connecting to game server
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show reconnection UI when disconnected
  if (!isConnected || isReconnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          className="w-full max-w-md p-6 sm:p-8"
          variants={microInteractionVariants}
          initial="initial"
          animate="animate"
        >
          <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
            <CardContent className="p-6">
              <div className="text-center space-y-6">
                <motion.div
                  className="flex justify-center"
                  variants={microInteractionVariants}
                >
                  <motion.div
                    className={cn(
                      "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center",
                      isReconnecting
                        ? "bg-yellow-500/20 shadow-yellow-500/30"
                        : "bg-red-500/20 shadow-red-500/30",
                    )}
                    variants={
                      isReconnecting
                        ? loadingVariants
                        : microInteractionVariants
                    }
                    animate={isReconnecting ? "animate" : "initial"}
                  >
                    <RiWifiOffLine
                      className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10",
                        isReconnecting ? "text-yellow-400" : "text-red-400",
                      )}
                    />
                  </motion.div>
                </motion.div>

                <motion.div variants={microInteractionVariants}>
                  <h2 className="text-xl sm:text-2xl font-bangers text-white mb-2">
                    {isReconnecting ? "Reconnecting..." : "Connection Lost"}
                  </h2>
                  <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide">
                    {isReconnecting
                      ? `Attempt ${reconnectAttempts} of 5...`
                      : "Your connection to the lobby was lost."}
                  </p>
                </motion.div>

                {isReconnecting && (
                  <motion.div
                    className="space-y-3"
                    variants={microInteractionVariants}
                  >
                    <Progress value={reconnectProgress} className="w-full" />
                    <p className="text-xs text-purple-200/50 font-bangers tracking-wide">
                      Attempting to reconnect...
                    </p>
                  </motion.div>
                )}

                {!isReconnecting && canReconnect && (
                  <motion.div variants={buttonVariants}>
                    <Button
                      onClick={triggerReconnection}
                      className={cn(
                        "w-full h-12 sm:h-14",
                        "bg-gradient-to-r from-yellow-600 to-yellow-700",
                        "hover:from-yellow-500 hover:to-yellow-600",
                        "text-white font-bangers text-lg sm:text-xl tracking-wide",
                        "shadow-lg shadow-yellow-500/30",
                        "focus-visible:ring-2 focus-visible:ring-yellow-500/50",
                        "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                      )}
                    >
                      <RiRefreshLine className="w-5 h-5 mr-2" />
                      Try Again
                    </Button>
                  </motion.div>
                )}

                {!canReconnect && (
                  <motion.div
                    className="space-y-4"
                    variants={microInteractionVariants}
                  >
                    <p className="text-red-400 text-sm font-bangers tracking-wide">
                      Failed to reconnect after 5 attempts.
                    </p>
                    <Button
                      onClick={() => router.push("/")}
                      className={cn(
                        "w-full h-12 sm:h-14",
                        "bg-gradient-to-r from-slate-600 to-slate-700",
                        "hover:from-slate-500 hover:to-slate-600",
                        "text-white font-bangers text-lg sm:text-xl tracking-wide",
                        "shadow-lg shadow-slate-500/30",
                        "focus-visible:ring-2 focus-visible:ring-slate-500/50",
                        "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                      )}
                    >
                      <RiArrowLeftLine className="w-5 h-5 mr-2" />
                      Back to Main Menu
                    </Button>
                  </motion.div>
                )}

                {connectionError && (
                  <motion.p
                    className="text-red-400 text-xs font-bangers tracking-wide"
                    variants={errorVariants}
                  >
                    {connectionError}
                  </motion.p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (error) {
    // Check if it's an authentication error
    const isAuthError =
      error.toLowerCase().includes("authentication") ||
      error.toLowerCase().includes("auth");

    if (isAuthError) {
      return <AuthError error={error} onRetry={refresh} />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          className="w-full max-w-md p-6 sm:p-8"
          variants={microInteractionVariants}
          initial="initial"
          animate="animate"
        >
          <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
            <CardContent className="p-6">
              <div className="text-center space-y-6">
                <motion.div
                  className="flex justify-center"
                  variants={microInteractionVariants}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/30">
                    <RiWifiOffLine className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
                  </div>
                </motion.div>

                <motion.div variants={microInteractionVariants}>
                  <h2 className="text-xl sm:text-2xl font-bangers text-red-400 mb-2">
                    Lobby Not Found
                  </h2>
                  <div className="space-y-3">
                    <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide">
                      {error}
                    </p>
                    <div className="text-xs text-purple-200/50 font-bangers tracking-wide space-y-1">
                      <p>• Check that the lobby code is correct</p>
                      <p>• Ensure the lobby hasn&apos;t been deleted</p>
                      <p>• Try refreshing the page</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={buttonVariants}>
                  <Button
                    onClick={handleBackToMain}
                    className={cn(
                      "w-full h-12 sm:h-14",
                      "bg-gradient-to-r from-slate-600 to-slate-700",
                      "hover:from-slate-500 hover:to-slate-600",
                      "text-white font-bangers text-lg sm:text-xl tracking-wide",
                      "shadow-lg shadow-slate-500/30",
                      "focus-visible:ring-2 focus-visible:ring-slate-500/50",
                      "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                    )}
                  >
                    <RiArrowLeftLine className="w-5 h-5 mr-2" />
                    Back to Main Menu
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!lobbyData) {
    return null;
  }

  // Handle game state redirects
  if (lobbyData.status === "started") {
    return (
      <GameRedirect
        lobbyCode={lobbyCode}
        gameStatus="started"
        onRedirect={() => {
          toast.info("Redirecting to game...");
        }}
      />
    );
  }

  if (lobbyData.status === "finished") {
    return <GameRedirect lobbyCode={lobbyCode} gameStatus="finished" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <motion.div variants={buttonVariants}>
              <Button
                onClick={handleBackToMain}
                variant="ghost"
                className="text-white hover:bg-slate-800/50 font-bangers tracking-wide h-10 sm:h-11"
              >
                <RiArrowLeftLine className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </motion.div>

            <div className="flex items-center gap-2 sm:gap-4">
              <motion.div
                className="text-center"
                variants={microInteractionVariants}
              >
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bangers text-white tracking-wide">
                  Game Lobby
                </h1>
                <div className="text-xs sm:text-sm text-purple-200/70 flex items-center justify-center gap-2 font-bangers tracking-wide">
                  <span>Waiting for players...</span>
                  {isValidating && (
                    <motion.div
                      className="w-2 h-2 sm:w-3 sm:h-3 border border-purple-400/30 border-t-purple-400 rounded-full"
                      variants={loadingVariants}
                      animate="animate"
                    />
                  )}
                </div>
              </motion.div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <motion.div variants={badgeVariants}>
                <Badge
                  variant="secondary"
                  className="bg-green-500/20 text-green-400 border-green-500/30 font-bangers tracking-wide text-xs sm:text-sm"
                >
                  {lobbyData.players.length}/{lobbyData.maxPlayers}
                </Badge>
              </motion.div>

              {/* Connection Status */}
              <motion.div variants={badgeVariants}>
                <Badge
                  variant="secondary"
                  className={cn(
                    "flex items-center gap-1 font-bangers tracking-wide text-xs sm:text-sm",
                    isConnected
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30",
                  )}
                >
                  <motion.div
                    className={cn(
                      "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                      isConnected ? "bg-green-400" : "bg-red-400",
                    )}
                    animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="hidden sm:inline">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </Badge>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Lobby Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl tracking-wide">
                  Lobby Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invitation Code */}
                <motion.div
                  className="space-y-3"
                  variants={microInteractionVariants}
                >
                  <label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                    Invitation Code
                  </label>
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2"
                      variants={microInteractionVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <code className="text-lg font-mono text-white tracking-widest">
                        {lobbyCode}
                      </code>
                    </motion.div>
                    <motion.div variants={buttonVariants}>
                      <Button
                        onClick={handleCopyCode}
                        size="sm"
                        variant="outline"
                        className="border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
                      >
                        <RiFileCopyLine className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Share Link */}
                <motion.div variants={buttonVariants}>
                  <Button
                    onClick={handleShareLink}
                    className={cn(
                      "w-full h-12",
                      "bg-gradient-to-r from-purple-600 to-purple-700",
                      "hover:from-purple-500 hover:to-purple-600",
                      "text-white font-bangers text-lg tracking-wide",
                      "shadow-lg shadow-purple-500/30",
                      "focus-visible:ring-2 focus-visible:ring-purple-500/50",
                      "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                    )}
                  >
                    <RiShareLine className="w-5 h-5 mr-2" />
                    Share Lobby Link
                  </Button>
                </motion.div>

                {/* Game Settings */}
                <motion.div
                  className="space-y-3"
                  variants={microInteractionVariants}
                >
                  <label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                    Game Settings
                  </label>
                  <div className="space-y-2 text-sm text-purple-200/70 font-bangers tracking-wide">
                    <div className="flex items-center gap-2">
                      <RiTimeLine className="w-4 h-4" />
                      <span>Rounds: {lobbyData.settings.rounds}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RiTimeLine className="w-4 h-4" />
                      <span>
                        Time Limit: {lobbyData.settings.timeLimit}s per round
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RiGamepadLine className="w-4 h-4" />
                      <span>
                        Categories: {lobbyData.settings.categories.join(", ")}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Refresh Lobby Data */}
                <motion.div
                  className="space-y-3"
                  variants={microInteractionVariants}
                >
                  <Separator className="bg-slate-700/50" />
                  <Button
                    onClick={refresh}
                    variant="outline"
                    className="w-full border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
                  >
                    <RiRefreshLine className="w-4 h-4 mr-2" />
                    Refresh Lobby
                  </Button>
                </motion.div>

                {/* Host Controls */}
                {isCurrentUserHost && (
                  <motion.div
                    className="space-y-3"
                    variants={microInteractionVariants}
                  >
                    <Separator className="bg-slate-700/50" />
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                        Host Controls
                      </label>
                      <motion.div variants={buttonVariants}>
                        <Button
                          onClick={handleStartGame}
                          disabled={lobbyData.players.length < 2 || isStarting}
                          className={cn(
                            "w-full h-14 sm:h-12",
                            "bg-gradient-to-r from-green-600 to-green-700",
                            "hover:from-green-500 hover:to-green-600",
                            "disabled:from-slate-600 disabled:to-slate-700",
                            "text-white font-bangers text-lg sm:text-lg tracking-wide",
                            "shadow-lg shadow-green-500/30",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            // Enhanced visual weight for critical action
                            "ring-2 ring-green-500/20 hover:ring-green-500/40",
                            "focus-visible:ring-2 focus-visible:ring-green-500/50",
                            "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                            // Mobile-specific enhancements
                            "sm:ring-1 sm:hover:ring-2",
                          )}
                        >
                          {isStarting ? (
                            <motion.div
                              className="flex items-center gap-2"
                              variants={successVariants}
                              animate="animate"
                            >
                              <div
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                                aria-hidden="true"
                              />
                              <span>Starting...</span>
                            </motion.div>
                          ) : (
                            <>
                              <RiPlayLine className="w-5 h-5 mr-2" />
                              Start Game
                            </>
                          )}
                        </Button>
                      </motion.div>
                      <motion.div variants={buttonVariants}>
                        <Button
                          onClick={handleOpenSettings}
                          variant="outline"
                          className="w-full border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
                        >
                          <RiSettings3Line className="w-4 h-4 mr-2" />
                          Game Settings
                        </Button>
                      </motion.div>
                      <motion.div variants={buttonVariants}>
                        <AddBotButton
                          onAddBot={handleAddBot}
                          isLoading={isAddingBot}
                          error={botError}
                          maxBots={6}
                          currentBotCount={
                            lobbyData.players.filter((p) => p.isAI).length
                          }
                          disabled={!isCurrentUserHost}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Players List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl tracking-wide">
                  Players ({lobbyData.players.length}/{lobbyData.maxPlayers})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AnimatePresence>
                    {lobbyData.players.map((player, index) => (
                      <motion.div
                        key={player.uid}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg",
                          "bg-slate-700/30 border border-slate-600/30",
                          "hover:bg-slate-700/50 transition-colors duration-200",
                        )}
                        variants={microInteractionVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <motion.div variants={microInteractionVariants}>
                          <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                            <AvatarImage src={player.profileURL || undefined} />
                            <AvatarFallback
                              className={cn(
                                "font-bangers text-sm sm:text-base",
                                player.isAI
                                  ? "bg-blue-600 text-white"
                                  : "bg-purple-600 text-white",
                              )}
                            >
                              {player.isAI ? (
                                <RiRobotLine className="w-5 h-5 sm:w-6 sm:h-6" />
                              ) : (
                                (player.displayName || "A")
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </AvatarFallback>
                          </Avatar>
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="font-bangers text-white tracking-wide text-sm sm:text-base truncate">
                              {player.isAI && player.aiPersonalityId
                                ? `${player.displayName} (${player.aiPersonalityId.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())})`
                                : player.displayName || "Anonymous Player"}
                            </span>
                            <div className="flex flex-wrap gap-1 sm:gap-2">
                              {player.isHost && (
                                <motion.div variants={badgeVariants}>
                                  <Badge
                                    variant="secondary"
                                    className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-bangers tracking-wide text-xs"
                                  >
                                    Host
                                  </Badge>
                                </motion.div>
                              )}
                              {player.isAI && (
                                <motion.div variants={badgeVariants}>
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-bangers tracking-wide text-xs"
                                  >
                                    AI
                                  </Badge>
                                </motion.div>
                              )}
                              {player.uid === currentUser.id && (
                                <motion.div variants={badgeVariants}>
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-bangers tracking-wide text-xs"
                                  >
                                    You
                                  </Badge>
                                </motion.div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs sm:text-sm text-purple-200/70 font-bangers tracking-wide mt-1">
                            Joined {formatJoinTime(player.joinedAt)}
                          </p>
                        </div>

                        {/* Kick Player Button */}
                        <motion.div variants={microInteractionVariants}>
                          <KickPlayerButton
                            lobbyCode={lobbyCode}
                            playerId={player.uid}
                            playerName={
                              player.displayName || "Anonymous Player"
                            }
                            isHost={isCurrentUserHost}
                            isCurrentUser={player.uid === currentUser.id}
                            isAI={player.isAI}
                            disabled={
                              isStarting || isSavingSettings || isAddingBot
                            }
                            onKickSuccess={refresh}
                          />
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Empty slots */}
                  {Array.from({
                    length: lobbyData.maxPlayers - lobbyData.players.length,
                  }).map((_, index) => (
                    <motion.div
                      key={`empty-${index}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-slate-700/10 border border-slate-600/20 border-dashed"
                      variants={microInteractionVariants}
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-700/50 flex items-center justify-center">
                        <RiUserLine className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-500 font-bangers tracking-wide text-sm sm:text-base">
                          Waiting for player...
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Game Settings Modal */}
      {lobbyData && (
        <GameSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={handleCloseSettings}
          currentSettings={lobbyData.settings}
          onSave={handleSaveSettings}
          isLoading={isSavingSettings}
          error={settingsError}
        />
      )}

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 shadow-2xl shadow-red-500/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bangers text-xl tracking-wide flex items-center">
              <RiAlertLine className="w-6 h-6 text-red-400 mr-2" />
              Are you sure you want to leave the lobby?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-purple-200/70 font-bangers tracking-wide">
              You are currently in a game lobby. Leaving now will abandon the
              game and remove you from the lobby.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelExit}
              className="border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveLobby}
              disabled={isLeaving}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bangers tracking-wide shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLeaving ? (
                <motion.div
                  className="flex items-center gap-2"
                  variants={successVariants}
                  animate="animate"
                >
                  <div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <span>Leaving...</span>
                </motion.div>
              ) : (
                "Leave Lobby"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
