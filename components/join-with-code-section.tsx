"use client";

import * as React from "react";
import { RiMailLine } from "react-icons/ri";
import { InvitationCodeInput } from "@/components/invitation-code-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div
      className={cn(
        "flex flex-col items-center gap-6 p-6 sm:p-8",
        "bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50",
        "shadow-2xl shadow-purple-500/10",
        className
      )}
    >
      {/* Golden Envelope Icon with Notification Badge */}
      <div className="relative">
        <div
          className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 rounded-full",
            "bg-gradient-to-br from-yellow-400 to-yellow-600",
            "flex items-center justify-center shadow-lg shadow-yellow-500/30",
            "transition-all duration-300",
            isOperationInProgress
              ? "animate-pulse scale-105"
              : "hover:scale-110 hover:shadow-yellow-500/50"
          )}
        >
          <RiMailLine
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 text-white",
              isOperationInProgress && "animate-bounce"
            )}
          />
        </div>

        {/* Notification Badge */}
        <div
          className={cn(
            "absolute -top-1 -right-1 w-6 h-6 sm:w-7 sm:h-7",
            "bg-gradient-to-br from-red-500 to-red-600",
            "rounded-full flex items-center justify-center",
            "shadow-lg shadow-red-500/30 border-2 border-slate-800",
            "animate-pulse"
          )}
        >
          <span className="text-white text-xs sm:text-sm font-bold">!</span>
        </div>
      </div>

      {/* Romanian Localization Text */}
      <div className="text-center">
        <h3 className="text-xl sm:text-2xl font-bangers text-white tracking-wide mb-2">
          Alătură-te cu codul de invitație
        </h3>
        <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide">
          Introdu codul primit de la prietenii tăi
        </p>
      </div>

      {/* Invitation Code Input */}
      <div className="w-full max-w-md">
        <InvitationCodeInput
          value={invitationCode}
          onChange={handleCodeChange}
          onComplete={handleCodeComplete}
          disabled={isOperationInProgress}
          error={!!error}
          className="w-full"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div
          className={cn(
            "w-full max-w-md p-3 rounded-lg",
            "bg-red-500/10 border border-red-500/30",
            "text-red-400 text-sm text-center font-bangers tracking-wide",
            "animate-in slide-in-from-top-2 duration-300"
          )}
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {/* Join Button */}
      <Button
        onClick={handleJoinClick}
        disabled={invitationCode.length !== 5 || isOperationInProgress}
        className={cn(
          "w-full max-w-md h-12 sm:h-14",
          "bg-gradient-to-r from-purple-600 to-purple-700",
          "hover:from-purple-500 hover:to-purple-600",
          "disabled:from-slate-600 disabled:to-slate-700",
          "text-white font-bangers text-lg sm:text-xl tracking-wide",
          "shadow-lg shadow-purple-500/30",
          "transition-all duration-300",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !isOperationInProgress &&
            invitationCode.length === 5 &&
            "hover:scale-105"
        )}
      >
        {isOperationInProgress ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Se alătură...</span>
          </div>
        ) : (
          "ALĂTURĂ-TE ACUM"
        )}
      </Button>

      {/* Helper Text */}
      <p className="text-purple-200/50 text-xs sm:text-sm text-center font-bangers tracking-wide max-w-md">
        Codul de invitație conține 5 caractere alfanumerice
      </p>
    </div>
  );
}
