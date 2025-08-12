/**
 * Lobby validation utilities using the defined TypeScript interfaces
 */

// Validation constants based on GameSettingsConstraints
export const LOBBY_VALIDATION_RULES: LobbyValidationSchema = {
  code: {
    pattern: /^[A-Z0-9]{5}$/,
    length: 5,
  },
  displayName: {
    minLength: 1,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9\s_-]+$/,
  },
  maxPlayers: {
    min: 3,
    max: 8,
  },
};

export const GAME_SETTINGS_CONSTRAINTS: GameSettingsConstraints = {
  rounds: {
    min: 3,
    max: 15,
  },
  timeLimit: {
    min: 30,
    max: 120,
  },
  categories: {
    available: ["general", "reaction", "wholesome", "gaming", "animals"],
    minSelected: 1,
  },
};

/**
 * Validates lobby code format
 */
export function validateLobbyCode(code: string): ValidationResult {
  const errors: string[] = [];

  if (!code) {
    errors.push("Lobby code is required");
  } else if (code.length !== LOBBY_VALIDATION_RULES.code.length) {
    errors.push(
      `Lobby code must be exactly ${LOBBY_VALIDATION_RULES.code.length} characters`,
    );
  } else if (!LOBBY_VALIDATION_RULES.code.pattern.test(code)) {
    errors.push("Lobby code must contain only uppercase letters and numbers");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates game settings
 */
export function validateGameSettings(
  settings: Partial<GameSettings>,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (settings.rounds !== undefined) {
    if (settings.rounds < GAME_SETTINGS_CONSTRAINTS.rounds.min) {
      errors.push(`Minimum rounds is ${GAME_SETTINGS_CONSTRAINTS.rounds.min}`);
    } else if (settings.rounds > GAME_SETTINGS_CONSTRAINTS.rounds.max) {
      errors.push(`Maximum rounds is ${GAME_SETTINGS_CONSTRAINTS.rounds.max}`);
    }
  }

  if (settings.timeLimit !== undefined) {
    if (settings.timeLimit < GAME_SETTINGS_CONSTRAINTS.timeLimit.min) {
      errors.push(
        `Minimum time limit is ${GAME_SETTINGS_CONSTRAINTS.timeLimit.min} seconds`,
      );
    } else if (settings.timeLimit > GAME_SETTINGS_CONSTRAINTS.timeLimit.max) {
      errors.push(
        `Maximum time limit is ${GAME_SETTINGS_CONSTRAINTS.timeLimit.max} seconds`,
      );
    }
  }

  if (settings.categories !== undefined) {
    if (
      settings.categories.length <
      GAME_SETTINGS_CONSTRAINTS.categories.minSelected
    ) {
      errors.push(
        `At least ${GAME_SETTINGS_CONSTRAINTS.categories.minSelected} category must be selected`,
      );
    }

    const invalidCategories = settings.categories.filter(
      (cat) => !GAME_SETTINGS_CONSTRAINTS.categories.available.includes(cat),
    );
    if (invalidCategories.length > 0) {
      errors.push(`Invalid categories: ${invalidCategories.join(", ")}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates player display name
 */
export function validateDisplayName(displayName: string): ValidationResult {
  const errors: string[] = [];

  if (!displayName) {
    errors.push("Display name is required");
  } else if (
    displayName.length < LOBBY_VALIDATION_RULES.displayName.minLength
  ) {
    errors.push(
      `Display name must be at least ${LOBBY_VALIDATION_RULES.displayName.minLength} character`,
    );
  } else if (
    displayName.length > LOBBY_VALIDATION_RULES.displayName.maxLength
  ) {
    errors.push(
      `Display name must be no more than ${LOBBY_VALIDATION_RULES.displayName.maxLength} characters`,
    );
  } else if (!LOBBY_VALIDATION_RULES.displayName.pattern.test(displayName)) {
    errors.push(
      "Display name can only contain letters, numbers, spaces, underscores, and hyphens",
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard to check if an object is a valid LobbyData
 */
export function isValidLobbyData(obj: unknown): obj is LobbyData {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === "object" &&
    true &&
    "code" in obj &&
    "hostUid" in obj &&
    "hostDisplayName" in obj &&
    "maxPlayers" in obj &&
    "status" in obj &&
    "settings" in obj &&
    "players" in obj &&
    "createdAt" in obj &&
    "updatedAt" in obj &&
    typeof (obj as LobbyData).code === "string" &&
    typeof (obj as LobbyData).hostUid === "string" &&
    typeof (obj as LobbyData).hostDisplayName === "string" &&
    typeof (obj as LobbyData).maxPlayers === "number" &&
    typeof (obj as LobbyData).status === "string" &&
    (obj as LobbyData).settings &&
    (obj as LobbyData).players &&
    typeof (obj as LobbyData).createdAt === "string" &&
    typeof (obj as LobbyData).updatedAt === "string"
  );
}

/**
 * Type guard to check if an object is a valid PlayerData
 */
export function isValidPlayerData(obj: unknown): obj is PlayerData {
  return (
    obj !== null &&
    obj !== undefined &&
    typeof obj === "object" &&
    true &&
    "displayName" in obj &&
    "avatarId" in obj &&
    "joinedAt" in obj &&
    "isHost" in obj &&
    "score" in obj &&
    "status" in obj &&
    "lastSeen" in obj &&
    typeof (obj as PlayerData).displayName === "string" &&
    typeof (obj as PlayerData).avatarId === "string" &&
    typeof (obj as PlayerData).joinedAt === "string" &&
    typeof (obj as PlayerData).isHost === "boolean" &&
    typeof (obj as PlayerData).score === "number" &&
    typeof (obj as PlayerData).status === "string" &&
    typeof (obj as PlayerData).lastSeen === "string"
  );
}
