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
} from "@/lib/animations/private-lobby-variants";

interface PrivateLobbySectionProps {
  onBackToMain: () => void;
  onJoinLobby: (code: string) => Promise<void>;
  onCreateLobby: () => Promise<string>;
  isLoading?: boolean;
  error?: string | null;
  createdLobbyCode?: string | null;
  joinSuccess?: boolean;
  className?: string;
}

export function PrivateLobbySection({
  onBackToMain,
  onJoinLobby,
  onCreateLobby,
  isLoading = false,
  error = null,
  createdLobbyCode = null,
  joinSuccess = false,
  className,
}: PrivateLobbySectionProps) {
  // Local state for managing individual section loading states
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [isJoining, setIsJoining] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  // Focus management refs
  const backButtonRef = React.useRef<HTMLButtonElement>(null);
  const joinSectionRef = React.useRef<HTMLDivElement>(null);
  const createSectionRef = React.useRef<HTMLDivElement>(null);

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

  // Handle back navigation with keyboard support and focus management
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

  // Focus management for screen readers
  React.useEffect(() => {
    // Announce view change to screen readers
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent =
      "Private lobby interface loaded. Choose to join an existing lobby or create your own.";
    document.body.appendChild(announcement);

    // Focus the back button for logical tab order
    if (backButtonRef.current) {
      backButtonRef.current.focus();
    }

    return () => {
      document.body.removeChild(announcement);
    };
  }, []);

  // Announce dynamic content changes
  React.useEffect(() => {
    if (error) {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "assertive");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = `Error: ${error}`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 100);
    }
  }, [error]);

  React.useEffect(() => {
    if (joinSuccess) {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "polite");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = "Successfully joined lobby!";
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 100);
    }
  }, [joinSuccess]);

  React.useEffect(() => {
    if (createdLobbyCode) {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "polite");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = `Lobby created successfully. Your invitation code is: ${createdLobbyCode}`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 100);
    }
  }, [createdLobbyCode]);

  return (
    <motion.div
      variants={lobbyEnterVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
        "flex flex-col items-center gap-8 sm:gap-12",
        "min-h-full py-8 sm:py-12", // Add padding to ensure button is clickable
        className
      )}
      role="main"
      aria-label="Private lobby interface"
    >
      {/* Back Navigation Button */}
      <motion.div
        variants={lobbySectionVariants}
        className="w-full flex justify-start  sticky top-0 z-20" // Make it sticky and ensure it's always accessible
      >
        <Button
          ref={backButtonRef}
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
            "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            "z-10 relative", // Ensure button is above other elements
            "min-h-[48px] min-w-[160px]", // Ensure minimum touch target size
            "cursor-pointer" // Explicitly set cursor
          )}
          aria-label="Navigate back to main menu"
          aria-describedby="back-button-description"
        >
          <RiArrowLeftLine
            className={cn(
              "w-5 h-5 transition-transform duration-300",
              "group-hover:-translate-x-1"
            )}
            aria-hidden="true"
          />
          <span>BACK TO START</span>
        </Button>
        <div id="back-button-description" className="sr-only">
          Return to the main game selection screen
        </div>
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
          aria-atomic="true"
        >
          <h4 className="text-lg font-bold mb-2" id="error-heading">
            Error
          </h4>
          <p className="text-sm" aria-describedby="error-heading">
            {error}
          </p>
        </motion.div>
      )}

      {/* Main Content Container */}
      <motion.div
        variants={staggerContainerVariants}
        className={cn(
          "w-full grid gap-8 sm:gap-12",
          // Mobile: Stack vertically
          "grid-cols-1",
          // Desktop: Side by side with equal height
          "lg:grid-cols-2 lg:gap-16",
          // Ensure equal height on desktop
          "lg:items-stretch"
        )}
        role="region"
        aria-label="Lobby options"
      >
        {/* Join With Code Section */}
        <motion.div
          ref={joinSectionRef}
          variants={lobbySectionVariants}
          className="w-full flex justify-center"
          role="region"
          aria-label="Join existing lobby"
        >
          <JoinWithCodeSection
            onJoinLobby={handleJoinLobby}
            isLoading={isJoining || isLoading}
            error={joinError || (error && !createError ? error : null)}
            success={joinSuccess}
            className="w-full max-w-md h-full"
          />
        </motion.div>

        {/* Create Lobby Section */}
        <motion.div
          ref={createSectionRef}
          variants={lobbySectionVariants}
          className="w-full flex justify-center"
          role="region"
          aria-label="Create new lobby"
        >
          <CreateLobbySection
            onCreateLobby={handleCreateLobby}
            isLoading={isCreating || isLoading}
            createdCode={createdLobbyCode}
            className="w-full max-w-md h-full"
          />
        </motion.div>
      </motion.div>

      {/* Helper Text */}
      <motion.div
        variants={lobbySectionVariants}
        className="text-center max-w-2xl"
        role="complementary"
        aria-label="Instructions"
      >
        <p className="text-purple-200/60 text-sm sm:text-base font-bangers tracking-wide">
          Choose to join an existing lobby with an invitation code or create
          your own lobby to invite friends.
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
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          aria-label="Loading"
          aria-describedby="loading-description"
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"
              aria-hidden="true"
            />
            <p
              id="loading-description"
              className="text-white font-bangers text-lg tracking-wide"
            >
              Processing...
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
