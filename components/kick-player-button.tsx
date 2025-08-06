"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiUserUnfollowLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  buttonVariants,
  errorVariants,
} from "@/lib/animations/private-lobby-variants";

interface KickPlayerButtonProps {
  lobbyCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  isCurrentUser: boolean;
  isAI?: boolean;
  disabled?: boolean;
  onKickPlayer: (playerId: string) => Promise<void>;
  onKickSuccess?: () => void;
}

export function KickPlayerButton({
  playerId,
  playerName,
  isHost,
  isCurrentUser,
  isAI = false,
  disabled = false,
  onKickPlayer,
  onKickSuccess,
}: KickPlayerButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isKicking, setIsKicking] = React.useState(false);

  const handleKickClick = React.useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmKick = React.useCallback(async () => {
    setIsKicking(true);
    try {
      await onKickPlayer(playerId);

      if (isAI) {
        toast.success(
          `Successfully removed AI player ${playerName} from the lobby`,
        );
      } else {
        toast.success(`Successfully kicked ${playerName} from the lobby`);
      }
      setShowConfirmDialog(false);
      onKickSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to kick player";
      toast.error(errorMessage);
      console.error("Failed to kick player:", err);
    } finally {
      setIsKicking(false);
    }
  }, [playerId, playerName, isAI, onKickPlayer, onKickSuccess]);

  const handleCancelKick = React.useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // Don't show kick button if:
  // - User is not the host
  // - Player is the current user (can't kick yourself)
  // - Player is the host (can't kick host)
  if (!isHost || isCurrentUser) {
    return null;
  }

  return (
    <>
      <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
        <Button
          onClick={handleKickClick}
          disabled={disabled || isKicking}
          variant="outline"
          size="sm"
          className={cn(
            "border-red-500/30 text-red-400 hover:bg-red-500/20",
            "hover:border-red-500/50 hover:text-red-300",
            "font-bangers tracking-wide text-xs",
            "focus-visible:ring-2 focus-visible:ring-red-500/50",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          aria-label={
            isKicking
              ? `${isAI ? "Removing" : "Kicking"} ${playerName}...`
              : `${isAI ? "Remove" : "Kick"} ${playerName} from lobby`
          }
        >
          <AnimatePresence mode="wait">
            {isKicking ? (
              <motion.div
                key="kicking"
                className="flex items-center gap-1"
                variants={errorVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div
                  className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span className="sr-only">
                  {isAI ? "Removing..." : "Kicking..."}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                className="flex items-center gap-1"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <RiUserUnfollowLine className="w-3 h-3" />
                <span>Kick</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 shadow-2xl shadow-red-500/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bangers text-xl tracking-wide flex items-center">
              <RiUserUnfollowLine className="w-6 h-6 text-red-400 mr-2" />
              {isAI ? "Remove AI Player" : "Kick Player"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-purple-200/70 font-bangers tracking-wide">
              Are you sure you want to {isAI ? "remove" : "kick"}{" "}
              <strong>{playerName}</strong> from the lobby? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelKick}
              className="border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmKick}
              disabled={isKicking}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bangers tracking-wide shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isKicking ? (
                <motion.div
                  className="flex items-center gap-2"
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <span>{isAI ? "Removing..." : "Kicking..."}</span>
                </motion.div>
              ) : isAI ? (
                "Remove AI Player"
              ) : (
                "Kick Player"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
