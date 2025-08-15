// Game Settings Types and Validation

export interface GameSettingsFormData {
  rounds: number;
  timeLimit: number;
}

export interface GameSettingsValidationErrors {
  rounds?: string;
  timeLimit?: string;
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
};

// Default settings
export const DEFAULT_GAME_SETTINGS: GameSettingsFormData = {
  rounds: 3,
  timeLimit: 60,
};

// Available AI personalities for selection
export const AVAILABLE_AI_PERSONALITIES = [
  {
    id: "sarcastic-sam",
    name: "Sarcastic Sam",
    description: "Witty and edgy humor",
  },
  {
    id: "wholesome-wendy",
    name: "Wholesome Wendy",
    description: "Kind and positive vibes",
  },
  {
    id: "chaos-carl",
    name: "Chaos Carl",
    description: "Unpredictable and random",
  },
  {
    id: "brainy-betty",
    name: "Brainy Betty",
    description: "Clever and strategic",
  },
  {
    id: "random-rick",
    name: "Random Rick",
    description: "Completely unpredictable",
  },
  {
    id: "meme-master-mike",
    name: "Meme Master Mike",
    description: "Meme connoisseur",
  },
];

// Validation function
export function validateGameSettings(
  settings: Partial<GameSettingsFormData>,
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

  return errors;
}

// Check if settings have validation errors
export function hasValidationErrors(
  errors: GameSettingsValidationErrors,
): boolean {
  return Object.keys(errors).length > 0;
}
