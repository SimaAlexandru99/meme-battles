/**
 * Lobby Cleanup and Maintenance Service
 *
 * This service handles cleanup of abandoned lobbies, stale player sessions,
 * and provides monitoring and logging for lobby lifecycle events.
 */

import { ref, get, remove, update } from "firebase/database";
import { rtdb } from "@/firebase/client";

export interface LobbyCleanupConfig {
  emptyLobbyTimeoutMs: number; // 5 minutes for empty lobbies
  abandonedLobbyTimeoutMs: number; // 30 minutes for abandoned lobbies
  staleSessionTimeoutMs: number; // 10 minutes for stale sessions
  cleanupIntervalMs: number; // How often to run cleanup
  maxLobbiesPerCleanup: number; // Limit cleanup batch size
}

export interface CleanupStats {
  emptyLobbiesRemoved: number;
  abandonedLobbiesRemoved: number;
  staleSessionsRemoved: number;
  lastCleanupTime: number;
  totalCleanupRuns: number;
}

export interface LobbyLifecycleEvent {
  type: "created" | "joined" | "left" | "abandoned" | "cleaned_up" | "error";
  lobbyCode: string;
  playerId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Default cleanup configuration
 */
export const DEFAULT_CLEANUP_CONFIG: LobbyCleanupConfig = {
  emptyLobbyTimeoutMs: 5 * 60 * 1000, // 5 minutes
  abandonedLobbyTimeoutMs: 30 * 60 * 1000, // 30 minutes
  staleSessionTimeoutMs: 10 * 60 * 1000, // 10 minutes
  cleanupIntervalMs: 2 * 60 * 1000, // 2 minutes
  maxLobbiesPerCleanup: 10, // Process max 10 lobbies per cleanup run
};

/**
 * Lobby cleanup and maintenance service
 */
export class LobbyCleanupService {
  private static instance: LobbyCleanupService;
  private config: LobbyCleanupConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats: CleanupStats = {
    emptyLobbiesRemoved: 0,
    abandonedLobbiesRemoved: 0,
    staleSessionsRemoved: 0,
    lastCleanupTime: 0,
    totalCleanupRuns: 0,
  };
  private eventListeners: Array<(event: LobbyLifecycleEvent) => void> = [];
  private isRunning = false;

  private constructor(config: LobbyCleanupConfig = DEFAULT_CLEANUP_CONFIG) {
    this.config = config;
  }

  static getInstance(config?: LobbyCleanupConfig): LobbyCleanupService {
    if (!LobbyCleanupService.instance) {
      LobbyCleanupService.instance = new LobbyCleanupService(config);
    }
    return LobbyCleanupService.instance;
  }

  /**
   * Start the cleanup service
   */
  start(): void {
    if (this.isRunning) {
      console.warn("Lobby cleanup service is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting lobby cleanup service");

    // Run initial cleanup
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.config.cleanupIntervalMs);

    this.logEvent({
      type: "created",
      lobbyCode: "system",
      timestamp: Date.now(),
      metadata: { action: "cleanup_service_started" },
    });
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log("Stopped lobby cleanup service");

    this.logEvent({
      type: "created",
      lobbyCode: "system",
      timestamp: Date.now(),
      metadata: { action: "cleanup_service_stopped" },
    });
  }

  /**
   * Run a single cleanup cycle
   */
  private async runCleanup(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      console.log("Running lobby cleanup cycle");
      const startTime = Date.now();

      // Run cleanup tasks in parallel
      const [emptyCount, abandonedCount, staleCount] = await Promise.all([
        this.cleanupEmptyLobbies(),
        this.cleanupAbandonedLobbies(),
        this.cleanupStaleSessions(),
      ]);

      // Update stats
      this.stats.emptyLobbiesRemoved += emptyCount;
      this.stats.abandonedLobbiesRemoved += abandonedCount;
      this.stats.staleSessionsRemoved += staleCount;
      this.stats.lastCleanupTime = Date.now();
      this.stats.totalCleanupRuns++;

      const duration = Date.now() - startTime;
      console.log(`Cleanup completed in ${duration}ms:`, {
        empty: emptyCount,
        abandoned: abandonedCount,
        stale: staleCount,
      });
    } catch (error) {
      console.error("Cleanup cycle failed:", error);

      this.logEvent({
        type: "error",
        lobbyCode: "system",
        timestamp: Date.now(),
        metadata: { error: (error as Error).message, action: "cleanup_cycle" },
      });
    }
  }

