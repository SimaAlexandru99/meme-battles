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
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn, formatJoinTime } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { useReconnection } from "@/hooks/useReconnection";
import { useLobbyRefresh } from "@/hooks/useLobbyRefresh";
import { GameRedirect } from "@/components/game-redirect";
import { AuthError } from "@/components/auth-error";
import { getLobbyData, startGame } from "@/lib/actions";

// Import types from global definitions

export function GameLobby({ lobbyCode, currentUser }: GameLobbyProps) {
  const router = useRouter();
  const [lobbyData, setLobbyData] = React.useState<LobbyData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isStarting, setIsStarting] = React.useState(false);

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
      fetchLobbyData();
    },
    onReconnectFailure: () => {
      // Redirect to main menu if reconnection fails
      toast.error("Failed to reconnect. Redirecting to main menu...");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    },
  });

  // Auto-refresh hook
  const { isRefreshing } = useLobbyRefresh({
    lobbyCode,
    enabled: isConnected && !isReconnecting,
    refreshInterval: 5000,
    onDataUpdate: (updatedLobbyData) => {
      setLobbyData(updatedLobbyData as LobbyData);
      setError(null);
    },
    onError: (errorMessage) => {
      setError(errorMessage);
      // Don't trigger connection loss for refresh errors
      // Only trigger for actual connection issues
    },
  });

  // Check if current user is the host
  const isHost = lobbyData?.hostUid === currentUser.id;

  // Fetch lobby data using server action
  const fetchLobbyData = React.useCallback(async () => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Fetch Lobby Data",
      },
      async () => {
        try {
          const response = await getLobbyData(lobbyCode);
          if (response.success && response.lobby) {
            // Convert serialized data to proper format
            const serializedLobby = response.lobby as SerializedLobbyData;
            const lobbyData: LobbyData = {
              ...serializedLobby,
              createdAt: new Date(serializedLobby.createdAt),
              updatedAt: new Date(serializedLobby.updatedAt),
            };
            setLobbyData(lobbyData);
          } else {
            throw new Error("Failed to load lobby data");
          }
          setError(null);

          // Reset connection state on successful fetch
          resetConnectionState();
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to load lobby";
          setError(errorMessage);
          Sentry.captureException(err);

          // Handle connection loss
          if (
            err instanceof Error &&
            (err.message.includes("Failed to load lobby") ||
              err.message.includes("You are not a member of this lobby"))
          ) {
            handleConnectionLoss();
          }
        } finally {
          setIsLoading(false);
        }
      }
    );
  }, [lobbyCode, resetConnectionState, handleConnectionLoss]);

  // Initial fetch with authentication check
  React.useEffect(() => {
    // Wait a bit for authentication to be ready
    const timer = setTimeout(() => {
      fetchLobbyData();
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchLobbyData]);

  // Copy invitation code to clipboard
  const handleCopyCode = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(lobbyCode);
      toast.success("Invitation code copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy invitation code", err);
      toast.error("Failed to copy invitation code");
    }
  }, [lobbyCode]);

  // Share invitation link
  const handleShareLink = React.useCallback(async () => {
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
      }
    }
  }, [lobbyCode]);

  // Start the game using server action
  const handleStartGame = React.useCallback(async () => {
    if (!isHost) return;

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
      }
    );
  }, [lobbyCode, isHost, router]);

  // Handle back navigation
  const handleBackToMain = React.useCallback(() => {
    router.push("/");
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-white font-bangers text-lg tracking-wide">
            Loading lobby...
          </p>
        </div>
      </div>
    );
  }

  // Show reconnection UI when disconnected
  if (!isConnected || isReconnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <RiWifiOffLine className="w-8 h-8 text-red-400" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bangers text-white mb-2">
                  {isReconnecting ? "Reconnecting..." : "Connection Lost"}
                </h2>
                <p className="text-purple-200/70 text-sm">
                  {isReconnecting
                    ? `Attempt ${reconnectAttempts} of 5...`
                    : "Your connection to the lobby was lost."}
                </p>
              </div>

              {isReconnecting && (
                <div className="space-y-2">
                  <Progress value={reconnectProgress} className="w-full" />
                  <p className="text-xs text-purple-200/50">
                    Attempting to reconnect...
                  </p>
                </div>
              )}

              {!isReconnecting && canReconnect && (
                <Button
                  onClick={triggerReconnection}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <RiRefreshLine className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              )}

              {!canReconnect && (
                <div className="space-y-3">
                  <p className="text-red-400 text-sm">
                    Failed to reconnect after 5 attempts.
                  </p>
                  <Button
                    onClick={() => router.push("/")}
                    className="w-full bg-slate-600 hover:bg-slate-700 text-white"
                  >
                    <RiArrowLeftLine className="w-4 h-4 mr-2" />
                    Back to Main Menu
                  </Button>
                </div>
              )}

              {connectionError && (
                <p className="text-red-400 text-xs mt-2">{connectionError}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    // Check if it's an authentication error
    const isAuthError =
      error.toLowerCase().includes("authentication") ||
      error.toLowerCase().includes("auth");

    if (isAuthError) {
      return <AuthError error={error} onRetry={fetchLobbyData} />;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bangers text-red-400 mb-4">
                Lobby Not Found
              </h2>
              <p className="text-purple-200/70 mb-6">{error}</p>
              <Button onClick={handleBackToMain} className="w-full">
                <RiArrowLeftLine className="w-4 h-4 mr-2" />
                Back to Main Menu
              </Button>
            </div>
          </CardContent>
        </Card>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleBackToMain}
              variant="ghost"
              className="text-white hover:bg-slate-800/50"
            >
              <RiArrowLeftLine className="w-5 h-5 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <h1 className="text-xl font-bangers text-white tracking-wide">
                  Game Lobby
                </h1>
                <div className="text-sm text-purple-200/70 flex items-center justify-center gap-2">
                  <span>Waiting for players...</span>
                  {isRefreshing && (
                    <div className="w-3 h-3 border border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-green-500/20 text-green-400 border-green-500/30"
              >
                {lobbyData.players.length}/{lobbyData.maxPlayers} Players
              </Badge>

              {/* Connection Status */}
              <Badge
                variant="secondary"
                className={cn(
                  "flex items-center gap-1",
                  isConnected
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-green-400" : "bg-red-400"
                  )}
                />
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Lobby Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl tracking-wide">
                  Lobby Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Invitation Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-200/70">
                    Invitation Code
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2">
                      <code className="text-lg font-mono text-white tracking-widest">
                        {lobbyCode}
                      </code>
                    </div>
                    <Button
                      onClick={handleCopyCode}
                      size="sm"
                      variant="outline"
                      className="border-slate-600/50 text-white hover:bg-slate-700/50"
                    >
                      <RiFileCopyLine className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Share Link */}
                <Button
                  onClick={handleShareLink}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <RiShareLine className="w-4 h-4 mr-2" />
                  Share Lobby Link
                </Button>

                {/* Game Settings */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-200/70">
                    Game Settings
                  </label>
                  <div className="space-y-1 text-sm text-purple-200/70">
                    <div>Rounds: {lobbyData.settings.rounds}</div>
                    <div>
                      Time Limit: {lobbyData.settings.timeLimit}s per round
                    </div>
                    <div>
                      Categories: {lobbyData.settings.categories.join(", ")}
                    </div>
                  </div>
                </div>

                {/* Refresh Lobby Data */}
                <div className="space-y-2">
                  <Separator className="bg-slate-700/50" />
                  <Button
                    onClick={fetchLobbyData}
                    variant="outline"
                    className="w-full border-slate-600/50 text-white hover:bg-slate-700/50"
                  >
                    <RiRefreshLine className="w-4 h-4 mr-2" />
                    Refresh Lobby
                  </Button>
                </div>

                {/* Host Controls */}
                {isHost && (
                  <div className="space-y-2">
                    <Separator className="bg-slate-700/50" />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-purple-200/70">
                        Host Controls
                      </label>
                      <Button
                        onClick={handleStartGame}
                        disabled={lobbyData.players.length < 2 || isStarting}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <RiPlayLine className="w-4 h-4 mr-2" />
                        {isStarting ? "Starting..." : "Start Game"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-slate-600/50 text-white hover:bg-slate-700/50"
                      >
                        <RiSettings3Line className="w-4 h-4 mr-2" />
                        Game Settings
                      </Button>
                    </div>
                  </div>
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
            <Card className="bg-slate-800/50 border-slate-700/50">
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
                          "flex items-center gap-4 p-4 rounded-lg",
                          "bg-slate-700/30 border border-slate-600/30",
                          "hover:bg-slate-700/50 transition-colors duration-200"
                        )}
                      >
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={player.profileURL || undefined} />
                          <AvatarFallback className="bg-purple-600 text-white font-bangers">
                            {(player.displayName || "A")
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bangers text-white tracking-wide">
                              {player.displayName || "Anonymous Player"}
                            </span>
                            {player.isHost && (
                              <Badge
                                variant="secondary"
                                className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              >
                                Host
                              </Badge>
                            )}
                            {player.uid === currentUser.id && (
                              <Badge
                                variant="secondary"
                                className="bg-blue-500/20 text-blue-400 border-blue-500/30"
                              >
                                You
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-purple-200/70">
                            Joined {formatJoinTime(player.joinedAt)}
                          </p>
                        </div>
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
                      className="flex items-center gap-4 p-4 rounded-lg bg-slate-700/10 border border-slate-600/20 border-dashed"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center">
                        <span className="text-slate-500 text-lg">?</span>
                      </div>
                      <div className="flex-1">
                        <span className="text-slate-500 font-bangers tracking-wide">
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
    </div>
  );
}
