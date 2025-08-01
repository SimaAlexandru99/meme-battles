"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { FieldError } from "./FormErrorDisplay";

interface TimeLimitSliderProps {
  value: number; // seconds
  onChange: (seconds: number) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

// Format seconds to display as "1m 30s" or "45s"
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

// Preset markers for common values
const PRESET_MARKERS = [30, 60, 120, 180, 300];

export function TimeLimitSlider({
  value,
  onChange,
  disabled = false,
  error,
  className,
}: TimeLimitSliderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
          Time Limit per Round
        </Label>
        <div className="text-lg font-bangers text-white tracking-wide">
          {formatTime(value)}
        </div>
      </div>

      <div className="relative px-2">
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={30}
          max={300}
          step={15}
          disabled={disabled}
          className={cn(
            "w-full",
            "[&_[role=slider]]:h-5 [&_[role=slider]]:w-5",
            "[&_[role=slider]]:bg-gradient-to-br [&_[role=slider]]:from-purple-500 [&_[role=slider]]:to-purple-700",
            "[&_[role=slider]]:border-2 [&_[role=slider]]:border-white/20",
            "[&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-purple-500/30",
            "[&_[role=slider]]:focus-visible:ring-2 [&_[role=slider]]:focus-visible:ring-purple-500/50",
            "[&_.slider-track]:bg-slate-700/50",
            "[&_.slider-range]:bg-gradient-to-r [&_.slider-range]:from-purple-600 [&_.slider-range]:to-purple-700",
            error && "[&_[role=slider]]:border-red-500/50",
          )}
        />

        {/* Preset markers */}
        <div className="absolute top-6 left-2 right-2 flex justify-between pointer-events-none">
          {PRESET_MARKERS.map((marker) => {
            const position = ((marker - 30) / (300 - 30)) * 100;
            return (
              <div
                key={marker}
                className="flex flex-col items-center"
                style={{
                  left: `${position}%`,
                  position: "absolute",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="w-0.5 h-2 bg-slate-500/50" />
                <span className="text-xs text-slate-400 font-bangers tracking-wide mt-1">
                  {formatTime(marker)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between text-xs text-slate-400 font-bangers tracking-wide px-2">
        <span>30s (Min)</span>
        <span>5m (Max)</span>
      </div>

      <FieldError error={error} />
    </div>
  );
}
