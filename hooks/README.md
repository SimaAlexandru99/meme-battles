# Battle Royale Matchmaking Hooks

This directory contains custom React hooks for managing Battle Royale matchmaking functionality in the Meme Battles application.

## Overview

The Battle Royale system extends the existing lobby management architecture with automated matchmaking, skill-based player grouping, and competitive statistics tracking. These hooks provide a clean, reusable interface for managing queue state, player statistics, and real-time subscriptions.

## Hooks

### `useMatchmakingQueue`

Complete matchmaking queue lifecycle management hook that handles joining/leaving queues, real-time position tracking, and match notifications.

```typescript
import { useMatchmakingQueue } from '@/hooks/use-matchmaking-queue';

function BattleRoyaleInterface() {
  const {
    // Queue State
    isInQueue,
    queuePosition,
    estimatedWaitTime,
    queueSize,
    isLoading,
    error,
    connectionStatus,

    // Match State
    matchFound,
    lobbyCode,

    // Actions
    joinQueue,
    leaveQueue,
    updatePreferences,

    // Utilities
    canJoinQueue,
    timeInQueue,
    clearError,
    retry,
  } = useMatchmakingQueue();

  const handleJoinQueue = async () => {
    try {
      await joinQueue({
        maxWaitTime: 120,
        skillRangeFlexibility: 'medium',
      });
    } catch (error) {
      console.error('Failed to join queue:', error);
    }
  };

  return (
    <div>
      {!isInQueue ? (
        <button
          onClick={handleJoinQueue}
          disabled={!canJoinQueue || isLoading}
        >
          Enter the Arena
        </button>
      ) : (
        <div>
          <p>Position in queue: {queuePosition}</p>
          <p>Estimated wait: {estimatedWaitTime}s</p>
          <p>Time in queue: {Math.floor(timeInQueue / 1000)}s</p>
          <button onClick={leaveQueue}>Leave Queue</button>
        </div>
      )}

      {matchFound && lobbyCode && (
        <div>Match found! Redirecting to lobby {lobbyCode}...</div>
      )}

      {error && (
        <div>
          Error: {error}
          <button onClick={clearError}>Dismiss</button>
          <button onClick={retry}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

**Features:**

- Automatic queue position tracking
- Real-time wait time estimates
- Match found notifications
- Connection status monitoring
- Automatic retry mechanisms
- Preference updates while in queue

### `useBattleRoyaleStats`

Player statistics and ranking display hook with caching and derived data calculations.

```typescript
import { useBattleRoyaleStats } from '@/hooks/use-battle-royale-stats';

function PlayerStatsPanel({ playerUid }: { playerUid?: string }) {
  const {
    stats,
    isLoading,
    error,
    refreshStats,

    // Derived Data
    rank,
    percentile,
    nextRankProgress,
    recentPerformance,
  } = useBattleRoyaleStats(playerUid);

  if (isLoading) return <div>Loading stats...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return <div>No stats available</div>;

  return (
    <div>
      <h3>Battle Royale Statistics</h3>

      <div>
        <p>Rank: {rank} ({percentile}th percentile)</p>
        <p>Progress to next rank: {nextRankProgress.toFixed(1)}%</p>
        <p>Recent performance: {recentPerformance}</p>
      </div>

      <div>
        <p>Games played: {stats.gamesPlayed}</p>
        <p>Win rate: {(stats.winRate * 100).toFixed(1)}%</p>
        <p>Current streak: {stats.currentStreak}</p>
        <p>Skill rating: {stats.skillRating}</p>
        <p>Average position: {stats.averagePosition.toFixed(1)}</p>
      </div>

      <button onClick={refreshStats}>Refresh Stats</button>
    </div>
  );
}
```

**Features:**

- Automatic caching (5-minute TTL)
- Real-time derived data calculations
- Performance trend analysis
- Ranking tier and percentile calculations
- Periodic background updates

### `useMatchmakingSubscriptions`

Low-level real-time subscription management with connection resilience and automatic reconnection.

```typescript
import { useMatchmakingSubscriptions } from '@/hooks/use-matchmaking-subscriptions';

