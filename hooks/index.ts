// Battle Royale Matchmaking Hooks
export { useMatchmakingQueue } from './use-matchmaking-queue';
export { useBattleRoyaleStats } from './use-battle-royale-stats';
export { useMatchmakingSubscriptions } from './use-matchmaking-subscriptions';

// Existing hooks
export {
  useCurrentUser,
  useIsAuthenticated,
  useIsAnonymous,
} from './useCurrentUser';
export { useLobbyManagement } from './use-lobby-management';
export { useLobbyConnection } from './use-lobby-connection';
export { useGameState } from './use-game-state';
export { useLobbyGameTransition } from './use-lobby-game-transition';
export { useLobbySettings } from './use-lobby-settings';
export { useMobile } from './use-mobile';
export { useGestureDetection } from './use-gesture-detection';
export { useMemeCardSelection } from './useMemeCardSelection';
export { useUnsavedChanges } from './useUnsavedChanges';
export { useUpdateDisplayName } from './useUpdateDisplayName';
export { useUpdateProfile } from './useUpdateProfile';

// Hook return types for external use
export type { UseMatchmakingQueueReturn } from './use-matchmaking-queue';
export type { UseBattleRoyaleStatsReturn } from './use-battle-royale-stats';
export type { UseMatchmakingSubscriptionsReturn } from './use-matchmaking-subscriptions';

// Re-export types from other hooks if needed
export type { UseLobbyManagementReturn } from './use-lobby-management';
export type { UseLobbyConnectionReturn } from './use-lobby-connection';
