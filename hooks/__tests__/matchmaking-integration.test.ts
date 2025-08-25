import { act, renderHook } from "@testing-library/react";
import { useBattleRoyaleStats } from "../use-battle-royale-stats";
import { useMatchmakingQueue } from "../use-matchmaking-queue";
import { useMatchmakingSubscriptions } from "../use-matchmaking-subscriptions";

// Mock Firebase Realtime Database
jest.mock("firebase/database", () => ({
  getDatabase: jest.fn(),
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
  query: jest.fn(),
  orderByChild: jest.fn(),
  serverTimestamp: jest.fn(),
}));

// Mock Firebase client
jest.mock("@/firebase/client", () => ({
  rtdb: {},
}));

// Mock dependencies
jest.mock("@/lib/services/matchmaking.service", () => ({
  MatchmakingService: {
    getInstance: jest.fn(() => ({
      addPlayerToQueue: jest.fn(),
      removePlayerFromQueue: jest.fn(),
      getEstimatedWaitTime: jest.fn(),
      updateQueuePreferences: jest.fn(),
      subscribeToQueue: jest.fn(),
      subscribeToQueuePosition: jest.fn(),
      subscribeToMatchFound: jest.fn(),
      getPlayerStats: jest.fn(),
      getPlayerRankingTier: jest.fn(),
      calculatePlayerPercentile: jest.fn(),
    })),
  },
}));

jest.mock("../useCurrentUser", () => ({
  useCurrentUser: jest.fn(() => ({
    user: {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      avatarId: "test-avatar",
      profileURL: "https://example.com/profile.jpg",
      xp: 100,
      provider: "google",
      role: "user",
      isAnonymous: false,
      setupCompleted: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      lastLoginAt: "2025-01-08T00:00:00.000Z",
      plan: "free" as const,
    },
  })),
}));

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn((config, callback) => callback()),
}));

describe("Matchmaking Hooks Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });
  });

  it("should initialize all hooks without errors", () => {
    const { result: queueResult } = renderHook(() => useMatchmakingQueue());
    const { result: statsResult } = renderHook(() => useBattleRoyaleStats());
    const { result: subscriptionsResult } = renderHook(() =>
      useMatchmakingSubscriptions(),
    );

    // Verify queue hook initialization
    expect(queueResult.current.isInQueue).toBe(false);
    expect(queueResult.current.canJoinQueue).toBe(true);
    expect(typeof queueResult.current.joinQueue).toBe("function");
    expect(typeof queueResult.current.leaveQueue).toBe("function");

    // Verify stats hook initialization
    expect(statsResult.current.stats).toBe(null);
    expect(statsResult.current.rank).toBe("Unranked");
    expect(typeof statsResult.current.refreshStats).toBe("function");

    // Verify subscriptions hook initialization (may be reconnecting due to auto-retry)
    expect(["disconnected", "reconnecting"]).toContain(
      subscriptionsResult.current.connectionStatus,
    );
    expect(subscriptionsResult.current.isOnline).toBe(true);
    expect(typeof subscriptionsResult.current.subscribeToQueue).toBe(
      "function",
    );
  });

  it("should handle hook interactions correctly", () => {
    const { result: queueResult } = renderHook(() => useMatchmakingQueue());
    const { result: subscriptionsResult } = renderHook(() =>
      useMatchmakingSubscriptions(),
    );

    // Test that hooks can be used together
    act(() => {
      subscriptionsResult.current.subscribeToQueue();
    });

    expect(queueResult.current.clearError).toBeDefined();
    expect(subscriptionsResult.current.unsubscribeAll).toBeDefined();
  });

  it("should provide consistent error handling across hooks", () => {
    const { result: queueResult } = renderHook(() => useMatchmakingQueue());
    const { result: statsResult } = renderHook(() => useBattleRoyaleStats());

    // All hooks should have error state and clearError functionality
    expect(queueResult.current.error).toBe(null);
    expect(statsResult.current.error).toBe(null);

    expect(typeof queueResult.current.clearError).toBe("function");
    // Stats hook doesn't have clearError, but has error state
    expect(statsResult.current.error).toBeDefined();
  });

  it("should handle cleanup properly", () => {
    const { unmount: unmountQueue } = renderHook(() => useMatchmakingQueue());
    const { unmount: unmountStats } = renderHook(() => useBattleRoyaleStats());
    const { unmount: unmountSubscriptions } = renderHook(() =>
      useMatchmakingSubscriptions(),
    );

    // Should not throw errors on unmount
    expect(() => {
      unmountQueue();
      unmountStats();
      unmountSubscriptions();
    }).not.toThrow();
  });
});
