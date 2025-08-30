"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Globe,
  Info,
  RotateCcw,
  Save,
  Settings,
  Target,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buttonVariants,
  lobbySectionVariants,
  microInteractionVariants,
} from "@/lib/animations/private-lobby-variants";
import { cn } from "@/lib/utils";

interface QueuePreferencesProps {
  onUpdatePreferences: (
    preferences: Partial<QueuePreferences>,
  ) => Promise<void>;
  isInQueue: boolean;
  isLoading: boolean;
  className?: string;
}

export function QueuePreferencesComponent({
  onUpdatePreferences,
  isInQueue,
  isLoading,
  className,
}: QueuePreferencesProps) {
  // Local state for preferences
  const [maxWaitTime, setMaxWaitTime] = React.useState<number>(120); // 2 minutes default
  const [skillRangeFlexibility, setSkillRangeFlexibility] = React.useState<
    "strict" | "medium" | "flexible"
  >("medium");
  const [regionPreference, setRegionPreference] =
    React.useState<string>("auto");

  // Track if preferences have been modified
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Default preferences for reset
  const defaultPreferences = React.useMemo(
    () => ({
      maxWaitTime: 120,
      skillRangeFlexibility: "medium" as const,
      regionPreference: "auto",
    }),
    [],
  );

  // Track changes to enable/disable save button
  React.useEffect(() => {
    const currentPrefs = {
      maxWaitTime,
      skillRangeFlexibility,
      regionPreference,
    };

    const hasChanged =
      currentPrefs.maxWaitTime !== defaultPreferences.maxWaitTime ||
      currentPrefs.skillRangeFlexibility !==
        defaultPreferences.skillRangeFlexibility ||
      currentPrefs.regionPreference !== defaultPreferences.regionPreference;

    setHasChanges(hasChanged);
  }, [
    maxWaitTime,
    skillRangeFlexibility,
    regionPreference,
    defaultPreferences,
  ]);

  // Handle saving preferences
  const handleSavePreferences = React.useCallback(async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      await onUpdatePreferences({
        maxWaitTime,
        skillRangeFlexibility,
        ...(regionPreference !== "auto" && { regionPreference }),
      });

      setHasChanges(false);
    } catch (error) {
      console.error("Failed to update preferences:", error);
    } finally {
      setIsSaving(false);
    }
  }, [
    hasChanges,
    isSaving,
    onUpdatePreferences,
    maxWaitTime,
    skillRangeFlexibility,
    regionPreference,
  ]);

  // Handle resetting to defaults
  const handleResetPreferences = React.useCallback(() => {
    setMaxWaitTime(defaultPreferences.maxWaitTime);
    setSkillRangeFlexibility(defaultPreferences.skillRangeFlexibility);
    setRegionPreference(defaultPreferences.regionPreference);
  }, [defaultPreferences]);

  // Format wait time for display
  const formatWaitTime = React.useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }, []);

  // Get skill flexibility description
  const getSkillFlexibilityDescription = React.useCallback(
    (flexibility: string): string => {
      switch (flexibility) {
        case "strict":
          return "Only match with players very close to your skill level";
        case "medium":
          return "Balance between skill matching and wait time";
        case "flexible":
          return "Prioritize faster matches over perfect skill matching";
        default:
          return "Balance between skill matching and wait time";
      }
    },
    [],
  );

  return (
    <TooltipProvider>
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
            "bg-gradient-to-br from-slate-800/70 to-slate-700/70",
            "border-slate-600/40 shadow-lg",
            "backdrop-blur-sm",
          )}
          aria-label="Queue preferences settings"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white font-bangers text-lg tracking-wide">
              <Settings className="w-5 h-5 text-purple-400" />
              Queue Preferences
              {/* Live update indicator */}
              {isInQueue && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-full text-xs text-green-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live Updates
                </div>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Maximum Wait Time */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-slate-200 font-medium">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Maximum Wait Time
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3 h-3 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        How long you&apos;re willing to wait before the system
                        expands your search criteria
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Label>

                <span className="text-purple-300 font-medium text-sm">
                  {formatWaitTime(maxWaitTime)}
                </span>
              </div>

              <div className="space-y-2">
                <Slider
                  value={[maxWaitTime]}
                  onValueChange={(value) => setMaxWaitTime(value[0])}
                  min={30}
                  max={300}
                  step={15}
                  className="w-full"
                  disabled={isLoading}
                />

                <div className="flex justify-between text-xs text-slate-400">
                  <span>30s (Fast)</span>
                  <span>5m (Patient)</span>
                </div>
              </div>
            </div>

            {/* Skill Range Flexibility */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-slate-200 font-medium">
                <Target className="w-4 h-4 text-orange-400" />
                Skill Matching
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">
                      How strictly to match players based on skill rating
                    </p>
                  </TooltipContent>
                </Tooltip>
              </Label>

              <Select
                value={skillRangeFlexibility}
                onValueChange={(value: "strict" | "medium" | "flexible") =>
                  setSkillRangeFlexibility(value)
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full" />
                      Strict Matching
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                      Balanced
                    </div>
                  </SelectItem>
                  <SelectItem value="flexible">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      Flexible
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs text-slate-400">
                {getSkillFlexibilityDescription(skillRangeFlexibility)}
              </p>
            </div>

            {/* Region Preference */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-slate-200 font-medium">
                <Globe className="w-4 h-4 text-green-400" />
                Region Preference
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">
                      Preferred server region for better connection quality
                    </p>
                  </TooltipContent>
                </Tooltip>
              </Label>

              <Select
                value={regionPreference}
                onValueChange={setRegionPreference}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Recommended)</SelectItem>
                  <SelectItem value="us-east">US East</SelectItem>
                  <SelectItem value="us-west">US West</SelectItem>
                  <SelectItem value="eu-west">Europe West</SelectItem>
                  <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-600/30">
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="flex-1"
              >
                <Button
                  onClick={handleSavePreferences}
                  disabled={!hasChanges || isSaving || isLoading}
                  className={cn(
                    "w-full bg-purple-600 hover:bg-purple-700",
                    "text-white font-bangers tracking-wide",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isInQueue ? "Update Live" : "Save Preferences"}
                    </>
                  )}
                </Button>
              </motion.div>

              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  onClick={handleResetPreferences}
                  disabled={!hasChanges || isLoading}
                  variant="outline"
                  className={cn(
                    "border-slate-600 text-slate-300",
                    "hover:bg-slate-700/50 hover:border-slate-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>

            {/* Live Update Notice */}
            {isInQueue && (
              <motion.div
                variants={microInteractionVariants}
                initial="initial"
                animate="animate"
                className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-200/80">
                    <p className="font-medium text-blue-300 mb-1">
                      Live Updates Enabled
                    </p>
                    <p>
                      Changes to your preferences will be applied immediately
                      while you&apos;re in the queue.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}
