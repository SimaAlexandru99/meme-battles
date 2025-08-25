/**
 * Lobby System Integration Service
 *
 * This service integrates all lobby management services including
 * optimization, cleanup, monitoring, and rate limiting for a
 * comprehensive lobby management system.
 */

import { dbOptimization } from "./database-optimization";
import { firebaseOptimization } from "./firebase-config";
import { lobbyCleanup } from "./lobby-cleanup";
import { lobbyMonitoring } from "./lobby-monitoring";
import { RateLimitingService } from "./rate-limiting";

export interface LobbySystemConfig {
  enableOptimization: boolean;
  enableCleanup: boolean;
  enableMonitoring: boolean;
  enableRateLimiting: boolean;
  developmentMode: boolean;
}

export interface LobbySystemStats {
  optimization: {
    cacheSize: number;
    activeListeners: number;
    pendingUpdates: number;
  };
  cleanup: {
    emptyLobbiesRemoved: number;
    abandonedLobbiesRemoved: number;
    staleSessionsRemoved: number;
    lastCleanupTime: number;
  };
  monitoring: {
    activeLobbies: number;
    activePlayers: number;
    averageLatency: number;
    errorRate: number;
  };
  system: {
    isOnline: boolean;
    lastHealthCheck: number;
    uptime: number;
  };
}

/**
 * Default system configuration
 */
export const DEFAULT_SYSTEM_CONFIG: LobbySystemConfig = {
  enableOptimization: true,
  enableCleanup: true,
  enableMonitoring: true,
  enableRateLimiting: true,
  developmentMode: process.env.NODE_ENV === "development",
};

/**
 * Integrated lobby system service
 */
export class LobbySystemIntegrationService {
  private static instance: LobbySystemIntegrationService;
  private config: LobbySystemConfig;
  private startTime: number;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck = 0;

  private constructor(config: LobbySystemConfig = DEFAULT_SYSTEM_CONFIG) {
    this.config = config;
    this.startTime = Date.now();
  }

  static getInstance(
    config?: LobbySystemConfig,
  ): LobbySystemIntegrationService {
    if (!LobbySystemIntegrationService.instance) {
      LobbySystemIntegrationService.instance =
        new LobbySystemIntegrationService(config);
    }
    return LobbySystemIntegrationService.instance;
  }

