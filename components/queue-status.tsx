"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Clock,
  Play,
  RefreshCw,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  badgeVariants,
  buttonVariants,
  errorVariants,
  loadingVariants,
} from "@/lib/animations/private-lobby-variants";
import { cn } from "@/lib/utils";

interface QueueStatusProps {
  isInQueue: boolean;
  queuePosition: number;
  estimatedWaitTime: number;
  queueSize: number;
  isLoading: boolean;
  error: string | null;
  onJoinQueue: () => Promise<void>;
  onLeaveQueue: () => Promise<void>;
  onClearError: () => void;
  onRetry: () => Promise<void>;
  canJoinQueue: boolean;
  timeInQueue: number;
  className?: string;
}

export function QueueStatus({
  isInQueue,
  queuePosition,
  estimatedWaitTime,
  queueSize,
  isLoading,
  error,
  onJoinQueue,
  onLeaveQueue,
  onClearError,
  onRetry,
  canJoinQueue,
  timeInQueue,
  className,
}: QueueStatusProps) {
  // Local loading states for individual actions
  const [isJoining, setIsJoining] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);

  // Format time helper function
  const formatTime = React.useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }, []);

  // Handle join queue with loading state
  const handleJoinQueue = React.useCallback(async () => {
    if (!canJoinQueue || isJoining) return;

    setIsJoining(true);
    try {
      await onJoinQueue();
    } catch (error) {
      console.error("Failed to join queue:", error);
    } finally {
      setIsJoining(false);
    }
  }, [canJoinQueue, isJoining, onJoinQueue]);

  // Handle leave queue with loading state
  const handleLeaveQueue = React.useCallback(async () => {
    if (!isInQueue || isLeaving) return;

    setIsLeaving(true);
    try {
      await onLeaveQueue();
    } catch (error) {
      console.error("Failed to leave queue:", error);
    } finally {
      setIsLeaving(false);
    }
  }, [isInQueue, isLeaving, onLeaveQueue]);

  // Handle retry with loading state
  const handleRetry = React.useCallback(async () => {
    try {
      await onRetry();
    } catch (error) {
      console.error("Retry failed:", error);
    }
  }, [onRetry]);

  // Determine if any operation is in progress
  const isAnyOperationInProgress = isLoading || isJoining || isLeaving;

  // Get queue status message
  const getQueueStatusMessage = React.useCallback(() => {
    if (isInQueue) {
      if (queuePosition === 1) {
        return "You're next in line!";
      } else if (queuePosition <= 3) {
        return "Almost ready to battle!";
      } else {
        return `Position ${queuePosition} in queue`;
      }
    }
    return "Ready to join the arena?";
  }, [isInQueue, queuePosition]);

  // Get estimated wait time message
  const getWaitTimeMessage = React.useCallback(() => {
    if (!isInQueue) return null;

    if (estimatedWaitTime <= 30) {
      return "Match starting soon!";
    } else if (estimatedWaitTime <= 60) {
      return `~${formatTime(estimatedWaitTime)} wait`;
    } else {
      return `~${formatTime(estimatedWaitTime)} estimated`;
    }
  }, [isInQueue, estimatedWaitTime, formatTime]);

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        "bg-gradient-to-br from-slate-800/90 to-slate-700/90",
        "border-slate-600/50 shadow-2xl",
        "backdrop-blur-sm",
        isInQueue && "border-purple-500/30 shadow-purple-500/10",
        className,
      )}
      role="region"
      aria-label="Battle Royale queue status"
    >
      {/* Animated background gradient for queue state */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-1000",
          isInQueue && "opacity-100",
        )}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 animate-pulse" />
      </div>

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-white font-bangers text-xl tracking-wide">
            <Trophy className="w-6 h-6 text-orange-400" />
            Battle Royale Queue
            {/* Queue size badge */}
            <AnimatePresence>
              {queueSize > 0 && (
                <motion.div
                  variants={badgeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300"
                >
                  <Users className="w-3 h-3" />
                  {queueSize}
                </motion.div>
              )}
            </AnimatePresence>
          </CardTitle>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            {isInQueue && (
              <motion.div
                variants={badgeVariants}
                initial="initial"
                animate="pulse"
                className="w-3 h-3 bg-green-400 rounded-full"
                aria-label="In queue"
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              variants={errorVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-red-300 text-sm font-medium">{error}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onClearError}
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    disabled={isAnyOperationInProgress}
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Queue Status Display */}
        <div className="space-y-4">
          {/* Main status message */}
          <div className="text-center">
            <h3 className="text-2xl font-bangers text-white tracking-wide mb-2">
              {getQueueStatusMessage()}
            </h3>

            {/* Queue details */}
            {isInQueue && (
              <div className="flex items-center justify-center gap-6 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Position {queuePosition}</span>
                </div>

                {getWaitTimeMessage() && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>{getWaitTimeMessage()}</span>
                  </div>
                )}

                {timeInQueue > 0 && (
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>
                      In queue {formatTime(Math.floor(timeInQueue / 1000))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center">
            <AnimatePresence mode="wait">
              {!isInQueue ? (
                <motion.div
                  key="join-button"
                  variants={buttonVariants}
                  initial="initial"
                  animate="initial"
                  whileHover="hover"
                  whileTap="tap"
                  exit="exit"
                >
                  <Button
                    onClick={handleJoinQueue}
                    disabled={!canJoinQueue || isAnyOperationInProgress}
                    className={cn(
                      "bg-gradient-to-r from-purple-600 to-pink-600",
                      "hover:from-purple-700 hover:to-pink-700",
                      "text-white font-bangers text-lg tracking-wide",
                      "px-8 py-3 rounded-full shadow-lg",
                      "hover:shadow-purple-500/25 transition-all duration-300",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "min-w-[200px]",
                    )}
                    aria-label="Join Battle Royale queue"
                  >
                    {isJoining ? (
                      <>
                        <motion.div
                          variants={loadingVariants}
                          animate="animate"
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                        />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Join Queue
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="leave-button"
                  variants={buttonVariants}
                  initial="initial"
                  animate="initial"
                  whileHover="hover"
                  whileTap="tap"
                  exit="exit"
                >
                  <Button
                    onClick={handleLeaveQueue}
                    disabled={isAnyOperationInProgress}
                    variant="outline"
                    className={cn(
                      "border-red-500/30 text-red-300",
                      "hover:bg-red-500/10 hover:border-red-400/50",
                      "font-bangers text-lg tracking-wide",
                      "px-8 py-3 rounded-full",
                      "transition-all duration-300",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "min-w-[200px]",
                    )}
                    aria-label="Leave Battle Royale queue"
                  >
                    {isLeaving ? (
                      <>
                        <motion.div
                          variants={loadingVariants}
                          animate="animate"
                          className="w-5 h-5 border-2 border-red-300/30 border-t-red-300 rounded-full mr-2"
                        />
                        Leaving...
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5 mr-2" />
                        Leave Queue
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Queue Statistics */}
        {queueSize > 0 && (
          <div className="pt-4 border-t border-slate-600/30">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>{queueSize} players queued</span>
              </div>

              {estimatedWaitTime > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>~{formatTime(estimatedWaitTime)} avg wait</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
