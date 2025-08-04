"use client";

import { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RiFireLine, RiMedalLine, RiTimerLine } from "react-icons/ri";

interface TopBarProps {
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  className?: string;
}

// Utility function for time formatting
const formatTime = (seconds: number): string => {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Memoized timer display component
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
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-base sm:text-lg shadow-sm transition-all duration-200",
        isUrgent &&
          "bg-destructive/10 border border-destructive/20 text-destructive animate-pulse",
        isWarning && "bg-warning/10 border border-warning/20 text-warning",
        !isUrgent && !isWarning && "bg-card border text-card-foreground",
        className,
      )}
      role="timer"
      aria-live={isUrgent ? "assertive" : "polite"}
      aria-label={`Time remaining: ${formattedTime}`}
    >
      <RiTimerLine className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
      <span className="font-mono tabular-nums">{formattedTime}</span>
    </div>
  );
});

// Memoized round display component
const RoundDisplay = memo(function RoundDisplay({
  currentRound,
  totalRounds,
}: {
  currentRound: number;
  totalRounds: number;
}) {
  return (
    <Badge
      variant="secondary"
      className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5"
      aria-label={`Round ${currentRound} of ${totalRounds}`}
    >
      <RiMedalLine className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
      <span className="hidden sm:inline">Round</span>
      <span className="font-mono tabular-nums">
        {currentRound} / {totalRounds}
      </span>
    </Badge>
  );
});

// Memoized arena title component
const ArenaTitle = memo(function ArenaTitle() {
  return (
    <Badge
      variant="outline"
      className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-50 text-orange-600 border-orange-200 flex items-center gap-1.5"
      aria-label="The Arena - Meme Battle Game"
    >
      <RiFireLine className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
      <span className="hidden sm:inline">THE ARENA</span>
      <span className="sm:hidden">ARENA</span>
    </Badge>
  );
});

export const TopBar = memo(function TopBar({
  currentRound,
  totalRounds,
  timeLeft,
  className,
}: TopBarProps) {
  // Validate props
  const validCurrentRound = Math.max(1, Math.min(currentRound, totalRounds));
  const validTotalRounds = Math.max(1, totalRounds);
  const validTimeLeft = Math.max(0, timeLeft);

  return (
    <header
      className={cn(
        "absolute top-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-6",
        className,
      )}
      role="banner"
      aria-label="Game status and timer"
    >
      <div className="flex justify-between items-center max-w-7xl mx-auto gap-2 sm:gap-4">
        {/* Left side - Round and Arena info */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <RoundDisplay
            currentRound={validCurrentRound}
            totalRounds={validTotalRounds}
          />
          <ArenaTitle />
        </div>

        {/* Right side - Timer */}
        <div className="flex-shrink-0">
          <TimerDisplay timeLeft={validTimeLeft} />
        </div>
      </div>
    </header>
  );
});
