"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, MoreHorizontal, UserMinus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useLobbyManagement } from "@/hooks/use-lobby-management";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

interface PlayerListProps {
  players: PlayerData[];
  currentUserId: string;
  isHost: boolean;
  lobbyCode: string;
  maxPlayers: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Player list component with real-time updates, host indicators, and kick functionality
 */
export function PlayerList({
  players,
  currentUserId,
  isHost,
  lobbyCode,
  maxPlayers,
  disabled = false,
  className,
}: PlayerListProps) {
  const { kickPlayer } = useLobbyManagement(lobbyCode);

  // Kick player dialog state
  const [playerToKick, setPlayerToKick] = React.useState<PlayerData | null>(
    null
  );
  const [isKicking, setIsKicking] = React.useState(false);

  /**
   * Handle kick player action
   */
  const handleKickPlayer = React.useCallback(
    async (player: PlayerData) => {
      if (!isHost || disabled) return;

      setIsKicking(true);
      try {
        await kickPlayer(player.id); // Assuming id is used as UID
        toast.success(`${player.id} has been removed from the lobby`);

        Sentry.addBreadcrumb({
          message: "Player kicked from lobby",
          data: {
            lobbyCode,
            kickedPlayer: player.displayName,
            hostId: currentUserId,
          },
          level: "info",
        });
      } catch (error) {
        console.error("Failed to kick player:", error);
        toast.error("Failed to remove player. Please try again.");
        Sentry.captureException(error);
      } finally {
        setIsKicking(false);
        setPlayerToKick(null);
      }
    },
    [isHost, disabled, kickPlayer, lobbyCode, currentUserId]
  );

  /**
   * Open kick confirmation dialog
   */
  const openKickDialog = React.useCallback((player: PlayerData) => {
    setPlayerToKick(player);
  }, []);

  /**
   * Close kick confirmation dialog
   */
  const closeKickDialog = React.useCallback(() => {
    setPlayerToKick(null);
  }, []);

  /**
   * Get player status indicator
   */
  const getPlayerStatusIndicator = React.useCallback((player: PlayerData) => {
    switch (player.status) {
      case "waiting":
        return {
          className: "bg-green-500/20 text-green-400 border-green-500/30",
          text: "Ready",
        };
      case "ready":
        return {
          className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          text: "Ready",
        };
      case "disconnected":
        return {
          className: "bg-red-500/20 text-red-400 border-red-500/30",
          text: "Offline",
        };
      default:
        return {
          className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
          text: "Unknown",
        };
    }
  }, []);

  /**
   * Check if player is currently online (last seen within 2 minutes)
   */
  const isPlayerOnline = React.useCallback((player: PlayerData) => {
    const lastSeen = new Date(player.lastSeen);
    const now = new Date();
    const timeDiff = now.getTime() - lastSeen.getTime();
    return timeDiff < 2 * 60 * 1000; // 2 minutes
  }, []);

  return (
    <>
      <Card
        className={cn(
          "bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10",
          className
        )}
      >
        <CardHeader>
          <CardTitle className="text-white font-bangers text-xl tracking-wide flex items-center justify-between">
            <span>
              Players ({players.length}/{maxPlayers})
            </span>
            {players.length >= 3 && (
              <Badge
                variant="secondary"
                className="bg-green-500/20 text-green-400 border-green-500/30 font-bangers tracking-wide text-sm"
              >
                Ready to Start
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {players.map((player, index) => {
                const isCurrentUser = player.displayName === currentUserId; // Assuming name is used as identifier
                const canKickPlayer =
                  isHost && !isCurrentUser && !player.isHost && !disabled;
                const statusProps = getPlayerStatusIndicator(player);
                const isOnline = isPlayerOnline(player);

                return (
                  <motion.div
                    key={player.displayName}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.05,
                      layout: { duration: 0.3 },
                    }}
                    className={cn(
                      "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg transition-all duration-200",
                      "bg-slate-700/30 border border-slate-600/30",
                      "hover:bg-slate-700/50 hover:border-slate-600/50",
                      !isOnline && "opacity-75"
                    )}
                    whileHover={{ scale: 1.01 }}
                    role="listitem"
                    aria-label={`Player ${player.displayName}${player.isHost ? " (host)" : ""}${isCurrentUser ? " (you)" : ""}`}
                  >
                    {/* Avatar */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      <div className="relative">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                          <AvatarImage
                            src={player.profileURL || undefined}
                            alt={`${player.displayName}'s avatar`}
                          />
                          <AvatarFallback
                            className={cn(
                              "font-bangers text-sm sm:text-base",
                              "bg-purple-600 text-white"
                            )}
                          >
                            {player.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Online status indicator */}
                        <motion.div
                          className={cn(
                            "absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-slate-700",
                            isOnline ? "bg-green-400" : "bg-gray-400"
                          )}
                          animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          aria-label={isOnline ? "Online" : "Offline"}
                        />
                      </div>
                    </motion.div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-bangers text-white tracking-wide text-sm sm:text-base truncate">
                          {player.displayName}
                        </span>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {player.isHost && (
                            <Badge
                              variant="secondary"
                              className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-bangers tracking-wide text-xs"
                            >
                              Host
                            </Badge>
                          )}

                          {isCurrentUser && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-bangers tracking-wide text-xs"
                            >
                              You
                            </Badge>
                          )}

                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-bangers tracking-wide text-xs",
                              statusProps.className
                            )}
                          >
                            {statusProps.text}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-purple-200/70 font-bangers tracking-wide mt-1">
                        Joined {formatJoinTime(player.joinedAt)}
                        {!isOnline && (
                          <span className="text-red-400/70 ml-2">
                            • Last seen {formatJoinTime(player.lastSeen)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Actions Menu */}
                    {canKickPlayer && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.3 }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-600/50"
                              aria-label={`Actions for ${player.displayName}`}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="end"
                            className="bg-slate-800 border-slate-700"
                          >
                            <DropdownMenuItem
                              onClick={() => openKickDialog(player)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remove Player
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty slots indicator */}
            {players.length < maxPlayers && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: players.length * 0.05 + 0.2 }}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 border-dashed border-slate-600/50 bg-slate-700/20"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-600/30 flex items-center justify-center">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                </div>
                <div className="flex-1">
                  <span className="text-slate-400 font-bangers tracking-wide text-sm sm:text-base">
                    Waiting for players...
                  </span>
                  <p className="text-xs sm:text-sm text-slate-500 font-bangers tracking-wide">
                    {maxPlayers - players.length} slot
                    {maxPlayers - players.length !== 1 ? "s" : ""} available
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kick Player Confirmation Dialog */}
      <AlertDialog open={!!playerToKick} onOpenChange={closeKickDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bangers tracking-wide">
              Remove Player
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 font-bangers tracking-wide">
              Are you sure you want to remove{" "}
              <span className="text-white font-semibold">
                {playerToKick?.displayName}
              </span>{" "}
              from the lobby? They will need a new invitation to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={closeKickDialog}
              className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 font-bangers tracking-wide"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => playerToKick && handleKickPlayer(playerToKick)}
              disabled={isKicking}
              className="bg-red-600 hover:bg-red-700 text-white font-bangers tracking-wide"
            >
              {isKicking ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Removing...
                </div>
              ) : (
                "Remove Player"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
