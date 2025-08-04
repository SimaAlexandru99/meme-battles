"use client";

import { useState, useCallback, useEffect } from "react";
import { useDebounce } from "react-haiku";
import {
  GameSettingsFormData,
  GameSettingsValidationErrors,
  DEFAULT_GAME_SETTINGS,
  validateGameSettings,
  hasValidationErrors,
} from "@/components/game-settings/types";

interface UseGameSettingsFormProps {
  initialSettings?: Partial<GameSettingsFormData>;
  onSubmit?: (settings: GameSettingsFormData) => Promise<void>;
}

interface UseGameSettingsFormReturn {
  // Form data
  settings: GameSettingsFormData;
  originalSettings: GameSettingsFormData;

  // Validation
  errors: GameSettingsValidationErrors;
  isValid: boolean;

  // State flags
  isDirty: boolean;
  isSubmitting: boolean;

  // Actions
  updateSetting: <K extends keyof GameSettingsFormData>(
    key: K,
    value: GameSettingsFormData[K],
  ) => void;
  resetForm: () => void;
  submitForm: () => Promise<void>;

  // Validation actions
  validateField: (field: keyof GameSettingsFormData) => void;
  validateForm: () => boolean;
  clearErrors: () => void;
}

export function useGameSettingsForm({
  initialSettings = {},
  onSubmit,
}: UseGameSettingsFormProps = {}): UseGameSettingsFormReturn {
  const [settings, setSettings] = useState<GameSettingsFormData>({
    ...DEFAULT_GAME_SETTINGS,
    ...initialSettings,
  });

  const [originalSettings] = useState<GameSettingsFormData>(settings);
  const [errors, setErrors] = useState<GameSettingsValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use Haiku's useDebounce for form validation
  const debouncedSettings = useDebounce(settings, 300);

  // Calculate derived state
  const isDirty = JSON.stringify(settings) !== JSON.stringify(originalSettings);
  const isValid = !hasValidationErrors(errors);

  // Update a specific setting
  const updateSetting = useCallback(
    <K extends keyof GameSettingsFormData>(
      key: K,
      value: GameSettingsFormData[K],
    ) => {
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));

      // Clear error for this field when user starts typing
      if (errors[key]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    },
    [errors],
  );

  // Validate a specific field
  const validateField = useCallback(
    (field: keyof GameSettingsFormData) => {
      const fieldValidation = validateGameSettings({
        [field]: settings[field],
      });

      setErrors((prev) => {
        const newErrors = { ...prev };
        if (fieldValidation[field]) {
          newErrors[field] = fieldValidation[field];
        } else {
          delete newErrors[field];
        }
        return newErrors;
      });
    },
    [settings],
  );

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const validationErrors = validateGameSettings(settings);
    setErrors(validationErrors);
    return !hasValidationErrors(validationErrors);
  }, [settings]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Reset form to original state
  const resetForm = useCallback(() => {
    setSettings(originalSettings);
    setErrors({});
    setIsSubmitting(false);
  }, [originalSettings]);

  // Submit form
  const submitForm = useCallback(async () => {
    if (!onSubmit) return;

    // Validate before submitting
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(settings);
      // Reset form state after successful submission
      setErrors({});
    } catch (error) {
      // Handle submission errors
      if (error instanceof Error) {
        setErrors({
          rounds: error.message.includes("rounds") ? error.message : undefined,
          timeLimit: error.message.includes("time") ? error.message : undefined,
          categories: error.message.includes("categories")
            ? error.message
            : undefined,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, settings, validateForm]);

  // Auto-validate on settings change (debounced)
  useEffect(() => {
    if (isDirty) {
      validateForm();
    }
  }, [debouncedSettings, isDirty, validateForm]);

  return {
    // Form data
    settings,
    originalSettings,

    // Validation
    errors,
    isValid,

    // State flags
    isDirty,
    isSubmitting,

    // Actions
    updateSetting,
    resetForm,
    submitForm,

    // Validation actions
    validateField,
    validateForm,
    clearErrors,
  };
}
