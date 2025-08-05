"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { FormErrorDisplay, FormSuccessDisplay } from "./FormErrorDisplay";
import { GameSettingsFormData, validateGameSettings } from "./types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cardVariants, badgeVariants } from "./animations";
import { Controller } from "react-hook-form";

interface GameSettingsFormProps {
  initialSettings?: Partial<GameSettingsFormData>;
  onSubmit?: (settings: GameSettingsFormData) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
  hideActions?: boolean;
}

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

const CATEGORY_OPTIONS = [
  {
    id: "funny",
    label: "Funny",
    description: "Classic humor and jokes",
    icon: "😂",
  },
  {
    id: "wholesome",
    label: "Wholesome",
    description: "Positive and heartwarming content",
    icon: "🥰",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Edgy and dark humor",
    icon: "🌚",
  },
  {
    id: "random",
    label: "Random",
    description: "Mixed content from all categories",
    icon: "🎲",
  },
  {
    id: "trending",
    label: "Trending",
    description: "Popular and viral memes",
    icon: "🔥",
  },
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

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty, isSubmitting },
    reset,
  } = useForm<GameSettingsFormData>({
    defaultValues: {
      rounds: initialSettings?.rounds ?? 5,
      timeLimit: initialSettings?.timeLimit ?? 60,
      categories: initialSettings?.categories ?? ["funny", "wholesome"],
    },
    resolver: (values) => {
      // Convert string rounds to number for validation
      const processedValues = {
        ...values,
        rounds:
          typeof values.rounds === "string"
            ? parseInt(values.rounds, 10)
            : values.rounds,
      };

      const validationErrors = validateGameSettings(processedValues);
      const hasErrors = Object.keys(validationErrors).length > 0;

      return {
        values: processedValues,
        errors: hasErrors ? validationErrors : {},
      };
    },
  });

  const watchedCategories = watch("categories");

  // Handle form submission
  const onSubmitForm = React.useCallback(
    async (data: GameSettingsFormData) => {
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

  // Handle category toggle
  const handleCategoryToggle = React.useCallback(
    (categoryId: string, checked: boolean) => {
      const currentCategories = watchedCategories || [];
      if (checked) {
        if (!currentCategories.includes(categoryId)) {
          setValue("categories", [...currentCategories, categoryId]);
        }
      } else {
        const newCategories = currentCategories.filter(
          (id) => id !== categoryId,
        );
        // Always require at least one category
        if (newCategories.length > 0) {
          setValue("categories", newCategories);
        }
      }
    },
    [watchedCategories, setValue],
  );

  return (
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
      <FormErrorDisplay
        errors={{
          rounds: errors.rounds?.message,
          timeLimit: errors.timeLimit?.message,
          categories: errors.categories?.message,
        }}
        onDismiss={() => {}}
      />

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Rounds Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
            Number of Rounds
          </Label>
          <Controller
            control={control}
            name="rounds"
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value?.toString() || ""}
                disabled={disabled || isSubmitting}
              >
                <SelectTrigger className="h-12 bg-slate-700/50 border-slate-600/50 text-white hover:bg-slate-700/70 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 font-bangers tracking-wide">
                  <SelectValue placeholder="Select number of rounds" />
                </SelectTrigger>
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
            )}
          />
          {errors.rounds && (
            <p className="text-sm text-red-200 font-bangers tracking-wide">
              {errors.rounds.message}
            </p>
          )}
        </div>

        {/* Time Limit Slider */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
            Time Limit per Round: {formatTime(watch("timeLimit") || 60)}
          </Label>
          <Controller
            control={control}
            name="timeLimit"
            render={({ field }) => (
              <Slider
                min={30}
                max={300}
                step={15}
                value={[field.value || 60]}
                onValueChange={(value) => field.onChange(value[0])}
                disabled={disabled || isSubmitting}
                className="w-full [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:bg-gradient-to-br [&_[role=slider]]:from-purple-500 [&_[role=slider]]:to-purple-700 [&_[role=slider]]:border-2 [&_[role=slider]]:border-white/20 [&_[role=slider]]:shadow-lg [&_[role=slider]]:shadow-purple-500/30 [&_[role=slider]]:focus-visible:ring-2 [&_[role=slider]]:focus-visible:ring-purple-500/50 [&_.slider-track]:bg-slate-700/50 [&_.slider-range]:bg-gradient-to-r [&_.slider-range]:from-purple-600 [&_.slider-range]:to-purple-700"
              />
            )}
          />
          <div className="flex justify-between text-xs text-slate-400 font-bangers tracking-wide px-2">
            <span>30s (Min)</span>
            <span>5m (Max)</span>
          </div>
          {errors.timeLimit && (
            <p className="text-sm text-red-200 font-bangers tracking-wide">
              {errors.timeLimit.message}
            </p>
          )}
        </div>

        {/* Categories Selector */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-purple-200/70 font-bangers tracking-wide">
            Meme Categories
          </Label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORY_OPTIONS.map((category, index) => {
              const isSelected =
                watchedCategories?.includes(category.id) || false;
              const isOnlySelected =
                isSelected && (watchedCategories?.length || 0) === 1;

              return (
                <motion.div
                  key={category.id}
                  variants={cardVariants}
                  initial="initial"
                  whileHover={
                    !disabled && !isOnlySelected ? "hover" : "initial"
                  }
                  whileTap={!disabled && !isOnlySelected ? "tap" : "initial"}
                  animate={isSelected ? "selected" : "initial"}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "relative flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200",
                    "hover:shadow-md cursor-pointer",
                    isSelected
                      ? "bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/20"
                      : "bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50",
                    disabled && "opacity-50 cursor-not-allowed",
                    errors.categories && "border-red-500/50",
                  )}
                  onClick={() => {
                    if (!disabled && !isOnlySelected) {
                      handleCategoryToggle(category.id, !isSelected);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-disabled={disabled || isOnlySelected}
                  onKeyDown={(e) => {
                    if (
                      (e.key === " " || e.key === "Enter") &&
                      !disabled &&
                      !isOnlySelected
                    ) {
                      e.preventDefault();
                      handleCategoryToggle(category.id, !isSelected);
                    }
                  }}
                >
                  <Checkbox
                    id={category.id}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (!disabled && !isOnlySelected) {
                        handleCategoryToggle(category.id, checked as boolean);
                      }
                    }}
                    disabled={disabled || isOnlySelected}
                    className={cn(
                      "mt-0.5 border-slate-500/50 data-[state=checked]:bg-purple-600",
                      "data-[state=checked]:border-purple-600 focus-visible:ring-purple-500/50",
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-lg"
                        role="img"
                        aria-label={category.label}
                      >
                        {category.icon}
                      </span>
                      <Label
                        htmlFor={category.id}
                        className={cn(
                          "font-bangers tracking-wide cursor-pointer",
                          isSelected ? "text-white" : "text-purple-200/90",
                          disabled && "cursor-not-allowed",
                        )}
                      >
                        {category.label}
                      </Label>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-bangers tracking-wide",
                        isSelected ? "text-purple-200/80" : "text-slate-400",
                      )}
                    >
                      {category.description}
                    </p>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        className="absolute top-2 right-2"
                        variants={badgeVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 font-bangers tracking-wide">
            Select at least one category. You have{" "}
            {watchedCategories?.length || 0} selected.
          </div>

          {errors.categories && (
            <p className="text-sm text-red-200 font-bangers tracking-wide">
              {errors.categories.message}
            </p>
          )}
        </div>
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
  );
});
