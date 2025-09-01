/**
 * Firebase Connection Manager
 * Centralized management of Firebase Realtime Database connections
 * Prevents memory leaks and manages listener lifecycle
 */

import * as Sentry from "@sentry/nextjs";
import {
  type DataSnapshot,
  onValue,
  ref,
  type Unsubscribe,
} from "firebase/database";
import { rtdb } from "@/firebase/client";

interface ListenerConfig {
  path: string;
  callback: (snapshot: DataSnapshot) => void;
  errorCallback?: (error: Error) => void;
  options?: {
    once?: boolean;
    timeout?: number;
    retryCount?: number;
  };
}

interface ActiveListener {
  id: string;
  path: string;
  unsubscribe: Unsubscribe;
  createdAt: number;
  lastActivity: number;
  config: ListenerConfig;
  retryCount: number;
}

export class FirebaseConnectionManager {
  private static instance: FirebaseConnectionManager;
  private activeListeners = new Map<string, ActiveListener>();
  private connectionStatus: "connected" | "connecting" | "disconnected" =
    "disconnected";
  private cleanupInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds
  private readonly MAX_LISTENER_AGE = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second

  private constructor() {
    this.startCleanupProcess();
    this.startHeartbeat();
    this.setupUnloadHandler();
  }

  static getInstance(): FirebaseConnectionManager {
    if (!FirebaseConnectionManager.instance) {
      FirebaseConnectionManager.instance = new FirebaseConnectionManager();
    }
    return FirebaseConnectionManager.instance;
  }

  /**
   * Subscribe to a Firebase path with automatic cleanup and retry logic
   */
  subscribe(
    listenerId: string,
    config: ListenerConfig,
  ): { unsubscribe: () => void; retry: () => void } {
    // Remove existing listener if it exists
    this.unsubscribe(listenerId);

    const wrappedCallback = this.createWrappedCallback(listenerId, config);
    const wrappedErrorCallback = this.createWrappedErrorCallback(
      listenerId,
      config,
    );

    try {
      const dbRef = ref(rtdb, config.path);
      const unsubscribe = onValue(dbRef, wrappedCallback, wrappedErrorCallback);

      const listener: ActiveListener = {
        id: listenerId,
        path: config.path,
        unsubscribe,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        config,
        retryCount: 0,
      };

      this.activeListeners.set(listenerId, listener);
      this.connectionStatus = "connected";

      Sentry.addBreadcrumb({
        message: "Firebase listener created",
        data: {
          listenerId,
          path: config.path,
          totalListeners: this.activeListeners.size,
        },
        level: "info",
      });

      return {
        unsubscribe: () => this.unsubscribe(listenerId),
        retry: () => this.retryListener(listenerId),
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: "firebase_subscribe" },
        extra: { listenerId, path: config.path },
      });

