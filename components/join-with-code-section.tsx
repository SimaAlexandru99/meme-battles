"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import {
  RiAlertLine,
  RiCheckLine,
  RiMailLine,
  RiSettingsLine,
  RiUserLine,
} from "react-icons/ri";
import { toast } from "sonner";
import { InvitationCodeInput } from "@/components/invitation-code-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  badgeVariants,
  buttonVariants,
  errorVariants,
  microInteractionVariants,
  successVariants,
} from "@/lib/animations/private-lobby-variants";
import { cn } from "@/lib/utils";

interface JoinWithCodeSectionProps {
  onJoinLobby: (code: string) => Promise<void>;
  onValidateCode?: (code: string) => Promise<{
    isValid: boolean;
    lobbyInfo?: {
      playerCount: number;
      maxPlayers: number;
      hostName: string;
      settings: GameSettings;
    };
  }>;
  isLoading: boolean;
  error?: string | null;
  success?: boolean;
  className?: string;
}

export function JoinWithCodeSection({
  onJoinLobby,
  onValidateCode,
  isLoading,
  error,
  success = false,
  className,
}: JoinWithCodeSectionProps) {
  const [invitationCode, setInvitationCode] = React.useState("");
  const [isJoining, setIsJoining] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  );
  const [lobbyPreview, setLobbyPreview] = React.useState<{
    playerCount: number;
    maxPlayers: number;
    hostName: string;
    settings: GameSettings;
  } | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  // Focus management refs
  const joinButtonRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLDivElement>(null);

  // Debounced validation
  const validateCodeDebounced = React.useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (code: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (code.length === 5 && onValidateCode) {
          setIsValidating(true);
          setValidationError(null);
          setLobbyPreview(null);

          try {
            const result = await onValidateCode(code);
            if (result.isValid && result.lobbyInfo) {
              setLobbyPreview(result.lobbyInfo);
              setValidationError(null);
            } else {
              setValidationError("Lobby not found or invalid code");
              setLobbyPreview(null);
            }
          } catch {
            setValidationError("Unable to validate code. Please try again.");
            setLobbyPreview(null);
          } finally {
            setIsValidating(false);
          }
        } else if (code.length === 5) {
          // Basic format validation without server check
          setValidationError(null);
          setLobbyPreview(null);
        } else {
          setValidationError(null);
          setLobbyPreview(null);
        }
      }, 500);
    };
  }, [onValidateCode]);

  const handleCodeChange = React.useCallback(
    (code: string) => {
      setInvitationCode(code);
      validateCodeDebounced(code);
    },
    [validateCodeDebounced],
  );

  const handleCodeComplete = React.useCallback(
    async (code: string) => {
      if (code.length === 5 && !isLoading && !isJoining && !validationError) {
        setIsJoining(true);
        try {
          await onJoinLobby(code);
          setRetryCount(0); // Reset retry count on success
        } catch (err) {
          const lobbyError = err as LobbyError;

          // Handle specific error types with user-friendly messages
          if (lobbyError.type === "LOBBY_NOT_FOUND") {
            toast.error("Lobby not found", {
              description: "Please check the invitation code and try again.",
            });
          } else if (lobbyError.type === "LOBBY_FULL") {
            toast.error("Lobby is full", {
              description: "This lobby has reached its maximum capacity.",
            });
          } else if (lobbyError.type === "LOBBY_ALREADY_STARTED") {
            toast.error("Game already started", {
              description: "You cannot join a game that has already begun.",
            });
          } else if (lobbyError.type === "NETWORK_ERROR") {
            toast.error("Network connection issue", {
              description: "Please check your connection and try again.",
              action: {
                label: "Retry",
                onClick: () => handleCodeComplete(code),
              },
            });
          } else {
            toast.error("Failed to join lobby", {
              description: lobbyError.userMessage || "Please try again.",
              action: {
                label: "Retry",
                onClick: () => handleCodeComplete(code),
              },
            });
          }

          setRetryCount((prev) => prev + 1);
        } finally {
          setIsJoining(false);
        }
      }
    },
    [onJoinLobby, isLoading, isJoining, validationError],
  );

  const handleJoinClick = React.useCallback(async () => {
    if (invitationCode.length === 5 && !isLoading && !isJoining) {
      await handleCodeComplete(invitationCode);
    }
  }, [invitationCode, handleCodeComplete, isLoading, isJoining]);

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (
        event.key === "Enter" &&
        invitationCode.length === 5 &&
        !isLoading &&
        !isJoining
      ) {
        event.preventDefault();
        handleJoinClick().then((r) => console.log(r));
      }
    },
    [invitationCode, isLoading, isJoining, handleJoinClick],
  );

  const isOperationInProgress = isLoading || isJoining;
  // const hasError = !!error; // Currently unused but kept for future error handling
  // const canRetry = hasError && retryCount < 3; // Currently unused but kept for future retry functionality

  // Announce status changes to screen readers
  React.useEffect(() => {
    if (error) {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "assertive");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = `Join error: ${error}`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 100);
    }
  }, [error]);

  React.useEffect(() => {
    if (success) {
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
  }, [success]);

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
      aria-label="Join existing lobby with invitation code"
      onKeyDown={handleKeyDown}
    >
      {/* Golden Envelope Icon with Notification Badge */}
      <motion.div
        className="relative"
        variants={microInteractionVariants}
        whileHover="hover"
        whileTap="tap"
        role="img"
        aria-label="Golden envelope with notification badge"
      >
        <motion.div
          className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 rounded-full",
            "bg-gradient-to-br from-yellow-400 to-yellow-600",
            "flex items-center justify-center shadow-lg shadow-yellow-500/30",
            "transition-all duration-300",
          )}
          animate={isOperationInProgress ? "animate" : "initial"}
          variants={
            isOperationInProgress ? successVariants : microInteractionVariants
          }
        >
          <RiMailLine
            className={cn(
              "w-8 h-8 sm:w-10 sm:h-10 text-white",
              isOperationInProgress && "animate-bounce",
            )}
            aria-hidden="true"
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
            "shadow-lg shadow-red-500/30 border-2 border-slate-800",
          )}
          role="img"
          aria-label="Notification indicator"
        >
          <span
            className="text-white text-xs sm:text-sm font-bold"
            aria-hidden="true"
          >
            !
          </span>
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
      <motion.section
        ref={inputRef}
        className="w-full max-w-md"
        variants={microInteractionVariants}
        aria-labelledby="code-input-label"
      >
        <div id="code-input-label" className="sr-only">
          Invitation code input field
        </div>
        <InvitationCodeInput
          value={invitationCode}
          onChange={handleCodeChange}
          onComplete={handleCodeComplete}
          disabled={isOperationInProgress}
          error={!!error || !!validationError}
          className="w-full"
        />

        {/* Real-time validation indicator */}
        <AnimatePresence mode="wait">
          {isValidating && invitationCode.length === 5 && (
            <motion.div
              variants={microInteractionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-center justify-center gap-2 mt-2"
            >
              <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
              <span className="text-purple-300 text-xs font-bangers">
                Validating code...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Lobby Preview */}
      <AnimatePresence mode="wait">
        {lobbyPreview && !error && (
          <motion.section
            variants={successVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "w-full max-w-md p-4 rounded-lg",
              "bg-blue-500/10 border border-blue-500/30",
              "text-center",
            )}
            aria-label="Lobby preview information"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <RiCheckLine className="w-4 h-4 text-green-400" />
              <p className="text-green-400 text-sm font-bangers tracking-wide">
                Lobby Found!
              </p>
            </div>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className="text-blue-200/70 flex items-center gap-1">
                  <RiUserLine className="w-3 h-3" />
                  Players:
                </span>
                <Badge
                  variant="secondary"
                  className="bg-blue-500/20 text-blue-300"
                >
                  {lobbyPreview.playerCount}/{lobbyPreview.maxPlayers}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-blue-200/70">Host:</span>
                <Badge
                  variant="secondary"
                  className="bg-blue-500/20 text-blue-300"
                >
                  {lobbyPreview.hostName}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-blue-200/70 flex items-center gap-1">
                  <RiSettingsLine className="w-3 h-3" />
                  Rounds:
                </span>
                <Badge
                  variant="secondary"
                  className="bg-blue-500/20 text-blue-300"
                >
                  {lobbyPreview.settings.rounds}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-blue-200/70">Time Limit:</span>
                <Badge
                  variant="secondary"
                  className="bg-blue-500/20 text-blue-300"
                >
                  {lobbyPreview.settings.timeLimit}s
                </Badge>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Validation Error Display */}
      <AnimatePresence mode="wait">
        {validationError && (
          <motion.div
            variants={errorVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "w-full max-w-md p-3 rounded-lg",
              "bg-red-500/10 border border-red-500/30",
              "text-center",
            )}
            role="alert"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <RiAlertLine className="w-4 h-4 text-red-400" />
              <p className="text-red-400 text-sm font-bangers tracking-wide">
                Invalid Code
              </p>
            </div>
            <p className="text-red-400/70 text-xs sm:text-sm font-bangers tracking-wide">
              {validationError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
              "text-red-400 text-sm text-center font-bangers tracking-wide",
            )}
            role="alert"
            aria-live="polite"
            aria-atomic="true"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Display */}
      <AnimatePresence mode="wait">
        {success && (
          <motion.div
            variants={successVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              "w-full max-w-md p-3 rounded-lg",
              "bg-green-500/10 border border-green-500/30",
              "text-green-400 text-sm text-center font-bangers tracking-wide",
            )}
            role="alert"
            aria-live="polite"
            aria-atomic="true"
          >
            Successfully joined lobby!
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
          ref={joinButtonRef}
          onClick={handleJoinClick}
          disabled={
            invitationCode.length !== 5 ||
            isOperationInProgress ||
            isValidating ||
            !!validationError ||
            (retryCount >= 3 && !!error)
          }
          className={cn(
            "w-full h-12 sm:h-14",
            "bg-gradient-to-r from-purple-600 to-purple-700",
            "hover:from-purple-500 hover:to-purple-600",
            "disabled:from-slate-600 disabled:to-slate-700",
            "text-white font-bangers text-lg sm:text-xl tracking-wide",
            "shadow-lg shadow-purple-500/30",
            "transition-all duration-300",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus-visible:ring-2 focus-visible:ring-purple-500/50",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            lobbyPreview && "ring-2 ring-green-500/30 shadow-green-500/20",
            validationError && "ring-2 ring-red-500/30 shadow-red-500/20",
          )}
          aria-label={
            isOperationInProgress
              ? "Joining lobby..."
              : isValidating
                ? "Validating code..."
                : validationError
                  ? "Invalid code - cannot join"
                  : lobbyPreview
                    ? `Join ${lobbyPreview.hostName}'s lobby`
                    : "Join lobby with invitation code"
          }
          aria-describedby="join-button-description"
        >
          <AnimatePresence mode="wait">
            {isOperationInProgress ? (
              <motion.div
                key="joining"
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
                <span>
                  {retryCount > 0
                    ? `Retrying... (${retryCount}/3)`
                    : "Joining..."}
                </span>
              </motion.div>
            ) : isValidating ? (
              <motion.div
                key="validating"
                className="flex items-center gap-2"
                variants={microInteractionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span>Validating...</span>
              </motion.div>
            ) : validationError ? (
              <motion.div
                key="error"
                className="flex items-center gap-2"
                variants={errorVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <RiAlertLine className="w-5 h-5" />
                <span>INVALID CODE</span>
              </motion.div>
            ) : lobbyPreview ? (
              <motion.div
                key="ready"
                className="flex items-center gap-2"
                variants={successVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <RiCheckLine className="w-5 h-5" />
                <span>JOIN LOBBY</span>
              </motion.div>
            ) : success ? (
              <motion.div
                key="success"
                className="flex items-center gap-2"
                variants={successVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <RiCheckLine className="w-5 h-5" />
                <span>JOINED!</span>
              </motion.div>
            ) : (
              <motion.span
                key="default"
                variants={microInteractionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                JOIN NOW
              </motion.span>
            )}
          </AnimatePresence>
        </Button>

        <div id="join-button-description" className="sr-only">
          {isOperationInProgress
            ? "Joining lobby, please wait"
            : isValidating
              ? "Validating invitation code"
              : validationError
                ? "Cannot join - invalid invitation code"
                : lobbyPreview
                  ? `Ready to join ${lobbyPreview.hostName}'s lobby with ${lobbyPreview.playerCount}/${lobbyPreview.maxPlayers} players`
                  : invitationCode.length === 5
                    ? "Join the lobby using the entered invitation code"
                    : "Enter a 5-character invitation code to enable this button"}
        </div>
      </motion.div>

      {/* Helper Text */}
      <motion.aside
        className="text-purple-200/50 text-xs sm:text-sm text-center font-bangers tracking-wide max-w-md"
        variants={microInteractionVariants}
        aria-label="Instructions"
      >
        The invitation code contains 5 alphanumeric characters
      </motion.aside>
    </motion.div>
  );
}
