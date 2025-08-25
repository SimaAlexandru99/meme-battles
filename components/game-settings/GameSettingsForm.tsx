"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { cn } from "@/lib/utils";
import { FormErrorDisplay, FormSuccessDisplay } from "./FormErrorDisplay";
import type { GameSettingsFormData } from "./types";

interface GameSettingsFormProps {
  initialSettings?: Partial<GameSettingsFormData>;
  onSubmit?: (settings: GameSettingsFormData) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
  hideActions?: boolean;
}

// Zod validation schema
const formSchema = z.object({
  rounds: z
    .number()
    .min(1, "Rounds must be at least 1")
    .max(10, "Rounds cannot exceed 10"),
  timeLimit: z
    .number()
    .min(30, "Time limit must be at least 30 seconds")
    .max(300, "Time limit cannot exceed 5 minutes"),
});

type FormValues = z.infer<typeof formSchema>;

// Form validation schema
const ROUNDS_OPTIONS = [
  { value: "1", label: "1 Round (Quick)" },
  { value: "2", label: "2 Rounds (Short)" },
  { value: "3", label: "3 Rounds (Standard)" },
  { value: "4", label: "4 Rounds" },
  { value: "5", label: "5 Rounds (Extended)" },
  { value: "6", label: "6 Rounds" },
  { value: "7", label: "7 Rounds (Long)" },
  { value: "8", label: "8 Rounds" },
  { value: "9", label: "9 Rounds" },
  { value: "10", label: "10 Rounds (Marathon)" },
];

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

export const GameSettingsForm = React.forwardRef<
  HTMLFormElement,
  GameSettingsFormProps
>(function GameSettingsForm(
  {
    initialSettings,
    onSubmit,
    onCancel,
    disabled = false,
    className,
    hideActions = false,
  },
  ref,
) {
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );

  const defaultValues = React.useMemo(
    () => ({
      rounds: initialSettings?.rounds ?? 5,
      timeLimit: initialSettings?.timeLimit ?? 60,
    }),
    [initialSettings?.rounds, initialSettings?.timeLimit],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const {
    handleSubmit,
    watch,
    formState: { errors, isValid, isDirty, isSubmitting },
    reset,
  } = form;

  const watchedTimeLimit = watch("timeLimit");

  // Handle form submission
  const onSubmitForm = React.useCallback(
    async (data: FormValues) => {
      if (!onSubmit) return;

      await onSubmit(data);
      setSuccessMessage("Settings saved successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    [onSubmit],
  );

  // Handle unsaved changes warning
  const { confirmNavigation } = useUnsavedChanges({
    hasUnsavedChanges: isDirty,
    message:
      "You have unsaved settings changes. Are you sure you want to cancel?",
  });

  const handleCancel = React.useCallback(() => {
    confirmNavigation(() => {
      reset();
      setSuccessMessage(null);
      onCancel?.();
    });
  }, [confirmNavigation, reset, onCancel]);

  const handleReset = React.useCallback(() => {
    reset();
    setSuccessMessage(null);
  }, [reset]);

  return (
    <Form {...form}>
      <form
        ref={ref}
        id="game-settings-form"
        onSubmit={handleSubmit(onSubmitForm)}
        className={cn("space-y-6", className)}
        autoComplete="off"
      >
        {/* Success Message */}
        {successMessage && (
          <FormSuccessDisplay
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}

        {/* Form-level Errors */}
        {(errors.rounds || errors.timeLimit) && (
          <FormErrorDisplay
            errors={{
              rounds: errors.rounds?.message,
              timeLimit: errors.timeLimit?.message,
            }}
            onDismiss={() => {}}
          />
        )}

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Rounds Selector */}
          <FormField
            control={form.control}
            name="rounds"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                  Number of Rounds
                </FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  value={field.value?.toString() || ""}
                  disabled={disabled || isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="h-12 bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-700/70 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 font-bangers tracking-wide">
                      <SelectValue placeholder="Select number of rounds" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-slate-800 border-slate-700/50">
                    {ROUNDS_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="text-white hover:bg-slate-700/50 focus:bg-slate-700/50 font-bangers tracking-wide cursor-pointer"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-red-200 font-bangers tracking-wide" />
              </FormItem>
            )}
          />

          {/* Time Limit Slider */}
          <FormField
            control={form.control}
            name="timeLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
                  Time Limit per Round: {formatTime(watchedTimeLimit || 60)}
                </FormLabel>
                <FormControl>
                  <Slider
                    min={30}
                    max={300}
                    step={15}
                    value={[field.value || 60]}
                    onValueChange={(value) => field.onChange(value[0])}
                    disabled={disabled || isSubmitting}
                    className="w-full [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-gradient-to-br [&_[role=slider]]:from-purple-500 [&_[role=slider]]:to-purple-700 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white/20 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-purple-500/30 [&_[role=slider]]:focus-visible:ring-2 [&_[role=slider]]:focus-visible:ring-purple-500/50 [&_.slider-track]:bg-slate-700/50 [&_.slider-range]:bg-gradient-to-r [&_.slider-range]:from-purple-600 [&_.slider-range]:to-purple-700"
                  />
                </FormControl>
                <FormDescription className="flex justify-between text-xs text-slate-400 font-bangers tracking-wide">
                  <span>30s (Min)</span>
                  <span>5m (Max)</span>
                </FormDescription>
                <FormMessage className="text-red-200 font-bangers tracking-wide" />
              </FormItem>
            )}
          />
        </div>

        {/* Form Actions */}
        {!hideActions && (
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700/50">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <Button
                type="submit"
                disabled={!isValid || !isDirty || isSubmitting || disabled}
                className={cn(
                  "flex-1 px-6 py-3 rounded-lg font-bangers tracking-wide text-lg",
                  "bg-gradient-to-r from-purple-600 to-purple-700",
                  "hover:from-purple-500 hover:to-purple-600",
                  "disabled:from-slate-600 disabled:to-slate-700",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "text-white shadow-lg transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                  "active:scale-95",
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Settings"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting || disabled}
                className={cn(
                  "flex-1 px-6 py-3 rounded-lg font-bangers tracking-wide text-lg",
                  "bg-slate-700/50 hover:bg-slate-700/70",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "text-white border border-slate-600/50",
                  "transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-slate-500/50",
                  "active:scale-95",
                )}
              >
                Cancel
              </Button>
            </div>

            {isDirty && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={isSubmitting || disabled}
                className={cn(
                  "px-4 py-3 rounded-lg font-bangers tracking-wide text-sm",
                  "text-slate-400 hover:text-white",
                  "hover:bg-slate-700/30 transition-all duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-slate-500/50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                Reset
              </Button>
            )}
          </div>
        )}

        {/* Form Status */}
        {isDirty && (
          <div className="text-xs text-slate-400 font-bangers tracking-wide text-center">
            You have unsaved changes
          </div>
        )}
      </form>
    </Form>
  );
});
