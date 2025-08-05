import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import useSWR from "swr";
import { getRandomMemeCards } from "@/lib/utils/meme-card-pool";
import { getLobbyData } from "@/lib/actions/lobby.action";

interface UseLobbyDataOptions {
  lobbyCode: string;
  currentUser?: User;
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
  isHost: (userId: string) => boolean;
  isValidating: boolean;
}

/**
 * Hook for fetching and managing real-time lobby data from Firebase
 * Converts Firebase lobby data to Player interface used in Arena component
 */
export function useLobbyData({
  lobbyCode,
  currentUser,
  refreshInterval = 3000, // Increased from 2000ms to 3000ms
  enabled = true,
}: UseLobbyDataOptions): UseLobbyDataReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Persist cards for the current player to prevent regeneration
  const currentPlayerCardsRef = useRef<MemeCard[]>([]);
  const hasGeneratedCardsRef = useRef(false);

  const fetchLobbyData = useCallback(async () => {
    if (!enabled || !lobbyCode) return;

    setIsValidating(true);
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
            const lobby: LobbyData = response.lobby as unknown as LobbyData;
            setLobbyData(lobby);

            // Convert Firebase lobby players to Arena Player interface
            const convertedPlayers: Player[] = lobby.players.map(
              (lobbyPlayer: LobbyPlayer) => {
                const isCurrentPlayer = currentUser
                  ? lobbyPlayer.uid === currentUser.id
                  : false;

                // Only generate cards once for the current player
                let playerCards: MemeCard[] = [];
                if (isCurrentPlayer) {
                  if (!hasGeneratedCardsRef.current) {
                    // Generate cards only once per session
                    playerCards = getRandomMemeCards(7);
                    currentPlayerCardsRef.current = playerCards;
                    hasGeneratedCardsRef.current = true;
                  } else {
                    // Use persisted cards but filter out used cards
                    const usedCardIds =
                      lobby.gameState?.playerUsedCards?.[lobbyPlayer.uid] || [];
                    playerCards = currentPlayerCardsRef.current.filter(
                      (card) => !usedCardIds.includes(card.id)
                    );
                  }
                }

                return {
                  id: lobbyPlayer.uid,
                  name: lobbyPlayer.displayName,
                  avatar: lobbyPlayer.profileURL || "/icons/cool-pepe.png",
                  score: lobbyPlayer.score || 0, // Use real score from Firebase
                  status: "playing" as const,
                  cards: playerCards,
                  isCurrentPlayer,
                  // AI-specific properties - extend the Player interface
                  isAI: lobbyPlayer.isAI || false,
                  aiPersonalityId: lobbyPlayer.aiPersonalityId,
                } as Player & { isAI?: boolean; aiPersonalityId?: string };
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
              convertedPlayers.filter(
                (p) => (p as Player & { isAI?: boolean }).isAI
              ).length
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
          setIsValidating(false);
        }
      }
    );
  }, [lobbyCode, currentUser, enabled]);

  // Reset card generation when lobby code changes
  useEffect(() => {
    hasGeneratedCardsRef.current = false;
    currentPlayerCardsRef.current = [];
  }, [lobbyCode]);

  // Initial fetch
  useEffect(() => {
    fetchLobbyData();
  }, [fetchLobbyData]);

  // Set up intelligent polling for real-time updates
  useEffect(() => {
    if (!enabled || !lobbyCode) return;

    // Adjust polling frequency based on lobby state
    const getPollingInterval = () => {
      if (!lobbyData) return refreshInterval;

      // More frequent polling during active game
      if (lobbyData.status === "started") {
        return 2000; // 2 seconds during active gameplay
      }

      // Less frequent polling when waiting
      if (lobbyData.status === "waiting") {
        return 5000; // 5 seconds when waiting
      }

      return refreshInterval;
    };

    const interval = setInterval(() => {
      fetchLobbyData();
    }, getPollingInterval());

    return () => clearInterval(interval);
  }, [fetchLobbyData, refreshInterval, enabled, lobbyCode, lobbyData]);

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
    isHost: (userId: string) => {
      if (!lobbyData) return false;
      return lobbyData.hostUid === userId;
    },
    isValidating,
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

  const lobbyData = useLobbyData({
    lobbyCode: lobbyCode || "",
    currentUser: lobbyOptions.currentUser as User,
    ...lobbyOptions,
  });
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
