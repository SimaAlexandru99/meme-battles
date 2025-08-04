"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RiFireLine, RiMedalLine, RiTimerLine } from "react-icons/ri";

interface TopBarProps {
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  className?: string;
  fullscreenButton?: React.ReactNode;
  networkStatus?: React.ReactNode;
}

// Animation variants for consistent motion
const topBarVariants = {
  initial: { opacity: 0, y: -20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

const timerVariants = {
  normal: { scale: 1 },
  warning: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },
  urgent: {
    scale: 1.1,
    transition: {
      duration: 0.1,
      repeat: Infinity,
      repeatType: "reverse" as const,
    },
  },
};

const badgeVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2 },
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.1 },
  },
};

// Utility function for time formatting
const formatTime = (seconds: number): string => {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Memoized timer display component with enhanced animations
const TimerDisplay = memo(function TimerDisplay({
  timeLeft,
  className,
}: {
  timeLeft: number;
  className?: string;
}) {
  const formattedTime = useMemo(() => formatTime(timeLeft), [timeLeft]);
  const isUrgent = timeLeft <= 10;
  const isWarning = timeLeft <= 30 && timeLeft > 10;

  return (
    <motion.div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-base sm:text-lg shadow-sm transition-all duration-200",
        "min-w-[80px] justify-center", // Ensure consistent width
        isUrgent &&
          "bg-destructive/10 border border-destructive/20 text-destructive",
        isWarning && "bg-warning/10 border border-warning/20 text-warning",
        !isUrgent && !isWarning && "bg-card border text-card-foreground",
        className,
      )}
      role="timer"
      aria-live={isUrgent ? "assertive" : "polite"}
      aria-label={`Time remaining: ${formattedTime}`}
      variants={timerVariants}
      animate={isUrgent ? "urgent" : isWarning ? "warning" : "normal"}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <RiTimerLine className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
      <span className="font-mono tabular-nums font-bold">{formattedTime}</span>
    </motion.div>
  );
});

// Memoized round display component with enhanced styling
const RoundDisplay = memo(function RoundDisplay({
  currentRound,
  totalRounds,
}: {
  currentRound: number;
  totalRounds: number;
}) {
  return (
    <motion.div
      variants={badgeVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      <Badge
        variant="secondary"
        className="text-xs sm:text-sm px-3 py-2 flex items-center gap-2 bg-primary/20 border-primary/30 text-primary-foreground font-semibold"
        aria-label={`Round ${currentRound} of ${totalRounds}`}
      >
        <RiMedalLine className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline font-medium">Round</span>
        <span className="font-mono tabular-nums font-bold">
          {currentRound} / {totalRounds}
        </span>
      </Badge>
    </motion.div>
  );
});

// Memoized arena title component with improved contrast
const ArenaTitle = memo(function ArenaTitle() {
  return (
    <motion.div
      variants={badgeVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      <Badge
        variant="outline"
        className="text-xs sm:text-sm px-3 py-2 bg-orange-100/20 text-orange-300 border-orange-300/30 flex items-center gap-2 font-semibold"
        aria-label="The Arena - Meme Battle Game"
      >
        <RiFireLine className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline font-medium">THE ARENA</span>
        <span className="sm:hidden font-medium">ARENA</span>
      </Badge>
    </motion.div>
  );
});

export const TopBar = memo(function TopBar({
  currentRound,
  totalRounds,
  timeLeft,
  className,
  fullscreenButton,
  networkStatus,
}: TopBarProps) {
  // Validate props
  const validCurrentRound = Math.max(1, Math.min(currentRound, totalRounds));
  const validTotalRounds = Math.max(1, totalRounds);
  const validTimeLeft = Math.max(0, timeLeft);

  return (
    <motion.header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6 w-full bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50",
        className,
      )}
      role="banner"
      aria-label="Game status and timer"
      variants={topBarVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="flex justify-between items-center w-full gap-3 sm:gap-4 ">
        {/* Left side - Round and Arena info */}
        <motion.div
          className="flex items-center gap-3 sm:gap-4 flex-shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <RoundDisplay
            currentRound={validCurrentRound}
            totalRounds={validTotalRounds}
          />
          <ArenaTitle />
        </motion.div>

        {/* Right side - Timer, Network, and Fullscreen */}
        <motion.div
          className="flex items-center gap-3 flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TimerDisplay timeLeft={validTimeLeft} />
          <AnimatePresence mode="wait">
            {networkStatus && (
              <motion.div
                key="network-status"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {networkStatus}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            {fullscreenButton && (
              <motion.div
                key="fullscreen-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {fullscreenButton}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.header>
  );
});
