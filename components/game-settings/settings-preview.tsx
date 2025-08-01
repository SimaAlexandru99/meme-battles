"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTimeLine,
  RiGamepadLine,
  RiArrowRightLine,
  RiCheckLine,
} from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  microInteractionVariants,
  badgeVariants,
} from "@/lib/animations/private-lobby-variants";

interface SettingsPreviewProps {
  settings: LobbySettings;
  originalSettings: LobbySettings;
  className?: string;
}

// Helper function to format time values
function formatTimeLimit(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

// Helper function to format category names
function formatCategoryName(category: string): string {
  const categoryMap: Record<string, string> = {
    funny: "😂 Funny",
    wholesome: "🥰 Wholesome",
    dark: "🌚 Dark",
    random: "🎲 Random",
    trending: "🔥 Trending",
  };
  return categoryMap[category] || category;
}

// Helper function to calculate estimated game duration
function calculateGameDuration(rounds: number, timeLimit: number): string {
  // Estimate includes time limit per round plus buffer time for transitions
  const bufferPerRound = 15; // 15 seconds buffer per round for transitions
  const totalSeconds = rounds * (timeLimit + bufferPerRound);

  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 1) {
    return "< 1 minute";
  }
  if (minutes === 1) {
    return "~1 minute";
  }
  return `~${minutes} minutes`;
}

// Helper function to check if a setting has changed
function hasSettingChanged<K extends keyof LobbySettings>(
  key: K,
  current: LobbySettings[K],
  original: LobbySettings[K],
): boolean {
  if (key === "categories") {
    const currentCategories = current as string[];
    const originalCategories = original as string[];
    return (
      currentCategories.length !== originalCategories.length ||
      !currentCategories.every((cat) => originalCategories.includes(cat))
    );
  }
  return current !== original;
}