  /**
   * Clean up empty lobbies (no players)
   */
  private async cleanupEmptyLobbies(): Promise<number> {
    try {
      const lobbiesRef = ref(rtdb, "lobbies");
      const snapshot = await get(lobbiesRef);

      if (!snapshot.exists()) {
        return 0;
      }

      const lobbies = snapshot.val();
      const now = Date.now();
      const cutoffTime = now - this.config.emptyLobbyTimeoutMs;
      let removedCount = 0;
      const updates: Record<string, null> = {};

      Object.entries(lobbies).forEach(([code, lobby]: [string, unknown]) => {
        // Check if lobby is empty (no players)
        const hasPlayers =
          (lobby as Record<string, unknown>).players &&
          Object.keys(
            (lobby as Record<string, unknown>).players as Record<
              string,
              unknown
            >,
          ).length > 0;

        if (!hasPlayers) {
          const createdAt = new Date(
            (lobby as Record<string, unknown>).createdAt as string,
          ).getTime();

          if (createdAt < cutoffTime) {
            updates[`lobbies/${code}`] = null;
            removedCount++;

            this.logEvent({
              type: "cleaned_up",
              lobbyCode: code,
              timestamp: now,
              metadata: {
                reason: "empty_lobby",
                ageMs: now - createdAt,
              },
            });
          }
        }
      });

      // Batch remove empty lobbies
      if (Object.keys(updates).length > 0) {
        await update(ref(rtdb), updates);
        console.log(`Removed ${removedCount} empty lobbies`);
      }

      return removedCount;
    } catch (error) {
      console.error("Failed to cleanup empty lobbies:", error);
      return 0;
    }
  }

  /**
   * Clean up abandoned lobbies (players inactive for too long)
   */
  private async cleanupAbandonedLobbies(): Promise<number> {
    try {
      const lobbiesRef = ref(rtdb, "lobbies");
      const snapshot = await get(lobbiesRef);

      if (!snapshot.exists()) {
        return 0;
      }

      const lobbies = snapshot.val();
      const now = Date.now();
      const cutoffTime = now - this.config.abandonedLobbyTimeoutMs;
      let removedCount = 0;
      const updates: Record<string, null> = {};

      Object.entries(lobbies).forEach(([code, lobby]: [string, unknown]) => {
        if (!(lobby as Record<string, unknown>).players) {
          return;
        }

        // Check if all players are inactive
        const playerLastSeenTimes = Object.values(
          (lobby as Record<string, unknown>).players as Record<string, unknown>,
        ).map((player: unknown) => {
          return new Date(
            ((player as Record<string, unknown>).lastSeen as string) ||
              ((player as Record<string, unknown>).joinedAt as string),
          ).getTime();
        });

        const mostRecentActivity = Math.max(...playerLastSeenTimes);

        if (mostRecentActivity < cutoffTime) {
          updates[`lobbies/${code}`] = null;
          removedCount++;

          this.logEvent({
            type: "abandoned",
            lobbyCode: code,
            timestamp: now,
            metadata: {
              reason: "abandoned_lobby",
              lastActivityMs: now - mostRecentActivity,
              playerCount: Object.keys(
                (lobby as Record<string, unknown>).players as Record<
                  string,
                  unknown
                >,
              ).length,
            },
          });
        }
      });

      // Batch remove abandoned lobbies
      if (Object.keys(updates).length > 0) {
        await update(ref(rtdb), updates);
        console.log(`Removed ${removedCount} abandoned lobbies`);
      }

      return removedCount;
    } catch (error) {
      console.error("Failed to cleanup abandoned lobbies:", error);
      return 0;
    }
  }

  /**
   * Clean up stale player sessions
   */
  private async cleanupStaleSessions(): Promise<number> {
    try {
      const sessionsRef = ref(rtdb, "playerSessions");
      const snapshot = await get(sessionsRef);

      if (!snapshot.exists()) {
        return 0;
      }

      const sessions = snapshot.val();
      const now = Date.now();
      const cutoffTime = now - this.config.staleSessionTimeoutMs;
      let removedCount = 0;
      const updates: Record<string, null> = {};

      Object.entries(sessions).forEach(
        ([playerId, session]: [string, unknown]) => {
          const lastActivity = new Date(
            (session as Record<string, unknown>).lastActivity as string,
          ).getTime();

          if (lastActivity < cutoffTime) {
            updates[`playerSessions/${playerId}`] = null;
            removedCount++;

            this.logEvent({
              type: "cleaned_up",
              lobbyCode:
                ((session as Record<string, unknown>).currentLobby as string) ||
                "none",
              playerId,
              timestamp: now,
              metadata: {
                reason: "stale_session",
                ageMs: now - lastActivity,
              },
            });
          }
        },
      );

      // Batch remove stale sessions
      if (Object.keys(updates).length > 0) {
        await update(ref(rtdb), updates);
        console.log(`Removed ${removedCount} stale sessions`);
      }

      return removedCount;
    } catch (error) {
      console.error("Failed to cleanup stale sessions:", error);
      return 0;
    }
  }

