import * as Sentry from "@sentry/nextjs";
import { getPersonalityById, selectRandomPersonality } from "./personalities";

/**
 * AI Player Manager - Singleton class for managing AI players across all lobbies
 * Handles creation, removal, balancing, and lifecycle management of AI players
 */
class AIPlayerManager {
  private static instance: AIPlayerManager;
  private state: AIPlayerManagerState;
  private readonly logger = Sentry.logger;

  private constructor() {
    this.state = {
      activeAIPlayers: new Map(),
      personalityPool: [],
      isInitialized: false,
    };
  }

  /**
   * Get the singleton instance of AIPlayerManager
   */
  public static getInstance(): AIPlayerManager {
    if (!AIPlayerManager.instance) {
      AIPlayerManager.instance = new AIPlayerManager();
    }
    return AIPlayerManager.instance;
  }

  /**
   * Initialize the AI Player Manager
   */
  public async initialize(): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.manager.initialization",
        name: "Initialize AI Player Manager",
      },
      async (span) => {
        try {
          // Check if already initialized
          if (this.state.isInitialized) {
            return;
          }

          console.log("AI Player Manager: Starting initialization...");

          // Lazy load personalities only when needed
          const { getAllPersonalities } = await import("./personalities");
          this.state.personalityPool = getAllPersonalities();
          console.log(
            "AI Player Manager: Loaded personalities:",
            this.state.personalityPool.length,
          );

          this.state.isInitialized = true;
          console.log("AI Player Manager: Initialization complete");

          this.logger.info("AI Player Manager initialized successfully", {
            personalityCount: this.state.personalityPool.length,
          });

          span.setAttribute(
            "personalityCount",
            this.state.personalityPool.length,
          );
        } catch (error) {
          console.error("AI Player Manager: Initialization failed:", error);
          this.logger.error("Failed to initialize AI Player Manager", {
            error,
          });
          throw error;
        }
      },
    );
  }

  /**
   * Create an AI player for a specific lobby
   */
  public async createAIPlayer(
    options: AIPlayerCreationOptions,
  ): Promise<AIPlayer> {
    return Sentry.startSpan(
      {
        op: "ai.player.creation",
        name: "Create AI Player",
      },
      async (span) => {
        try {
          const {
            lobbyCode,
            personalityId,
            forcePersonality = false,
            maxPlayers = 6,
          } = options;

          // Validate lobby capacity
          const currentPlayers = this.getAIPlayersForLobby(lobbyCode).length;
          if (currentPlayers >= maxPlayers) {
            throw new Error("Lobby is at maximum capacity");
          }

          // Select personality
          let personality: AIPersonality;
          if (personalityId && forcePersonality) {
            const foundPersonality = getPersonalityById(personalityId);
            if (!foundPersonality) {
              throw new Error(`Personality ${personalityId} not found`);
            }
            personality = foundPersonality;
          } else {
            const existingPersonalities = this.getAIPlayersForLobby(
              lobbyCode,
            ).map((player) => player.personality.id);
            personality = selectRandomPersonality(existingPersonalities);
          }

          // Create AI player
          const aiPlayer: AIPlayer = {
            id: `ai_${lobbyCode}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            personality,
            isConnected: true,
            score: 0,
            hand: [],
            status: "waiting",
            lastActivity: new Date(),
            decisionHistory: [],
            chatHistory: [],
          };

          // Add to active players
          if (!this.state.activeAIPlayers.has(lobbyCode)) {
            this.state.activeAIPlayers.set(lobbyCode, new Map());
          }
          this.state.activeAIPlayers.get(lobbyCode)!.set(aiPlayer.id, aiPlayer);

          this.logger.info("AI player created successfully", {
            playerId: aiPlayer.id,
            lobbyCode,
            personalityId: personality.id,
          });

          span.setAttribute("playerId", aiPlayer.id);
          span.setAttribute("lobbyCode", lobbyCode);
          span.setAttribute("personalityId", personality.id);

          return aiPlayer;
        } catch (error) {
          this.logger.error("Failed to create AI player", { error, options });
          throw error;
        }
      },
    );
  }

  /**
   * Remove an AI player from a lobby
   */
  public async removeAIPlayer(options: AIPlayerRemovalOptions): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.player.removal",
        name: "Remove AI Player",
      },
      async (span) => {
        try {
          const { lobbyCode, playerId, reason } = options;

          const lobbyPlayers = this.state.activeAIPlayers.get(lobbyCode);
          if (!lobbyPlayers) {
            this.logger.warn("No AI players found for lobby", { lobbyCode });
            return;
          }

          const aiPlayer = lobbyPlayers.get(playerId);
          if (!aiPlayer) {
            this.logger.warn("AI player not found", { playerId, lobbyCode });
            return;
          }

          // Remove player
          lobbyPlayers.delete(playerId);

          // Clean up empty lobby
          if (lobbyPlayers.size === 0) {
            this.state.activeAIPlayers.delete(lobbyCode);
          }

          this.logger.info("AI player removed successfully", {
            playerId,
            lobbyCode,
            reason,
            personalityId: aiPlayer.personality.id,
          });

          span.setAttribute("playerId", playerId);
          span.setAttribute("lobbyCode", lobbyCode);
          span.setAttribute("reason", reason);
          span.setAttribute("personalityId", aiPlayer.personality.id);
        } catch (error) {
          this.logger.error("Failed to remove AI player", { error, options });
          throw error;
        }
      },
    );
  }

  /**
   * Balance AI players in a lobby based on human player count
   */
  public async balanceAIPlayers(
    lobbyCode: string,
    humanPlayerCount: number,
    aiSettings: AISettings,
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.player.balancing",
        name: "Balance AI Players",
      },
      async (span) => {
        try {
          const currentAIPlayers = this.getAIPlayersForLobby(lobbyCode);
          const totalPlayerCount = humanPlayerCount + currentAIPlayers.length;
          const maxPlayers = aiSettings.maxAIPlayers + humanPlayerCount;

          // Remove excess AI players if lobby is full
          if (totalPlayerCount > maxPlayers) {
            const excessCount = totalPlayerCount - maxPlayers;
            const playersToRemove = currentAIPlayers.slice(0, excessCount);

            for (const player of playersToRemove) {
              await this.removeAIPlayer({
                lobbyCode,
                playerId: player.id,
                reason: "lobby-full",
              });
            }
          }

          // Add AI players if needed and auto-balance is enabled
          if (
            aiSettings.autoBalance &&
            humanPlayerCount < aiSettings.minHumanPlayers
          ) {
            const neededAIPlayers = Math.min(
              aiSettings.maxAIPlayers,
              aiSettings.minHumanPlayers - humanPlayerCount,
            );

            const currentCount = this.getAIPlayersForLobby(lobbyCode).length;
            const toAdd = neededAIPlayers - currentCount;

            for (let i = 0; i < toAdd; i++) {
              await this.createAIPlayer({
                lobbyCode,
                personalityPool: aiSettings.personalityPool,
                maxPlayers,
              });
            }
          }

          this.logger.info("AI players balanced successfully", {
            lobbyCode,
            humanPlayerCount,
            aiPlayerCount: this.getAIPlayersForLobby(lobbyCode).length,
            maxPlayers,
          });

          span.setAttribute("lobbyCode", lobbyCode);
          span.setAttribute("humanPlayerCount", humanPlayerCount);
          span.setAttribute(
            "aiPlayerCount",
            this.getAIPlayersForLobby(lobbyCode).length,
          );
          span.setAttribute("maxPlayers", maxPlayers);
        } catch (error) {
          this.logger.error("Failed to balance AI players", {
            error,
            lobbyCode,
          });
          throw error;
        }
      },
    );
  }

  /**
   * Get all AI players for a specific lobby
   */
  public getAIPlayersForLobby(lobbyCode: string): AIPlayer[] {
    const lobbyPlayers = this.state.activeAIPlayers.get(lobbyCode);
    if (!lobbyPlayers) {
      return [];
    }
    return Array.from(lobbyPlayers.values());
  }

  /**
   * Get a specific AI player by ID
   */
  public getAIPlayer(
    lobbyCode: string,
    playerId: string,
  ): AIPlayer | undefined {
    const lobbyPlayers = this.state.activeAIPlayers.get(lobbyCode);
    if (!lobbyPlayers) {
      return undefined;
    }
    return lobbyPlayers.get(playerId);
  }

  /**
   * Update AI player state
   */
  public updateAIPlayer(
    lobbyCode: string,
    playerId: string,
    updates: Partial<AIPlayer>,
  ): void {
    return Sentry.startSpan(
      {
        op: "ai.player.update",
        name: "Update AI Player",
      },
      (span) => {
        try {
          const lobbyPlayers = this.state.activeAIPlayers.get(lobbyCode);
          if (!lobbyPlayers) {
            throw new Error(`No AI players found for lobby ${lobbyCode}`);
          }

          const aiPlayer = lobbyPlayers.get(playerId);
          if (!aiPlayer) {
            throw new Error(
              `AI player ${playerId} not found in lobby ${lobbyCode}`,
            );
          }

          // Update player
          Object.assign(aiPlayer, updates);

          // Only update lastActivity if not explicitly provided in updates
          if (!updates.lastActivity) {
            aiPlayer.lastActivity = new Date();
          }

          this.logger.debug("AI player updated", {
            playerId,
            lobbyCode,
            updates: Object.keys(updates),
          });

          span.setAttribute("playerId", playerId);
          span.setAttribute("lobbyCode", lobbyCode);
          span.setAttribute("updateCount", Object.keys(updates).length);
        } catch (error) {
          this.logger.error("Failed to update AI player", {
            error,
            lobbyCode,
            playerId,
          });
          throw error;
        }
      },
    );
  }

  /**
   * Convert AI player to LobbyPlayer format for lobby integration
   */
  public convertToLobbyPlayer(aiPlayer: AIPlayer): LobbyPlayer {
    return {
      uid: aiPlayer.id,
      displayName: aiPlayer.personality.displayName,
      profileURL: `/icons/${aiPlayer.personality.avatarId}`,
      joinedAt: aiPlayer.lastActivity.toISOString(),
      isHost: false,
      isAI: true,
      aiPersonalityId: aiPlayer.personality.id,
    };
  }

  /**
   * Get all AI players as LobbyPlayer format for a lobby
   */
  public getAIPlayersAsLobbyPlayers(lobbyCode: string): LobbyPlayer[] {
    const aiPlayers = this.getAIPlayersForLobby(lobbyCode);
    return aiPlayers.map((player) => this.convertToLobbyPlayer(player));
  }

  /**
   * Check if a player is an AI player
   */
  public isAIPlayer(playerId: string): boolean {
    for (const [, players] of this.state.activeAIPlayers) {
      if (players.has(playerId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get AI player by player ID across all lobbies
   */
  public getAIPlayerById(
    playerId: string,
  ): { player: AIPlayer; lobbyCode: string } | null {
    for (const [lobbyCode, players] of this.state.activeAIPlayers) {
      const player = players.get(playerId);
      if (player) {
        return { player, lobbyCode };
      }
    }
    return null;
  }

  /**
   * Remove all AI players from a lobby (for lobby cleanup)
   */
  public async removeAllAIPlayersFromLobby(lobbyCode: string): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.player.bulk_removal",
        name: "Remove All AI Players from Lobby",
      },
      async (span) => {
        try {
          const aiPlayers = this.getAIPlayersForLobby(lobbyCode);

          for (const player of aiPlayers) {
            await this.removeAIPlayer({
              lobbyCode,
              playerId: player.id,
              reason: "lobby-cleanup",
            });
          }

          this.logger.info("All AI players removed from lobby", {
            lobbyCode,
            removedCount: aiPlayers.length,
          });

          span.setAttribute("lobbyCode", lobbyCode);
          span.setAttribute("removedCount", aiPlayers.length);
        } catch (error) {
          this.logger.error("Failed to remove all AI players from lobby", {
            error,
            lobbyCode,
          });
          throw error;
        }
      },
    );
  }

  /**
   * Get statistics about AI player usage
   */
  public getAIPlayerStats(): {
    totalAIPlayers: number;
    activeLobbies: number;
    personalityUsage: Record<string, number>;
  } {
    const personalityUsage: Record<string, number> = {};
    let totalAIPlayers = 0;

    for (const [, players] of this.state.activeAIPlayers) {
      totalAIPlayers += players.size;

      for (const player of players.values()) {
        const personalityId = player.personality.id;
        personalityUsage[personalityId] =
          (personalityUsage[personalityId] || 0) + 1;
      }
    }

    return {
      totalAIPlayers,
      activeLobbies: this.state.activeAIPlayers.size,
      personalityUsage,
    };
  }

  /**
   * Validate AI settings for a lobby
   */
  public validateAISettings(aiSettings: AISettings): AIPlayerErrorInfo | null {
    try {
      // Check if AI is enabled
      if (!aiSettings.enabled) {
        return null;
      }

      // Validate max AI players
      if (aiSettings.maxAIPlayers < 1 || aiSettings.maxAIPlayers > 6) {
        return {
          error: "INVALID_SETTINGS",
          message: "Max AI players must be between 1 and 6",
          context: { maxAIPlayers: aiSettings.maxAIPlayers },
          timestamp: new Date(),
        };
      }

      // Validate min human players
      if (aiSettings.minHumanPlayers < 1) {
        return {
          error: "INVALID_SETTINGS",
          message: "Min human players must be at least 1",
          context: { minHumanPlayers: aiSettings.minHumanPlayers },
          timestamp: new Date(),
        };
      }

      // Validate personality pool
      if (aiSettings.personalityPool.length === 0) {
        return {
          error: "INVALID_SETTINGS",
          message: "Personality pool cannot be empty",
          context: { personalityPool: aiSettings.personalityPool },
          timestamp: new Date(),
        };
      }

      // Validate personality IDs exist
      for (const personalityId of aiSettings.personalityPool) {
        if (!getPersonalityById(personalityId)) {
          return {
            error: "PERSONALITY_NOT_FOUND",
            message: `Personality ${personalityId} not found`,
            context: { personalityId },
            timestamp: new Date(),
          };
        }
      }

      return null;
    } catch (error) {
      return {
        error: "INVALID_SETTINGS",
        message: "Failed to validate AI settings",
        context: { error: String(error) },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Clean up inactive AI players (for maintenance)
   */
  public async cleanupInactiveAIPlayers(
    maxInactiveMinutes: number = 30,
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.player.cleanup",
        name: "Cleanup Inactive AI Players",
      },
      async (span) => {
        try {
          const cutoffTime = new Date(
            Date.now() - maxInactiveMinutes * 60 * 1000,
          );
          let removedCount = 0;

          for (const [lobbyCode, players] of this.state.activeAIPlayers) {
            for (const [playerId, player] of players) {
              if (player.lastActivity < cutoffTime) {
                await this.removeAIPlayer({
                  lobbyCode,
                  playerId,
                  reason: "inactive",
                });
                removedCount++;
              }
            }
          }

          if (removedCount > 0) {
            this.logger.info("Cleaned up inactive AI players", {
              removedCount,
              maxInactiveMinutes,
            });
          }

          span.setAttribute("removedCount", removedCount);
          span.setAttribute("maxInactiveMinutes", maxInactiveMinutes);
        } catch (error) {
          this.logger.error("Failed to cleanup inactive AI players", { error });
          throw error;
        }
      },
    );
  }

  /**
   * Get the current state of the AI Player Manager
   */
  public getState(): AIPlayerManagerState {
    return {
      activeAIPlayers: new Map(this.state.activeAIPlayers),
      personalityPool: [...this.state.personalityPool],
      isInitialized: this.state.isInitialized,
    };
  }

  /**
   * Reset the AI Player Manager (for testing)
   */
  public reset(): void {
    this.state = {
      activeAIPlayers: new Map(),
      personalityPool: [],
      isInitialized: false,
    };
  }
}

// Export singleton instance
export const aiPlayerManager = AIPlayerManager.getInstance();

// Export class for testing
export { AIPlayerManager };
