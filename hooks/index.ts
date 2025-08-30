// Battle Royale Matchmaking Hooks

export type { UseBattleRoyaleStatsReturn } from "./use-battle-royale-stats";
export { useBattleRoyaleStats } from "./use-battle-royale-stats";
export { useGameState } from "./use-game-state";
export { useGestureDetection } from "./use-gesture-detection";
export type { UseLobbyConnectionReturn } from "./use-lobby-connection";
export { useLobbyConnection } from "./use-lobby-connection";
export { useLobbyGameTransition } from "./use-lobby-game-transition";
// Re-export types from other hooks if needed
export type { UseLobbyManagementReturn } from "./use-lobby-management";
export { useLobbyManagement } from "./use-lobby-management";
export { useLobbySettings } from "./use-lobby-settings";
// Hook return types for external use
export type { UseMatchmakingQueueReturn } from "./use-matchmaking-queue";
export { useMatchmakingQueue } from "./use-matchmaking-queue";
export type { UseMatchmakingSubscriptionsReturn } from "./use-matchmaking-subscriptions";
export { useMatchmakingSubscriptions } from "./use-matchmaking-subscriptions";
export { useIsMobile } from "./use-mobile";
// Existing hooks
export {
  useCurrentUser,
  useIsAnonymous,
  useIsAuthenticated,
} from "./useCurrentUser";
export { useMemeCardSelection } from "./useMemeCardSelection";
export { useUnsavedChanges } from "./useUnsavedChanges";
export { useUpdateDisplayName } from "./useUpdateDisplayName";
export { useUpdateProfile } from "./useUpdateProfile";
