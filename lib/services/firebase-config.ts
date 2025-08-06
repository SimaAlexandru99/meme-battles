/**
 * Firebase Configuration for Optimization
 *
 * This file contains configuration for Firebase Realtime Database
 * optimization including offline persistence and connection settings.
 */

import { goOffline, goOnline } from "firebase/database";
import { rtdb } from "@/firebase/client";

export interface FirebaseOptimizationConfig {
  offlinePersistence: boolean;
  cacheSizeBytes: number;
  connectionTimeout: number;
  keepSyncedPaths: string[];
}

/**
 * Default optimization configuration
 */
export const DEFAULT_OPTIMIZATION_CONFIG: FirebaseOptimizationConfig = {
  offlinePersistence: true,
  cacheSizeBytes: 40 * 1024 * 1024, // 40MB cache
  connectionTimeout: 30000, // 30 seconds
  keepSyncedPaths: [
    "lobbies", // Keep lobby data synced for quick access
    "playerSessions", // Keep player session data synced
  ],
};

/**
 * Firebase optimization service for connection and caching management
 */
export class FirebaseOptimizationService {
  private static instance: FirebaseOptimizationService;
  private isOnline = true;
  private connectionListeners: Array<(online: boolean) => void> = [];
  private keepSyncedRefs: Array<unknown> = [];

  private constructor() {
    this.setupConnectionMonitoring();
    this.setupOfflinePersistence();
  }

  static getInstance(): FirebaseOptimizationService {
    if (!FirebaseOptimizationService.instance) {
      FirebaseOptimizationService.instance = new FirebaseOptimizationService();
    }
    return FirebaseOptimizationService.instance;
  }

  /**
   * Setup connection monitoring
   */
  private setupConnectionMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener("online", () => {
      this.handleConnectionChange(true);
    });

    window.addEventListener("offline", () => {
      this.handleConnectionChange(false);
    });

    // Initial connection state
    this.isOnline = navigator.onLine;
  }

  /**
   * Setup offline persistence configuration
   */
  private setupOfflinePersistence(): void {
    try {
      // Note: In a real implementation, this would be configured during Firebase initialization
      // For now, we'll document the configuration that should be applied
      console.log("Firebase offline persistence configuration:");
      console.log("- Enable offline persistence in Firebase initialization");
      console.log(
        "- Set cache size to",
        DEFAULT_OPTIMIZATION_CONFIG.cacheSizeBytes,
        "bytes"
      );
      console.log(
        "- Keep synced paths:",
        DEFAULT_OPTIMIZATION_CONFIG.keepSyncedPaths
      );

      // Setup keep synced for critical paths
      this.setupKeepSynced();
    } catch (error) {
      console.warn("Failed to setup offline persistence:", error);
    }
  }

  /**
   * Setup keep synced for critical data paths
   */
  private setupKeepSynced(): void {
    try {
      // Note: In a real implementation, you would call keepSynced(true) on critical refs
      // This ensures data is kept in local cache even when not actively listening

      DEFAULT_OPTIMIZATION_CONFIG.keepSyncedPaths.forEach((path) => {
        console.log(`Should enable keepSynced for path: ${path}`);
        // const ref = ref(rtdb, path);
        // ref.keepSynced(true);
        // this.keepSyncedRefs.push(ref);
      });
    } catch (error) {
      console.warn("Failed to setup keep synced:", error);
    }
  }

  /**
   * Handle connection state changes
   */
  private handleConnectionChange(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online;

      if (online) {
        this.handleGoOnline();
      } else {
        this.handleGoOffline();
      }

      // Notify listeners
      this.connectionListeners.forEach((listener) => {
        try {
          listener(online);
        } catch (error) {
          console.error("Connection listener error:", error);
        }
      });
    }
  }

  /**
   * Handle going online
   */
  private handleGoOnline(): void {
    try {
      goOnline(rtdb);
      console.log("Firebase Realtime Database: Going online");
    } catch (error) {
      console.error("Failed to go online:", error);
    }
  }

  /**
   * Handle going offline
   */
  private handleGoOffline(): void {
    try {
      // Note: We typically don't want to force offline mode
      // Firebase handles offline scenarios automatically
      console.log("Network offline detected - Firebase will handle gracefully");
    } catch (error) {
      console.error("Failed to handle offline state:", error);
    }
  }

  /**
   * Add connection state listener
   */
  addConnectionListener(listener: (online: boolean) => void): () => void {
    this.connectionListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current connection state
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Force offline mode (for testing)
   */
  forceOffline(): void {
    try {
      goOffline(rtdb);
      this.isOnline = false;
      console.log("Forced Firebase offline mode");
    } catch (error) {
      console.error("Failed to force offline:", error);
    }
  }

  /**
   * Force online mode
   */
  forceOnline(): void {
    try {
      goOnline(rtdb);
      this.isOnline = true;
      console.log("Forced Firebase online mode");
    } catch (error) {
      console.error("Failed to force online:", error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear connection listeners
    this.connectionListeners = [];

    // Disable keep synced for all refs
    this.keepSyncedRefs.forEach(() => {
      try {
        // ref.keepSynced(false);
        console.log("Should disable keepSynced for ref");
      } catch (error) {
        console.warn("Failed to disable keepSynced:", error);
      }
    });
    this.keepSyncedRefs = [];

    console.log("Firebase optimization service cleaned up");
  }
}

/**
 * Connection monitoring hook for React components
 */
export function useFirebaseConnection() {
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const service = FirebaseOptimizationService.getInstance();
    setIsOnline(service.isConnected());

    const unsubscribe = service.addConnectionListener(setIsOnline);

    return unsubscribe;
  }, []);

  return {
    isOnline,
    forceOffline: () =>
      FirebaseOptimizationService.getInstance().forceOffline(),
    forceOnline: () => FirebaseOptimizationService.getInstance().forceOnline(),
  };
}

// Export singleton instance
export const firebaseOptimization = FirebaseOptimizationService.getInstance();

// Import React for the hook
import React from "react";