export function SettingsPreview({
  settings,
  originalSettings,
  className,
}: SettingsPreviewProps) {
  const hasChanges = React.useMemo(() => {
    return (
      hasSettingChanged("rounds", settings.rounds, originalSettings.rounds) ||
      hasSettingChanged(
        "timeLimit",
        settings.timeLimit,
        originalSettings.timeLimit,
      ) ||
      hasSettingChanged(
        "categories",
        settings.categories,
        originalSettings.categories,
      )
    );
  }, [settings, originalSettings]);

  const estimatedDuration = React.useMemo(() => {
    return calculateGameDuration(settings.rounds, settings.timeLimit);
  }, [settings.rounds, settings.timeLimit]);

  return (
    <motion.div
      className={cn("space-y-4", className)}
      variants={microInteractionVariants}
      initial="initial"
      animate="animate"
    >
      <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
        <CardHeader>
          <CardTitle className="text-white font-bangers text-lg tracking-wide flex items-center gap-2">
            <RiCheckLine className="w-5 h-5" />
            Settings Preview
            <AnimatePresence>
              {hasChanges && (
                <motion.div
                  variants={badgeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <Badge
                    variant="secondary"
                    className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-bangers tracking-wide"
                  >
                    Modified
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rounds Setting */}
          <motion.div className="space-y-3" variants={microInteractionVariants}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiGamepadLine className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                  Rounds
                </span>
              </div>
              <AnimatePresence>
                {hasSettingChanged(
                  "rounds",
                  settings.rounds,
                  originalSettings.rounds,
                ) && (
                  <motion.div
                    variants={badgeVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Badge
                      variant="secondary"
                      className="bg-green-500/20 text-green-400 border-green-500/30 font-bangers tracking-wide text-xs"
                    >
                      Changed
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3">
              <motion.div
                className={cn(
                  "flex-1 bg-slate-700/50 border rounded-lg px-3 py-2 text-center",
                  hasSettingChanged(
                    "rounds",
                    settings.rounds,
                    originalSettings.rounds,
                  )
                    ? "border-slate-600/30"
                    : "border-slate-600/50",
                )}
                variants={microInteractionVariants}
              >
                <span
                  className={cn(
                    "text-sm font-bangers tracking-wide",
                    hasSettingChanged(
                      "rounds",
                      settings.rounds,
                      originalSettings.rounds,
                    )
                      ? "text-slate-400 line-through"
                      : "text-white",
                  )}
                >
                  {originalSettings.rounds}
                </span>
              </motion.div>

              {hasSettingChanged(
                "rounds",
                settings.rounds,
                originalSettings.rounds,
              ) && (
                <>
                  <RiArrowRightLine className="w-4 h-4 text-purple-400" />
                  <motion.div
                    className="flex-1 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-2 text-center"
                    variants={microInteractionVariants}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <span className="text-sm font-bangers tracking-wide text-purple-300">
                      {settings.rounds}
                    </span>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>

          <Separator className="bg-slate-700/50" />

          {/* Time Limit Setting */}
          <motion.div className="space-y-3" variants={microInteractionVariants}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiTimeLine className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                  Time Limit
                </span>
              </div>
              <AnimatePresence>
                {hasSettingChanged(
                  "timeLimit",
                  settings.timeLimit,
                  originalSettings.timeLimit,
                ) && (
                  <motion.div
                    variants={badgeVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Badge
                      variant="secondary"
                      className="bg-green-500/20 text-green-400 border-green-500/30 font-bangers tracking-wide text-xs"
                    >
                      Changed
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3">
              <motion.div
                className={cn(
                  "flex-1 bg-slate-700/50 border rounded-lg px-3 py-2 text-center",
                  hasSettingChanged(
                    "timeLimit",
                    settings.timeLimit,
                    originalSettings.timeLimit,
                  )
                    ? "border-slate-600/30"
                    : "border-slate-600/50",
                )}
                variants={microInteractionVariants}
              >
                <span
                  className={cn(
                    "text-sm font-bangers tracking-wide",
                    hasSettingChanged(
                      "timeLimit",
                      settings.timeLimit,
                      originalSettings.timeLimit,
                    )
                      ? "text-slate-400 line-through"
                      : "text-white",
                  )}
                >
                  {formatTimeLimit(originalSettings.timeLimit)}
                </span>
              </motion.div>

              {hasSettingChanged(
                "timeLimit",
                settings.timeLimit,
                originalSettings.timeLimit,
              ) && (
                <>
                  <RiArrowRightLine className="w-4 h-4 text-purple-400" />
                  <motion.div
                    className="flex-1 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-2 text-center"
                    variants={microInteractionVariants}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <span className="text-sm font-bangers tracking-wide text-purple-300">
                      {formatTimeLimit(settings.timeLimit)}
                    </span>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>

          <Separator className="bg-slate-700/50" />

          {/* Categories Setting */}
          <motion.div className="space-y-3" variants={microInteractionVariants}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiGamepadLine className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                  Categories
                </span>
              </div>
              <AnimatePresence>
                {hasSettingChanged(
                  "categories",
                  settings.categories,
                  originalSettings.categories,
                ) && (
                  <motion.div
                    variants={badgeVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Badge
                      variant="secondary"
                      className="bg-green-500/20 text-green-400 border-green-500/30 font-bangers tracking-wide text-xs"
                    >
                      Changed
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-3">
              {/* Original Categories */}
              <motion.div
                className={cn(
                  "bg-slate-700/50 border rounded-lg p-3",
                  hasSettingChanged(
                    "categories",
                    settings.categories,
                    originalSettings.categories,
                  )
                    ? "border-slate-600/30"
                    : "border-slate-600/50",
                )}
                variants={microInteractionVariants}
              >
                <div className="flex flex-wrap gap-2">
                  {originalSettings.categories.map((category) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className={cn(
                        "font-bangers tracking-wide text-xs",
                        hasSettingChanged(
                          "categories",
                          settings.categories,
                          originalSettings.categories,
                        )
                          ? "bg-slate-600/30 text-slate-400 line-through border-slate-500/30"
                          : "bg-slate-600/50 text-white border-slate-500/50",
                      )}
                    >
                      {formatCategoryName(category)}
                    </Badge>
                  ))}
                </div>
              </motion.div>

              {/* New Categories */}
              {hasSettingChanged(
                "categories",
                settings.categories,
                originalSettings.categories,
              ) && (
                <>
                  <div className="flex items-center justify-center">
                    <RiArrowRightLine className="w-4 h-4 text-purple-400" />
                  </div>
                  <motion.div
                    className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3"
                    variants={microInteractionVariants}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <div className="flex flex-wrap gap-2">
                      {settings.categories.map((category) => (
                        <motion.div
                          key={category}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-purple-600/30 text-purple-300 border-purple-500/30 font-bangers tracking-wide text-xs"
                          >
                            {formatCategoryName(category)}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>

          <Separator className="bg-slate-700/50" />

          {/* Estimated Duration */}
          <motion.div className="space-y-3" variants={microInteractionVariants}>
            <div className="flex items-center gap-2">
              <RiTimeLine className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                Estimated Duration
              </span>
            </div>

            <motion.div
              className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg px-4 py-3 text-center"
              variants={microInteractionVariants}
              key={estimatedDuration} // Re-animate when duration changes
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <span className="text-lg font-bangers tracking-wide text-purple-300">
                {estimatedDuration}
              </span>
              <p className="text-xs text-purple-200/50 font-bangers tracking-wide mt-1">
                Including transition time
              </p>
            </motion.div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
