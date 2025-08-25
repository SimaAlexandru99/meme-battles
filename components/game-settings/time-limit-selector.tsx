"use client";

import { motion } from "framer-motion";
import { Clock, Timer, Turtle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

interface TimeLimitOption {
  value: number;
  label: string;
  description: string;
  icon: React.ReactNode;
  difficulty: "easy" | "medium" | "hard";
}

const TIME_PRESETS: TimeLimitOption[] = [
  {
    value: 30,
    label: "Lightning",
    description: "Quick decisions, high pressure",
    icon: <Zap className="h-4 w-4" />,
    difficulty: "hard",
  },
  {
    value: 45,
    label: "Fast",
    description: "Think fast, act faster",
    icon: <Timer className="h-4 w-4" />,
    difficulty: "medium",
  },
  {
    value: 60,
    label: "Standard",
    description: "Perfect balance of time and pressure",
    icon: <Clock className="h-4 w-4" />,
    difficulty: "medium",
  },
  {
    value: 90,
    label: "Relaxed",
    description: "Take your time to find the perfect meme",
    icon: <Turtle className="h-4 w-4" />,
    difficulty: "easy",
  },
  {
    value: 120,
    label: "Casual",
    description: "No rush, maximum creativity",
    icon: <Turtle className="h-4 w-4" />,
    difficulty: "easy",
  },
];

interface TimeLimitSelectorProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showCustomSlider?: boolean;
}

export function TimeLimitSelector({
  value,
  onChange,
  disabled = false,
  showCustomSlider = true,
}: TimeLimitSelectorProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const selectedPreset = TIME_PRESETS.find((preset) => preset.value === value);
  const isCustomValue = !selectedPreset;

  return (
    <div className="space-y-6">
      {/* Current selection display */}
      <div className="text-center p-4 bg-muted/50 rounded-lg">
        <div className="text-2xl font-bold text-primary mb-1">
          {formatTime(value)}
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedPreset ? selectedPreset.label : "Custom"} Time Limit
        </div>
        {selectedPreset && (
          <div className="text-xs text-muted-foreground mt-1">
            {selectedPreset.description}
          </div>
        )}
      </div>

      {/* Preset options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Quick Presets
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TIME_PRESETS.map((preset) => {
            const isSelected = value === preset.value;

            return (
              <motion.div
                key={preset.value}
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
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
                        {preset.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">
                            {preset.label}
                          </h4>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getDifficultyColor(preset.difficulty)}`}
                          >
                            {preset.difficulty}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {preset.description}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <div className="text-sm font-medium">
                          {formatTime(preset.value)}
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
              Custom Time Limit
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
              min={30}
              max={120}
              step={15}
              disabled={disabled}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30s (Lightning)</span>
              <span>2m (Casual)</span>
            </div>
          </div>
        </div>
      )}

      {/* Time limit impact info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> Shorter time limits create more pressure and
            faster-paced games, while longer limits allow for more thoughtful
            meme selection and creativity.
          </div>
        </div>
      </div>
    </div>
  );
}