      throw new Error(`Failed to subscribe to ${config.path}: ${error}`);
    }
  }

  /**
   * Unsubscribe from a Firebase listener
   */
  unsubscribe(listenerId: string): boolean {
    const listener = this.activeListeners.get(listenerId);
    if (!listener) {
      return false;
    }

    try {
      listener.unsubscribe();
      this.activeListeners.delete(listenerId);

      Sentry.addBreadcrumb({
        message: "Firebase listener removed",
        data: {
          listenerId,
          path: listener.path,
          duration: Date.now() - listener.createdAt,
          totalListeners: this.activeListeners.size,
        },
        level: "info",
      });

      return true;
    } catch (error) {
      console.error(`Failed to unsubscribe listener ${listenerId}:`, error);
      Sentry.captureException(error, {
        tags: { operation: "firebase_unsubscribe" },
        extra: { listenerId, path: listener.path },
      });
      return false;
    }
  }

  /**
   * Unsubscribe from all listeners for a specific path pattern
   */
  unsubscribeByPattern(pathPattern: string | RegExp): number {
    const pattern =
      typeof pathPattern === "string"
        ? new RegExp(pathPattern.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&"))
        : pathPattern;

    const listenersToRemove: string[] = [];

    for (const [id, listener] of this.activeListeners) {
      if (pattern.test(listener.path)) {
        listenersToRemove.push(id);
      }
    }

    let removedCount = 0;
    for (const id of listenersToRemove) {
      if (this.unsubscribe(id)) {
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get connection status and statistics
   */
  getConnectionInfo(): {
    status: string;
    activeListeners: number;
    oldestListener: number | null;
    memoryUsage: string;
  } {
    let oldestTimestamp: number | null = null;

    for (const listener of this.activeListeners.values()) {
      if (oldestTimestamp === null || listener.createdAt < oldestTimestamp) {
        oldestTimestamp = listener.createdAt;
      }
    }

    return {
      status: this.connectionStatus,
      activeListeners: this.activeListeners.size,
      oldestListener: oldestTimestamp,
      memoryUsage: `${Math.round(process.memoryUsage?.().heapUsed / 1024 / 1024 || 0)}MB`,
    };
  }

  /**
   * Force cleanup of all listeners
   */
  cleanup(): void {
    const listenerIds = Array.from(this.activeListeners.keys());
    let cleanedCount = 0;

    for (const id of listenerIds) {
      if (this.unsubscribe(id)) {
        cleanedCount++;
      }
    }

    console.log(
      `Firebase cleanup completed: ${cleanedCount} listeners removed`,
    );

    Sentry.addBreadcrumb({
      message: "Firebase connection manager cleanup",
      data: { cleanedCount },
      level: "info",
    });
  }

  /**
   * Create wrapped callback with error handling and activity tracking
   */
  private createWrappedCallback(listenerId: string, config: ListenerConfig) {
    return (snapshot: DataSnapshot) => {
      try {
        const listener = this.activeListeners.get(listenerId);
        if (listener) {
          listener.lastActivity = Date.now();
          listener.retryCount = 0; // Reset retry count on successful callback
        }

        config.callback(snapshot);
      } catch (error) {
        console.error(`Error in Firebase callback for ${listenerId}:`, error);
        Sentry.captureException(error, {
          tags: { operation: "firebase_callback_error" },
          extra: { listenerId, path: config.path },
        });

        // Optionally retry on callback errors
        this.handleCallbackError(listenerId, error as Error);
      }
    };
  }

  /**
   * Create wrapped error callback with retry logic
   */
  private createWrappedErrorCallback(
    listenerId: string,
    config: ListenerConfig,
  ) {
    return (error: Error) => {
      console.error(`Firebase listener error for ${listenerId}:`, error);

      Sentry.captureException(error, {
        tags: { operation: "firebase_listener_error" },
        extra: { listenerId, path: config.path },
      });

      if (config.errorCallback) {
        try {
          config.errorCallback(error);
        } catch (callbackError) {
          console.error(
            "Error in user-provided error callback:",
            callbackError,
          );
        }
      }

      // Attempt automatic retry
      this.handleListenerError(listenerId, error);
    };
  }

  /**
   * Handle callback errors with potential retry
   */
  private handleCallbackError(listenerId: string, _error: Error): void {
    const listener = this.activeListeners.get(listenerId);
    if (!listener) return;

    if (listener.retryCount < this.MAX_RETRY_ATTEMPTS) {
      console.log(
        `Retrying listener ${listenerId} due to callback error (attempt ${listener.retryCount + 1})`,
      );
      this.retryListener(listenerId);
    } else {
      console.error(
        `Max retry attempts reached for listener ${listenerId}, removing`,
      );
      this.unsubscribe(listenerId);
    }
  }

  /**
   * Handle listener connection errors with retry logic
   */
  private handleListenerError(listenerId: string, _error: Error): void {
    const listener = this.activeListeners.get(listenerId);
    if (!listener) return;

    // Don't retry if we've exceeded max attempts
    if (listener.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      console.error(
        `Max retry attempts reached for listener ${listenerId}, giving up`,
      );
      this.unsubscribe(listenerId);
      return;
    }

    // Schedule retry with exponential backoff
    const retryDelay = this.RETRY_DELAY_BASE * 2 ** listener.retryCount;

    setTimeout(() => {
      this.retryListener(listenerId);
    }, retryDelay);
  }

  /**
   * Retry a failed listener (public method for manual retries)
   */
  retryListener(listenerId: string): void {
    const listener = this.activeListeners.get(listenerId);
    if (!listener) return;

    console.log(
      `Retrying Firebase listener ${listenerId} (attempt ${listener.retryCount + 1})`,
    );

    // Increment retry count
    listener.retryCount++;

    // Remove old listener
    try {
      listener.unsubscribe();
    } catch (error) {
      console.warn("Failed to unsubscribe old listener during retry:", error);
    }

    // Create new listener
    try {
      const dbRef = ref(rtdb, listener.config.path);
      const wrappedCallback = this.createWrappedCallback(
        listenerId,
        listener.config,
      );
      const wrappedErrorCallback = this.createWrappedErrorCallback(
        listenerId,
        listener.config,
      );

      const newUnsubscribe = onValue(
        dbRef,
        wrappedCallback,
        wrappedErrorCallback,
      );

      // Update listener with new unsubscribe function
      listener.unsubscribe = newUnsubscribe;
      listener.lastActivity = Date.now();

      console.log(`Successfully retried listener ${listenerId}`);
    } catch (error) {
      console.error(`Failed to retry listener ${listenerId}:`, error);
      this.handleListenerError(listenerId, error as Error);
    }
  }

  /**
   * Start periodic cleanup of stale listeners
   */
  private startCleanupProcess(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Start heartbeat to monitor connection health
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Perform cleanup of stale or old listeners
   */
  private performCleanup(): void {
    const now = Date.now();
    const listenersToRemove: string[] = [];

    for (const [id, listener] of this.activeListeners) {
      const age = now - listener.createdAt;
      const inactiveTime = now - listener.lastActivity;

      // Remove very old listeners or inactive ones
      if (age > this.MAX_LISTENER_AGE || inactiveTime > this.MAX_LISTENER_AGE) {
        listenersToRemove.push(id);
      }
    }

    if (listenersToRemove.length > 0) {
      console.log(
        `Cleaning up ${listenersToRemove.length} stale Firebase listeners`,
      );

      for (const id of listenersToRemove) {
        this.unsubscribe(id);
      }

      Sentry.addBreadcrumb({
        message: "Firebase listeners cleanup",
        data: { cleanedCount: listenersToRemove.length },
        level: "info",
      });
    }
  }

  /**
   * Perform health check on active connections
   */
  private performHeartbeat(): void {
    const activeCount = this.activeListeners.size;

    if (activeCount > 50) {
      console.warn(`High number of active Firebase listeners: ${activeCount}`);
      Sentry.captureMessage("High Firebase listener count", {
        level: "warning",
        extra: { activeCount },
      });
    }

    // Update connection status based on listener activity
    let hasRecentActivity = false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    for (const listener of this.activeListeners.values()) {
      if (listener.lastActivity > fiveMinutesAgo) {
        hasRecentActivity = true;
        break;
      }
    }

    this.connectionStatus = hasRecentActivity ? "connected" : "disconnected";
  }

  /**
   * Setup cleanup on page unload
   */
  private setupUnloadHandler(): void {
    if (typeof window !== "undefined") {
      const cleanup = () => {
        this.cleanup();

        if (this.cleanupInterval) {
          clearInterval(this.cleanupInterval);
        }

        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
        }
      };

      window.addEventListener("beforeunload", cleanup);
      window.addEventListener("unload", cleanup);

      // Also cleanup on visibility change (when tab is hidden for a long time)
      let hiddenTime: number | null = null;

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          hiddenTime = Date.now();
        } else if (hiddenTime && Date.now() - hiddenTime > 10 * 60 * 1000) {
          // Page was hidden for more than 10 minutes, cleanup stale listeners
          console.log(
            "Page was hidden for extended time, cleaning up Firebase listeners",
          );
          this.performCleanup();
          hiddenTime = null;
        }
      });
    }
  }
}

// Export singleton instance
export const firebaseConnectionManager =
  FirebaseConnectionManager.getInstance();

// Helper functions for React components (React import handled by consuming components)
export function createFirebaseListener(
  listenerId: string,
  path: string,
  callback: (snapshot: DataSnapshot) => void,
  errorCallback?: (error: Error) => void,
): { unsubscribe: () => void; retry: () => void } {
  const manager = FirebaseConnectionManager.getInstance();
  return manager.subscribe(listenerId, {
    path,
    callback,
    errorCallback,
  });
}

export function removeFirebaseListener(listenerId: string): boolean {
  const manager = FirebaseConnectionManager.getInstance();
  return manager.unsubscribe(listenerId);
}
