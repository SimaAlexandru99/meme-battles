"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGameSettingsForm } from "@/hooks/useGameSettingsForm";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { RoundsSelector } from "./RoundsSelector";
import { TimeLimitSlider } from "./TimeLimitSlider";
import { CategoriesSelector } from "./CategoriesSelector";
import { FormErrorDisplay, FormSuccessDisplay } from "./FormErrorDisplay";
import { GameSettingsFormData } from "./types";

interface GameSettingsFormProps {
  initialSettings?: Partial<GameSettingsFormData>;
  onSubmit?: (settings: GameSettingsFormData) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

export function GameSettingsForm({
  initialSettings,
  onSubmit,
  onCancel,
  disabled = false,
  className,
}: GameSettingsFormProps) {
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null
  );

  const {
    settings,
    originalSettings,
    errors,
    isValid,
    isDirty,
    isSubmitting,
    updateSetting,
    resetForm,
    submitForm,
    clearErrors,
  } = useGameSettingsForm({
    initialSettings,
    onSubmit: async (formSettings) => {
      if (onSubmit) {
        await onSubmit(formSettings);
        setSuccessMessage("Settings saved successfully!");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  // Handle unsaved changes warning
  const { confirmNavigation } = useUnsavedChanges({
    hasUnsavedChanges: isDirty,
    message:
      "You have unsaved settings changes. Are you sure you want to cancel?",
  });

  const handleCancel = () => {
    confirmNavigation(() => {
      resetForm();
      setSuccessMessage(null);
      onCancel?.();
    });
  };

  const handleReset = () => {
    resetForm();
    setSuccessMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Success Message */}
      {successMessage && (
        <FormSuccessDisplay
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {/* Form-level Errors */}
      <FormErrorDisplay errors={errors} onDismiss={clearErrors} />

      {/* Form Fields */}
      <div className="space-y-6">
        <RoundsSelector
          value={settings.rounds}
          onChange={(rounds) => updateSetting("rounds", rounds)}
          disabled={disabled || isSubmitting}
          error={errors.rounds}
        />

        <TimeLimitSlider
          value={settings.timeLimit}
          onChange={(timeLimit) => updateSetting("timeLimit", timeLimit)}
          disabled={disabled || isSubmitting}
          error={errors.timeLimit}
        />

        <CategoriesSelector
          value={settings.categories}
          onChange={(categories) => updateSetting("categories", categories)}
          disabled={disabled || isSubmitting}
          error={errors.categories}
        />
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700/50">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <button
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
              "active:scale-95"
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
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting || disabled}
            className={cn(
              "flex-1 px-6 py-3 rounded-lg font-bangers tracking-wide text-lg",
              "bg-slate-700/50 hover:bg-slate-700/70",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "text-white border border-slate-600/50",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-slate-500/50",
              "active:scale-95"
            )}
          >
            Cancel
          </button>
        </div>

        {isDirty && (
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting || disabled}
            className={cn(
              "px-4 py-3 rounded-lg font-bangers tracking-wide text-sm",
              "text-slate-400 hover:text-white",
              "hover:bg-slate-700/30 transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-slate-500/50",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            Reset
          </button>
        )}
      </div>

      {/* Form Status */}
      {isDirty && (
        <div className="text-xs text-slate-400 font-bangers tracking-wide text-center">
          You have unsaved changes
        </div>
      )}
    </form>
  );
}
