"use client";

import { motion } from "framer-motion";
import { RotateCcw, Trophy, Clock, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

interface RoundsOption {
  value: number;
  label: string;
  description: string;
  estimatedTime: string;
  gameType: "quick" | "standard" | "extended";
}

const ROUNDS_PRESETS: RoundsOption[] = [
  {
    value: 3,
    label: "Quick Game",
    description: "Perfect for a fast round with friends",
    estimatedTime: "5-8 min",
    gameType: "quick",
  },
  {
    value: 5,
    label: "Standard Game",
    description: "The classic Meme Battles experience",
    estimatedTime: "8-12 min",
    gameType: "standard",
  },
  {
    value: 7,
    label: "Extended Game",
    description: "More rounds, more laughs, more competition",
    estimatedTime: "12-18 min",
    gameType: "extended",
  },
  {
    value: 10,
    label: "Marathon",
    description: "For serious meme warriors only",
    estimatedTime: "18-25 min",
    gameType: "extended",
  },
  {
    value: 15,
    label: "Epic Battle",
    description: "The ultimate meme showdown",
    estimatedTime: "25-35 min",
    gameType: "extended",
  },
];

interface RoundsSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  timeLimit?: number;
  playerCount?: number;
  showCustomSlider?: boolean;
}

export function RoundsSelector({
  value,
  onChange,
  disabled = false,
  timeLimit = 60,
  playerCount = 4,
  showCustomSlider = true,
}: RoundsSelectorProps) {
  const getGameTypeColor = (gameType: string) => {
    switch (gameType) {
      case "quick":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "standard":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "extended":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const calculateEstimatedTime = (rounds: number) => {
    // Base time per round (submission + voting + results)
    const baseTimePerRound = timeLimit + 30 + 15; // submission + voting + results
    const totalSeconds = rounds * baseTimePerRound;
    const minutes = Math.ceil(totalSeconds / 60);

    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  };

  const selectedPreset = ROUNDS_PRESETS.find(
    (preset) => preset.value === value,
  );
  const isCustomValue = !selectedPreset;

  return (
    <div className="space-y-6">
      {/* Current selection display */}
      <div className="text-center p-4 bg-muted/50 rounded-lg">
        <div className="text-2xl font-bold text-primary mb-1">
          {value} Round{value !== 1 ? "s" : ""}
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedPreset ? selectedPreset.label : "Custom Game"}
        </div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />~{calculateEstimatedTime(value)}
          </span>
          {playerCount && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {playerCount} player{playerCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Preset options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Game Length Presets
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {ROUNDS_PRESETS.map((preset) => {
            const isSelected = value === preset.value;

            return (
              <motion.div
                key={preset.value}
                whileHover={{ scale: disabled ? 1 : 1.01 }}
                whileTap={{ scale: disabled ? 1 : 0.99 }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => !disabled && onChange(preset.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                        <RotateCcw className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">
                            {preset.label}
                          </h4>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getGameTypeColor(preset.gameType)}`}
                          >
                            {preset.gameType}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2">
                          {preset.description}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {preset.estimatedTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {preset.value} rounds
                          </span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold text-primary">
                          {preset.value}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          rounds
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Custom slider */}
      {showCustomSlider && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Custom Round Count
            </h3>
            {isCustomValue && (
              <Badge variant="outline" className="text-xs">
                Custom
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            <Slider
              value={[value]}
              onValueChange={(values) => !disabled && onChange(values[0])}
              min={3}
              max={15}
              step={1}
              disabled={disabled}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3 rounds (Quick)</span>
              <span>15 rounds (Epic)</span>
            </div>
          </div>
        </div>
      )}

      {/* Game length impact info */}
      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Tip:</strong> More rounds mean more opportunities to score
            points and showcase different memes, but also longer games. Consider
            your group&apos;s attention span!
          </div>
        </div>
      </div>
    </div>
  );
}
