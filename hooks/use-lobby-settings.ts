import { useState, useEffect, useCallback, useRef } from "react";
import { LobbyService } from "@/lib/services/lobby.service";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import * as Sentry from "@sentry/nextjs";

// Hook return interface
interface UseLobbySettingsReturn {
  // State
  settings: GameSettings | null;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  validationErrors: Record<string, string>;

  // Actions
  updateSettings: (newSettings: Partial<GameSettings>) => Promise<void>;
  resetSettings: () => void;
  validateSettings: (settings: GameSettings) => ValidationResult;

  // Utilities
  isHost: boolean;
  canModifySettings: boolean;
  clearError: () => void;
}

// Available meme categories for validation
const AVAILABLE_CATEGORIES = [
  "general",
  "reaction",
  "wholesome",
  "animals",
  "gaming",
  "movies",
  "tv-shows",
  "internet",
  "classic",
  "trending",
];

// Settings constraints for validation
const SETTINGS_CONSTRAINTS: GameSettingsConstraints = {
  rounds: { min: 3, max: 15 },
  timeLimit: { min: 30, max: 120 },
  categories: {
    available: AVAILABLE_CATEGORIES,
    minSelected: 1,
  },
};

/**
 * Custom hook for lobby settings management with validation and real-time synchronization
 * Handles host-only permissions, optimistic updates, and rollback on failure
 */
