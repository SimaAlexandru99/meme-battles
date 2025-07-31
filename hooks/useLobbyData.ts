import useSWR from "swr";
import { getLobbyData } from "@/lib/actions";
import * as Sentry from "@sentry/nextjs";

/**
 * Helper function to ensure a timestamp is converted to a Date object
 */
function ensureDate(
  timestamp: Date | string | FirebaseFirestore.Timestamp
): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }
  // Handle Firestore Timestamp
  if (timestamp && typeof timestamp === "object" && "toDate" in timestamp) {
    return (timestamp as FirebaseFirestore.Timestamp).toDate();
  }
  // Fallback
  return new Date(timestamp as string);
}

/**
 * SWR hook for lobby data with real-time updates
 * Replaces manual setInterval pattern with SWR's built-in refresh mechanism
 */
export function useLobbyData(
  lobbyCode: string | null,
  options: UseLobbyDataOptions = {}
) {
  const {
    refreshInterval = 5000, // 5 seconds
    enabled = true,
    revalidateOnFocus = true,
    revalidateOnReconnect = true,
    ...swrOptions
  } = options;

  // SWR fetcher function with Sentry tracing
  const fetcher = async (code: string) => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Fetch Lobby Data (SWR)",
      },
      async (span) => {
        span.setAttribute("lobby.code", code);

        try {
          const response = await getLobbyData(code);

          if (response.success && response.lobby) {
            const serializedLobby = response.lobby as LobbyData;

            // Ensure dates are in proper format for UI consistency
            const lobbyData: LobbyData = {
              ...serializedLobby,
              createdAt: ensureDate(serializedLobby.createdAt),
              updatedAt: ensureDate(serializedLobby.updatedAt),
            };

            span.setAttribute("lobby.player_count", lobbyData.players.length);
            span.setAttribute("lobby.status", lobbyData.status);

            return lobbyData;
          } else {
            throw new Error("Failed to fetch lobby data");
          }
        } catch (error) {
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  };

  // SWR key - null disables the request
  const swrKey = enabled && lobbyCode ? `lobby-${lobbyCode}` : null;

  const swrResult = useSWR(swrKey, () => fetcher(lobbyCode!), {
    refreshInterval: enabled ? refreshInterval : 0,
    revalidateOnFocus,
    revalidateOnReconnect,
    // Keep previous data while revalidating to prevent loading flickers
    keepPreviousData: true,
    // Retry on error, but not for authentication/authorization errors
    shouldRetryOnError: (error: Error) => {
      const errorMessage = error?.message || "";
      return (
        !errorMessage.includes("authentication") &&
        !errorMessage.includes("unauthorized") &&
        !errorMessage.includes("not a member")
      );
    },
    errorRetryCount: 3,
    errorRetryInterval: 2000,
    ...swrOptions,
  });

  return {
    lobbyData: swrResult.data,
    error: swrResult.error,
    isLoading: swrResult.isLoading,
    isValidating: swrResult.isValidating,

    // Mutation helpers
    mutate: swrResult.mutate,

    // Manual refresh
    refresh: () => swrResult.mutate(),

    // Helper to check if we have data
    hasData: !!swrResult.data,

    // Helper to check if user is host
    isHost: (userId: string) => swrResult.data?.hostUid === userId,

    // Helper to get player count
    playerCount: swrResult.data?.players.length ?? 0,
  };
}

/**
 * Hook for checking if a user has an active lobby
 * Uses SWR for efficient caching and background updates
 */
export function useActiveLobbies(options: UseActiveLobbiesOptions = {}) {
  const {
    enabled = true,
    refreshInterval = 30000, // 30 seconds - less frequent for this data
    ...swrOptions
  } = options;

  const fetcher = async () => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Fetch Active Lobbies (SWR)",
      },
      async (span) => {
        try {
          // Import getUserActiveLobbies when we need it to avoid circular imports
          const { getUserActiveLobbies } = await import("@/lib/actions");
          const response = await getUserActiveLobbies();

          if (response.success && response.lobbies) {
            span.setAttribute("lobby.count", response.lobbies.length);
            return response.lobbies;
          } else {
            throw new Error("Failed to fetch active lobbies");
          }
        } catch (error) {
          Sentry.captureException(error);
          throw error;
        }
      }
    );
  };

  const swrKey = enabled ? "user-active-lobbies" : null;

  const swrResult = useSWR(swrKey, fetcher, {
    refreshInterval: enabled ? refreshInterval : 0,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
    shouldRetryOnError: (error: Error) => {
      const errorMessage = error?.message || "";
      return (
        !errorMessage.includes("authentication") &&
        !errorMessage.includes("unauthorized")
      );
    },
    errorRetryCount: 2,
    errorRetryInterval: 5000,
    ...swrOptions,
  });

  return {
    activeLobbies: swrResult.data || [],
    error: swrResult.error,
    isLoading: swrResult.isLoading,
    isValidating: swrResult.isValidating,
    mutate: swrResult.mutate,
    refresh: () => swrResult.mutate(),
    hasActiveLobbies: !!swrResult.data && swrResult.data.length > 0,
  };
}

/**
 * Combined hook for lobby data and active lobbies
 * Useful for components that need both pieces of data
 */
export function useLobbyAndActiveData(
  lobbyCode: string | null,
  options: UseLobbyAndActiveDataOptions = {}
) {
  const { lobbyOptions = {}, activeLobbiesOptions = {} } = options;

  const lobbyData = useLobbyData(lobbyCode, lobbyOptions);
  const activeLobbies = useActiveLobbies(activeLobbiesOptions);

  return {
    ...lobbyData,
    activeLobbies: activeLobbies.activeLobbies,
    isLoadingActiveLobbies: activeLobbies.isLoading,
    activeLobbiesError: activeLobbies.error,
    refreshActiveLobbies: activeLobbies.refresh,
    hasActiveLobbies: activeLobbies.hasActiveLobbies,
  };
}
