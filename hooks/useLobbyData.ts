import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { getRandomMemeCards } from "@/lib/utils/meme-card-pool";
import { getLobbyData } from "@/lib/actions/lobby.action";

interface UseLobbyDataOptions {
  lobbyCode: string;
  currentUser: User;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseLobbyDataReturn {
  players: Player[];
  currentPlayer: Player | null;
  isLoading: boolean;
  error: string | null;
  lobbyData: LobbyData | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching and managing real-time lobby data from Firebase
 * Converts Firebase lobby data to Player interface used in Arena component
 */
export function useLobbyData({
  lobbyCode,
  currentUser,
  refreshInterval = 2000,
  enabled = true,
}: UseLobbyDataOptions): UseLobbyDataReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);

  const fetchLobbyData = useCallback(async () => {
    if (!enabled || !lobbyCode) return;

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Fetch Lobby Data",
      },
      async (span) => {
        try {
          span.setAttribute("lobby.code", lobbyCode);

          const response = await getLobbyData(lobbyCode);

          if (response.success && response.lobby) {
            const lobby: LobbyData = response.lobby;
            setLobbyData(lobby);

            // Convert Firebase lobby players to Arena Player interface
            const convertedPlayers: Player[] = lobby.players.map(
              (lobbyPlayer: LobbyPlayer) => {
                const isCurrentPlayer = lobbyPlayer.uid === currentUser.id;

                return {
                  id: lobbyPlayer.uid,
                  name: lobbyPlayer.displayName,
                  avatar: lobbyPlayer.profileURL || "/icons/cool-pepe.png",
                  score: lobbyPlayer.score || 0, // Use real score from Firebase
                  status: "playing" as const,
                  cards: isCurrentPlayer ? getRandomMemeCards(7) : [], // Only current player needs cards
                  isCurrentPlayer,
                  // AI-specific properties
                  isAI: lobbyPlayer.isAI || false,
                  aiPersonalityId: lobbyPlayer.aiPersonalityId,
                };
              }
            );

            setPlayers(convertedPlayers);

            // Set current player
            const currentPlayerData = convertedPlayers.find(
              (p) => p.isCurrentPlayer
            );
            setCurrentPlayer(currentPlayerData || null);

            setError(null);
            span.setAttribute("player_count", convertedPlayers.length);
            span.setAttribute(
              "ai_player_count",
              convertedPlayers.filter((p) => p.isAI).length
            );
            span.setAttribute("success", true);
          } else {
            throw new Error("Failed to fetch lobby data");
          }
        } catch (error) {
          console.error("Error fetching lobby data:", error);
          Sentry.captureException(error);
          setError(
            error instanceof Error
              ? error.message
              : "Failed to fetch lobby data"
          );
          toast.error("Failed to load game data");
          span.setAttribute("success", false);
        } finally {
          setIsLoading(false);
        }
      }
    );
  }, [lobbyCode, currentUser, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchLobbyData();
  }, [fetchLobbyData]);

  // Set up polling for real-time updates
  useEffect(() => {
    if (!enabled || !lobbyCode) return;

    const interval = setInterval(() => {
      fetchLobbyData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchLobbyData, refreshInterval, enabled, lobbyCode]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchLobbyData();
  }, [fetchLobbyData]);

  return {
    players,
    currentPlayer,
    isLoading,
    error,
    lobbyData,
    refresh,
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