function QueueMonitor() {
  const {
    // Connection State
    connectionStatus,
    isOnline,
    retryCount,
    lastSeen,

    // Queue Data
    queueData,
    queueSize,
    playerPosition,

    // Match State
    matchFound,
    matchLobbyCode,

    // Actions
    subscribeToQueue,
    subscribeToQueuePosition,
    subscribeToMatchFound,
    unsubscribeAll,
    reconnect,
  } = useMatchmakingSubscriptions();

  useEffect(() => {
    // Subscribe to queue updates
    subscribeToQueue();

    // Subscribe to specific player updates if needed
    if (playerUid) {
      subscribeToQueuePosition(playerUid);
      subscribeToMatchFound(playerUid);
    }

    return () => {
      unsubscribeAll();
    };
  }, [playerUid]);

  return (
    <div>
      <div>Connection: {connectionStatus}</div>
      <div>Queue size: {queueSize}</div>
      <div>Your position: {playerPosition}</div>

      {connectionStatus === 'disconnected' && (
        <button onClick={reconnect}>Reconnect</button>
      )}

      {matchFound && (
        <div>Match found! Lobby: {matchLobbyCode}</div>
      )}
    </div>
  );
}
```

**Features:**

- Automatic connection monitoring
- Exponential backoff retry logic
- Heartbeat detection
- Online/offline state handling
- Memory leak prevention
- Graceful error recovery

## Architecture

### State Management Patterns

All hooks follow consistent patterns established by existing lobby management hooks:

- **Loading States**: Boolean `isLoading` for async operations
- **Error Handling**: String `error` with user-friendly messages
- **Connection Status**: Enum `connectionStatus` for real-time connection state
- **Cleanup**: Automatic subscription cleanup on unmount
- **Retry Logic**: Exponential backoff with configurable limits

### Real-time Subscriptions

The hooks use Firebase Realtime Database for real-time updates:

```typescript
// Queue updates
subscribeToQueue((queueData) => {
  setQueueSize(queueData.length);
  // Update UI with latest queue state
});

// Position tracking
subscribeToQueuePosition(playerUid, (position) => {
  setQueuePosition(position);
  // Update player's position in real-time
});

// Match notifications
subscribeToMatchFound(playerUid, (lobbyCode) => {
  setMatchFound(true);
  setLobbyCode(lobbyCode);
  // Redirect to lobby
});
```

### Error Recovery

All hooks implement comprehensive error recovery:

1. **Automatic Retry**: Retryable errors trigger automatic retry with exponential backoff
2. **Manual Retry**: Users can manually retry failed operations
3. **Graceful Degradation**: Hooks continue to function with reduced capabilities during errors
4. **Error Classification**: Different error types receive appropriate handling strategies

### Performance Optimizations

- **Caching**: Statistics are cached for 5 minutes to reduce Firebase reads
- **Batching**: Queue updates are batched to minimize real-time listener overhead
- **Cleanup**: Proper subscription cleanup prevents memory leaks
- **Throttling**: Connection attempts are throttled to prevent spam

## Testing

Comprehensive test suites are provided for all hooks:

```bash
# Run all matchmaking hook tests
pnpm test hooks/__tests__/use-matchmaking-queue.test.ts
pnpm test hooks/__tests__/use-battle-royale-stats.test.ts
pnpm test hooks/__tests__/matchmaking-integration.test.ts

# Run all hook tests
pnpm test hooks/
```

### Test Coverage

- **Unit Tests**: Individual hook functionality and edge cases
- **Integration Tests**: Hook interactions and data flow
- **Error Scenarios**: Network failures, invalid data, and recovery
- **Cleanup**: Memory leak prevention and proper unmounting

## Usage Guidelines

### Best Practices

1. **Single Responsibility**: Use `useMatchmakingQueue` for queue management, `useBattleRoyaleStats` for statistics
2. **Error Handling**: Always handle errors gracefully with user feedback
3. **Loading States**: Show loading indicators during async operations
4. **Cleanup**: Hooks automatically clean up, but manual cleanup may be needed for complex scenarios
5. **Performance**: Use caching features and avoid unnecessary re-renders

### Common Patterns

```typescript
// Queue management with error handling
const { joinQueue, leaveQueue, error, clearError } = useMatchmakingQueue();

const handleJoinQueue = async () => {
  try {
    await joinQueue();
  } catch (err) {
    // Error is automatically set in hook state
    // Optionally show additional UI feedback
  }
};

// Statistics with loading states
const { stats, isLoading, refreshStats } = useBattleRoyaleStats();

if (isLoading) return <LoadingSpinner />;
if (!stats) return <NoStatsMessage />;

// Subscription management
const { subscribeToQueue, unsubscribeAll } = useMatchmakingSubscriptions();

useEffect(() => {
  subscribeToQueue();
  return unsubscribeAll; // Cleanup on unmount
}, []);
```

## Integration with Existing Systems

These hooks integrate seamlessly with the existing Meme Battles architecture:

- **LobbyService**: Extends existing lobby patterns for Battle Royale lobbies
- **Firebase**: Uses same Realtime Database instance and security rules
- **Error Handling**: Follows existing error classification and Sentry reporting
- **Authentication**: Integrates with `useCurrentUser` for player identification
- **UI Components**: Compatible with existing shadcn/ui component patterns

## Future Enhancements

Planned improvements for the matchmaking hooks:

1. **Advanced Matchmaking**: Geographic proximity and connection quality factors
2. **Tournament Mode**: Support for bracket-style tournaments
3. **Team Matchmaking**: Support for team-based Battle Royale modes
4. **Analytics**: Enhanced performance tracking and optimization metrics
5. **Offline Support**: Queue persistence during network interruptions