  /**
   * Initialize the complete lobby system
   */
  async initialize(): Promise<void> {
    console.log("Initializing lobby system integration...");

    try {
      // Initialize services based on configuration
      if (this.config.enableCleanup) {
        lobbyCleanup.start();
        console.log("✓ Lobby cleanup service started");
      }

      if (this.config.enableMonitoring) {
        lobbyMonitoring.setEnabled(true);
        console.log("✓ Lobby monitoring service enabled");
      }

      // Setup health monitoring
      this.startHealthMonitoring();

      // Log system initialization
      if (this.config.enableMonitoring) {
        lobbyMonitoring.logEvent({
          type: "lobby_created", // Using existing type for system events
          metadata: {
            action: "system_initialized",
            config: this.config,
            timestamp: Date.now(),
          },
          severity: "info",
        });
      }

      console.log("✓ Lobby system integration initialized successfully");
    } catch (error) {
      console.error("Failed to initialize lobby system:", error);

      if (this.config.enableMonitoring) {
        lobbyMonitoring.logError(error as Error, {
          context: "system_initialization",
        });
      }

      throw error;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // Every minute

    // Initial health check
    this.performHealthCheck();
  }

  /**
   * Perform system health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      this.lastHealthCheck = Date.now();

      if (this.config.enableMonitoring) {
        const health = await lobbyMonitoring.getSystemHealth();

        if (health) {
          // Log health metrics
          lobbyMonitoring.logPerformanceMetrics(
            {
              connectionLatency: health.averageLatency,
            },
            {
              context: "health_check",
              activeLobbies: health.activeLobbies,
              activePlayers: health.activePlayers,
              errorRate: health.errorRate,
            },
          );

          // Alert on high error rate
          if (health.errorRate > 10) {
            lobbyMonitoring.logEvent({
              type: "error",
              metadata: {
                message: "High error rate detected",
                errorRate: health.errorRate,
                activeLobbies: health.activeLobbies,
                activePlayers: health.activePlayers,
              },
              severity: "warning",
            });
          }

          // Alert on high load
          if (health.activeLobbies > 100) {
            console.log("High load detected, enabling graceful degradation");
            await lobbyCleanup.handleHighLoad();
          }
        }
      }
    } catch (error) {
      console.error("Health check failed:", error);

      if (this.config.enableMonitoring) {
        lobbyMonitoring.logError(error as Error, {
          context: "health_check",
        });
      }
    }
  }

  /**
   * Create a lobby with full system integration
   */
  async createLobby(
    userId: string,
    lobbyData: unknown,
    options: { skipRateLimit?: boolean } = {},
  ): Promise<{ success: boolean; lobbyCode?: string; error?: string }> {
    const startTime = performance.now();

    try {
      // Rate limiting check
      if (this.config.enableRateLimiting && !options.skipRateLimit) {
        const rateLimitResult = await RateLimitingService.checkRateLimit(
          userId,
          "LOBBY_CREATION",
        );

        if (!rateLimitResult.allowed) {
          const error = `Rate limit exceeded: ${rateLimitResult.remainingRequests} requests remaining`;

          if (this.config.enableMonitoring) {
            lobbyMonitoring.logEvent({
              type: "error",
              userId,
              metadata: {
                message: error,
                rateLimitResult,
                action: "create_lobby",
              },
              severity: "warning",
            });
          }

          return { success: false, error };
        }
      }

      // Generate unique lobby code using optimization service
      const lobbyCode = await this.generateUniqueLobbyCode();

      // Create lobby data with optimization
      const optimizedLobbyData = {
        ...(lobbyData as Record<string, unknown>),
        code: lobbyCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Use delta updates for efficient writes
      const lobbyPath = `lobbies/${lobbyCode}`;
      dbOptimization.scheduleDeltaUpdate(lobbyPath, optimizedLobbyData);

      // Update player session
      if (this.config.enableOptimization) {
        dbOptimization.scheduleDeltaUpdate(`playerSessions/${userId}`, {
          currentLobby: lobbyCode,
          lastActivity: new Date().toISOString(),
          connectionStatus: "online",
        });
      }

      // Log creation event
      if (this.config.enableMonitoring) {
        const duration = performance.now() - startTime;

        lobbyMonitoring.logLobbyCreated(lobbyCode, userId, {
          duration,
          optimized: this.config.enableOptimization,
        });
      }

      return { success: true, lobbyCode };
    } catch (error) {
      const duration = performance.now() - startTime;

      if (this.config.enableMonitoring) {
        lobbyMonitoring.logError(error as Error, {
          context: "create_lobby",
          userId,
          duration,
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Join a lobby with full system integration
   */
  async joinLobby(
    userId: string,
    lobbyCode: string,
    playerData: unknown,
  ): Promise<{ success: boolean; error?: string }> {
    const startTime = performance.now();

    try {
      // Rate limiting check
      if (this.config.enableRateLimiting) {
        const rateLimitResult = await RateLimitingService.checkRateLimit(
          userId,
          "PLAYER_ACTIONS",
        );

        if (!rateLimitResult.allowed) {
          const error = `Rate limit exceeded for player actions`;

          if (this.config.enableMonitoring) {
            lobbyMonitoring.logEvent({
              type: "error",
              lobbyCode,
              userId,
              metadata: {
                message: error,
                rateLimitResult,
                action: "join_lobby",
              },
              severity: "warning",
            });
          }

          return { success: false, error };
        }
      }

      // Get lobby data with caching
      const lobbyData = await dbOptimization.getCachedData(
        `lobbies/${lobbyCode}`,
        10000,
      );

      if (!lobbyData) {
        return { success: false, error: "Lobby not found" };
      }

      // Validate lobby state
      if ((lobbyData as Record<string, unknown>).status !== "waiting") {
        return { success: false, error: "Lobby is not accepting new players" };
      }

      const currentPlayerCount = (lobbyData as Record<string, unknown>).players
        ? Object.keys(
            (lobbyData as Record<string, unknown>).players as Record<
              string,
              unknown
            >,
          ).length
        : 0;
      if (
        currentPlayerCount >=
        ((lobbyData as Record<string, unknown>).maxPlayers as number)
      ) {
        return { success: false, error: "Lobby is full" };
      }

      // Add player using delta updates
      const playerPath = `lobbies/${lobbyCode}/players/${userId}`;
      const playerInfo = {
        ...(playerData as Record<string, unknown>),
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        isHost: false,
        score: 0,
        status: "waiting",
      };

      dbOptimization.scheduleDeltaUpdate(playerPath, playerInfo);
      dbOptimization.scheduleDeltaUpdate(
        `lobbies/${lobbyCode}/updatedAt`,
        new Date().toISOString(),
      );

      // Update player session
      if (this.config.enableOptimization) {
        dbOptimization.scheduleDeltaUpdate(`playerSessions/${userId}`, {
          currentLobby: lobbyCode,
          lastActivity: new Date().toISOString(),
          connectionStatus: "online",
        });
      }

      // Log join event
      if (this.config.enableMonitoring) {
        const duration = performance.now() - startTime;

        lobbyMonitoring.logLobbyJoined(lobbyCode, userId, {
          duration,
          playerCount: currentPlayerCount + 1,
        });
      }

      return { success: true };
    } catch (error) {
      const duration = performance.now() - startTime;

      if (this.config.enableMonitoring) {
        lobbyMonitoring.logError(error as Error, {
          context: "join_lobby",
          lobbyCode,
          userId,
          duration,
        });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate unique lobby code with collision detection
   */
  private async generateUniqueLobbyCode(): Promise<string> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const code = this.generateRandomCode();

      // Check if code exists using cached data
      const existingLobby = await dbOptimization.getCachedData(
        `lobbies/${code}`,
        1000,
      );

      if (!existingLobby) {
        return code;
      }

      attempts++;
    }

    throw new Error(
      "Unable to generate unique lobby code after maximum attempts",
    );
  }

  /**
   * Generate random 5-character alphanumeric code
   */
  private generateRandomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Get comprehensive system statistics
   */
  async getSystemStats(): Promise<LobbySystemStats> {
    const [optimizationStats, cleanupStats, systemHealth] = await Promise.all([
      Promise.resolve(dbOptimization.getStats()),
      Promise.resolve(lobbyCleanup.getStats()),
      this.config.enableMonitoring
        ? lobbyMonitoring.getSystemHealth()
        : Promise.resolve(null),
    ]);

    return {
      optimization: optimizationStats,
      cleanup: cleanupStats,
      monitoring: systemHealth || {
        activeLobbies: 0,
        activePlayers: 0,
        averageLatency: 0,
        errorRate: 0,
      },
      system: {
        isOnline: firebaseOptimization.isConnected(),
        lastHealthCheck: this.lastHealthCheck,
        uptime: Date.now() - this.startTime,
      },
    };
  }

  /**
   * Update system configuration
   */
  updateConfig(newConfig: Partial<LobbySystemConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Apply configuration changes
    if (oldConfig.enableCleanup !== this.config.enableCleanup) {
      if (this.config.enableCleanup) {
        lobbyCleanup.start();
      } else {
        lobbyCleanup.stop();
      }
    }

    if (oldConfig.enableMonitoring !== this.config.enableMonitoring) {
      lobbyMonitoring.setEnabled(this.config.enableMonitoring);
    }

    console.log("Updated lobby system configuration:", this.config);
  }

  /**
   * Shutdown the lobby system gracefully
   */
  async shutdown(): Promise<void> {
    console.log("Shutting down lobby system...");

    try {
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Cleanup services
      if (this.config.enableCleanup) {
        lobbyCleanup.cleanup();
      }

      if (this.config.enableOptimization) {
        dbOptimization.cleanup();
      }

      if (this.config.enableMonitoring) {
        lobbyMonitoring.cleanup();
      }

      firebaseOptimization.cleanup();

      console.log("✓ Lobby system shutdown completed");
    } catch (error) {
      console.error("Error during lobby system shutdown:", error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LobbySystemConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const lobbySystem = LobbySystemIntegrationService.getInstance();
