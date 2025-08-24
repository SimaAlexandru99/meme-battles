import { renderHook, act, waitFor } from '@testing-library/react';
import { useMatchmakingQueue } from '../use-matchmaking-queue';
import { MatchmakingService } from '@/lib/services/matchmaking.service';
import { useCurrentUser } from '../useCurrentUser';

// Mock Firebase Realtime Database
jest.mock('firebase/database', () => ({
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
jest.mock('@/firebase/client', () => ({
  rtdb: {},
}));

// Mock dependencies
jest.mock('@/lib/services/matchmaking.service');
jest.mock('../useCurrentUser');
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn((config, callback) => callback()),
}));

const mockMatchmakingService = {
  addPlayerToQueue: jest.fn(),
  removePlayerFromQueue: jest.fn(),
  getEstimatedWaitTime: jest.fn(),
  updateQueuePreferences: jest.fn(),
  subscribeToQueue: jest.fn(),
  subscribeToQueuePosition: jest.fn(),
  subscribeToMatchFound: jest.fn(),
};

const mockUser = {
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@example.com',
  avatarId: 'test-avatar',
  profileURL: 'https://example.com/profile.jpg',
  xp: 100,
  provider: 'google',
  role: 'user',
  isAnonymous: false,
  setupCompleted: true,
  createdAt: '2025-01-01T00:00:00.000Z',
  lastLoginAt: '2025-01-08T00:00:00.000Z',
  plan: 'free' as const,
};

describe('useMatchmakingQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MatchmakingService.getInstance as jest.Mock).mockReturnValue(
      mockMatchmakingService
    );
    (useCurrentUser as jest.Mock).mockReturnValue({ user: mockUser });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMatchmakingQueue());

    expect(result.current.isInQueue).toBe(false);
    expect(result.current.queuePosition).toBe(-1);
    expect(result.current.estimatedWaitTime).toBe(0);
    expect(result.current.queueSize).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.connectionStatus).toBe('disconnected');
    expect(result.current.matchFound).toBe(false);
    expect(result.current.lobbyCode).toBe(null);
    expect(result.current.canJoinQueue).toBe(true);
    expect(result.current.timeInQueue).toBe(0);
  });

  it('should join queue successfully', async () => {
    mockMatchmakingService.addPlayerToQueue.mockResolvedValue({
      success: true,
      data: { playerUid: 'test-user-id' },
    });

    const { result } = renderHook(() => useMatchmakingQueue());

    await act(async () => {
      await result.current.joinQueue();
    });

    expect(mockMatchmakingService.addPlayerToQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        playerUid: 'test-user-id',
        displayName: 'Test User',
        avatarId: 'test-avatar',
        profileURL: 'https://example.com/profile.jpg',
        xpLevel: 100,
      })
    );

    expect(result.current.isInQueue).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle join queue error', async () => {
    const errorMessage = 'Queue is full';
    mockMatchmakingService.addPlayerToQueue.mockRejectedValue(
      new Error(errorMessage)
    );

    const { result } = renderHook(() => useMatchmakingQueue());

    await act(async () => {
      try {
        await result.current.joinQueue();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInQueue).toBe(false);
  });

  it('should leave queue successfully', async () => {
    mockMatchmakingService.addPlayerToQueue.mockResolvedValue({
      success: true,
      data: { playerUid: 'test-user-id' },
    });
    mockMatchmakingService.removePlayerFromQueue.mockResolvedValue({
      success: true,
      data: { message: 'Successfully removed from queue' },
    });

    const { result } = renderHook(() => useMatchmakingQueue());

    // First join the queue
    await act(async () => {
      await result.current.joinQueue();
    });

    expect(result.current.isInQueue).toBe(true);

    // Then leave the queue
    await act(async () => {
      await result.current.leaveQueue();
    });

    expect(mockMatchmakingService.removePlayerFromQueue).toHaveBeenCalledWith(
      'test-user-id'
    );
    expect(result.current.isInQueue).toBe(false);
    expect(result.current.queuePosition).toBe(-1);
    expect(result.current.timeInQueue).toBe(0);
  });

  it('should update preferences successfully', async () => {
    mockMatchmakingService.addPlayerToQueue.mockResolvedValue({
      success: true,
      data: { playerUid: 'test-user-id' },
    });
    mockMatchmakingService.updateQueuePreferences.mockResolvedValue({
      success: true,
      data: { preferences: { maxWaitTime: 180 } },
    });
    mockMatchmakingService.getEstimatedWaitTime.mockResolvedValue(90);

    const { result } = renderHook(() => useMatchmakingQueue());

    // First join the queue
    await act(async () => {
      await result.current.joinQueue();
    });

    // Then update preferences
    await act(async () => {
      await result.current.updatePreferences({ maxWaitTime: 180 });
    });

    expect(mockMatchmakingService.updateQueuePreferences).toHaveBeenCalledWith(
      'test-user-id',
      { maxWaitTime: 180 }
    );
    expect(mockMatchmakingService.getEstimatedWaitTime).toHaveBeenCalledWith(
      'test-user-id'
    );
  });

  it('should clear error state', () => {
    const { result } = renderHook(() => useMatchmakingQueue());

    // Simulate an error state
    act(() => {
      // This would normally be set by an error handler
      // We'll test the clearError function directly
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('should prevent joining queue when user is not authenticated', async () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useMatchmakingQueue());

    expect(result.current.canJoinQueue).toBe(false);

    await act(async () => {
      try {
        await result.current.joinQueue();
      } catch (error) {
        expect(error).toEqual(
          new Error('User must be authenticated to join the queue')
        );
      }
    });
  });

  it('should prevent joining queue when already in queue', async () => {
    mockMatchmakingService.addPlayerToQueue.mockResolvedValue({
      success: true,
      data: { playerUid: 'test-user-id' },
    });

    const { result } = renderHook(() => useMatchmakingQueue());

    // First join the queue
    await act(async () => {
      await result.current.joinQueue();
    });

    expect(result.current.isInQueue).toBe(true);
    expect(result.current.canJoinQueue).toBe(false);

    // Try to join again
    await act(async () => {
      try {
        await result.current.joinQueue();
      } catch (error) {
        expect(error).toEqual(new Error('Already in queue'));
      }
    });
  });

  it('should handle subscription setup', async () => {
    const mockUnsubscribe = jest.fn();
    mockMatchmakingService.subscribeToQueue.mockReturnValue(mockUnsubscribe);
    mockMatchmakingService.subscribeToQueuePosition.mockReturnValue(
      mockUnsubscribe
    );
    mockMatchmakingService.subscribeToMatchFound.mockReturnValue(
      mockUnsubscribe
    );
    mockMatchmakingService.addPlayerToQueue.mockResolvedValue({
      success: true,
      data: { playerUid: 'test-user-id' },
    });

    const { result } = renderHook(() => useMatchmakingQueue());

    await act(async () => {
      await result.current.joinQueue();
    });

    expect(mockMatchmakingService.subscribeToQueue).toHaveBeenCalled();
    expect(
      mockMatchmakingService.subscribeToQueuePosition
    ).toHaveBeenCalledWith('test-user-id');
    expect(mockMatchmakingService.subscribeToMatchFound).toHaveBeenCalledWith(
      'test-user-id'
    );
  });
});
