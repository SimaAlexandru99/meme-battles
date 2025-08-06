"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn, formatJoinTime } from "@/lib/utils";
import { useLobbyGameTransition } from "@/hooks/use-lobby-game-transition";
import { StartGameButton, LeaveLobbyButton } from "@/components/lobby";
import { KickPlayerButton } from "@/components/kick-player-button";
import {
  microInteractionVariants,
  staggerContainerVariants,
} from "@/lib/animations/private-lobby-variants";

interface LobbyInterfaceExampleProps {
  lobbyCode: string;
  currentUser: User;
}

/**
 * Example component demonstrating the new lobby action components
 * This shows how to integrate the StartGameButton, LeaveLobbyButton, and KickPlayerButton
 */
export function LobbyInterfaceExample({
  lobbyCode,
  currentUser,
}: LobbyInterfaceExampleProps) {
  const {
    lobby,
    players,
    isLoading,
    error,
    connectionStatus,
    isStartingGame,
    isTransitioning,
    startGameWithTransition,
    leaveLobby,
    kickPlayer,
    isHost,
    playerCount,
    clearError,
  } = useLobbyGameTransition(lobbyCode);

  // Show loading state
  if (isLoading && !lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          className="text-center"
          variants={microInteractionVariants}
          initial="initial"
          animate="animate"
        >
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-bangers text-xl tracking-wide">
            Loading lobby...
          </p>
        </motion.div>
      </div>
    );
  }

  // Show error state
  if (error && !lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div
          className="text-center max-w-md p-6"
          variants={microInteractionVariants}
          initial="initial"
          animate="animate"
        >
          <Card className="bg-slate-800/50 backdrop-blur-sm border border-red-500/30">
            <CardContent className="p-6">
              <p className="text-red-400 font-bangers text-lg mb-4">{error}</p>
              <button
                onClick={clearError}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bangers tracking-wide"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!lobby) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <motion.div
          className="grid gap-6 sm:gap-8 lg:grid-cols-3"
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
        >
          {/* Lobby Info */}
          <motion.div
            className="lg:col-span-1"
            variants={microInteractionVariants}
          >
            <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl tracking-wide">
                  Lobby Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Lobby Code */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                    Invitation Code
                  </label>
                  <div className="bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2">
                    <code className="text-lg font-mono text-white tracking-widest">
                      {lobby.code}
                    </code>
                  </div>
                </div>

                {/* Connection Status */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "flex items-center gap-1 font-bangers tracking-wide text-xs",
                      connectionStatus === "connected"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    )}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        connectionStatus === "connected"
                          ? "bg-green-400"
                          : "bg-red-400"
                      )}
                    />
                    {connectionStatus}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-bangers tracking-wide text-xs"
                  >
                    {playerCount}/{lobby.maxPlayers} players
                  </Badge>
                </div>

                <Separator className="bg-slate-700/50" />

                {/* Lobby Actions - Using the new components */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                    Actions
                  </h3>

                  {/* Option 1: Use individual components */}
                  <div className="space-y-3">
                    <StartGameButton
                      lobbyCode={lobby.code}
                      playerCount={playerCount}
                      isHost={isHost}
                      lobbyStatus={lobby.status}
                      isLoading={isStartingGame || isTransitioning}
                      onStartGame={startGameWithTransition}
                    />

                    <LeaveLobbyButton
                      lobbyCode={lobby.code}
                      isHost={isHost}
                      playerCount={playerCount}
                      isLoading={isLoading}
                      onLeaveLobby={leaveLobby}
                      variant="outline"
                    />
                  </div>

                  {/* Option 2: Use the combined LobbyActions component */}
                  {/* 
                  <LobbyActions
                    lobbyCode={lobby.code}
                    lobbyStatus={lobby.status}
                    playerCount={playerCount}
                    isHost={isHost}
                    isLoading={isStartingGame || isTransitioning}
                    onStartGame={startGameWithTransition}
                    onLeaveLobby={leaveLobby}
                  />
                  */}
                </div>

                {/* Game Transition Status */}
                {(isStartingGame || isTransitioning) && (
                  <motion.div
                    className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
                    variants={microInteractionVariants}
                    initial="initial"
                    animate="animate"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                      <div>
                        <p className="text-green-400 font-bangers text-sm tracking-wide">
                          {isTransitioning
                            ? "Transitioning to game..."
                            : "Starting game..."}
                        </p>
                        <p className="text-green-400/70 text-xs font-bangers tracking-wide">
                          {isTransitioning
                            ? "Preparing your meme cards"
                            : "Validating players and settings"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Players List */}
          <motion.div
            className="lg:col-span-2"
            variants={microInteractionVariants}
          >
            <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl tracking-wide">
                  Players ({playerCount}/{lobby.maxPlayers})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {players.map((player, index) => (
                    <motion.div
                      key={player.displayName}
                      className={cn(
                        "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg",
                        "bg-slate-700/30 border border-slate-600/30",
                        "hover:bg-slate-700/50 transition-colors duration-200"
                      )}
                      variants={microInteractionVariants}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                        <AvatarImage src={player.profileURL || undefined} />
                        <AvatarFallback className="bg-purple-600 text-white font-bangers text-sm sm:text-base">
                          {player.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span className="font-bangers text-white tracking-wide text-sm sm:text-base truncate">
                            {player.displayName}
                          </span>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {player.isHost && (
                              <Badge
                                variant="secondary"
                                className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-bangers tracking-wide text-xs"
                              >
                                Host
                              </Badge>
                            )}
                            {/* Show "You" badge for current user */}
                            {player.displayName === currentUser.name && (
                              <Badge
                                variant="secondary"
                                className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-bangers tracking-wide text-xs"
                              >
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-purple-200/70 font-bangers tracking-wide mt-1">
                          Joined {formatJoinTime(player.joinedAt)}
                        </p>
                      </div>

                      {/* Kick Player Button - Using the enhanced component */}
                      <KickPlayerButton
                        lobbyCode={lobby.code}
                        playerId={player.displayName} // Using displayName as ID for demo
                        playerName={player.displayName}
                        isHost={isHost}
                        isCurrentUser={player.displayName === currentUser.name}
                        onKickPlayer={kickPlayer}
                        disabled={isStartingGame || isTransitioning}
                      />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
