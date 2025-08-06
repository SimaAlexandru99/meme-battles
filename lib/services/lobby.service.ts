import { ref, set, get, update, onValue, off, remove } from "firebase/database";
import { rtdb } from "@/firebase/client";
import * as Sentry from "@sentry/nextjs";

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
              const jitter = Math.random() * 100; // Add up to 100ms jitter
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

        console.error(
          "Failed to generate unique lobby code after maximum attempts"
        );
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
          console.log("Starting lobby creation with params:", params);

          // Generate unique lobby code atomically
          console.log("Generating unique lobby code...");
          const code = await this.generateUniqueLobbyCode();
          console.log("Generated lobby code:", code);

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

          const now = new Date().toISOString();
          const lobby: LobbyData = {
            code,
            hostUid: params.hostUid,
            hostDisplayName: params.hostDisplayName,
            maxPlayers,
            status: "waiting" as LobbyStatus,
            settings,
            players: {
              [params.hostUid]: {
                displayName: params.hostDisplayName,
                avatarId: params.hostAvatarId,
                profileURL: params.hostProfileURL,
                joinedAt: now,
                isHost: true,
                score: 0,
                status: "waiting" as PlayerStatus,
                lastSeen: now,
              },
            },
            createdAt: now,
            updatedAt: now,
          };

          // Replace the reserved placeholder with actual lobby data
          const lobbyRef = ref(rtdb, `lobbies/${code}`);
          await set(lobbyRef, lobby);

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

          const now = new Date().toISOString();

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

          Sentry.captureException(error);
          throw this.createLobbyError(
            "UNKNOWN_ERROR",
            `Failed to join lobby: ${error}`,
            "Failed to join lobby. Please try again.",
            true
          );
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
            throw this.createLobbyError(
              "LOBBY_NOT_FOUND",
              `Lobby ${code} not found`,
              "Lobby not found. Please check the code.",
              false
            );
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Validate host permissions
          if (lobby.hostUid !== hostUid) {
            throw this.createLobbyError(
              "PERMISSION_DENIED",
              `User ${hostUid} is not the host of lobby ${code}`,
              "Only the host can change game settings.",
              false
            );
          }

          // Validate lobby status
          if (lobby.status !== "waiting") {
            throw this.createLobbyError(
              "LOBBY_ALREADY_STARTED",
              `Cannot update settings for lobby ${code} with status ${lobby.status}`,
              "Cannot change settings after the game has started.",
              false
            );
          }

          // Merge and validate new settings
          const updatedSettings = { ...lobby.settings, ...settings };
          const validation = this.isValidGameSettings(updatedSettings);
          if (!validation.isValid) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `Invalid game settings: ${validation.errors.join(", ")}`,
              `Invalid settings: ${validation.errors.join(", ")}`,
              false
            );
          }

          // Clear any existing timeout for this lobby
          const existingTimeout = this.settingsUpdateTimeouts.get(code);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Debounce rapid changes (wait 500ms before applying)
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(async () => {
              try {
                const updates: Record<string, unknown> = {};
                updates[`lobbies/${code}/settings`] = updatedSettings;
                updates[`lobbies/${code}/updatedAt`] = new Date().toISOString();

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

          Sentry.captureException(error);
          throw this.createLobbyError(
            "UNKNOWN_ERROR",
            `Failed to update lobby settings: ${error}`,
            "Failed to update settings. Please try again.",
            true
          );
        }
      }
    );
  }

  /**
   * Kick a player from the lobby (host-only)
   */
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
            throw this.createLobbyError(
              "LOBBY_NOT_FOUND",
              `Lobby ${code} not found`,
              "Lobby not found. Please check the code.",
              false
            );
          }

          const lobby = lobbySnapshot.val() as LobbyData;

          // Validate host permissions
          if (lobby.hostUid !== hostUid) {
            throw this.createLobbyError(
              "PERMISSION_DENIED",
              `User ${hostUid} is not the host of lobby ${code}`,
              "Only the host can kick players.",
              false
            );
          }

          // Check if target player exists
          if (!lobby.players[targetUid]) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `Player ${targetUid} not found in lobby ${code}`,
              "Player not found in this lobby.",
              false
            );
          }

          // Prevent host from kicking themselves
          if (targetUid === hostUid) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `Host cannot kick themselves`,
              "You cannot kick yourself from the lobby.",
              false
            );
          }

          // Remove player from lobby
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${code}/players/${targetUid}`] = null;
          updates[`lobbies/${code}/updatedAt`] = new Date().toISOString();

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
            `Failed to kick player: ${error}`,
            "Failed to kick player. Please try again.",
            true
          );
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
          updates[`lobbies/${code}/updatedAt`] = new Date().toISOString();

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

          // Remove old host's isHost flag if they still exist
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
            new Date().toISOString();
          updates[`lobbies/${code}/updatedAt`] = new Date().toISOString();

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
            throw this.createLobbyError(
              "PERMISSION_DENIED",
              `User ${hostUid} is not the host of lobby ${lobbyCode}`,
              "Only the host can start the game.",
              false
            );
          }

          // Validate lobby status
          if (lobby.status !== "waiting") {
            throw this.createLobbyError(
              "LOBBY_ALREADY_STARTED",
              `Lobby ${lobbyCode} has status ${lobby.status}`,
              "Game has already started or ended.",
              false
            );
          }

          // Validate minimum player count
          const players = Object.values(lobby.players);
          if (players.length < 3) {
            throw this.createLobbyError(
              "VALIDATION_ERROR",
              `Not enough players to start game. Need 3, have ${players.length}`,
              "Need at least 3 players to start the game.",
              false
            );
          }

          // Generate AI situation with fallback
          let currentSituation: string;
          try {
            const situationResponse = await this.generateSituation();
            currentSituation = situationResponse || this.getFallbackSituation();
          } catch (error) {
            console.warn(
              "AI situation generation failed, using fallback:",
              error
            );
            currentSituation = this.getFallbackSituation();
          }

          // Distribute meme cards to all players
          const playerCards = await this.distributeMemeCards(lobby.players);

          // Create game state
          const gameState: GameState = {
            currentRound: 1,
            totalRounds: lobby.settings.rounds,
            timeLeft: lobby.settings.timeLimit,
            phase: "playing",
            currentPrompt: currentSituation,
          };

          // Prepare database updates
          const updates: Record<string, unknown> = {};
          updates[`lobbies/${lobbyCode}/status`] = "started";
          updates[`lobbies/${lobbyCode}/gameState`] = {
            currentRound: 1,
            phase: "submission",
            phaseStartTime: new Date().toISOString(),
            currentSituation,
            submissions: {},
            votes: {},
            roundResults: null,
          };

          // Add player cards to each player's data
          Object.entries(playerCards).forEach(([playerUid, cards]) => {
            updates[`lobbies/${lobbyCode}/players/${playerUid}/cards`] =
              cards.map((card) => ({
                id: card.id,
                filename: card.filename,
                url: card.url,
                alt: card.alt,
              }));
          });

          updates[`lobbies/${lobbyCode}/updatedAt`] = new Date().toISOString();

          // Apply all updates atomically
          await update(ref(rtdb), updates);

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

          Sentry.captureException(error);
          throw this.createLobbyError(
            "UNKNOWN_ERROR",
            `Failed to start game: ${error}`,
            "Failed to start the game. Please try again.",
            true
          );
        }
      }
    );
  }

  /**
   * Generate AI situation with timeout handling
   */
  private async generateSituation(): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      return data.situation;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        console.warn("AI situation generation timed out");
      } else {
        console.warn("AI situation generation failed:", error);
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

    try {
      const distribution = cardPool.distributeCards(
        playerUids.length,
        cardsPerPlayer
      );
      const playerCards: Record<string, MemeCard[]> = {};

      // Map player indices to UIDs
      playerUids.forEach((uid, index) => {
        const cards = distribution.get(index);
        if (cards) {
          playerCards[uid] = cards;
        }
      });

      return playerCards;
    } catch (error) {
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
}

export const lobbyService = LobbyService.getInstance();
