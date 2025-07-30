"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiAddLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buttonVariants,
  successVariants,
  microInteractionVariants,
  badgeVariants,
} from "@/lib/animations/private-lobby-variants";

interface CreateLobbySectionProps {
  onCreateLobby: () => Promise<string>;
  isLoading: boolean;
  createdCode?: string | null;
  className?: string;
}

export function CreateLobbySection({
  onCreateLobby,
  isLoading,
  createdCode,
  className,
}: CreateLobbySectionProps) {
  const [isCreating, setIsCreating] = React.useState(false);

  // Focus management refs
  const createButtonRef = React.useRef<HTMLButtonElement>(null);
  const codeDisplayRef = React.useRef<HTMLDivElement>(null);

  const handleCreateClick = React.useCallback(async () => {
    if (!isLoading && !isCreating) {
      setIsCreating(true);
      try {
        await onCreateLobby();
      } catch (err) {
        // Error handling is managed by parent component
        console.error("Failed to create lobby:", err);
      } finally {
        setIsCreating(false);
      }
    }
  }, [onCreateLobby, isLoading, isCreating]);

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && !isLoading && !isCreating) {
        event.preventDefault();
        handleCreateClick();
      }
    },
    [isLoading, isCreating, handleCreateClick],
  );

  const isOperationInProgress = isLoading || isCreating;

  // Announce status changes to screen readers
  React.useEffect(() => {
    if (createdCode) {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "polite");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = `Lobby created successfully. Your invitation code is: ${createdCode}. Send this code to your friends to join.`;
      document.body.appendChild(announcement);

      // Focus the code display for easy copying
      if (codeDisplayRef.current) {
        codeDisplayRef.current.focus();
      }

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 100);
    }
  }, [createdCode]);

  return (
    <motion.div
      variants={microInteractionVariants}
      className={cn(
        "flex flex-col items-center gap-6 p-6 sm:p-8",
        "bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50",
        "shadow-2xl shadow-purple-500/10",
        "h-full justify-between",
        className,
      )}
      role="region"
      aria-label="Create new private lobby"
      onKeyDown={handleKeyDown}
    >
      {/* Two Blue Cards with Smiley Faces */}
      <motion.div
        className="relative w-full max-w-sm h-32 sm:h-36"
        variants={microInteractionVariants}
        role="img"
        aria-label="Two blue cards with yellow smiley faces representing friends"
      >
        {/* First Card (Back) */}
        <motion.div
          className={cn(
            "absolute top-2 left-4 w-24 h-24 sm:w-28 sm:h-28",
            "bg-gradient-to-br from-blue-400 to-blue-600",
            "rounded-2xl shadow-lg shadow-blue-500/30",
            "flex items-center justify-center",
            "transform rotate-[-8deg]",
          )}
          variants={microInteractionVariants}
          whileHover="hover"
          whileTap="tap"
          animate={isOperationInProgress ? "animate" : "initial"}
          role="img"
          aria-label="First blue card with yellow smiley face"
        >
          {/* Yellow Smiley Face */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
            <div className="flex flex-col items-center gap-1">
              {/* Eyes */}
              <div className="flex gap-2">
                <div
                  className="w-1.5 h-1.5 bg-slate-800 rounded-full"
                  aria-hidden="true"
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-slate-800 rounded-full"
                  aria-hidden="true"
                ></div>
              </div>
              {/* Smile */}
              <div
                className="w-4 h-2 border-b-2 border-slate-800 rounded-full"
                aria-hidden="true"
              ></div>
            </div>
          </div>
        </motion.div>

        {/* Second Card (Front) */}
        <motion.div
          className={cn(
            "absolute top-0 right-4 w-24 h-24 sm:w-28 sm:h-28",
            "bg-gradient-to-br from-blue-500 to-blue-700",
            "rounded-2xl shadow-lg shadow-blue-500/40",
            "flex items-center justify-center",
            "transform rotate-[8deg]",
          )}
          variants={microInteractionVariants}
          whileHover="hover"
          whileTap="tap"
          animate={isOperationInProgress ? "animate" : "initial"}
          role="img"
          aria-label="Second blue card with yellow smiley face"
        >
          {/* Yellow Smiley Face */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
            <div className="flex flex-col items-center gap-1">
              {/* Eyes */}
              <div className="flex gap-2">
                <div
                  className="w-1.5 h-1.5 bg-slate-800 rounded-full"
                  aria-hidden="true"
                ></div>
                <div
                  className="w-1.5 h-1.5 bg-slate-800 rounded-full"
                  aria-hidden="true"
                ></div>
              </div>
              {/* Smile */}
              <div
                className="w-4 h-2 border-b-2 border-slate-800 rounded-full"
                aria-hidden="true"
              ></div>
            </div>
          </div>
        </motion.div>

        {/* Green Speech Bubble with Plus Icon */}
        <motion.div
          className={cn(
            "absolute top-[-20px] left-1/2 transform -translate-x-1/2",
            "w-12 h-12 sm:w-14 sm:h-14",
            "bg-gradient-to-br from-green-400 to-green-600",
            "rounded-full shadow-lg shadow-green-500/30",
            "flex items-center justify-center",
          )}
          variants={badgeVariants}
          initial="initial"
          animate="animate"
          whileHover="pulse"
          role="img"
          aria-label="Green speech bubble with plus icon indicating create action"
        >
          <motion.div
            animate={isOperationInProgress ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RiAddLine
              className="w-6 h-6 sm:w-7 sm:h-7 text-white"
              aria-hidden="true"
            />
          </motion.div>

          {/* Speech Bubble Tail */}
          <div
            className={cn(
              "absolute top-full left-1/2 transform -translate-x-1/2",
              "w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px]",
              "border-l-transparent border-r-transparent border-t-green-500",
            )}
            aria-hidden="true"
          />
        </motion.div>
      </motion.div>

      {/* English Description Text */}
      <motion.div className="text-center" variants={microInteractionVariants}>
        <h3 className="text-xl sm:text-2xl font-bangers text-white tracking-wide mb-2">
          Create a private lobby
        </h3>
        <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide">
          Create a lobby and invite your friends
        </p>
      </motion.div>

      {/* Created Code Display */}
      <AnimatePresence mode="wait">
        {createdCode && (
          <motion.div
            ref={codeDisplayRef}
            variants={successVariants}
            initial="initial"
            animate="animate"
            exit="initial"
            className={cn(
              "w-full max-w-md p-4 rounded-lg",
              "bg-green-500/10 border border-green-500/30",
              "text-center",
            )}
            role="region"
            aria-label="Created invitation code"
            tabIndex={0}
          >
            <p className="text-green-400 text-sm font-bangers tracking-wide mb-2">
              Your invitation code:
            </p>
            <motion.div
              className={cn(
                "text-2xl sm:text-3xl font-bangers text-white tracking-widest",
                "bg-slate-800/50 rounded-lg py-2 px-4",
                "border border-green-500/30 shadow-lg",
                "focus-visible:ring-2 focus-visible:ring-green-500/50",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
              )}
              variants={microInteractionVariants}
              whileHover="hover"
              role="textbox"
              aria-label={`Invitation code: ${createdCode}`}
              aria-describedby="code-instructions"
            >
              {createdCode}
            </motion.div>
            <p
              id="code-instructions"
              className="text-green-400/70 text-xs sm:text-sm font-bangers tracking-wide mt-2"
            >
              Send this code to your friends!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Lobby Button */}
      <motion.div
        className="w-full max-w-md"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <Button
          ref={createButtonRef}
          onClick={handleCreateClick}
          disabled={isOperationInProgress}
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
          )}
          aria-label={
            isOperationInProgress
              ? "Creating lobby..."
              : "Create new private lobby"
          }
          aria-describedby="create-button-description"
        >
          {isOperationInProgress ? (
            <motion.div
              className="flex items-center gap-2"
              variants={successVariants}
              animate="animate"
            >
              <div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
              <span>Creating...</span>
            </motion.div>
          ) : (
            "CREATE MY LOBBY"
          )}
        </Button>
        <div id="create-button-description" className="sr-only">
          {isOperationInProgress
            ? "Creating a new private lobby, please wait"
            : "Create a new private lobby and receive an invitation code to share with friends"}
        </div>
      </motion.div>

      {/* Helper Text */}
      <motion.p
        className="text-purple-200/50 text-xs sm:text-sm text-center font-bangers tracking-wide max-w-md"
        variants={microInteractionVariants}
        role="complementary"
        aria-label="Instructions"
      >
        You will receive an invitation code that you can send to friends
      </motion.p>
    </motion.div>
  );
}
