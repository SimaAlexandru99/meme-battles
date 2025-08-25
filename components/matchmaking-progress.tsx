"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Clock,
  Globe,
  Search,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  badgeVariants,
  lobbySectionVariants,
  microInteractionVariants,
} from "@/lib/animations/private-lobby-variants";
import { cn } from "@/lib/utils";

interface MatchmakingProgressProps {
  queuePosition: number;
  estimatedWaitTime: number;
  timeInQueue: number;
  queueSize: number;
  className?: string;
}

// Matchmaking phases based on queue position and time
type MatchmakingPhase = "waiting" | "searching" | "matching" | "expanding";

export function MatchmakingProgress({
  queuePosition,
  estimatedWaitTime,
  timeInQueue,
  className,
}: MatchmakingProgressProps) {
  // Calculate current matchmaking phase
  const getCurrentPhase = React.useCallback((): MatchmakingPhase => {
    const timeInQueueSeconds = Math.floor(timeInQueue / 1000);

    if (queuePosition > 5) {
      return "waiting";
    } else if (queuePosition <= 3 && timeInQueueSeconds < 30) {
      return "searching";
    } else if (queuePosition <= 3 && timeInQueueSeconds < 60) {
      return "matching";
    } else {
      return "expanding";
    }
  }, [queuePosition, timeInQueue]);

  const currentPhase = getCurrentPhase();

  // Calculate progress percentage based on estimated wait time
  const getProgressPercentage = React.useCallback((): number => {
    if (estimatedWaitTime <= 0) return 0;

    const timeInQueueSeconds = Math.floor(timeInQueue / 1000);
    const progress = Math.min(
      (timeInQueueSeconds / estimatedWaitTime) * 100,
      95,
    );

    return Math.max(progress, 5); // Minimum 5% to show some progress
  }, [timeInQueue, estimatedWaitTime]);

  // Get phase-specific content
  const getPhaseContent = React.useCallback(() => {
    switch (currentPhase) {
      case "waiting":
        return {
          icon: Clock,
          title: "In Queue",
          description: "Waiting for your turn to be matched",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/20",
        };
      case "searching":
        return {
          icon: Search,
          title: "Searching",
          description: "Looking for players at your skill level",
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
        };
      case "matching":
        return {
          icon: Users,
          title: "Matching",
          description: "Found potential opponents, creating match",
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
        };
      case "expanding":
        return {
          icon: TrendingUp,
          title: "Expanding Search",
          description: "Widening skill range to find more players",
          color: "text-orange-400",
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/20",
        };
      default:
        return {
          icon: Search,
          title: "Matchmaking",
          description: "Finding your perfect match",
          color: "text-purple-400",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/20",
        };
    }
  }, [currentPhase]);

  const phaseContent = getPhaseContent();
  const progressPercentage = getProgressPercentage();

  // Format time helper
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

  // Animated dots for loading states
  const AnimatedDots = React.memo(function AnimatedDots() {
    return (
      <motion.span
        className="inline-flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1 h-1 bg-current rounded-full mx-0.5"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.span>
    );
  });

  return (
    <motion.div
      variants={lobbySectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      <Card
        className={cn(
          "relative overflow-hidden",
          "bg-gradient-to-br from-slate-800/50 to-slate-700/50",
          "border-slate-600/30 shadow-lg",
          "backdrop-blur-sm",
          phaseContent.borderColor,
        )}
        aria-label="Matchmaking progress"
        aria-live="polite"
      >
        {/* Animated background for current phase */}
        <div
          className={cn(
            "absolute inset-0 opacity-20 transition-all duration-1000",
            phaseContent.bgColor,
          )}
          aria-hidden="true"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        <CardContent className="relative p-6 space-y-6">
          {/* Phase Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                variants={microInteractionVariants}
                whileHover="hover"
                className={cn(
                  "p-2 rounded-full",
                  phaseContent.bgColor,
                  phaseContent.borderColor,
                  "border",
                )}
              >
                <phaseContent.icon
                  className={cn("w-5 h-5", phaseContent.color)}
                  aria-hidden="true"
                />
              </motion.div>

              <div>
                <h3
                  className={cn(
                    "font-bangers text-lg tracking-wide flex items-center gap-2",
                    phaseContent.color,
                  )}
                >
                  {phaseContent.title}
                  {(currentPhase === "searching" ||
                    currentPhase === "matching") && <AnimatedDots />}
                </h3>
                <p className="text-slate-300 text-sm">
                  {phaseContent.description}
                </p>
              </div>
            </div>

            {/* Phase indicator badge */}
            <motion.div
              variants={badgeVariants}
              initial="initial"
              animate="animate"
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                phaseContent.bgColor,
                phaseContent.color,
                "border",
                phaseContent.borderColor,
              )}
            >
              {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)}
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Progress</span>
              <span className={cn("font-medium", phaseContent.color)}>
                {Math.round(progressPercentage)}%
              </span>
            </div>

            <div className="relative">
              <Progress
                value={progressPercentage}
                className="h-2 bg-slate-700/50"
              />

              {/* Animated progress indicator */}
              <motion.div
                className={cn(
                  "absolute top-0 left-0 h-full rounded-full",
                  "bg-gradient-to-r from-purple-500 to-pink-500",
                  "opacity-80",
                )}
                style={{ width: `${progressPercentage}%` }}
                animate={{
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </div>

          {/* Matchmaking Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-600/30">
            <div className="flex items-center gap-2 text-sm">
              <Target className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-slate-400">Position</p>
                <p className="text-white font-medium">#{queuePosition}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="text-slate-400">Time in Queue</p>
                <p className="text-white font-medium">
                  {formatTime(Math.floor(timeInQueue / 1000))}
                </p>
              </div>
            </div>
          </div>

          {/* Alternative Options for Long Waits */}
          <AnimatePresence>
            {timeInQueue > 120000 && ( // Show after 2 minutes
              <motion.div
                variants={lobbySectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="text-orange-300 font-medium text-sm">
                      Taking longer than expected?
                    </h4>
                    <p className="text-orange-200/80 text-xs">
                      Try creating a private lobby or check back during peak
                      hours (7-10 PM) for faster matches.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skill Range Expansion Indicator */}
          <AnimatePresence>
            {currentPhase === "expanding" && (
              <motion.div
                variants={lobbySectionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="text-blue-300 font-medium text-sm">
                      Expanding Search Range
                    </h4>
                    <p className="text-blue-200/80 text-xs">
                      We&apos;re looking for players with a wider skill range to
                      get you into a match faster.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
