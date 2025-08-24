import { renderHook, act, waitFor } from '@testing-library/react';
import { useBattleRoyaleStats } from '../use-battle-royale-stats';
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
}));

const mockMatchmakingService = {
  getPlayerStats: jest.fn(),
  getPlayerRankingTier: jest.fn(),
  calculatePlayerPercentile: jest.fn(),
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

const mockStats: BattleRoyaleStats = {
  gamesPlayed: 25,
  wins: 8,
  losses: 17,
  winRate: 0.32,
  skillRating: 1150,
  highestRating: 1200,
  currentStreak: 2,
  longestWinStreak: 4,
  averagePosition: 4.2,
  totalXpEarned: 850,
  achievements: ['first_win', 'five_games'],
  lastPlayed: '2025-01-08T10:00:00.000Z',
  seasonStats: {
    '2025_season_1': {
      gamesPlayed: 25,
      wins: 8,
      skillRatingChange: -50,
    },
  },
};

const mockRankingTier = {
  name: 'Silver',
  minRating: 1000,
  maxRating: 1299,
  color: '#C0C0C0',
  icon: 'silver-badge',
  percentile: 35,
};

describe('useBattleRoyaleStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MatchmakingService.getInstance as jest.Mock).mockReturnValue(
      mockMatchmakingService
    );
    (useCurrentUser as jest.Mock).mockReturnValue({ user: mockUser });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useBattleRoyaleStats());

    expect(result.current.stats).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.rank).toBe('Unranked');
    expect(result.current.percentile).toBe(0);
    expect(result.current.nextRankProgress).toBe(0);
    expect(result.current.recentPerformance).toBe('stable');
  });

  it('should fetch and display player stats', async () => {
    mockMatchmakingService.getPlayerStats.mockResolvedValue(mockStats);
    mockMatchmakingService.getPlayerRankingTier.mockResolvedValue(
      mockRankingTier
    );
    mockMatchmakingService.calculatePlayerPercentile.mockResolvedValue(65);

    const { result } = renderHook(() => useBattleRoyaleStats());

    await waitFor(() => {
      expect(result.current.stats).toEqual(mockStats);
    });

    expect(result.current.rank).toBe('Silver');
    expect(result.current.percentile).toBe(65);
    expect(result.current.recentPerformance).toBe('improving'); // Current streak > 0
  });

  it('should handle stats for specific player UID', async () => {
    const targetPlayerUid = 'other-player-id';
    mockMatchmakingService.getPlayerStats.mockResolvedValue(mockStats);
    mockMatchmakingService.getPlayerRankingTier.mockResolvedValue(
      mockRankingTier
    );
    mockMatchmakingService.calculatePlayerPercentile.mockResolvedValue(45);

    const { result } = renderHook(() => useBattleRoyaleStats(targetPlayerUid));

    await waitFor(() => {
      expect(mockMatchmakingService.getPlayerStats).toHaveBeenCalledWith(
        targetPlayerUid
      );
    });

    expect(result.current.stats).toEqual(mockStats);
  });

  it('should handle null stats for new players', async () => {
    mockMatchmakingService.getPlayerStats.mockResolvedValue(null);

    const { result } = renderHook(() => useBattleRoyaleStats());

    await waitFor(() => {
      expect(result.current.stats).toBe(null);
    });

    expect(result.current.rank).toBe('Unranked');
    expect(result.current.percentile).toBe(0);
    expect(result.current.nextRankProgress).toBe(0);
    expect(result.current.recentPerformance).toBe('stable');
  });

  it('should calculate next rank progress correctly', async () => {
    const statsWithProgress = {
      ...mockStats,
      skillRating: 1150, // Silver tier (1000-1299)
    };

    mockMatchmakingService.getPlayerStats.mockResolvedValue(statsWithProgress);
    mockMatchmakingService.getPlayerRankingTier.mockResolvedValue(
      mockRankingTier
    );
    mockMatchmakingService.calculatePlayerPercentile.mockResolvedValue(65);

    const { result } = renderHook(() => useBattleRoyaleStats());

    await waitFor(() => {
      expect(result.current.stats).toEqual(statsWithProgress);
    });

    // Progress calculation: (1150 - 1000) / (1299 - 1000) * 100 = 50.17%
    expect(result.current.nextRankProgress).toBeCloseTo(50.17, 1);
  });

  it('should analyze recent performance trends', async () => {
    // Test declining performance
    const decliningStats = {
      ...mockStats,
      currentStreak: 0,
      winRate: 0.3,
    };

    mockMatchmakingService.getPlayerStats.mockResolvedValue(decliningStats);
    mockMatchmakingService.getPlayerRankingTier.mockResolvedValue(
      mockRankingTier
    );
    mockMatchmakingService.calculatePlayerPercentile.mockResolvedValue(30);

    const { result } = renderHook(() => useBattleRoyaleStats());

    await waitFor(() => {
      expect(result.current.recentPerformance).toBe('declining');
    });
  });

  it('should refresh stats on demand', async () => {
    mockMatchmakingService.getPlayerStats.mockResolvedValue(mockStats);
    mockMatchmakingService.getPlayerRankingTier.mockResolvedValue(
      mockRankingTier
    );
    mockMatchmakingService.calculatePlayerPercentile.mockResolvedValue(65);

    const { result } = renderHook(() => useBattleRoyaleStats());

    await waitFor(() => {
      expect(result.current.stats).toEqual(mockStats);
    });

    // Clear the mock to test refresh
    mockMatchmakingService.getPlayerStats.mockClear();

    await act(async () => {
      await result.current.refreshStats();
    });

    expect(mockMatchmakingService.getPlayerStats).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to fetch stats';
    mockMatchmakingService.getPlayerStats.mockRejectedValue(
      new Error(errorMessage)
    );

    const { result } = renderHook(() => useBattleRoyaleStats());

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.stats).toBe(null);
  });

  it('should use caching mechanism', async () => {
    mockMatchmakingService.getPlayerStats.mockResolvedValue(mockStats);
    mockMatchmakingService.getPlayerRankingTier.mockResolvedValue(
      mockRankingTier
    );
    mockMatchmakingService.calculatePlayerPercentile.mockResolvedValue(65);

    const { result, rerender } = renderHook(() => useBattleRoyaleStats());

    await waitFor(() => {
      expect(result.current.stats).toEqual(mockStats);
    });

    // Clear the mock and rerender to test cache
    mockMatchmakingService.getPlayerStats.mockClear();

    rerender();

    // Should not call the service again due to caching
    expect(mockMatchmakingService.getPlayerStats).not.toHaveBeenCalled();
  });

  it('should handle no user gracefully', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useBattleRoyaleStats());

    expect(result.current.stats).toBe(null);
    expect(result.current.rank).toBe('Unranked');
    expect(mockMatchmakingService.getPlayerStats).not.toHaveBeenCalled();
  });
});