  /**
   * Manual cleanup trigger for specific lobby
   */
  async cleanupLobby(
    lobbyCode: string,
    reason: string = "manual",
  ): Promise<boolean> {
    try {
      const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
      const snapshot = await get(lobbyRef);

      if (!snapshot.exists()) {
        return false;
      }

      // Remove the lobby
      await remove(lobbyRef);

      // Clean up related player sessions
      const sessionsRef = ref(rtdb, "playerSessions");
      const sessionsSnapshot = await get(sessionsRef);

      if (sessionsSnapshot.exists()) {
        const sessions = sessionsSnapshot.val();
        const updates: Record<string, null> = {};

        Object.entries(sessions).forEach(
          ([playerId, session]: [string, unknown]) => {
            if (
              (session as Record<string, unknown>).currentLobby === lobbyCode
            ) {
              updates[`playerSessions/${playerId}`] = null;
            }
          },
        );

        if (Object.keys(updates).length > 0) {
          await update(ref(rtdb), updates);
        }
      }

      this.logEvent({
        type: "cleaned_up",
        lobbyCode,
        timestamp: Date.now(),
        metadata: { reason },
      });

      console.log(`Manually cleaned up lobby ${lobbyCode}`);
      return true;
    } catch (error) {
      console.error(`Failed to cleanup lobby ${lobbyCode}:`, error);
      return false;
    }
  }

  /**
   * Add event listener for lobby lifecycle events
   */
  addEventListener(listener: (event: LobbyLifecycleEvent) => void): () => void {
    this.eventListeners.push(listener);

    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Log a lobby lifecycle event
   */
  private logEvent(event: LobbyLifecycleEvent): void {
    // Notify listeners
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Event listener error:", error);
      }
    });

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("Lobby lifecycle event:", event);
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats(): CleanupStats {
    return { ...this.stats };
  }

  /**
   * Update cleanup configuration
   */
  updateConfig(newConfig: Partial<LobbyCleanupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("Updated cleanup configuration:", this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): LobbyCleanupConfig {
    return { ...this.config };
  }

  /**
   * Graceful degradation for high-load scenarios
   */
  async handleHighLoad(): Promise<void> {
    console.log("Handling high load - reducing cleanup frequency");

    // Temporarily increase cleanup interval
    const originalInterval = this.config.cleanupIntervalMs;
    this.config.cleanupIntervalMs = Math.min(
      originalInterval * 2,
      10 * 60 * 1000, // Max 10 minutes
    );

    // Reduce batch size
    this.config.maxLobbiesPerCleanup = Math.max(
      Math.floor(this.config.maxLobbiesPerCleanup / 2),
      1,
    );

    // Reset after 30 minutes
    setTimeout(
      () => {
        this.config.cleanupIntervalMs = originalInterval;
        this.config.maxLobbiesPerCleanup =
          DEFAULT_CLEANUP_CONFIG.maxLobbiesPerCleanup;
        console.log("Restored normal cleanup configuration");
      },
      30 * 60 * 1000,
    );
  }

  /**
   * Cleanup service resources
   */
  cleanup(): void {
    this.stop();
    this.eventListeners = [];
    console.log("Lobby cleanup service cleaned up");
  }
}

/**
 * React hook for lobby cleanup monitoring
 */
export function useLobbyCleanupMonitoring() {
  const [stats, setStats] = React.useState<CleanupStats | null>(null);
  const [events, setEvents] = React.useState<LobbyLifecycleEvent[]>([]);

  React.useEffect(() => {
    const service = LobbyCleanupService.getInstance();

    // Get initial stats
    setStats(service.getStats());

    // Listen for events
    const unsubscribe = service.addEventListener((event) => {
      setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
      setStats(service.getStats());
    });

    // Update stats periodically
    const interval = setInterval(() => {
      setStats(service.getStats());
    }, 30000); // Every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    stats,
    events,
    cleanupLobby: (lobbyCode: string, reason?: string) =>
      LobbyCleanupService.getInstance().cleanupLobby(lobbyCode, reason),
  };
}

// Export singleton instance
export const lobbyCleanup = LobbyCleanupService.getInstance();

// Import React for the hook
import React from "react";
