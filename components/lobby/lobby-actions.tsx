"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { StartGameButton } from "./start-game-button";
import { LeaveLobbyButton } from "./leave-lobby-button";
import { cn } from "@/lib/utils";
import { staggerContainerVariants } from "@/lib/animations/private-lobby-variants";

interface LobbyActionsProps {
  // Lobby data
  lobbyCode: string;
  lobbyStatus: LobbyStatus;
  playerCount: number;
  isHost: boolean;

  // Loading states
  isLoading?: boolean;

  // Action handlers
  onStartGame: () => Promise<void>;
  onLeaveLobby: () => Promise<void>;

  // Styling
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function LobbyActions({
  lobbyCode,
  lobbyStatus,
  playerCount,
  isHost,
  isLoading = false,
  onStartGame,
  onLeaveLobby,
  className,
  orientation = "vertical",
}: LobbyActionsProps) {
  const containerClasses = cn(
    "flex gap-3",
    orientation === "horizontal" ? "flex-row" : "flex-col",
    className,
  );

  return (
    <motion.div
      className={containerClasses}
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      role="group"
      aria-label="Lobby actions"
    >
      {/* Start Game Button - Only visible to host */}
      {isHost && (
        <StartGameButton
          lobbyCode={lobbyCode}
          playerCount={playerCount}
          isHost={isHost}
          lobbyStatus={lobbyStatus}
          isLoading={isLoading}
          onStartGame={onStartGame}
        />
      )}

      {/* Leave Lobby Button - Always visible */}
      <LeaveLobbyButton
        lobbyCode={lobbyCode}
        isHost={isHost}
        playerCount={playerCount}
        isLoading={isLoading}
        onLeaveLobby={onLeaveLobby}
        variant={isHost ? "outline" : "outline"}
        size={isHost ? "md" : "md"}
      />
    </motion.div>
  );
}
