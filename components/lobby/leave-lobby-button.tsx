"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { RiAlertLine, RiArrowLeftLine } from "react-icons/ri";
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
} from "@/lib/animations/private-lobby-variants";
import { cn } from "@/lib/utils";

interface LeaveLobbyButtonProps {
  lobbyCode: string;
  isHost: boolean;
  playerCount: number;
  isLoading?: boolean;
  disabled?: boolean;
  onLeaveLobby: () => Promise<void>;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export function LeaveLobbyButton({
  lobbyCode,
  isHost,
  playerCount,
  isLoading = false,
  disabled = false,
  onLeaveLobby,
  className,
  variant = "outline",
  size = "md",
  showIcon = true,
}: LeaveLobbyButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);

  const handleLeaveClick = React.useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmLeave = React.useCallback(async () => {
    setIsLeaving(true);
    try {
      await onLeaveLobby();
      toast.success("Successfully left the lobby");
      setShowConfirmDialog(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to leave lobby";
      toast.error(errorMessage);
      console.error("Failed to leave lobby:", error);
    } finally {
      setIsLeaving(false);
    }
  }, [onLeaveLobby]);

  const handleCancelLeave = React.useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  // Handle keyboard shortcuts in dialog
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showConfirmDialog && event.key === "Escape") {
        handleCancelLeave();
      }
    };

    if (showConfirmDialog) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showConfirmDialog, handleCancelLeave]);

  const buttonSizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg",
  };

  const buttonVariantClasses = {
    default: "bg-red-600 hover:bg-red-700 text-white",
    outline:
      "border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300",
    ghost: "text-red-400 hover:bg-red-500/20 hover:text-red-300",
  };

  const warningMessage = React.useMemo(() => {
    if (isHost && playerCount > 1) {
      return "As the host, leaving will transfer host privileges to another player.";
    }
    if (isHost && playerCount === 1) {
      return "As the only player, leaving will delete the lobby.";
    }
    return "Are you sure you want to leave this lobby?";
  }, [isHost, playerCount]);

  return (
    <>
      <motion.div
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        className={className}
      >
        <Button
          onClick={handleLeaveClick}
          disabled={disabled || isLeaving || isLoading}
          variant={variant}
          className={cn(
            buttonSizeClasses[size],
            buttonVariantClasses[variant],
            "font-bangers tracking-wide transition-all duration-200",
            "focus-visible:ring-2 focus-visible:ring-red-500/50",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          aria-label={isLeaving ? "Leaving lobby..." : "Leave lobby"}
          aria-describedby="leave-lobby-description"
        >
          <AnimatePresence mode="wait">
            {isLeaving ? (
              <motion.div
                key="leaving"
                className="flex items-center gap-2"
                variants={errorVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div
                  className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span>Leaving...</span>
              </motion.div>
            ) : (
              <motion.div
                key="default"
                className="flex items-center gap-2"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {showIcon && <RiArrowLeftLine className="w-4 h-4" />}
                <span>Leave Lobby</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        <div id="leave-lobby-description" className="sr-only">
          {isLeaving
            ? "Leaving the lobby, please wait"
            : `Leave lobby ${lobbyCode}. ${warningMessage}`}
        </div>
      </motion.div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 shadow-2xl shadow-red-500/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bangers text-xl tracking-wide flex items-center">
              <RiAlertLine className="w-6 h-6 text-red-400 mr-2" />
              Leave Lobby
            </AlertDialogTitle>
            <AlertDialogDescription className="text-purple-200/70 font-bangers tracking-wide space-y-2">
              <p>{warningMessage}</p>
              {isHost && playerCount > 1 && (
                <p className="text-yellow-400/80 text-sm">
                  The earliest joined player will become the new host.
                </p>
              )}
              {isHost && playerCount === 1 && (
                <p className="text-red-400/80 text-sm font-medium">
                  This action cannot be undone.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleCancelLeave}
              className="border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
            >
              Stay in Lobby
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              disabled={isLeaving}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bangers tracking-wide shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLeaving ? (
                <motion.div
                  className="flex items-center gap-2"
                  animate={{ opacity: [1, 0.7, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
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
    </>
  );
}
