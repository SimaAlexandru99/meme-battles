"use client";

import * as Sentry from "@sentry/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Crown, Gamepad2, Target, Trophy, Zap } from "lucide-react";
import * as React from "react";
import { MatchmakingProgress } from "@/components/matchmaking-progress";
import { QueuePreferencesComponent } from "@/components/queue-preferences";
import { QueueStatus } from "@/components/queue-status";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBattleRoyaleStats } from "@/hooks/use-battle-royale-stats";
import { useMatchmakingQueue } from "@/hooks/use-matchmaking-queue";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  lobbyEnterVariants,
  lobbySectionVariants,
  staggerContainerVariants,
} from "@/lib/animations/private-lobby-variants";
import { cn } from "@/lib/utils";

interface BattleRoyaleInterfaceProps {
  onBackToMain: () => void;
  className?: string;
}

export function BattleRoyaleInterface({
  onBackToMain,
  className,
}: BattleRoyaleInterfaceProps) {
  const { user } = useCurrentUser();
  const {
    isInQueue,
    queuePosition,
    estimatedWaitTime,
    queueSize,
    isLoading,
    error,
    matchFound,
    lobbyCode,
    joinQueue,
    leaveQueue,
    updatePreferences,
    canJoinQueue,
    timeInQueue,
    clearError,
    retry,
    retryCount,
    nextRetryTime,
    isRetrying,
    manualRetry,
  } = useMatchmakingQueue();

  // Battle Royale Statistics
  const {
    stats,
    rank,
    nextRankProgress,
    isLoading: statsLoading,
  } = useBattleRoyaleStats();

  // Focus management refs - reusing existing patterns
  const backButtonRef = React.useRef<HTMLButtonElement>(null);
  const queueStatusRef = React.useRef<HTMLDivElement>(null);
  const preferencesRef = React.useRef<HTMLDivElement>(null);

  // Handle back navigation with keyboard support and focus management
  const handleBackToMain = React.useCallback(
    (event?: React.KeyboardEvent) => {
      if (!event || event.key === "Enter" || event.key === " ") {
        event?.preventDefault();

        // Leave queue if currently in queue
        if (isInQueue) {
          leaveQueue().catch((error) => {
            console.error("Failed to leave queue on back navigation:", error);
          });
        }

        onBackToMain();
      }
    },
    [onBackToMain, isInQueue, leaveQueue],
  );

  // Handle joining the Battle Royale queue
  const handleJoinQueue = React.useCallback(async () => {
    if (!canJoinQueue) {
      return;
    }

    try {
      await joinQueue();

      Sentry.addBreadcrumb({
        message: "Player joined Battle Royale queue",
        data: {
          playerUid: user?.id,
          queueSize,
        },
        level: "info",
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: "join_battle_royale_queue",
          userId: user?.id || "anonymous",
        },
      });
    }
  }, [canJoinQueue, joinQueue, user?.id, queueSize]);

  // Handle leaving the queue
  const handleLeaveQueue = React.useCallback(async () => {
    try {
      await leaveQueue();

      Sentry.addBreadcrumb({
        message: "Player left Battle Royale queue",
        data: {
          playerUid: user?.id,
          timeInQueue,
        },
        level: "info",
      });
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          operation: "leave_battle_royale_queue",
          userId: user?.id || "anonymous",
        },
      });
    }
  }, [leaveQueue, user?.id, timeInQueue]);

  // Handle preference updates
  const handleUpdatePreferences = React.useCallback(
    async (preferences: Partial<QueuePreferences>) => {
      try {
        await updatePreferences(preferences);

        Sentry.addBreadcrumb({
          message: "Updated Battle Royale queue preferences",
          data: {
            playerUid: user?.id,
            preferences,
          },
          level: "info",
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            operation: "update_queue_preferences",
            userId: user?.id || "anonymous",
          },
        });
      }
    },
    [updatePreferences, user?.id],
  );

  // Redirect to lobby when match is found
  React.useEffect(() => {
    if (matchFound && lobbyCode) {
      // Redirect to the Battle Royale lobby
      window.location.href = `/game/${lobbyCode}`;
    }
  }, [matchFound, lobbyCode]);

  // Focus management for screen readers - reusing existing patterns
  React.useEffect(() => {
    // Announce view change to screen readers
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent =
      "Battle Royale interface loaded. Join the queue to find competitive matches.";
    document.body.appendChild(announcement);

    // Focus the back button for logical tab order
    if (backButtonRef.current) {
      backButtonRef.current.focus();
    }

    return () => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    };
  }, []);

  // Announce dynamic content changes - reusing existing patterns
  React.useEffect(() => {
    if (error) {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "assertive");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = `Error: ${error}`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 100);
    }
  }, [error]);

  React.useEffect(() => {
    if (isInQueue) {
      const positionText =
        queuePosition === 0 ? "unknown" : queuePosition.toString();
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "polite");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = `Joined Battle Royale queue. Position: ${positionText}, Estimated wait: ${estimatedWaitTime} seconds.`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        if (document.body.contains(announcement)) {
          document.body.removeChild(announcement);
        }
      }, 100);
    }
  }, [isInQueue, queuePosition, estimatedWaitTime]);

  return (
    <ErrorBoundary>
      <motion.main
        variants={lobbyEnterVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn(
          "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
          "flex flex-col items-center gap-8 sm:gap-12",
          "min-h-full py-8 sm:py-12",
          "relative",
          className,
        )}
        aria-label="Battle Royale matchmaking interface"
      >
        {/* Back Navigation Button - reusing existing patterns */}
        <motion.div
          variants={lobbySectionVariants}
          className="w-full flex justify-start sticky top-0 z-20"
        >
          <Button
            ref={backButtonRef}
            onClick={() => handleBackToMain()}
            onKeyDown={handleBackToMain}
            disabled={isLoading}
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
              "z-10 relative",
              "min-h-[48px] min-w-[160px]",
              "cursor-pointer",
            )}
            aria-label="Navigate back to main menu"
            aria-describedby="back-button-description"
          >
            <ArrowLeft
              className={cn(
                "w-5 h-5 transition-transform duration-300",
                "group-hover:-translate-x-1",
              )}
              aria-hidden="true"
            />
            <span>BACK TO START</span>
          </Button>
          <div id="back-button-description" className="sr-only">
            Return to the main game selection screen
          </div>
        </motion.div>

        {/* Main Content Container - reusing existing grid patterns */}
        <motion.section
          variants={staggerContainerVariants}
          className={cn(
            "w-full grid gap-8 sm:gap-12",
            // Mobile: Stack vertically
            "grid-cols-1",
            // Desktop: Three columns for queue, preferences, and stats
            "lg:grid-cols-3 lg:gap-16",
            // Ensure equal height on desktop
            "lg:items-start",
          )}
          aria-label="Battle Royale matchmaking options"
        >
          {/* Queue Status Section */}
          <motion.section
            ref={queueStatusRef}
            variants={lobbySectionVariants}
            className="w-full flex justify-center"
            aria-label="Queue status and matchmaking progress"
          >
            <div className="w-full max-w-2xl space-y-6">
              <QueueStatus
                isInQueue={isInQueue}
                queuePosition={queuePosition}
                estimatedWaitTime={estimatedWaitTime}
                queueSize={queueSize}
                isLoading={isLoading}
                error={error}
                onJoinQueue={handleJoinQueue}
                onLeaveQueue={handleLeaveQueue}
                onClearError={clearError}
                onRetry={retry}
                onManualRetry={manualRetry}
                canJoinQueue={canJoinQueue}
                timeInQueue={timeInQueue}
                retryCount={retryCount}
                nextRetryTime={nextRetryTime}
                isRetrying={isRetrying}
                className="w-full"
              />

              <AnimatePresence>
                {isInQueue && (
                  <MatchmakingProgress
                    queuePosition={queuePosition}
                    estimatedWaitTime={estimatedWaitTime}
                    timeInQueue={timeInQueue}
                    queueSize={queueSize}
                    className="w-full"
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Queue Preferences Section */}
          <motion.section
            ref={preferencesRef}
            variants={lobbySectionVariants}
            className="w-full flex justify-center"
            aria-label="Matchmaking preferences"
          >
            <QueuePreferencesComponent
              onUpdatePreferences={handleUpdatePreferences}
              isInQueue={isInQueue}
              isLoading={isLoading}
              className="w-full max-w-md"
            />
          </motion.section>

          {/* Battle Royale Statistics Section */}
          <motion.section
            variants={lobbySectionVariants}
            className="w-full flex justify-center"
            aria-label="Battle Royale statistics and ranking"
          >
            <div className="w-full max-w-md">
              <Card
                className={cn(
                  "relative overflow-hidden",
                  "bg-gradient-to-br from-slate-800/70 to-slate-700/70",
                  "border-slate-600/40 shadow-lg",
                  "backdrop-blur-sm",
                )}
                aria-label="Battle Royale player statistics"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-white font-bangers text-lg tracking-wide">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Your Stats
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                  ) : stats ? (
                    <>
                      {/* Current Rank */}
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-400" />
                          <span className="text-slate-200 text-sm">Rank</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-white border-current",
                            rank === "Bronze" &&
                              "text-orange-400 border-orange-400",
                            rank === "Silver" &&
                              "text-slate-400 border-slate-400",
                            rank === "Gold" &&
                              "text-yellow-400 border-yellow-400",
                            rank === "Platinum" &&
                              "text-slate-300 border-slate-300",
                            rank === "Diamond" &&
                              "text-blue-400 border-blue-400",
                            rank === "Master" && "text-red-400 border-red-400",
                          )}
                        >
                          {rank}
                        </Badge>
                      </div>

                      {/* Skill Rating */}
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-400" />
                          <span className="text-slate-200 text-sm">
                            Skill Rating
                          </span>
                        </div>
                        <span className="text-purple-300 font-medium">
                          {stats.skillRating}
                        </span>
                      </div>

                      {/* Games Played */}
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="w-4 h-4 text-green-400" />
                          <span className="text-slate-200 text-sm">Games</span>
                        </div>
                        <span className="text-green-300 font-medium">
                          {stats.gamesPlayed}
                        </span>
                      </div>

                      {/* Win Rate */}
                      <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-orange-400" />
                          <span className="text-slate-200 text-sm">
                            Win Rate
                          </span>
                        </div>
                        <span className="text-orange-300 font-medium">
                          {stats.winRate
                            ? `${(stats.winRate * 100).toFixed(1)}%`
                            : "0%"}
                        </span>
                      </div>

                      {/* Rank Progress */}
                      {rank !== "Master" && nextRankProgress > 0 && (
                        <div className="space-y-2 p-3 bg-slate-700/50 rounded-lg">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Progress to Next Rank</span>
                            <span>{nextRankProgress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-600/50 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${nextRankProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Trophy className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">
                        Complete your first Battle Royale match to see your
                        stats!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.section>
        </motion.section>

        {/* Helper Text - reusing existing patterns */}
        <motion.aside
          variants={lobbySectionVariants}
          className="text-center max-w-2xl"
          aria-label="Instructions"
        >
          <p className="text-purple-200/60 text-sm sm:text-base font-bangers tracking-wide">
            {isInQueue
              ? "You're in the Battle Royale queue! We'll find you a competitive match soon."
              : "Join the Battle Royale queue to compete against players of similar skill level."}
          </p>
        </motion.aside>

        {/* Loading Overlay for Global Operations - reusing existing patterns */}
        {isLoading && !isInQueue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center",
              "bg-slate-900/80 backdrop-blur-sm",
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
                Joining Battle Royale...
              </p>
            </div>
          </motion.div>
        )}
      </motion.main>
    </ErrorBoundary>
  );
}
