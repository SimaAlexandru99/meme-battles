// Game Settings Types and Validation

export interface GameSettingsFormData {
  rounds: number;
  timeLimit: number;
  categories: string[];
}

export interface GameSettingsValidationErrors {
  rounds?: string;
  timeLimit?: string;
  categories?: string;
}

export interface GameSettingsValidationRules {
  rounds: {
    min: number;
    max: number;
    required: boolean;
  };
  timeLimit: {
    min: number;
    max: number;
    step: number;
    required: boolean;
  };
  categories: {
    minLength: number;
    maxLength: number;
    allowedValues: string[];
    required: boolean;
  };
}

// Validation rules based on design document
export const GAME_SETTINGS_VALIDATION: GameSettingsValidationRules = {
  rounds: {
    min: 1,
    max: 10,
    required: true,
  },
  timeLimit: {
    min: 30,
    max: 300,
    step: 15,
    required: true,
  },
  categories: {
    minLength: 1,
    maxLength: 5,
    allowedValues: ["funny", "wholesome", "dark", "random", "trending"],
    required: true,
  },
};

// Default settings
export const DEFAULT_GAME_SETTINGS: GameSettingsFormData = {
  rounds: 3,
  timeLimit: 60,
  categories: ["funny", "random"],
};

// Validation function
export function validateGameSettings(
  settings: Partial<GameSettingsFormData>
): GameSettingsValidationErrors {
  const errors: GameSettingsValidationErrors = {};

  // Validate rounds
  if (settings.rounds === undefined || settings.rounds === null) {
    errors.rounds = "Number of rounds is required";
  } else if (
    settings.rounds < GAME_SETTINGS_VALIDATION.rounds.min ||
    settings.rounds > GAME_SETTINGS_VALIDATION.rounds.max
  ) {
    errors.rounds = `Rounds must be between ${GAME_SETTINGS_VALIDATION.rounds.min} and ${GAME_SETTINGS_VALIDATION.rounds.max}`;
  }

  // Validate time limit
  if (settings.timeLimit === undefined || settings.timeLimit === null) {
    errors.timeLimit = "Time limit is required";
  } else if (
    settings.timeLimit < GAME_SETTINGS_VALIDATION.timeLimit.min ||
    settings.timeLimit > GAME_SETTINGS_VALIDATION.timeLimit.max
  ) {
    errors.timeLimit = `Time limit must be between ${GAME_SETTINGS_VALIDATION.timeLimit.min} and ${GAME_SETTINGS_VALIDATION.timeLimit.max} seconds`;
  } else if (
    settings.timeLimit % GAME_SETTINGS_VALIDATION.timeLimit.step !==
    0
  ) {
    errors.timeLimit = `Time limit must be in ${GAME_SETTINGS_VALIDATION.timeLimit.step} second increments`;
  }

  // Validate categories
  if (!settings.categories || settings.categories.length === 0) {
    errors.categories = "At least one category must be selected";
  } else if (
    settings.categories.length > GAME_SETTINGS_VALIDATION.categories.maxLength
  ) {
    errors.categories = `Maximum ${GAME_SETTINGS_VALIDATION.categories.maxLength} categories allowed`;
  } else {
    // Check if all categories are valid
    const invalidCategories = settings.categories.filter(
      (category) =>
        !GAME_SETTINGS_VALIDATION.categories.allowedValues.includes(category)
    );
    if (invalidCategories.length > 0) {
      errors.categories = `Invalid categories: ${invalidCategories.join(", ")}`;
    }
  }

  return errors;
}

// Check if settings have validation errors
export function hasValidationErrors(
  errors: GameSettingsValidationErrors
): boolean {
  return Object.keys(errors).length > 0;
}

// Get a clean settings object with only valid properties
export function sanitizeGameSettings(
  settings: Partial<GameSettingsFormData>
): GameSettingsFormData {
  return {
    rounds: Math.max(
      GAME_SETTINGS_VALIDATION.rounds.min,
      Math.min(
        GAME_SETTINGS_VALIDATION.rounds.max,
        settings.rounds || DEFAULT_GAME_SETTINGS.rounds
      )
    ),
    timeLimit: Math.max(
      GAME_SETTINGS_VALIDATION.timeLimit.min,
      Math.min(
        GAME_SETTINGS_VALIDATION.timeLimit.max,
        Math.round(
          (settings.timeLimit || DEFAULT_GAME_SETTINGS.timeLimit) /
            GAME_SETTINGS_VALIDATION.timeLimit.step
        ) * GAME_SETTINGS_VALIDATION.timeLimit.step
      )
    ),
    categories: (() => {
      const inputCategories =
        settings.categories || DEFAULT_GAME_SETTINGS.categories;
      const validCategories = inputCategories.filter((category) =>
        GAME_SETTINGS_VALIDATION.categories.allowedValues.includes(category)
      );

      // If no valid categories remain, use default categories
      return validCategories.length > 0
        ? validCategories.slice(
            0,
            GAME_SETTINGS_VALIDATION.categories.maxLength
          )
        : DEFAULT_GAME_SETTINGS.categories;
    })(),
  };
}
