/**
 * Lobby Monitoring and Logging Service
 *
 * This service provides monitoring, logging, and analytics for lobby
 * lifecycle events and system performance.
 */

import {
  ref,
  push,
  get,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";
import { rtdb } from "@/firebase/client";

export interface MonitoringEvent {
  id?: string;
  type:
    | "lobby_created"
    | "lobby_joined"
    | "lobby_left"
    | "lobby_started"
    | "lobby_ended"
    | "error"
    | "performance";
  lobbyCode?: string;
  userId?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  severity: "info" | "warning" | "error" | "critical";
}

export interface PerformanceMetrics {
  lobbyCreationTime: number;
  joinTime: number;
  settingsUpdateTime: number;
  gameStartTime: number;
  connectionLatency: number;
  dataTransferSize: number;
}

export interface SystemHealth {
  activeLobbies: number;
  activePlayers: number;
  averageLatency: number;
  errorRate: number;
  lastUpdated: number;
}

/**
 * Lobby monitoring and logging service
 */
export class LobbyMonitoringService {
  private static instance: LobbyMonitoringService;
  private eventBuffer: MonitoringEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private isEnabled = true;

  private constructor() {
    this.setupPerformanceMonitoring();
    this.startEventBufferFlush();
  }

  static getInstance(): LobbyMonitoringService {
    if (!LobbyMonitoringService.instance) {
      LobbyMonitoringService.instance = new LobbyMonitoringService();
    }
    return LobbyMonitoringService.instance;
  }

  /**
   * Setup performance monitoring using Performance Observer API
   */
  private setupPerformanceMonitoring(): void {
    if (typeof window === "undefined" || !window.PerformanceObserver) {
      console.warn("Performance Observer not available");
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        entries.forEach((entry) => {
          if (entry.name.includes("lobby") || entry.name.includes("firebase")) {
            this.logEvent({
              type: "performance",
              timestamp: Date.now(),
              metadata: {
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime,
                entryType: entry.entryType,
              },
              severity: entry.duration > 1000 ? "warning" : "info",
            });
          }
        });
      });

      this.performanceObserver.observe({
        entryTypes: ["measure", "navigation", "resource"],
      });
    } catch (error) {
      console.warn("Failed to setup performance monitoring:", error);
    }
  }

  /**
   * Start periodic flush of event buffer
   */
  private startEventBufferFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushEventBuffer();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Log a monitoring event
   */
  logEvent(
    event: Omit<MonitoringEvent, "id" | "timestamp"> & { timestamp?: number }
  ): void {
    if (!this.isEnabled) {
      return;
    }

    const fullEvent: MonitoringEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
    };

    // Add to buffer
    this.eventBuffer.push(fullEvent);

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      const logLevel =
        fullEvent.severity === "error" || fullEvent.severity === "critical"
          ? "error"
          : "log";
      console[logLevel]("Lobby monitoring event:", fullEvent);
    }

    // Immediate flush for critical events
    if (fullEvent.severity === "critical") {
      this.flushEventBuffer();
    }

    // Prevent buffer overflow
    if (this.eventBuffer.length > 100) {
      this.eventBuffer = this.eventBuffer.slice(-50); // Keep last 50 events
    }
  }

  /**
   * Flush event buffer to Firebase
   */
  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Batch write events to Firebase
      const promises = eventsToFlush.map((event) =>
        push(ref(rtdb, "monitoring/events"), event)
      );

      await Promise.all(promises);

      if (process.env.NODE_ENV === "development") {
        console.log(`Flushed ${eventsToFlush.length} monitoring events`);
      }
    } catch (error) {
      console.error("Failed to flush monitoring events:", error);

      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Log lobby creation event
   */
  logLobbyCreated(
    lobbyCode: string,
    userId: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent({
      type: "lobby_created",
      lobbyCode,
      userId,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
      severity: "info",
    });
  }

  /**
   * Log lobby join event
   */
  logLobbyJoined(
    lobbyCode: string,
    userId: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent({
      type: "lobby_joined",
      lobbyCode,
      userId,
      metadata: {
        ...metadata,
        joinMethod: metadata.joinMethod || "code",
      },
      severity: "info",
    });
  }

  /**
   * Log lobby leave event
   */
  logLobbyLeft(
    lobbyCode: string,
    userId: string,
    reason: string = "user_action"
  ): void {
    this.logEvent({
      type: "lobby_left",
      lobbyCode,
      userId,
      metadata: {
        reason,
        timestamp: Date.now(),
      },
      severity: "info",
    });
  }

  /**
   * Log error event
   */
  logError(error: Error, context: Record<string, unknown> = {}): void {
    this.logEvent({
      type: "error",
      metadata: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...context,
      },
      severity: "error",
    });
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(
    metrics: Partial<PerformanceMetrics>,
    context: Record<string, unknown> = {}
  ): void {
    this.logEvent({
      type: "performance",
      metadata: {
        ...metrics,
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
      severity: "info",
    });
  }

  /**
   * Measure and log operation performance
   */
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context: Record<string, unknown> = {}
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      this.logPerformanceMetrics(
        { [operationName]: duration },
        { ...context, success: true }
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.logError(error as Error, {
        operation: operationName,
        duration,
        ...context,
      });

      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealth | null> {
    try {
      const [lobbiesSnapshot, sessionsSnapshot] = await Promise.all([
        get(ref(rtdb, "lobbies")),
        get(ref(rtdb, "playerSessions")),
      ]);

      const activeLobbies = lobbiesSnapshot.exists()
        ? Object.keys(lobbiesSnapshot.val()).length
        : 0;

      const activePlayers = sessionsSnapshot.exists()
        ? Object.values(sessionsSnapshot.val()).filter(
            (session: unknown) =>
              (session as Record<string, unknown>).connectionStatus === "online"
          ).length
        : 0;

      // Get recent performance metrics
      const metricsSnapshot = await get(
        query(
          ref(rtdb, "monitoring/events"),
          orderByChild("type"),
          limitToLast(100)
        )
      );

      let averageLatency = 0;
      let errorRate = 0;

      if (metricsSnapshot.exists()) {
        const events = Object.values(
          metricsSnapshot.val()
        ) as MonitoringEvent[];
        const performanceEvents = events.filter(
          (e) => e.type === "performance"
        );
        const errorEvents = events.filter(
          (e) => e.severity === "error" || e.severity === "critical"
        );

        if (performanceEvents.length > 0) {
          const latencies = performanceEvents
            .map((e) => e.metadata.connectionLatency)
            .filter((l) => typeof l === "number");

          if (latencies.length > 0) {
            averageLatency =
              latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
          }
        }

        errorRate =
          events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;
      }

      return {
        activeLobbies,
        activePlayers,
        averageLatency,
        errorRate,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error("Failed to get system health:", error);
      return null;
    }
  }

  /**
   * Get recent monitoring events
   */
  async getRecentEvents(limit: number = 50): Promise<MonitoringEvent[]> {
    try {
      const snapshot = await get(
        query(
          ref(rtdb, "monitoring/events"),
          orderByChild("timestamp"),
          limitToLast(limit)
        )
      );

      if (!snapshot.exists()) {
        return [];
      }

      return Object.entries(snapshot.val()).map(([id, event]) => ({
        id,
        ...(event as MonitoringEvent),
      }));
    } catch (error) {
      console.error("Failed to get recent events:", error);
      return [];
    }
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`Lobby monitoring ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Cleanup monitoring service
   */
  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    // Flush remaining events
    this.flushEventBuffer();

    console.log("Lobby monitoring service cleaned up");
  }
}

/**
 * React hook for monitoring system health
 */
export function useSystemHealth() {
  const [health, setHealth] = React.useState<SystemHealth | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const service = LobbyMonitoringService.getInstance();

    const updateHealth = async () => {
      try {
        const healthData = await service.getSystemHealth();
        setHealth(healthData);
      } catch (error) {
        console.error("Failed to update system health:", error);
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    updateHealth();

    // Update every 30 seconds
    const interval = setInterval(updateHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return { health, loading };
}

/**
 * React hook for monitoring events
 */
export function useMonitoringEvents(limit: number = 20) {
  const [events, setEvents] = React.useState<MonitoringEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const service = LobbyMonitoringService.getInstance();

    const loadEvents = async () => {
      try {
        const recentEvents = await service.getRecentEvents(limit);
        setEvents(recentEvents);
      } catch (error) {
        console.error("Failed to load monitoring events:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();

    // Refresh every minute
    const interval = setInterval(loadEvents, 60000);

    return () => clearInterval(interval);
  }, [limit]);

  return { events, loading };
}

// Export singleton instance
export const lobbyMonitoring = LobbyMonitoringService.getInstance();

// Import React for hooks
import React from "react";
