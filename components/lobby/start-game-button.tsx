"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { RiAlertLine, RiPlayLine } from "react-icons/ri";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  buttonVariants,
  errorVariants,
  successVariants,
} from "@/lib/animations/private-lobby-variants";
import { cn } from "@/lib/utils";

interface StartGameButtonProps {
  lobbyCode: string;
  playerCount: number;
  isHost: boolean;
  lobbyStatus: LobbyStatus;
  isLoading?: boolean;
  disabled?: boolean;
  onStartGame: () => Promise<void>;
  className?: string;
}

export function StartGameButton({
  playerCount,
  isHost,
  lobbyStatus,
  isLoading = false,
  disabled = false,
  onStartGame,
  className,
}: StartGameButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);

  // Validation checks
  const canStartGame = React.useMemo(() => {
    return (
      isHost &&
      playerCount >= 3 &&
      lobbyStatus === "waiting" &&
      !isLoading &&
      !disabled
    );
  }, [isHost, playerCount, lobbyStatus, isLoading, disabled]);

  const validationMessage = React.useMemo(() => {
    if (!isHost) return "Only the host can start the game";
    if (playerCount < 3) return "Need at least 3 players to start";
    if (lobbyStatus !== "waiting")
      return "Game cannot be started in current state";
    return null;
  }, [isHost, playerCount, lobbyStatus]);

  const handleStartClick = React.useCallback(() => {
    if (!canStartGame) {
      if (validationMessage) {
        toast.error(validationMessage);
      }
      return;
    }
    setShowConfirmDialog(true);
  }, [canStartGame, validationMessage]);

  const handleConfirmStart = React.useCallback(async () => {
    if (!canStartGame) return;

    setIsStarting(true);
    try {
      await onStartGame();
      toast.success("Game started successfully!");
      setShowConfirmDialog(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to start game";
      toast.error(errorMessage);
      console.error("Failed to start game:", error);
    } finally {
      setIsStarting(false);
    }
  }, [canStartGame, onStartGame]);

  const handleCancelStart = React.useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // Don't render if user is not the host
  if (!isHost) {
    return null;
  }

  return (
    <>
      <motion.div
        variants={buttonVariants}
        whileHover={canStartGame ? "hover" : undefined}
        whileTap={canStartGame ? "tap" : undefined}
        className={className}
      >
        <Button
          onClick={handleStartClick}
          disabled={!canStartGame || isStarting}
          className={cn(
            "w-full h-12 sm:h-14",
            "bg-gradient-to-r from-green-600 to-green-700",
            "hover:from-green-500 hover:to-green-600",
            "disabled:from-slate-600 disabled:to-slate-700",
            "text-white font-bangers text-lg sm:text-xl tracking-wide",
            "shadow-lg shadow-green-500/30",
            "transition-all duration-300",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus-visible:ring-2 focus-visible:ring-green-500/50",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            // Enhanced visual weight for critical action
            "ring-2 ring-green-500/20 hover:ring-green-500/40",
            // Mobile-specific enhancements
            "sm:ring-1 sm:hover:ring-2",
          )}
          aria-label={
            isStarting
              ? "Starting game..."
              : canStartGame
                ? "Start the game"
                : validationMessage || "Cannot start game"
          }
          aria-describedby="start-game-description"
        >
          <AnimatePresence mode="wait">
            {isStarting ? (
              <motion.div
                key="starting"
                className="flex items-center gap-2"
                variants={successVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span>Starting Game...</span>
              </motion.div>
            ) : !canStartGame && validationMessage ? (
              <motion.div
                key="disabled"
                className="flex items-center gap-2"
                variants={errorVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <RiAlertLine className="w-5 h-5" />
                <span className="truncate">
                  {playerCount < 3
                    ? `Need ${3 - playerCount} more`
                    : "Cannot Start"}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="ready"
                className="flex items-center gap-2"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <RiPlayLine className="w-5 h-5" />
                <span>Start Game</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        <div id="start-game-description" className="sr-only">
          {isStarting
            ? "Starting the game, please wait"
            : canStartGame
              ? `Start the game with ${playerCount} players`
              : validationMessage || "Game cannot be started"}
        </div>
      </motion.div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 shadow-2xl shadow-green-500/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bangers text-xl tracking-wide flex items-center">
              <RiPlayLine className="w-6 h-6 text-green-400 mr-2" />
              Start Game
            </AlertDialogTitle>
            <AlertDialogDescription className="text-purple-200/70 font-bangers tracking-wide">
              Are you ready to start the game with {playerCount} players? Once
              started, no new players can join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelStart}
              className="border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStart}
              disabled={isStarting}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bangers tracking-wide shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <motion.div
                  className="flex items-center gap-2"
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <span>Starting...</span>
                </motion.div>
              ) : (
                "Start Game"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
