import {
  ref,
  set,
  get,
  update,
  onValue,
  off,
  remove,
  onDisconnect,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "@/firebase/client";
import * as Sentry from "@sentry/nextjs";
import { AVAILABLE_AI_PERSONALITIES } from "@/components/game-settings/types";
import { AIBotService } from "./ai-bot.service";

/**
 * Enhanced service for managing lobby operations using Firebase Realtime Database
 * with atomic operations, comprehensive error handling, and retry mechanisms
 */
export class LobbyService {
  private static instance: LobbyService;
  private readonly CODE_LENGTH = 5;
  private readonly CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  private readonly MAX_CODE_GENERATION_ATTEMPTS = 10;
  private readonly RETRY_DELAYS = [100, 200, 400, 800, 1600]; // Exponential backoff in ms
  private settingsUpdateTimeouts = new Map<string, NodeJS.Timeout>();

  static getInstance(): LobbyService {
    if (!LobbyService.instance) {
      LobbyService.instance = new LobbyService();
    }
    return LobbyService.instance;
  }

  /**
   * Create a custom error with proper typing and user-friendly messages
   * Automatically reports to Sentry for monitoring
   */
  private createLobbyError(
    type: LobbyErrorType,
    message: string,
    userMessage: string,
    retryable: boolean = false
  ): LobbyError {
    const error = new Error(message) as LobbyError;
    error.type = type;
    error.userMessage = userMessage;
    error.retryable = retryable;
    error.name = "LobbyError";

    // Automatically report to Sentry for monitoring
    Sentry.captureException(error, {
      tags: {
        operation: "lobby_service",
        error_type: type,
        retryable: retryable.toString(),
      },
      extra: {
        message,
        userMessage,
        type,
        retryable,
      },
    });

    return error;
  }

  /**
   * Generate a random lobby code
   */
  private generateRandomCode(): string {
    let code = "";
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      code += this.CODE_CHARS.charAt(
        Math.floor(Math.random() * this.CODE_CHARS.length)
      );
    }
    return code;
  }

  /**
   * Check if a lobby code exists in the database
   */
  async checkLobbyCodeExists(code: string): Promise<boolean> {
    try {
      const lobbyRef = ref(rtdb, `lobbies/${code}`);
      const snapshot = await get(lobbyRef);
      return snapshot.exists();
    } catch (error) {
      Sentry.captureException(error);
      throw this.createLobbyError(
        "NETWORK_ERROR",
        `Failed to check lobby code existence: ${error}`,
        "Network error while validating lobby code. Please try again.",
        true
      );
    }
  }

  /**
   * Generate a unique lobby code with atomic check-and-set operations
   * Implements retry logic with exponential backoff for high-concurrency scenarios
   */
  async generateUniqueLobbyCode(): Promise<string> {
    return Sentry.startSpan(
      {
        op: "db.lobby.generate_code",
        name: "Generate Unique Lobby Code",
      },
      async () => {
        let attempts = 0;
        const startTime = Date.now();

        while (attempts < this.MAX_CODE_GENERATION_ATTEMPTS) {
          try {
            const code = this.generateRandomCode();
            const lobbyRef = ref(rtdb, `lobbies/${code}`);

            // Atomic check-and-set operation
            const snapshot = await get(lobbyRef);

            if (!snapshot.exists()) {
              // Reserve the code immediately with a placeholder to prevent race conditions
              await set(lobbyRef, {
                reserved: true,
                reservedAt: Date.now(),
                reservedBy: "code_generation",
              });

              // Log successful generation for monitoring
              Sentry.addBreadcrumb({
                message: "Lobby code generated successfully",
                data: {
                  code,
                  attempts: attempts + 1,
                  duration: Date.now() - startTime,
                },
                level: "info",
              });

              return code;
            }

            attempts++;

            // Exponential backoff with jitter to reduce collision probability
            if (attempts < this.MAX_CODE_GENERATION_ATTEMPTS) {
              const baseDelay =
                this.RETRY_DELAYS[
                  Math.min(attempts - 1, this.RETRY_DELAYS.length - 1)
                ];
              const jitter = Math.random() * 100; // Add up to 100 ms jitter
              await new Promise((resolve) =>
                setTimeout(resolve, baseDelay + jitter)
              );
            }
          } catch (error) {
            attempts++;
            Sentry.captureException(error);

            // If it's a network error and we have retries left, continue
            if (attempts < this.MAX_CODE_GENERATION_ATTEMPTS) {
              const delay =
                this.RETRY_DELAYS[
                  Math.min(attempts - 1, this.RETRY_DELAYS.length - 1)
                ];
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }

            // If we've exhausted retries, throw network error
            throw this.createLobbyError(
              "NETWORK_ERROR",
              `Network error during code generation: ${error}`,
              "Unable to generate lobby code due to network issues. Please check your connection and try again.",
              true
            );
          }
        }

        // Log code generation failure for monitoring collision rates
        Sentry.captureMessage(
          "Lobby code generation failed after maximum attempts",
          {
            level: "warning",
            extra: {
              attempts: this.MAX_CODE_GENERATION_ATTEMPTS,
              duration: Date.now() - startTime,
              codeLength: this.CODE_LENGTH,
              charsetSize: this.CODE_CHARS.length,
            },
          }
        );

        // Explicit fallback behavior after maximum retry attempts
        throw this.createLobbyError(
          "CODE_GENERATION_FAILED",
          `Unable to generate unique lobby code after ${this.MAX_CODE_GENERATION_ATTEMPTS} attempts`,
          "Unable to create a unique lobby code. This usually happens during high traffic. Please try again in a moment.",
          true
        );
      }
    );
  }

  /**
   * Validate lobby code format
   */
  validateLobbyCode(code: string): ValidationResult {
    const errors: string[] = [];

    if (!code) {
      errors.push("Lobby code is required");
    } else {
      if (code.length !== this.CODE_LENGTH) {
        errors.push(
          `Lobby code must be exactly ${this.CODE_LENGTH} characters`
        );
      }

      if (!/^[A-Z0-9]+$/.test(code)) {
        errors.push(
          "Lobby code can only contain uppercase letters and numbers"
        );
      }
    }

    // Add breadcrumb for validation attempts
    Sentry.addBreadcrumb({
      message: "Lobby code validation",
      data: {
        code,
        isValid: errors.length === 0,
        errorCount: errors.length,
        errors,
      },
      level: errors.length === 0 ? "info" : "warning",
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate game settings
   */
  isValidGameSettings(settings: GameSettings): ValidationResult {
    const errors: string[] = [];

    if (settings.rounds < 3 || settings.rounds > 15) {
      errors.push("Rounds must be between 3 and 15");
    }

    if (settings.timeLimit < 30 || settings.timeLimit > 120) {
      errors.push("Time limit must be between 30 and 120 seconds");
    }

    if (
      !Array.isArray(settings.categories) ||
      settings.categories.length === 0
    ) {
      errors.push("At least one category must be selected");
    }

    // Add breadcrumb for settings validation
    Sentry.addBreadcrumb({
      message: "Game settings validation",
      data: {
        rounds: settings.rounds,
        timeLimit: settings.timeLimit,
        categories: settings.categories,
        isValid: errors.length === 0,
        errorCount: errors.length,
        errors,
      },
      level: errors.length === 0 ? "info" : "warning",
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a new lobby with atomic code generation
   */
  async createLobby(
    params: CreateLobbyParams
  ): Promise<ServiceResult<{ code: string; lobby: LobbyData }>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.create",
        name: "Create Lobby",
      },
      async () => {
        try {
          // Add breadcrumb for lobby creation start
          Sentry.addBreadcrumb({
            message: "Starting lobby creation",
            data: {
              hostUid: params.hostUid,
              hostDisplayName: params.hostDisplayName,
              maxPlayers: params.maxPlayers || 8,
              hasCustomSettings: !!params.settings,
            },
            level: "info",
          });

          // Generate unique lobby code atomically
          const code = await this.generateUniqueLobbyCode();

          // Set default values
          const maxPlayers = params.maxPlayers || 8;
          const defaultSettings: GameSettings = {
            rounds: 8,
            timeLimit: 60,
            categories: ["general", "reaction", "wholesome"],
          };
          const settings = { ...defaultSettings, ...params.settings };

          // Validate settings
          const validation = this.isValidGameSettings(settings);
          if (!validation.isValid) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `Invalid game settings: ${validation.errors.join(", ")}`,
              `Invalid settings: ${validation.errors.join(", ")}`
            );
          }

          const now = serverTimestamp();
          const lobby: LobbyData = {
            code,
            hostUid: params.hostUid,
            hostDisplayName: params.hostDisplayName,
            maxPlayers,
            status: "waiting" as LobbyStatus,
            settings,
            players: {
              [params.hostUid]: {
                id: params.hostUid,
                displayName: params.hostDisplayName,
                avatarId: params.hostAvatarId,
                profileURL: params.hostProfileURL,
                joinedAt: now as unknown as string,
                isHost: true,
                score: 0,
                status: "waiting" as PlayerStatus,
                lastSeen: now as unknown as string,
              },
            },
            createdAt: now as unknown as string,
            updatedAt: now as unknown as string,
          };

          // Replace the reserved placeholder with actual lobby data (with retries)
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          await set(lobbyRef, lobby);

          // Verify replacement and retry if node still marked as reserved (handles race/lag)
          for (let attempt = 0; attempt < 3; attempt++) {
            const verifySnap = await get(lobbyRef);
            const verifyData = verifySnap.val();
            if (
              verifyData &&
              !verifyData.reserved &&
              verifyData.hostUid === params.hostUid
            ) {
              break;
            }
            // Attempt overwrite using update to ensure replacement
            await update(ref(rtdb), { [`lobbies/${code}`]: lobby });
            await new Promise((r) => setTimeout(r, 100));
          }

          // Add breadcrumb for successful lobby creation
          Sentry.addBreadcrumb({
            message: "Lobby created successfully",
            data: {
              code,
              hostUid: params.hostUid,
              playerCount: 1,
              maxPlayers: lobby.maxPlayers,
            },
            level: "info",
          });

          return {
            success: true,
            data: { code, lobby },
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as LobbyError).type
          ) {
            // Re-throw lobby errors as-is
            throw error;
          }

          Sentry.captureException(error);
          throw this.createLobbyError(
            "UNKNOWN_ERROR",
            `Failed to create lobby: ${error}`,
            "Failed to create lobby. Please try again.",
            true
          );
        }
      }
    );
  }

  /**
   * Join an existing lobby
   */
  async joinLobby(
    lobbyCode: string,
    params: JoinLobbyParams
  ): Promise<ServiceResult<LobbyData>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.join",
        name: "Join Lobby",
      },
      async () => {
        try {
          // Validate lobby code format
          const codeValidation = this.validateLobbyCode(lobbyCode);
          if (!codeValidation.isValid) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `Invalid lobby code format: ${codeValidation.errors.join(", ")}`,
              `Invalid lobby code: ${codeValidation.errors.join(", ")}`,
              false
            );
          }

          const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            throw this.createLobbyError(
              "LOBBY_NOT_FOUND",
              `Lobby ${lobbyCode} not found`,
              "Lobby not found. Please check the code.",
              false
            );
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Check if lobby is full
          const playerCount = Object.keys(lobby.players || {}).length;
          if (playerCount >= lobby.maxPlayers) {
            throw this.createLobbyError(
              "LOBBY_FULL",
              `Lobby ${lobbyCode} is full (${playerCount}/${lobby.maxPlayers})`,
              "This lobby is full. Try another one.",
              false
            );
          }

          // Check if lobby has already started
          if (lobby.status !== "waiting") {
            throw this.createLobbyError(
              "LOBBY_ALREADY_STARTED",
              `Lobby ${lobbyCode} has status ${lobby.status}`,
              "This game has already started. You cannot join now.",
              false
            );
          }

          // Check if player is already in the lobby
          if (lobby.players[params.uid]) {
            // Player already in lobby, return current state
            return {
              success: true,
              data: lobby,
            };
          }

          const now = serverTimestamp();

          // Add player to lobby
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${lobbyCode}/players/${params.uid}`] = {
            displayName: params.displayName,
            avatarId: params.avatarId,
            profileURL: params.profileURL || null,
            joinedAt: now,
            isHost: false,
            score: 0,
            status: "waiting" as PlayerStatus,
            lastSeen: now,
          };
          updates[`lobbies/${lobbyCode}/updatedAt`] = now;

          await update(ref(rtdb), updates);

          // Get updated lobby data
          const updatedSnapshot = await get(lobbyRef);
          const updatedLobby = updatedSnapshot.val() as LobbyData;

          return {
            success: true,
            data: updatedLobby,
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as LobbyError).type
          ) {
            throw error;
          }

          // Report unknown errors to Sentry and create a new error
          Sentry.captureException(error, {
            tags: {
              operation: "lobby_service",
              error_type: "unknown_error",
              method: "joinLobby",
            },
            extra: {
              originalError:
                error instanceof Error ? error.message : String(error),
              lobbyCode,
              params,
            },
          });

          const newError = new Error(
            `Failed to join lobby: ${error}`
          ) as LobbyError;
          newError.userMessage = "Failed to join lobby. Please try again.";
          newError.retryable = true;
          newError.type = "UNKNOWN_ERROR";
          newError.name = "LobbyError";
          throw newError;
        }
      }
    );
  }

  /**
   * Update lobby settings with host permission validation and debouncing
   */
  async updateLobbySettings(
    code: string,
    settings: Partial<GameSettings>,
    hostUid: string
  ): Promise<ServiceResult<LobbyData>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.update_settings",
        name: "Update Lobby Settings",
      },
      async () => {
        try {
          // Get current lobby data to validate host permissions
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            const error = new Error(`Lobby ${code} not found`) as LobbyError;
            error.userMessage = "Lobby not found. Please check the code.";
            error.retryable = false;
            error.type = "LOBBY_NOT_FOUND";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "lobby_not_found",
                method: "updateLobbySettings",
              },
              extra: {
                code,
              },
            });
            throw error;
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Validate host permissions
          if (lobby.hostUid !== hostUid) {
            const error = new Error(
              `User ${hostUid} is not the host of lobby ${code}`
            ) as LobbyError;
            error.userMessage = "Only the host can change game settings.";
            error.retryable = false;
            error.type = "PERMISSION_DENIED";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "permission_denied",
                method: "updateLobbySettings",
              },
              extra: {
                hostUid,
                code,
                lobbyHostUid: lobby.hostUid,
              },
            });
            throw error;
          }

          // Validate lobby status
          if (lobby.status !== "waiting") {
            const error = new Error(
              `Cannot update settings for lobby ${code} with status ${lobby.status}`
            ) as LobbyError;
            error.userMessage =
              "Cannot change settings after the game has started.";
            error.retryable = false;
            error.type = "LOBBY_ALREADY_STARTED";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "lobby_already_started",
                method: "updateLobbySettings",
              },
              extra: {
                code,
                currentStatus: lobby.status,
                expectedStatus: "waiting",
              },
            });
            throw error;
          }

          // Merge and validate new settings
          const updatedSettings = { ...lobby.settings, ...settings };
          const validation = this.isValidGameSettings(updatedSettings);
          if (!validation.isValid) {
            const error = new Error(
              `Invalid game settings: ${validation.errors.join(", ")}`
            ) as LobbyError;
            error.userMessage = `Invalid settings: ${validation.errors.join(", ")}`;
            error.retryable = false;
            error.type = "VALIDATION_ERROR";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "validation_error",
                method: "updateLobbySettings",
              },
              extra: {
                code,
                validationErrors: validation.errors,
                currentSettings: lobby.settings,
                newSettings: settings,
              },
            });
            throw error;
          }

          // Clear any existing timeout for this lobby
          const existingTimeout = this.settingsUpdateTimeouts.get(code);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Debounce rapid changes (wait 500 ms before applying)
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(async () => {
              try {
                const updates: Record<string, unknown> = {};
                updates[`lobbies/${code}/settings`] = updatedSettings;
                updates[`lobbies/${code}/updatedAt`] = serverTimestamp();

                await update(ref(rtdb), updates);

                // Get updated lobby data
                const updatedSnapshot = await get(lobbyRef);
                const updatedLobby = updatedSnapshot.val() as LobbyData;

                this.settingsUpdateTimeouts.delete(code);
                resolve({
                  success: true,
                  data: updatedLobby,
                });
              } catch (error) {
                this.settingsUpdateTimeouts.delete(code);
                reject(error);
              }
            }, 500);

            this.settingsUpdateTimeouts.set(code, timeout);
          });
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as LobbyError).type
          ) {
            throw error;
          }

          // Report unknown errors to Sentry and create a new error
          Sentry.captureException(error, {
            tags: {
              operation: "lobby_service",
              error_type: "unknown_error",
              method: "updateLobbySettings",
            },
            extra: {
              originalError:
                error instanceof Error ? error.message : String(error),
              code,
              hostUid,
            },
          });

          const newError = new Error(
            `Failed to update lobby settings: ${error}`
          ) as LobbyError;
          newError.userMessage = "Failed to update settings. Please try again.";
          newError.retryable = true;
          newError.type = "UNKNOWN_ERROR";
          newError.name = "LobbyError";
          throw newError;
        }
      }
    );
  }

  /**
   * Kick a player from the lobby (host-only)
   */
  async addBot(
    code: string,
    hostUid: string,
    botConfig: {
      personalityId: string;
      difficulty: "easy" | "medium" | "hard";
    }
  ): Promise<ServiceResult<LobbyData>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.add_bot",
        name: "Add AI Bot to Lobby",
      },
      async () => {
        try {
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          const snapshot = await get(lobbyRef);

          if (!snapshot.exists()) {
            const error = new Error(`Lobby ${code} not found`) as LobbyError;
            error.userMessage =
              "Lobby not found. It may have been deleted or the code is incorrect.";
            error.retryable = false;
            error.type = "LOBBY_NOT_FOUND";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "lobby_not_found",
                method: "addBot",
              },
              extra: {
                code,
              },
            });
            throw error;
          }

          const lobbyData = snapshot.val() as LobbyData;

          // Validate host permissions
          if (lobbyData.hostUid !== hostUid) {
            const error = new Error(
              `User ${hostUid} is not the host of lobby ${code}`
            ) as LobbyError;
            error.userMessage = "Only the lobby host can add AI players.";
            error.retryable = false;
            error.type = "PERMISSION_DENIED";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "permission_denied",
                method: "addBot",
              },
              extra: {
                hostUid,
                code,
                lobbyHostUid: lobbyData.hostUid,
              },
            });
            throw error;
          }

          // Check if lobby is full
          const currentPlayerCount = Object.keys(lobbyData.players).length;
          if (currentPlayerCount >= lobbyData.maxPlayers) {
            const error = new Error(
              `Lobby ${code} is full (${currentPlayerCount}/${lobbyData.maxPlayers})`
            ) as LobbyError;
            error.userMessage = "Lobby is full. Cannot add more players.";
            error.retryable = false;
            error.type = "LOBBY_FULL";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "lobby_full",
                method: "addBot",
              },
              extra: {
                code,
                currentPlayerCount,
                maxPlayers: lobbyData.maxPlayers,
              },
            });
            throw error;
          }

          // Check if game has already started
          if (lobbyData.status !== "waiting") {
            const error = new Error(
              `Cannot add bot to lobby ${code} - game already ${lobbyData.status}`
            ) as LobbyError;
            error.userMessage =
              "Cannot add AI players after the game has started.";
            error.retryable = false;
            error.type = "LOBBY_ALREADY_STARTED";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "lobby_already_started",
                method: "addBot",
              },
              extra: {
                code,
                currentStatus: lobbyData.status,
                expectedStatus: "waiting",
              },
            });
            throw error;
          }

          // Generate unique bot ID
          const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

          // Get personality name from available personalities
          const personality = AVAILABLE_AI_PERSONALITIES.find(
            (p) => p.id === botConfig.personalityId
          );
          const botDisplayName = personality ? personality.name : "AI Player";

          // Create bot player data
          const botPlayer: PlayerData = {
            id: botId,
            displayName: botDisplayName,
            avatarId: "ai-avatar",
            profileURL: "",
            joinedAt: serverTimestamp() as unknown as string,
            isHost: false,
            score: 0,
            status: "waiting",
            lastSeen: serverTimestamp() as unknown as string,
            isAI: true,
            aiPersonalityId: botConfig.personalityId,
            aiDifficulty: botConfig.difficulty,
          };

          // Add bot to players
          const updatedPlayers = {
            ...lobbyData.players,
            [botId]: botPlayer,
          };

          // Update lobby with new bot
          const updates: Record<string, unknown> = {
            [`lobbies/${code}/players/${botId}`]: botPlayer,
            [`lobbies/${code}/updatedAt`]: serverTimestamp(),
          };

          await update(ref(rtdb), updates);

          // Return updated lobby data
          const updatedLobbyData: LobbyData = {
            ...lobbyData,
            players: updatedPlayers,
            updatedAt: new Date().toISOString(),
          };

          return {
            success: true,
            data: updatedLobbyData,
            timestamp: new Date().toISOString(),
          };
        } catch (error) {
          Sentry.captureException(error);

          if (error instanceof Error && "type" in error) {
            throw error; // Re-throw LobbyError
          }

          // Report unknown errors to Sentry and create a new error
          Sentry.captureException(error, {
            tags: {
              operation: "lobby_service",
              error_type: "unknown_error",
              method: "addBot",
            },
            extra: {
              originalError:
                error instanceof Error ? error.message : String(error),
              code,
              hostUid,
            },
          });

          const newError = new Error(
            `Failed to add bot to lobby ${code}: ${error}`
          ) as LobbyError;
          newError.userMessage = "Failed to add AI player. Please try again.";
          newError.retryable = true;
          newError.type = "UNKNOWN_ERROR";
          newError.name = "LobbyError";
          throw newError;
        }
      }
    );
  }

  async kickPlayer(
    code: string,
    targetUid: string,
    hostUid: string
  ): Promise<ServiceResult<LobbyData>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.kick_player",
        name: "Kick Player",
      },
      async () => {
        try {
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            const error = new Error(`Lobby ${code} not found`) as LobbyError;
            error.userMessage = "Lobby not found. Please check the code.";
            error.retryable = false;
            error.type = "LOBBY_NOT_FOUND";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "lobby_not_found",
                method: "kickPlayer",
              },
              extra: {
                code,
              },
            });
            throw error;
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Validate host permissions
          if (lobby.hostUid !== hostUid) {
            const error = new Error(
              `User ${hostUid} is not the host of lobby ${code}`
            ) as LobbyError;
            error.userMessage = "Only the host can kick players.";
            error.retryable = false;
            error.type = "PERMISSION_DENIED";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "permission_denied",
                method: "kickPlayer",
              },
              extra: {
                hostUid,
                code,
                lobbyHostUid: lobby.hostUid,
              },
            });
            throw error;
          }

          // Check if target player exists
          if (!lobby.players[targetUid]) {
            const error = new Error(
              `Player ${targetUid} not found in lobby ${code}`
            ) as LobbyError;
            error.userMessage = "Player not found in this lobby.";
            error.retryable = false;
            error.type = "VALIDATION_ERROR";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "validation_error",
                method: "kickPlayer",
              },
              extra: {
                targetUid,
                code,
                availablePlayers: Object.keys(lobby.players),
              },
            });
            throw error;
          }

          // Prevent host from kicking themselves
          if (targetUid === hostUid) {
            const error = new Error(
              `Host cannot kick themselves`
            ) as LobbyError;
            error.userMessage = "You cannot kick yourself from the lobby.";
            error.retryable = false;
            error.type = "VALIDATION_ERROR";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "validation_error",
                method: "kickPlayer",
              },
              extra: {
                targetUid,
                hostUid,
                code,
              },
            });
            throw error;
          }

          // Remove player from lobby
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${code}/players/${targetUid}`] = null;
          updates[`lobbies/${code}/updatedAt`] = serverTimestamp();

          await update(ref(rtdb), updates);

          // Get updated lobby data
          const updatedSnapshot = await get(lobbyRef);
          const updatedLobby = updatedSnapshot.val() as LobbyData;

          return {
            success: true,
            data: updatedLobby,
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as LobbyError).type
          ) {
            throw error;
          }

          // Report unknown errors to Sentry and create a new error
          Sentry.captureException(error, {
            tags: {
              operation: "lobby_service",
              error_type: "unknown_error",
              method: "kickPlayer",
            },
            extra: {
              originalError:
                error instanceof Error ? error.message : String(error),
              code,
              targetUid,
              hostUid,
            },
          });

          const newError = new Error(
            `Failed to kick player: ${error}`
          ) as LobbyError;
          newError.userMessage = "Failed to kick player. Please try again.";
          newError.retryable = true;
          newError.type = "UNKNOWN_ERROR";
          newError.name = "LobbyError";
          throw newError;
        }
      }
    );
  }

  /**
   * Transfer host privileges to another player
   */
  async transferHost(
    code: string,
    newHostUid: string,
    currentHostUid: string
  ): Promise<ServiceResult<LobbyData>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.transfer_host",
        name: "Transfer Host",
      },
      async () => {
        try {
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            throw this.createLobbyError(
              "LOBBY_NOT_FOUND",
              `Lobby ${code} not found`,
              "Lobby not found. Please check the code.",
              false
            );
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Validate current host permissions
          if (lobby.hostUid !== currentHostUid) {
            throw this.createLobbyError(
              "PERMISSION_DENIED",
              `User ${currentHostUid} is not the host of lobby ${code}`,
              "Only the current host can transfer host privileges.",
              false
            );
          }

          // Check if new host exists in lobby
          if (!lobby.players[newHostUid]) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `Player ${newHostUid} not found in lobby ${code}`,
              "Cannot transfer host to a player not in the lobby.",
              false
            );
          }

          // Prevent transferring to self
          if (newHostUid === currentHostUid) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `Cannot transfer host to self`,
              "You are already the host.",
              false
            );
          }

          // Update host information
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${code}/hostUid`] = newHostUid;
          updates[`lobbies/${code}/hostDisplayName`] =
            lobby.players[newHostUid].displayName;
          updates[`lobbies/${code}/players/${currentHostUid}/isHost`] = false;
          updates[`lobbies/${code}/players/${newHostUid}/isHost`] = true;
          updates[`lobbies/${code}/updatedAt`] = serverTimestamp();

          await update(ref(rtdb), updates);

          // Get updated lobby data
          const updatedSnapshot = await get(lobbyRef);
          const updatedLobby = updatedSnapshot.val() as LobbyData;

          return {
            success: true,
            data: updatedLobby,
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as LobbyError).type
          ) {
            throw error;
          }

          Sentry.captureException(error);
          throw this.createLobbyError(
            "UNKNOWN_ERROR",
            `Failed to transfer host: ${error}`,
            "Failed to transfer host privileges. Please try again.",
            true
          );
        }
      }
    );
  }

  /**
   * Transfer host to earliest joined player (deterministic selection)
   */
  async transferHostToEarliestPlayer(
    code: string
  ): Promise<ServiceResult<LobbyData>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.transfer_host_auto",
        name: "Auto Transfer Host",
      },
      async () => {
        try {
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            throw this.createLobbyError(
              "LOBBY_NOT_FOUND",
              `Lobby ${code} not found`,
              "Lobby not found.",
              false
            );
          }

          const lobby = lobbySnapshot.val() as LobbyData;
          const players = Object.entries(lobby.players);

          if (players.length === 0) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `No players in lobby ${code}`,
              "Cannot transfer host - no players in lobby.",
              false
            );
          }

          // Find earliest joined player (excluding current host if they still exist)
          const nonHostPlayers = players.filter(
            ([uid]) => uid !== lobby.hostUid
          );

          if (nonHostPlayers.length === 0) {
            // Only the host remains, no transfer needed
            return {
              success: true,
              data: lobby,
            };
          }

          // Check if only AI players remain after host transfer
          const playerCounts = this.getPlayerCounts(Object.fromEntries(nonHostPlayers));
          
          if (this.hasOnlyAIPlayers(Object.fromEntries(nonHostPlayers))) {
            console.log(
              `🤖 Only AI players remain for host transfer in lobby ${code}. AI will become host but game may stall.`
            );
            
            Sentry.addBreadcrumb({
              message: "AI-only host transfer - potential game stall",
              data: {
                code,
                aiPlayerCount: playerCounts.ai,
                totalPlayers: playerCounts.total,
              },
              level: "warning",
            });
          }

          // Sort by joinedAt timestamp to find earliest
          const earliestPlayer = nonHostPlayers.sort(
            ([, a], [, b]) =>
              new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
          )[0];

          const [newHostUid, newHostData] = earliestPlayer;

          // Update host information
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${code}/hostUid`] = newHostUid;
          updates[`lobbies/${code}/hostDisplayName`] = newHostData.displayName;
          updates[`lobbies/${code}/players/${newHostUid}/isHost`] = true;
          updates[`lobbies/${code}/updatedAt`] = new Date().toISOString();

          // Remove the old host's isHost flag if they still exist
          if (lobby.players[lobby.hostUid]) {
            updates[`lobbies/${code}/players/${lobby.hostUid}/isHost`] = false;
          }

          await update(ref(rtdb), updates);

          // Get updated lobby data
          const updatedSnapshot = await get(lobbyRef);
          const updatedLobby = updatedSnapshot.val() as LobbyData;

          return {
            success: true,
            data: updatedLobby,
          };
        } catch (error) {
          if (error instanceof Error && (error as LobbyError).type) {
            throw error;
          }

          Sentry.captureException(error);
          throw this.createLobbyError(
            "UNKNOWN_ERROR",
            `Failed to auto-transfer host: ${error}`,
            "Failed to transfer host privileges. Please try again.",
            true
          );
        }
      }
    );
  }

  /**
   * Update player status for real-time player state management
   */
  async updatePlayerStatus(
    code: string,
    playerUid: string,
    status: PlayerStatus
  ): Promise<ServiceResult<void>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.update_player_status",
        name: "Update Player Status",
      },
      async () => {
        try {
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            throw this.createLobbyError(
              "LOBBY_NOT_FOUND",
              `Lobby ${code} not found`,
              "Lobby not found. Please check the code.",
              false
            );
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Check if player exists in lobby
          if (!lobby.players[playerUid]) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `Player ${playerUid} not found in lobby ${code}`,
              "Player not found in this lobby.",
              false
            );
          }

          // Update player status and last seen
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${code}/players/${playerUid}/status`] = status;
          updates[`lobbies/${code}/players/${playerUid}/lastSeen`] =
            serverTimestamp();
          updates[`lobbies/${code}/updatedAt`] = serverTimestamp();

          await update(ref(rtdb), updates);

          return {
            success: true,
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as LobbyError).type
          ) {
            throw error;
          }

          Sentry.captureException(error);
          throw this.createLobbyError(
            "UNKNOWN_ERROR",
            `Failed to update player status: ${error}`,
            "Failed to update player status. Please try again.",
            true
          );
        }
      }
    );
  }

  /**
   * Delete a lobby with proper cleanup
   */
  async deleteLobby(
    code: string,
    hostUid: string
  ): Promise<ServiceResult<void>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.delete",
        name: "Delete Lobby",
      },
      async () => {
        try {
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            // Lobby already doesn't exist, consider it successful
            return {
              success: true,
            };
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Validate host permissions (allow deletion if lobby is empty)
          const playerCount = Object.keys(lobby.players || {}).length;
          if (playerCount > 0 && lobby.hostUid !== hostUid) {
            throw this.createLobbyError(
              "PERMISSION_DENIED",
              `User ${hostUid} is not the host of lobby ${code}`,
              "Only the host can delete the lobby.",
              false
            );
          }

          // Remove the entire lobby
          await remove(lobbyRef);

          // Clean up any pending settings update timeouts
          const existingTimeout = this.settingsUpdateTimeouts.get(code);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            this.settingsUpdateTimeouts.delete(code);
          }

          return {
            success: true,
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as LobbyError).type
          ) {
            throw error;
          }

          Sentry.captureException(error);
          throw this.createLobbyError(
            "UNKNOWN_ERROR",
            `Failed to delete lobby: ${error}`,
            "Failed to delete lobby. Please try again.",
            true
          );
        }
      }
    );
  }

  /**
   * Leave a lobby and handle host transfer if necessary
   */
  async leaveLobby(
    code: string,
    playerUid: string
  ): Promise<ServiceResult<void>> {
    return Sentry.startSpan(
      {
        op: "db.lobby.leave",
        name: "Leave Lobby",
      },
      async () => {
        try {
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            // Lobby doesn't exist, consider leaving successful
            return {
              success: true,
            };
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Check if player exists in lobby
          if (!lobby.players[playerUid]) {
            // Player not in lobby, consider leaving successful
            return {
              success: true,
            };
          }

          const isHost = lobby.hostUid === playerUid;
          const playerCount = Object.keys(lobby.players).length;

          if (playerCount === 1) {
            // Last player leaving, delete the lobby
            await this.deleteLobby(code, playerUid);
            return {
              success: true,
            };
          }

          // Remove player from lobby
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${code}/players/${playerUid}`] = null;
          updates[`lobbies/${code}/updatedAt`] = new Date().toISOString();

          await update(ref(rtdb), updates);

          // Get updated lobby data to check remaining players
          const updatedSnapshot = await get(lobbyRef);
          const updatedLobby = updatedSnapshot.val() as LobbyData;
          const remainingPlayers = updatedLobby?.players || {};
          const playerCounts = this.getPlayerCounts(remainingPlayers);

          // Log player status for monitoring
          Sentry.addBreadcrumb({
            message: "Player left lobby - checking remaining players",
            data: {
              code,
              leavingPlayer: playerUid,
              wasHost: isHost,
              remainingPlayers: playerCounts,
            },
            level: "info",
          });

          // If only AI players remain, end the game gracefully
          if (playerCounts.total > 0 && this.hasOnlyAIPlayers(remainingPlayers)) {
            console.log(
              `🤖 Only AI players remain in lobby ${code} (${playerCounts.ai} AI players). Ending game gracefully.`
            );
            
            Sentry.addBreadcrumb({
              message: "AI-only scenario detected - ending game",
              data: {
                code,
                aiPlayerCount: playerCounts.ai,
                gameStatus: updatedLobby.status,
              },
              level: "info",
            });

            // If game is in progress, create final results for AI players
            if (updatedLobby.status === "started" && updatedLobby.gameState) {
              await this.createFinalAIResults(code, updatedLobby.gameState, remainingPlayers);
            }

            // Delete the lobby since no humans can manage it
            await this.deleteLobby(code, playerUid);
            return {
              success: true,
            };
          }

          // If the leaving player was the host, transfer to earliest joined player
          if (isHost) {
            await this.transferHostToEarliestPlayer(code);
          }

          return {
            success: true,
          };
        } catch (error) {
          if (error instanceof Error && (error as LobbyError).type) {
            throw error;
          }

          Sentry.captureException(error);
          throw this.createLobbyError(
            "UNKNOWN_ERROR",
            `Failed to leave lobby: ${error}`,
            "Failed to leave lobby. Please try again.",
            true
          );
        }
      }
    );
  }

  /**
   * Start a game with validation, meme card distribution, and AI situation generation
   */
  async startGame(
    lobbyCode: string,
    hostUid: string
  ): Promise<
    ServiceResult<{
      gameState: GameState;
      playerCards: Record<string, MemeCard[]>;
    }>
  > {
    return Sentry.startSpan(
      {
        op: "db.game.start",
        name: "Start Game",
      },
      async () => {
        try {
          // Get current lobby data for validation
          const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            const error = new Error(
              `Lobby ${lobbyCode} not found`
            ) as LobbyError;
            error.userMessage = "Lobby not found. Please check the code.";
            error.retryable = false;
            error.type = "LOBBY_NOT_FOUND";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "lobby_not_found",
                method: "startGame",
              },
              extra: {
                lobbyCode,
              },
            });
            throw error;
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Validate host permissions
          if (lobby.hostUid !== hostUid) {
            const error = new Error(
              `User ${hostUid} is not the host of lobby ${lobbyCode}`
            ) as LobbyError;
            error.userMessage = "Only the host can start the game.";
            error.retryable = false;
            error.type = "PERMISSION_DENIED";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "permission_denied",
                method: "startGame",
              },
              extra: {
                hostUid,
                lobbyCode,
                lobbyHostUid: lobby.hostUid,
              },
            });
            throw error;
          }

          // Validate lobby status
          if (lobby.status !== "waiting") {
            const error = new Error(
              `Lobby ${lobbyCode} has status ${lobby.status}`
            ) as LobbyError;
            error.userMessage = "Game has already started or ended.";
            error.retryable = false;
            error.type = "LOBBY_ALREADY_STARTED";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "lobby_already_started",
                method: "startGame",
              },
              extra: {
                lobbyCode,
                currentStatus: lobby.status,
                expectedStatus: "waiting",
              },
            });
            throw error;
          }

          // Validate minimum player count
          const players = Object.values(lobby.players);
          if (players.length < 3) {
            const error = new Error(
              `Not enough players to start game. Need 3, have ${players.length}`
            ) as LobbyError;
            error.userMessage = "Need at least 3 players to start the game.";
            error.retryable = false;
            error.type = "VALIDATION_ERROR";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "validation_error",
                method: "startGame",
              },
              extra: {
                lobbyCode,
                playerCount: players.length,
                minRequired: 3,
              },
            });
            throw error;
          }

          // Generate AI situation with fallback
          let currentSituation: string;
          try {
            const situationResponse = await this.generateSituation();
            currentSituation = situationResponse || this.getFallbackSituation();
          } catch (error) {
            // AI situation generation failed, using fallback
            currentSituation = this.getFallbackSituation();

            Sentry.captureException(error);
          }

          // Distribute meme cards to all players
          console.log(
            "🃏 Starting card distribution for players:",
            Object.keys(lobby.players)
          );
          const playerCards = await this.distributeMemeCards(lobby.players);
          console.log(
            "🃏 Card distribution complete:",
            Object.keys(playerCards).length,
            "players"
          );

          // Create game state
          const gameState: GameState = {
            roundNumber: 1,
            totalRounds: lobby.settings.rounds,
            timeLeft: lobby.settings.timeLimit,
            phase: "transition",
            currentSituation,
            submissions: {},
            votes: {},
            scores: {},
          };

          // Prepare database updates - start with transition phase
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${lobbyCode}/status`] = "started";
          updates[`lobbies/${lobbyCode}/gameState`] = {
            roundNumber: 1,
            totalRounds: lobby.settings.rounds,
            timeLeft: lobby.settings.timeLimit,
            phase: "transition",
            phaseStartTime: serverTimestamp(),
            currentSituation,
            submissions: {},
            votes: {},
            abstentions: {},
            scores: {},
            playerStreaks: {},
            roundResults: null,
          };

          // Add player cards to each player's data - CRITICAL for game functionality
          Object.entries(playerCards).forEach(([playerUid, cards]) => {
            // Ensure we have exactly 7 cards per player (game rule)
            if (cards.length !== 7) {
              console.error(
                `❌ GAME RULE VIOLATION: Player ${playerUid} has ${cards.length} cards instead of 7`
              );
              throw new Error(
                `Card distribution failed: Player ${playerUid} should have 7 cards but has ${cards.length}`
              );
            }

            // Store cards in the correct Firebase structure
            updates[`lobbies/${lobbyCode}/players/${playerUid}/cards`] =
              cards.map((card) => ({
                id: card.id,
                filename: card.filename,
                url: card.url,
                alt: card.alt,
              }));

            console.log(
              `✅ Assigned ${cards.length} cards to player ${playerUid}:`,
              cards
                .map((c) => c.filename)
                .slice(0, 3)
                .join(", ") + "..."
            );
          });

          // Ensure all players have their status reset
          Object.keys(lobby.players).forEach((playerUid) => {
            updates[`lobbies/${lobbyCode}/players/${playerUid}/status`] =
              "waiting";
          });

          updates[`lobbies/${lobbyCode}/updatedAt`] = serverTimestamp();

          console.log("🚀 Applying game start updates to Firebase...");

          // Apply all updates atomically
          await update(ref(rtdb), updates);

          console.log("✅ Game start updates applied successfully");

          // Verify that cards were actually written to the database
          const verificationPromises = Object.keys(playerCards).map(
            async (playerUid) => {
              const playerCardsRef = ref(
                rtdb,
                `lobbies/${lobbyCode}/players/${playerUid}/cards`
              );
              const snapshot = await get(playerCardsRef);
              if (!snapshot.exists()) {
                console.error(
                  `❌ Cards not found for player ${playerUid} after write`
                );
                throw new Error(
                  `Failed to write cards for player ${playerUid}`
                );
              } else {
                const cards = snapshot.val();
                console.log(
                  `✅ Verified ${cards.length} cards for player ${playerUid}`
                );
              }
            }
          );

          // Wait for all verifications to complete
          await Promise.all(verificationPromises);
          console.log("✅ All player cards verified in database");

          return {
            success: true,
            data: {
              gameState,
              playerCards,
            },
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as LobbyError).type
          ) {
            throw error;
          }

          // Report unknown errors to Sentry and create a new error
          Sentry.captureException(error, {
            tags: {
              operation: "lobby_service",
              error_type: "unknown_error",
              method: "startGame",
            },
            extra: {
              originalError:
                error instanceof Error ? error.message : String(error),
              lobbyCode,
              hostUid,
            },
          });

          const newError = new Error(
            `Failed to start game: ${error}`
          ) as LobbyError;
          newError.userMessage = "Failed to start the game. Please try again.";
          newError.retryable = true;
          newError.type = "UNKNOWN_ERROR";
          newError.name = "LobbyError";
          throw newError;
        }
      }
    );
  }

  /**
   * Complete the game transition and start the actual game
   */
  async completeGameTransition(
    lobbyCode: string,
    hostUid: string
  ): Promise<ServiceResult<void>> {
    return Sentry.startSpan(
      {
        op: "db.game.complete_transition",
        name: "Complete Game Transition",
      },
      async () => {
        try {
          // Get current lobby data for validation
          const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            throw this.createLobbyError(
              "LOBBY_NOT_FOUND",
              `Lobby ${lobbyCode} not found`,
              "Lobby not found. Please check the code.",
              false
            );
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Validate host permissions
          if (lobby.hostUid !== hostUid) {
            const error = new Error(
              `User ${hostUid} is not the host of lobby ${lobbyCode}`
            ) as LobbyError;
            error.userMessage =
              "Only the host can complete the game transition.";
            error.retryable = false;
            error.type = "PERMISSION_DENIED";
            error.name = "LobbyError";
            Sentry.captureException(error, {
              tags: {
                operation: "lobby_service",
                error_type: "permission_denied",
                method: "completeGameTransition",
              },
              extra: {
                hostUid,
                lobbyCode,
                lobbyHostUid: lobby.hostUid,
              },
            });
            throw error;
          }

          // Update game state to start the actual game
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${lobbyCode}/gameState/phase`] = "submission";
          updates[`lobbies/${lobbyCode}/gameState/phaseStartTime`] =
            serverTimestamp();

          await update(ref(rtdb), updates);

          // Process AI bot submissions asynchronously
          const aiBotService = AIBotService.getInstance();
          const situation =
            (
              lobby.gameState as Partial<
                GameState & { currentSituation?: string }
              >
            )?.currentSituation || "No situation available";

          // Process AI submissions in the background
          aiBotService
            .processAIBotSubmissions(lobbyCode, lobby.players, situation)
            .catch((error) => {
              Sentry.captureException(error, {
                tags: { operation: "ai_bot_submissions_background" },
                extra: { lobbyCode },
              });
            });

          // Also schedule AI votes once all submissions exist
          // Lightweight poll after 1s to read current submissions and trigger votes
          setTimeout(async () => {
            try {
              const { ref, get } = await import("firebase/database");
              const { rtdb } = await import("@/firebase/client");
              const subsSnap = await get(
                ref(rtdb, `lobbies/${lobbyCode}/gameState/submissions`)
              );
              const subs = (subsSnap.exists() ? subsSnap.val() : {}) as Record<
                string,
                { cardId: string; cardName: string }
              >;
              await aiBotService.processAIBotVotes(
                lobbyCode,
                lobby.players,
                subs,
                situation
              );
            } catch (err) {
              Sentry.captureException(err, {
                tags: { operation: "ai_bot_votes_background" },
                extra: { lobbyCode },
              });
            }
          }, 1000);

          return {
            success: true,
            data: undefined,
          };
        } catch (error) {
          if (
            error instanceof Error &&
            "type" in error &&
            (error as LobbyError).type
          ) {
            throw error;
          }

          // Report unknown errors to Sentry and create a new error
          Sentry.captureException(error, {
            tags: {
              operation: "lobby_service",
              error_type: "unknown_error",
              method: "completeGameTransition",
            },
            extra: {
              originalError:
                error instanceof Error ? error.message : String(error),
              lobbyCode,
              hostUid,
            },
          });

          const newError = new Error(
            `Failed to complete game transition: ${error}`
          ) as LobbyError;
          newError.userMessage =
            "Failed to complete game transition. Please try again.";
          newError.retryable = true;
          newError.type = "UNKNOWN_ERROR";
          newError.name = "LobbyError";
          throw newError;
        }
      }
    );
  }

  /**
   * Generate an AI situation with timeout handling
   */
  private async generateSituation(): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeouts

    try {
      const response = await fetch("/api/situation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        Sentry.captureException(error, {
          tags: {
            operation: "ai_situation_generation",
            status: response.status.toString(),
          },
          extra: {
            url: "/api/situation",
            status: response.status,
            statusText: response.statusText,
          },
        });
        throw error;
      }

      const data = await response.json();
      if (data.error) {
        const error = new Error(data.error);
        Sentry.captureException(error, {
          tags: {
            operation: "ai_situation_generation",
            error_type: "ai_response_error",
          },
          extra: {
            url: "/api/situation",
            aiError: data.error,
            responseData: data,
          },
        });
        throw error;
      }

      return data.situation;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        // Don't report timeout errors to Sentry as they're expected
      } else {
        // Report unexpected errors to Sentry
        Sentry.captureException(error, {
          tags: {
            operation: "ai_situation_generation",
            error_type: "unexpected_error",
          },
          extra: {
            url: "/api/situation",
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
      return null;
    }
  }

  /**
   * Get a fallback situation when AI generation fails
   */
  private getFallbackSituation(): string {
    const fallbackPrompts = [
      "When you realize it's Monday tomorrow",
      "Trying to explain cryptocurrency to your parents",
      "When the wifi goes down during an important meeting",
      "Your reaction when someone spoils a movie",
      "When you find out pineapple pizza is actually good",
      "When your friend says 'I have a great idea' at 3 AM",
      "Trying to look busy when your boss walks by",
      "When you accidentally like someone's old photo on social media",
      "Your face when you see your bank balance",
      "When someone asks if you've been working out",
      "Trying to remember where you put your keys",
      "When you realize you've been talking to yourself",
      "Your reaction to finding money in old clothes",
      "When someone says 'we need to talk'",
      "Trying to act natural when you see your ex",
    ];

    return fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
  }

  /**
   * Distribute meme cards to all players ensuring no duplicates
   */
  private async distributeMemeCards(
    players: Record<string, PlayerData>
  ): Promise<Record<string, MemeCard[]>> {
    // Import the MemeCardPool class dynamically to avoid circular dependencies
    const { MemeCardPool } = await import("@/lib/utils/meme-card-pool");

    const cardPool = new MemeCardPool();
    const playerUids = Object.keys(players);
    const cardsPerPlayer = 7;

    console.log(
      `🃏 Distributing ${cardsPerPlayer} cards to ${playerUids.length} players`
    );

    try {
      // Validate we have enough cards for all players
      const totalCardsNeeded = playerUids.length * cardsPerPlayer;
      console.log(`🃏 Total cards needed: ${totalCardsNeeded}`);

      const distribution = cardPool.distributeCards(
        playerUids.length,
        cardsPerPlayer
      );
      const playerCards: Record<string, MemeCard[]> = {};

      // Map player indices to UIDs and validate
      playerUids.forEach((uid, index) => {
        const cards = distribution.get(index);
        if (cards) {
          if (cards.length !== cardsPerPlayer) {
            throw new Error(
              `Player ${uid} received ${cards.length} cards instead of ${cardsPerPlayer}`
            );
          }
          playerCards[uid] = cards;
          console.log(`🃏 Player ${uid} assigned ${cards.length} cards`);
        } else {
          throw new Error(
            `No cards assigned to player ${uid} at index ${index}`
          );
        }
      });

      // Final validation
      const totalDistributed = Object.values(playerCards).reduce(
        (sum, cards) => sum + cards.length,
        0
      );
      console.log(
        `🃏 Distribution complete: ${totalDistributed} cards distributed to ${Object.keys(playerCards).length} players`
      );

      if (totalDistributed !== totalCardsNeeded) {
        throw new Error(
          `Card distribution mismatch: expected ${totalCardsNeeded}, got ${totalDistributed}`
        );
      }

      return playerCards;
    } catch (error) {
      console.error("🃏 Card distribution failed:", error);
      throw this.createLobbyError(
        "UNKNOWN_ERROR",
        `Failed to distribute meme cards: ${error}`,
        "Failed to distribute cards to players. Please try again.",
        true
      );
    }
  }

  /**
   * Subscribe to lobby changes
   */
  subscribeToLobby(
    lobbyCode: string,
    callback: (data: unknown) => void,
    onError?: (error: Error) => void
  ): () => void {
    const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);

    onValue(
      lobbyRef,
      (snapshot) => {
        const data = snapshot.val();
        callback(data);
      },
      (error) => {
        Sentry.captureException(error);
        if (onError) onError(error);
      }
    );

    return () => {
      off(lobbyRef);
    };
  }

  /**
   * Initialize presence tracking for a player within a lobby using Realtime DB onDisconnect
   * - Marks player as waiting and updates lastSeen while connected
   * - On disconnect, atomically marks the player as disconnected with lastSeen
   * Returns an unsubscribe function to stop presence monitoring
   */
  initializePresence(lobbyCode: string, playerUid: string): () => void {
    const connectedRef = ref(rtdb, ".info/connected");
    const playerRef = ref(rtdb, `lobbies/${lobbyCode}/players/${playerUid}`);

    onValue(
      connectedRef,
      async (snapshot) => {
        try {
          const isConnected = snapshot.val() === true;
          const now = new Date().toISOString();

          if (isConnected) {
            // Ensure onDisconnect handler is registered first
            try {
              await onDisconnect(playerRef).update({
                status: "disconnected",
                lastSeen: now,
              });
            } catch (err) {
              Sentry.captureException(err, {
                tags: {
                  operation: "presence_onDisconnect_register",
                  lobbyCode,
                },
                extra: { playerUid },
              });
            }

            // Mark as connected/waiting now
            await update(playerRef, {
              status: "waiting",
              lastSeen: now,
            });
          }
        } catch (error) {
          Sentry.captureException(error, {
            tags: { operation: "presence_update", lobbyCode },
            extra: { playerUid },
          });
        }
      },
      (error) => {
        Sentry.captureException(error, {
          tags: { operation: "presence_listener", lobbyCode },
          extra: { playerUid },
        });
      }
    );

    return () => off(connectedRef);
  }

  /**
   * Get lobby data (one-time read)
   */
  async getLobbyData(
    lobbyCode: string
  ): Promise<{ success: boolean; lobby?: unknown; error?: string }> {
    return Sentry.startSpan(
      {
        op: "db.lobby.get",
        name: "Get Lobby Data",
      },
      async () => {
        try {
          const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
          const lobbySnapshot = await get(lobbyRef);

          if (!lobbySnapshot.exists()) {
            return { success: false, error: "Lobby not found" };
          }

          const lobby = lobbySnapshot.val();
          return { success: true, lobby };
        } catch (error) {
          Sentry.captureException(error);
          return {
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to get lobby data",
          };
        }
      }
    );
  }

  /**
   * Create final results for AI-only game completion
   */
  private async createFinalAIResults(
    code: string,
    gameState: GameState,
    players: Record<string, PlayerData>
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "db.game.ai_only_completion",
        name: "Create AI-Only Final Results",
      },
      async () => {
        try {
          console.log(`🤖 Creating final results for AI-only game ${code}`);

          // Calculate final scores and rankings
          const playerList = Object.values(players);
          const finalScores = gameState.scores || {};
          
          // Sort players by score (descending)
          const rankedPlayers = playerList
            .map(player => ({
              ...player,
              finalScore: finalScores[player.id] || 0,
            }))
            .sort((a, b) => b.finalScore - a.finalScore);

          // Create final game results
          const finalResults = {
            completedAt: new Date().toISOString(),
            totalRounds: gameState.totalRounds || 8,
            roundsCompleted: gameState.roundNumber || 1,
            reason: "ai_only_completion",
            finalRankings: rankedPlayers.map((player, index) => ({
              rank: index + 1,
              playerId: player.id,
              displayName: player.displayName,
              isAI: player.isAI,
              finalScore: player.finalScore,
              aiPersonality: player.aiPersonalityId,
            })),
            winner: rankedPlayers[0] || null,
          };

          // Update game state with final results
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${code}/gameState/phase`] = "completed";
          updates[`lobbies/${code}/gameState/finalResults`] = finalResults;
          updates[`lobbies/${code}/status`] = "completed";
          updates[`lobbies/${code}/updatedAt`] = new Date().toISOString();

          await update(ref(rtdb), updates);

          // Log completion for monitoring
          Sentry.addBreadcrumb({
            message: "AI-only game completed",
            data: {
              code,
              totalPlayers: rankedPlayers.length,
              roundsCompleted: finalResults.roundsCompleted,
              winner: finalResults.winner?.displayName,
            },
            level: "info",
          });

          console.log(
            `✅ AI-only game ${code} completed. Winner: ${finalResults.winner?.displayName} (${finalResults.winner?.finalScore} points)`
          );
        } catch (error) {
          console.error(`❌ Failed to create AI-only final results for ${code}:`, error);
          Sentry.captureException(error, {
            tags: { operation: "ai_only_game_completion", code },
            extra: { gameState, playerCount: Object.keys(players).length },
          });
          // Don't throw - we still want to clean up the lobby
        }
      }
    );
  }

  /**
   * Check if only AI players remain in the lobby (no human players)
   */
  private hasOnlyAIPlayers(players: Record<string, PlayerData>): boolean {
    const allPlayers = Object.values(players);
    if (allPlayers.length === 0) return false;
    
    // Check if all remaining players are AI
    return allPlayers.every(player => player.isAI === true);
  }

  /**
   * Check if any human players remain in the lobby
   */
  private hasHumanPlayers(players: Record<string, PlayerData>): boolean {
    return Object.values(players).some(player => !player.isAI);
  }

  /**
   * Get count of human vs AI players
   */
  private getPlayerCounts(players: Record<string, PlayerData>): {
    total: number;
    human: number;
    ai: number;
  } {
    const allPlayers = Object.values(players);
    const humanCount = allPlayers.filter(p => !p.isAI).length;
    const aiCount = allPlayers.filter(p => p.isAI).length;
    
    return {
      total: allPlayers.length,
      human: humanCount,
      ai: aiCount,
    };
  }
}

export const lobbyService = LobbyService.getInstance();
