"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FieldError } from "./FormErrorDisplay";

interface RoundsSelectorProps {
  value: number;
  onChange: (rounds: number) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const ROUNDS_OPTIONS = [
  { value: 1, label: "1 Round (Quick)" },
  { value: 2, label: "2 Rounds (Short)" },
  { value: 3, label: "3 Rounds (Standard)" },
  { value: 4, label: "4 Rounds" },
  { value: 5, label: "5 Rounds (Extended)" },
  { value: 6, label: "6 Rounds" },
  { value: 7, label: "7 Rounds (Long)" },
  { value: 8, label: "8 Rounds" },
  { value: 9, label: "9 Rounds" },
  { value: 10, label: "10 Rounds (Marathon)" },
];

export function RoundsSelector({
  value,
  onChange,
  disabled = false,
  error,
  className,
}: RoundsSelectorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
        Number of Rounds
      </Label>
      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(parseInt(val, 10))}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "h-12 bg-slate-700/50 border-slate-600/50 text-white",
            "hover:bg-slate-700/70 focus:ring-2 focus:ring-purple-500/50",
            "focus:border-purple-500/50 font-bangers tracking-wide",
            error && "border-red-500/50 focus:ring-red-500/50"
          )}
        >
          <SelectValue placeholder="Select number of rounds" />
        </SelectTrigger>
        <SelectContent className="bg-slate-800 border-slate-700/50">
          {ROUNDS_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value.toString()}
              className={cn(
                "text-white hover:bg-slate-700/50 focus:bg-slate-700/50",
                "font-bangers tracking-wide cursor-pointer"
              )}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError error={error} />
    </div>
  );
}