export function useLobbySettings(
  lobbyCode: string,
  lobbyData: LobbyData | null
): UseLobbySettingsReturn {
  // Core state
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Service and user references
  const lobbyService = useRef(LobbyService.getInstance());
  const { user } = useCurrentUser();

  // Optimistic update state for rollback functionality
  const [optimisticSettings, setOptimisticSettings] =
    useState<GameSettings | null>(null);
  const rollbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const isHost = !!(user && lobbyData && lobbyData.hostUid === user.id);
  const canModifySettings =
    isHost && lobbyData?.status === "waiting" && !isLoading;

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setValidationErrors({});
  }, []);

  /**
   * Validate game settings against constraints
   */
  const validateSettings = useCallback(
    (settingsToValidate: GameSettings): ValidationResult => {
      const errors: string[] = [];
      const fieldErrors: Record<string, string> = {};

      // Validate rounds
      if (
        settingsToValidate.rounds < SETTINGS_CONSTRAINTS.rounds.min ||
        settingsToValidate.rounds > SETTINGS_CONSTRAINTS.rounds.max
      ) {
        const error = `Rounds must be between ${SETTINGS_CONSTRAINTS.rounds.min} and ${SETTINGS_CONSTRAINTS.rounds.max}`;
        errors.push(error);
        fieldErrors.rounds = error;
      }

      // Validate time limit
      if (
        settingsToValidate.timeLimit < SETTINGS_CONSTRAINTS.timeLimit.min ||
        settingsToValidate.timeLimit > SETTINGS_CONSTRAINTS.timeLimit.max
      ) {
        const error = `Time limit must be between ${SETTINGS_CONSTRAINTS.timeLimit.min} and ${SETTINGS_CONSTRAINTS.timeLimit.max} seconds`;
        errors.push(error);
        fieldErrors.timeLimit = error;
      }

      // Validate categories
      if (
        !Array.isArray(settingsToValidate.categories) ||
        settingsToValidate.categories.length <
          SETTINGS_CONSTRAINTS.categories.minSelected
      ) {
        const error = `At least ${SETTINGS_CONSTRAINTS.categories.minSelected} category must be selected`;
        errors.push(error);
        fieldErrors.categories = error;
      } else {
        // Check if all selected categories are valid
        const invalidCategories = settingsToValidate.categories.filter(
          (category) =>
            !SETTINGS_CONSTRAINTS.categories.available.includes(category)
        );
        if (invalidCategories.length > 0) {
          const error = `Invalid categories: ${invalidCategories.join(", ")}`;
          errors.push(error);
          fieldErrors.categories = error;
        }
      }

      // Update field-specific validation errors
      setValidationErrors(fieldErrors);

      return {
        isValid: errors.length === 0,
        errors,
        field: Object.keys(fieldErrors)[0], // First field with error
      };
    },
    []
  );

  /**
   * Handle settings update errors with proper classification
   */
  const handleError = useCallback(
    (error: unknown, operation: string) => {
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error instanceof Error && "type" in error) {
        const lobbyError = error as LobbyError;
        errorMessage = lobbyError.userMessage || lobbyError.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setIsLoading(false);

      // Log error for monitoring
      Sentry.captureException(error, {
        tags: {
          operation,
          lobbyCode,
          userId: user?.id || "anonymous",
          isHost,
        },
      });
    },
    [lobbyCode, user?.id, isHost]
  );

  /**
   * Update lobby settings with optimistic updates and rollback on failure
   */
  const updateSettings = useCallback(
    async (newSettings: Partial<GameSettings>): Promise<void> => {
      if (!user || !lobbyData || !canModifySettings) {
        throw new Error("Cannot modify settings: insufficient permissions");
      }

      if (!settings) {
        throw new Error("No current settings to update");
      }

      // Merge new settings with current settings
      const updatedSettings: GameSettings = {
        ...settings,
        ...newSettings,
      };

      // Validate merged settings
      const validation = validateSettings(updatedSettings);
      if (!validation.isValid) {
        setError(`Invalid settings: ${validation.errors.join(", ")}`);
        return;
      }

      setIsLoading(true);
      setError(null);
      clearError();

      // Optimistic update - immediately show changes in UI
      const previousSettings = settings;
      setSettings(updatedSettings);
      setOptimisticSettings(updatedSettings);
      setHasUnsavedChanges(true);

      // Clear any existing rollback timeout
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
        rollbackTimeoutRef.current = null;
      }

      try {
        const result = await lobbyService.current.updateLobbySettings(
          lobbyCode,
          newSettings,
          user.id
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to update settings");
        }

        // Success - clear optimistic state and mark as saved
        setOptimisticSettings(null);
        setHasUnsavedChanges(false);
        setIsLoading(false);

        Sentry.addBreadcrumb({
          message: "Settings updated successfully",
          data: {
            lobbyCode,
            updatedFields: Object.keys(newSettings),
            newSettings: updatedSettings,
          },
          level: "info",
        });
      } catch (error) {
        // Failure - rollback optimistic update after a short delay
        rollbackTimeoutRef.current = setTimeout(() => {
          setSettings(previousSettings);
          setOptimisticSettings(null);
          setHasUnsavedChanges(false);
          rollbackTimeoutRef.current = null;
        }, 1000); // 1 second delay to show the error

        handleError(error, "update_settings");
        throw error;
      }
    },
    [
      user,
      lobbyData,
      canModifySettings,
      settings,
      validateSettings,
      clearError,
      lobbyCode,
      handleError,
    ]
  );

  /**
   * Reset settings to lobby's current settings (cancel unsaved changes)
   */
  const resetSettings = useCallback(() => {
    if (lobbyData?.settings) {
      setSettings(lobbyData.settings);
      setOptimisticSettings(null);
      setHasUnsavedChanges(false);
      setError(null);
      setValidationErrors({});

      // Clear any pending rollback
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
        rollbackTimeoutRef.current = null;
      }

      Sentry.addBreadcrumb({
        message: "Settings reset to lobby state",
        data: {
          lobbyCode,
          resetTo: lobbyData.settings,
        },
        level: "info",
      });
    }
  }, [lobbyData?.settings, lobbyCode]);

  /**
   * Sync settings with lobby data changes (real-time updates from other players)
   */
  useEffect(() => {
    if (lobbyData?.settings) {
      // Only update if we don't have unsaved changes (avoid overwriting user input)
      if (!hasUnsavedChanges && !optimisticSettings) {
        setSettings(lobbyData.settings);
      }
    }
  }, [lobbyData?.settings, hasUnsavedChanges, optimisticSettings]);

  /**
   * Handle host permission changes
   */
  useEffect(() => {
    if (!isHost && hasUnsavedChanges) {
      // User lost host privileges, reset any unsaved changes
      resetSettings();
    }
  }, [isHost, hasUnsavedChanges, resetSettings]);

  /**
   * Handle lobby status changes
   */
  useEffect(() => {
    if (lobbyData?.status !== "waiting" && hasUnsavedChanges) {
      // Game started or ended, reset any unsaved changes
      resetSettings();
    }
  }, [lobbyData?.status, hasUnsavedChanges, resetSettings]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (rollbackTimeoutRef.current) {
        clearTimeout(rollbackTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Validate settings whenever they change
   */
  useEffect(() => {
    if (settings) {
      validateSettings(settings);
    }
  }, [settings, validateSettings]);

  return {
    // State
    settings,
    isLoading,
    error,
    hasUnsavedChanges,
    validationErrors,

    // Actions
    updateSettings,
    resetSettings,
    validateSettings,

    // Utilities
    isHost,
    canModifySettings,
    clearError,
  };
}
