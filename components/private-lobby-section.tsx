"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { RiArrowLeftLine } from "react-icons/ri";
import { JoinWithCodeSection } from "@/components/join-with-code-section";
import { CreateLobbySection } from "@/components/create-lobby-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  lobbyEnterVariants,
  lobbySectionVariants,
  staggerContainerVariants,
  buttonVariants,
} from "@/lib/animations/private-lobby-variants";

interface PrivateLobbySectionProps {
  onBackToMain: () => void;
  onJoinLobby: (code: string) => Promise<void>;
  onCreateLobby: () => Promise<string>;
  isLoading?: boolean;
  error?: string | null;
  createdLobbyCode?: string | null;
  className?: string;
}

export function PrivateLobbySection({
  onBackToMain,
  onJoinLobby,
  onCreateLobby,
  isLoading = false,
  error = null,
  createdLobbyCode = null,
  className,
}: PrivateLobbySectionProps) {
  // Local state for managing individual section loading states
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isJoining, setIsJoining] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  // Handle join lobby with error management
  const handleJoinLobby = React.useCallback(
    async (code: string) => {
      setJoinError(null);
      setIsJoining(true);

      try {
        await onJoinLobby(code);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to join lobby";
        setJoinError(errorMessage);
        throw err; // Re-throw to let child component handle loading state
      } finally {
        setIsJoining(false);
      }
    },
    [onJoinLobby]
  );

  // Handle create lobby with error management
  const handleCreateLobby = React.useCallback(async () => {
    setCreateError(null);
    setIsCreating(true);

    try {
      const code = await onCreateLobby();
      return code;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create lobby";
      setCreateError(errorMessage);
      throw err; // Re-throw to let child component handle loading state
    } finally {
      setIsCreating(false);
    }
  }, [onCreateLobby]);

  // Handle back navigation with keyboard support
  const handleBackToMain = React.useCallback(
    (event?: React.KeyboardEvent) => {
      if (!event || event.key === "Enter" || event.key === " ") {
        event?.preventDefault();
        onBackToMain();
      }
    },
    [onBackToMain]
  );

  // Determine if any operation is in progress
  const isAnyOperationInProgress = isLoading || isJoining || isCreating;

  // Clear errors when global error changes
  React.useEffect(() => {
    if (error) {
      setJoinError(null);
      setCreateError(null);
    }
  }, [error]);

  return (
    <motion.div
      variants={lobbyEnterVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
        "flex flex-col items-center gap-8 sm:gap-12",
        className
      )}
    >
      {/* Back Navigation Button */}
      <motion.div
        variants={lobbySectionVariants}
        className="w-full flex justify-start"
      >
        <Button
          onClick={() => handleBackToMain()}
          onKeyDown={handleBackToMain}
          disabled={isAnyOperationInProgress}
          className={cn(
            "group flex items-center gap-3 px-6 py-3",
            "bg-slate-800/50 hover:bg-slate-700/50",
            "border border-slate-600/50 hover:border-slate-500/50",
            "text-white font-bangers text-lg tracking-wide",
            "shadow-lg shadow-slate-900/20",
            "transition-all duration-300",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus-visible:ring-2 focus-visible:ring-purple-500/50",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          )}
          asChild
        >
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            aria-label="Back to main menu"
          >
            <RiArrowLeftLine
              className={cn(
                "w-5 h-5 transition-transform duration-300",
                "group-hover:-translate-x-1"
              )}
            />
            <span>ÎNAPOI LA ÎNCEPUT</span>
          </motion.button>
        </Button>
      </motion.div>

      {/* Global Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={cn(
            "w-full max-w-2xl p-4 rounded-lg",
            "bg-red-500/10 border border-red-500/30",
            "text-red-400 text-center font-bangers tracking-wide",
            "shadow-lg shadow-red-500/10"
          )}
          role="alert"
          aria-live="assertive"
        >
          <h4 className="text-lg font-bold mb-2">Eroare</h4>
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      {/* Main Content Container */}
      <motion.div
        variants={staggerContainerVariants}
        className={cn(
          "w-full grid gap-8 sm:gap-12",
          // Mobile: Stack vertically
          "grid-cols-1",
          // Desktop: Side by side
          "lg:grid-cols-2 lg:gap-16",
          // Ensure equal height on desktop
          "lg:items-start"
        )}
      >
        {/* Join With Code Section */}
        <motion.div
          variants={lobbySectionVariants}
          className="w-full flex justify-center"
        >
          <JoinWithCodeSection
            onJoinLobby={handleJoinLobby}
            isLoading={isJoining || isLoading}
            error={joinError || (error && !createError ? error : null)}
            className="w-full max-w-md"
          />
        </motion.div>

        {/* Create Lobby Section */}
        <motion.div
          variants={lobbySectionVariants}
          className="w-full flex justify-center"
        >
          <CreateLobbySection
            onCreateLobby={handleCreateLobby}
            isLoading={isCreating || isLoading}
            createdCode={createdLobbyCode}
            className="w-full max-w-md"
          />
        </motion.div>
      </motion.div>

      {/* Helper Text */}
      <motion.div
        variants={lobbySectionVariants}
        className="text-center max-w-2xl"
      >
        <p className="text-purple-200/60 text-sm sm:text-base font-bangers tracking-wide">
          Alege să te alături unui lobby existent cu un cod de invitație sau
          creează propriul tău lobby pentru a invita prietenii.
        </p>
      </motion.div>

      {/* Loading Overlay for Global Operations */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-slate-900/80 backdrop-blur-sm"
          )}
          aria-live="polite"
          aria-label="Loading"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <p className="text-white font-bangers text-lg tracking-wide">
              Se procesează...
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
