"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiMailLine } from "react-icons/ri";
import { InvitationCodeInput } from "@/components/invitation-code-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buttonVariants,
  errorVariants,
  badgeVariants,
  microInteractionVariants,
  successVariants,
} from "@/lib/animations/private-lobby-variants";

interface JoinWithCodeSectionProps {
  onJoinLobby: (code: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
  className?: string;
}

export function JoinWithCodeSection({
  onJoinLobby,
  isLoading,
  error,
  className,
}: JoinWithCodeSectionProps) {
  const [invitationCode, setInvitationCode] = React.useState("");
  const [isJoining, setIsJoining] = React.useState(false);

  const handleCodeChange = React.useCallback((code: string) => {
    setInvitationCode(code);
  }, []);

  const handleCodeComplete = React.useCallback(
    async (code: string) => {
      if (code.length === 5 && !isLoading && !isJoining) {
        setIsJoining(true);
        try {
          await onJoinLobby(code);
        } catch (err) {
          // Error handling is managed by parent component
          console.error("Failed to join lobby:", err);
        } finally {
          setIsJoining(false);
        }
      }
    },
    [onJoinLobby, isLoading, isJoining]
  );

  const handleJoinClick = React.useCallback(async () => {
    if (invitationCode.length === 5 && !isLoading && !isJoining) {
      await handleCodeComplete(invitationCode);
    }
  }, [invitationCode, handleCodeComplete, isLoading, isJoining]);

  const isOperationInProgress = isLoading || isJoining;

  return (
    <motion.div
      variants={microInteractionVariants}
      className={cn(
        "flex flex-col items-center gap-6 p-6 sm:p-8",
        "bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50",
        "shadow-2xl shadow-purple-500/10",
        "h-full justify-between",
        className
      )}
    >
      {/* Golden Envelope Icon with Notification Badge */}
      <motion.div
        className="relative"
        variants={microInteractionVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <motion.div
          className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 rounded-full",
            "bg-gradient-to-br from-yellow-400 to-yellow-600",
            "flex items-center justify-center shadow-lg shadow-yellow-500/30",
            "transition-all duration-300"
          )}
          animate={isOperationInProgress ? "animate" : "initial"}
          variants={
            isOperationInProgress ? successVariants : microInteractionVariants
          }
        >
          <RiMailLine
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 text-white",
              isOperationInProgress && "animate-bounce"
            )}
          />
        </motion.div>

        {/* Notification Badge */}
        <motion.div
          variants={badgeVariants}
          initial="initial"
          animate="animate"
          className={cn(
            "absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7",
            "bg-gradient-to-br from-red-500 to-red-600",
            "rounded-full flex items-center justify-center",
            "shadow-lg shadow-red-500/30 border-2 border-slate-800"
          )}
        >
          <span className="text-white text-xs sm:text-sm font-bold">!</span>
        </motion.div>
      </motion.div>

      {/* English Localization Text */}
      <motion.div className="text-center" variants={microInteractionVariants}>
        <h3 className="text-xl sm:text-2xl font-bangers text-white tracking-wide mb-2">
          Join with invitation code
        </h3>
        <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide">
          Enter the code received from your friends
        </p>
      </motion.div>

      {/* Invitation Code Input */}
      <motion.div
        className="w-full max-w-md"
        variants={microInteractionVariants}
      >
        <InvitationCodeInput
          value={invitationCode}
          onChange={handleCodeChange}
          onComplete={handleCodeComplete}
          disabled={isOperationInProgress}
          error={!!error}
          className="w-full"
        />
      </motion.div>

      {/* Error Display */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            variants={errorVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "w-full max-w-md p-3 rounded-lg",
              "bg-red-500/10 border border-red-500/30",
              "text-red-400 text-sm text-center font-bangers tracking-wide"
            )}
            role="alert"
            aria-live="polite"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Button */}
      <motion.div
        className="w-full max-w-md"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
      >
        <Button
          onClick={handleJoinClick}
          disabled={invitationCode.length !== 5 || isOperationInProgress}
          className={cn(
            "w-full h-12 sm:h-14",
            "bg-gradient-to-r from-purple-600 to-purple-700",
            "hover:from-purple-500 hover:to-purple-600",
            "disabled:from-slate-600 disabled:to-slate-700",
            "text-white font-bangers text-lg sm:text-xl tracking-wide",
            "shadow-lg shadow-purple-500/30",
            "transition-all duration-300",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isOperationInProgress ? (
            <motion.div
              className="flex items-center gap-2"
              variants={successVariants}
              animate="animate"
            >
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Se alătură...</span>
            </motion.div>
          ) : (
            "JOIN NOW"
          )}
        </Button>
      </motion.div>

      {/* Helper Text */}
      <motion.p
        className="text-purple-200/50 text-xs sm:text-sm text-center font-bangers tracking-wide max-w-md"
        variants={microInteractionVariants}
      >
        The invitation code contains 5 alphanumeric characters
      </motion.p>
    </motion.div>
  );
}
