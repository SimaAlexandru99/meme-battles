import * as Sentry from "@sentry/nextjs";
import {
  createLobby,
  joinLobby,
  getLobbyData,
  startGame,
  leaveLobby,
  updateLobbySettings,
  addAIPlayerToLobby,
  removeAIPlayerFromLobby,
} from "@/lib/actions";

/**
 * Joins a lobby with the given invitation code
 * @param invitationCode - The 5-character invitation code
 * @returns Promise with lobby data or error
 */
export async function joinLobbyService(
  invitationCode: string
): Promise<JoinLobbyResponse> {
  return Sentry.startSpan(
    {
      op: "ui.action",
      name: `Join Lobby Service`,
    },
    async () => {
      try {
        const response = await joinLobby(invitationCode);

        if (response.success && response.lobby) {
          return {
            success: true,
            lobby: response.lobby,
          } as unknown as JoinLobbyResponse;
        } else {
          throw new Error("Failed to join lobby");
        }
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Creates a new lobby and returns the invitation code
 * @returns Promise with lobby data or error
 */
export async function createLobbyService(): Promise<CreateLobbyResponse> {
  return Sentry.startSpan(
    {
      op: "ui.action",
      name: `Create Lobby Service`,
    },
    async () => {
      try {
        const response = await createLobby();

        if (response.success && response.lobby) {
          return {
            success: true,
            lobby: response.lobby,
          } as unknown as CreateLobbyResponse;
        } else {
          throw new Error("Failed to create lobby");
        }
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Gets lobby data by invitation code
 * @param invitationCode - The 5-character invitation code
 * @returns Promise with lobby data or error
 */
export async function getLobbyDataService(
  invitationCode: string
): Promise<{ success: boolean; lobby: Lobby }> {
  return Sentry.startSpan(
    {
      op: "ui.action",
      name: `Get Lobby Data Service`,
    },
    async () => {
      try {
        const response = await getLobbyData(invitationCode);

        if (response.success && response.lobby) {
          return {
            success: true,
            lobby: response.lobby,
          } as unknown as { success: boolean; lobby: Lobby };
        } else {
          throw new Error("Failed to get lobby data");
        }
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Starts a game in the lobby (host only)
 * @param invitationCode - The 5-character invitation code
 * @returns Promise with updated lobby data or error
 */
export async function startGameService(
  invitationCode: string
): Promise<{ success: boolean; lobby: Lobby }> {
  return Sentry.startSpan(
    {
      op: "ui.action",
      name: `Start Game Service`,
    },
    async () => {
      try {
        const response = await startGame(invitationCode);

        if (response.success && response.lobby) {
          return {
            success: true,
            lobby: response.lobby,
          } as unknown as { success: boolean; lobby: Lobby };
        } else {
          throw new Error("Failed to start game");
        }
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Leaves a lobby
 * @param invitationCode - The 5-character invitation code
 * @returns Promise with success response or error
 */
export async function leaveLobbyService(
  invitationCode: string
): Promise<{ success: boolean; message: string }> {
  return Sentry.startSpan(
    {
      op: "ui.action",
      name: `Leave Lobby Service`,
    },
    async () => {
      try {
        const response = await leaveLobby(invitationCode);

        if (response.success) {
          return {
            success: true,
            message: response.message || "Successfully left the lobby",
          };
        } else {
          throw new Error("Failed to leave lobby");
        }
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Validates an invitation code format
 * @param code - The invitation code to validate
 * @returns Boolean indicating if the code is valid
 */
export function validateInvitationCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }

  // Check if code is exactly 5 characters and alphanumeric
  const normalizedCode = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return normalizedCode.length === 5;
}

/**
 * Normalizes an invitation code (uppercase, alphanumeric only)
 * @param code - The invitation code to normalize
 * @returns Normalized invitation code
 */
export function normalizeInvitationCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * Updates lobby settings (host only)
 * @param invitationCode - The 5-character invitation code
 * @param settings - The new lobby settings
 * @returns Promise with updated lobby data or error
 */
export async function updateLobbySettingsService(
  invitationCode: string,
  settings: {
    rounds: number;
    timeLimit: number;
    categories: string[];
    aiSettings?: {
      enabled: boolean;
      maxAIPlayers: number;
      minHumanPlayers: number;
      personalityPool: string[];
      autoBalance: boolean;
      difficulty: "easy" | "medium" | "hard";
    };
  }
): Promise<{ success: boolean; lobby: Lobby; message: string }> {
  return Sentry.startSpan(
    {
      op: "ui.action",
      name: `Update Lobby Settings Service`,
    },
    async () => {
      try {
        const response = await updateLobbySettings(invitationCode, settings);

        if (response.success && response.lobby) {
          return {
            success: true,
            lobby: response.lobby,
            message: response.message || "Settings updated successfully",
          } as unknown as { success: boolean; lobby: Lobby; message: string };
        } else {
          throw new Error("Failed to update lobby settings");
        }
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

export async function addAIPlayerToLobbyService(
  invitationCode: string,
  botConfig: {
    personalityId: string;
    difficulty: "easy" | "medium" | "hard";
  }
): Promise<{ success: boolean; lobby: Lobby; message: string }> {
  try {
    const result = await addAIPlayerToLobby(invitationCode, botConfig);
    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add AI player";
    throw new Error(errorMessage);
  }
}

export async function removeAIPlayerFromLobbyService(
  invitationCode: string,
  aiPlayerId: string
): Promise<{ success: boolean; lobby: Lobby; message: string }> {
  try {
    const result = await removeAIPlayerFromLobby(invitationCode, aiPlayerId);
    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to remove AI player";
    throw new Error(errorMessage);
  }
}
