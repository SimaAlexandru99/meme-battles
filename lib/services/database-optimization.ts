/**
 * Database Optimization Service for Firebase Realtime Database
 *
 * This service provides optimizations for minimal bandwidth usage,
 * delta updates, connection pooling, and caching strategies.
 */

import {
  ref,
  update,
  onValue,
  get,
  query,
  orderByChild,
  limitToLast,
  startAt,
  endAt,
  Unsubscribe,
  DataSnapshot,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "@/firebase/client";

export interface DeltaUpdate {
  path: string;
  value: unknown;
  timestamp: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Database optimization service with caching, delta updates, and connection management
 */
export class DatabaseOptimizationService {
  private static instance: DatabaseOptimizationService;
  private cache = new Map<string, CacheEntry<unknown>>();
  private listeners = new Map<string, Unsubscribe>();
  private pendingUpdates = new Map<string, DeltaUpdate[]>();
  private updateBatchTimeout: NodeJS.Timeout | null = null;

  private readonly config: ConnectionPoolConfig = {
    maxConnections: 10,
    connectionTimeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  };

  private constructor() {
    // Enable offline persistence for better performance
    this.enableOfflinePersistence();

    // Set up periodic cache cleanup
    this.setupCacheCleanup();
  }

  static getInstance(): DatabaseOptimizationService {
    if (!DatabaseOptimizationService.instance) {
      DatabaseOptimizationService.instance = new DatabaseOptimizationService();
    }
    return DatabaseOptimizationService.instance;
  }

  /**
   * Enable offline persistence for better performance
   */
  private enableOfflinePersistence(): void {
    try {
      // Note: This should be called before any other database operations
      // In a real implementation, this would be configured in firebase/client.ts
      console.log(
        "Offline persistence should be enabled in Firebase configuration"
      );
    } catch (error) {
      console.warn("Failed to enable offline persistence:", error);
    }
  }

  /**
   * Set up periodic cache cleanup to prevent memory leaks
   */
  private setupCacheCleanup(): void {
    setInterval(
      () => {
        this.cleanupExpiredCache();
      },
      5 * 60 * 1000
    ); // Clean up every 5 minutes
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach((key) => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get data with caching support
   */
  async getCachedData<T>(
    path: string,
    ttl: number = 30000 // 30 seconds default TTL
  ): Promise<T | null> {
    const cacheKey = path;
    const cached = this.cache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    try {
      const snapshot = await get(ref(rtdb, path));
      const data = snapshot.exists() ? snapshot.val() : null;

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      return data as T;
    } catch (error) {
      console.error(`Failed to get data from ${path}:`, error);

      // Return stale cache data if available
      if (cached) {
        console.warn(`Returning stale cache data for ${path}`);
        return cached.data as T;
      }

      return null;
    }
  }

  /**
   * Invalidate cache for a specific path
   */
  invalidateCache(path: string): void {
    this.cache.delete(path);

    // Also invalidate parent paths that might contain this data
    const pathParts = path.split("/");
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join("/");
      this.cache.delete(parentPath);
    }
  }

  /**
   * Batch delta updates for efficient writes
   */
  scheduleDeltaUpdate(path: string, value: unknown): void {
    const update: DeltaUpdate = {
      path,
      value,
      timestamp: Date.now(),
    };

    if (!this.pendingUpdates.has(path)) {
      this.pendingUpdates.set(path, []);
    }

    this.pendingUpdates.get(path)!.push(update);

    // Schedule batch update if not already scheduled
    if (!this.updateBatchTimeout) {
      this.updateBatchTimeout = setTimeout(() => {
        this.flushPendingUpdates();
      }, 100); // Batch updates every 100ms
    }
  }

  /**
   * Flush all pending delta updates
   */
  private async flushPendingUpdates(): Promise<void> {
    if (this.pendingUpdates.size === 0) {
      this.updateBatchTimeout = null;
      return;
    }

    const updates: Record<string, unknown> = {};

    // Consolidate updates - later updates override earlier ones for the same path
    this.pendingUpdates.forEach((deltaUpdates, path) => {
      if (deltaUpdates.length > 0) {
        // Use the latest update for each path
        const latestUpdate = deltaUpdates[deltaUpdates.length - 1];
        updates[path] = latestUpdate.value;

        // Invalidate cache for updated paths
        this.invalidateCache(path);
      }
    });

    try {
      await update(ref(rtdb), updates);
      console.log(`Flushed ${Object.keys(updates).length} delta updates`);
    } catch (error) {
      console.error("Failed to flush delta updates:", error);

      // Retry failed updates
      setTimeout(() => {
        this.retryFailedUpdates(updates);
      }, this.config.retryDelay);
    }

    // Clear pending updates
    this.pendingUpdates.clear();
    this.updateBatchTimeout = null;
  }

  /**
   * Retry failed updates with exponential backoff
   */
  private async retryFailedUpdates(
    updates: Record<string, unknown>,
    attempt: number = 1
  ): Promise<void> {
    if (attempt > this.config.retryAttempts) {
      console.error("Max retry attempts reached for delta updates");
      return;
    }

    try {
      await update(ref(rtdb), updates);
      console.log(`Successfully retried delta updates on attempt ${attempt}`);
    } catch (error) {
      console.error(`Retry attempt ${attempt} failed:`, error);

      const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
      setTimeout(() => {
        this.retryFailedUpdates(updates, attempt + 1);
      }, delay);
    }
  }

  /**
   * Optimized listener management with automatic cleanup
   */
  subscribeWithOptimization<T>(
    path: string,
    callback: (data: T | null) => void,
    options: {
      useCache?: boolean;
      cacheTtl?: number;
      throttleMs?: number;
    } = {}
  ): Unsubscribe {
    const { useCache = true, cacheTtl = 30000, throttleMs = 100 } = options;

    // Throttle callback to prevent excessive updates
    let lastCallTime = 0;
    let throttleTimeout: NodeJS.Timeout | null = null;

    const throttledCallback = (data: T | null) => {
      const now = Date.now();

      if (now - lastCallTime >= throttleMs) {
        lastCallTime = now;
        callback(data);
      } else {
        // Schedule delayed callback
        if (throttleTimeout) {
          clearTimeout(throttleTimeout);
        }

        throttleTimeout = setTimeout(
          () => {
            lastCallTime = Date.now();
            callback(data);
            throttleTimeout = null;
          },
          throttleMs - (now - lastCallTime)
        );
      }
    };

    const dbRef = ref(rtdb, path);
    const unsubscribe = onValue(
      dbRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.exists() ? snapshot.val() : null;

        // Update cache if enabled
        if (useCache) {
          this.cache.set(path, {
            data,
            timestamp: Date.now(),
            ttl: cacheTtl,
          });
        }

        throttledCallback(data as T);
      },
      (error) => {
        console.error(`Listener error for ${path}:`, error);

        // Try to provide cached data on error
        if (useCache) {
          const cached = this.cache.get(path);
          if (cached) {
            console.warn(`Using cached data for ${path} due to listener error`);
            throttledCallback(cached.data as T);
          }
        }
      }
    );

    // Store listener for cleanup
    this.listeners.set(path, unsubscribe);

    // Return enhanced unsubscribe function
    return () => {
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
      unsubscribe();
      this.listeners.delete(path);
    };
  }

  /**
   * Optimized query for lobby listings with pagination
   */
  async getLobbiesOptimized(
    options: {
      status?: string;
      limit?: number;
      startAfter?: string;
      orderBy?: "createdAt" | "updatedAt";
    } = {}
  ): Promise<unknown[]> {
    const { status, limit = 20, startAfter, orderBy = "createdAt" } = options;

    try {
      let dbQuery = query(
        ref(rtdb, "lobbies"),
        orderByChild(orderBy),
        limitToLast(limit)
      );

      // Add status filter if specified
      if (status) {
        dbQuery = query(
          ref(rtdb, "lobbies"),
          orderByChild("status"),
          startAt(status),
          endAt(status),
          limitToLast(limit)
        );
      }

      // Add pagination if specified
      if (startAfter) {
        dbQuery = query(dbQuery, startAt(startAfter));
      }

      const snapshot = await get(dbQuery);

      if (!snapshot.exists()) {
        return [];
      }

      const lobbies = Object.entries(snapshot.val()).map(([code, data]) => ({
        code,
        ...(data as Record<string, unknown>),
      }));

      return lobbies.reverse(); // Reverse to get newest first
    } catch (error) {
      console.error("Failed to get optimized lobbies:", error);
      return [];
    }
  }

  /**
   * Cleanup all listeners and resources
   */
  cleanup(): void {
    // Clear all listeners
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();

    // Clear cache
    this.cache.clear();

    // Clear pending updates
    if (this.updateBatchTimeout) {
      clearTimeout(this.updateBatchTimeout);
      this.updateBatchTimeout = null;
    }
    this.pendingUpdates.clear();

    console.log("Database optimization service cleaned up");
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    cacheSize: number;
    activeListeners: number;
    pendingUpdates: number;
  } {
    return {
      cacheSize: this.cache.size,
      activeListeners: this.listeners.size,
      pendingUpdates: this.pendingUpdates.size,
    };
  }
}

/**
 * Utility functions for database path optimization
 */
export class DatabasePathOptimizer {
  /**
   * Generate optimized paths for minimal data transfer
   */
  static getLobbyPlayerPath(lobbyCode: string, playerId: string): string {
    return `lobbies/${lobbyCode}/players/${playerId}`;
  }

  static getLobbySettingsPath(lobbyCode: string): string {
    return `lobbies/${lobbyCode}/settings`;
  }

  static getLobbyStatusPath(lobbyCode: string): string {
    return `lobbies/${lobbyCode}/status`;
  }

  static getPlayerSessionPath(playerId: string): string {
    return `playerSessions/${playerId}`;
  }

  /**
   * Create delta update paths for specific field updates
   */
  static createDeltaUpdatePaths(
    basePath: string,
    updates: Record<string, unknown>
  ): Record<string, unknown> {
    const deltaPaths: Record<string, unknown> = {};

    Object.entries(updates).forEach(([field, value]) => {
      deltaPaths[`${basePath}/${field}`] = value;
    });

    // Always update the parent's updatedAt timestamp (server time)
    try {
      deltaPaths[`${basePath}/updatedAt`] = serverTimestamp();
    } catch {
      // Fallback: leave as-is if serverTimestamp is unavailable in this context
      deltaPaths[`${basePath}/updatedAt`] = Date.now();
    }

    return deltaPaths;
  }
}

// Export singleton instance
export const dbOptimization = DatabaseOptimizationService.getInstance();
