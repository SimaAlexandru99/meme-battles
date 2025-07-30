import useSWR from "swr";
import { getCurrentUser } from "@/lib/actions/auth.action";

const USER_KEY = "current-user";

/**
 * SWR hook for current user data with optimized caching
 * Matches the existing 5-minute cache TTL from auth.action.ts
 */
export function useCurrentUser(initialData?: User | null) {
  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR(USER_KEY, getCurrentUser, {
    // Use initial data from server-side rendering
    fallbackData: initialData,
  });

  return {
    user,
    isLoading,
    isError: !!error,
    error,

    // Mutation helpers for optimistic updates
    mutate,

    // Helper to refresh user data (useful after profile updates)
    refresh: () => mutate(),

    // Helper to clear user data (useful for logout)
    clear: () => mutate(null, false),
  };
}

/**
 * Helper hook for authentication status
 */
export function useIsAuthenticated() {
  const { user, isLoading } = useCurrentUser();

  return {
    isAuthenticated: !!user,
    isLoading,
    user,
  };
}

/**
 * Helper hook for anonymous user status
 */
export function useIsAnonymous() {
  const { user, isLoading } = useCurrentUser();

  return {
    isAnonymous: user?.isAnonymous ?? false,
    isLoading,
    user,
  };
}
