import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LobbyService } from "@/lib/services/lobby.service";

// Hook return interface
export interface UseLobbyManagementReturn {
  // State
  lobby: LobbyData | null;
  players: PlayerData[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;

  // Actions
  createLobby: (settings?: Partial<GameSettings>) => Promise<string>;
  joinLobby: (code: string) => Promise<void>;
  leaveLobby: () => Promise<void>;
  updateSettings: (settings: Partial<GameSettings>) => Promise<void>;
  startGame: () => Promise<void>;
  completeGameTransition: () => Promise<void>;
  kickPlayer: (playerUid: string) => Promise<void>;
  addBot: (botConfig: {
    personalityId: string;
    difficulty: "easy" | "medium" | "hard";
  }) => Promise<void>;

  // Utilities
  isHost: boolean;
  canStartGame: boolean;
  playerCount: number;
  clearError: () => void;
  retry: () => Promise<void>;
}

/**
 * Custom hook for complete lobby lifecycle management
 * Handles state management, real-time subscriptions, and all lobby operations
 */
export function useLobbyManagement(
  lobbyCode?: string,
): UseLobbyManagementReturn {
  // Core state
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  // Service and user references
  const lobbyService = useRef(LobbyService.getInstance());
  const { user } = useCurrentUser();
  const unsubscribeRef = useRef<UnsubscribeFunction | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const players: PlayerData[] = lobby?.players
    ? (Object.values(lobby.players) as unknown as PlayerData[])
    : [];
  const isHost = !!(user && lobby && lobby.hostUid === user.id);
  const playerCount = players.length;
  const canStartGame =
    isHost && playerCount >= 3 && lobby?.status === "waiting";

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle lobby errors with proper classification and user messages
   */
  const handleError = useCallback(
    (error: unknown, operation: string) => {
      let errorMessage = "An unexpected error occurred. Please try again.";
      let shouldRetry = false;

      if (error instanceof Error && "type" in error) {
        const lobbyError = error as LobbyError;
        errorMessage = lobbyError.userMessage || lobbyError.message;
        shouldRetry = lobbyError.retryable;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setIsLoading(false);

      // Log error for monitoring
      Sentry.captureException(error, {
        tags: {
          operation,
          lobbyCode: lobbyCode || "unknown",
          userId: user?.id || "anonymous",
        },
      });

      // Auto-retry for retryable errors after delay
      if (shouldRetry && retryTimeoutRef.current === null) {
        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          // Retry will be handled by the retry function
        }, 2000);
      }
    },
    [lobbyCode, user?.id],
  );

  /**
   * Set up real-time subscription to lobby data
   */
  const subscribeToLobby = useCallback(
    (code: string) => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      setConnectionStatus("connecting");

      try {
        const unsubscribe = lobbyService.current.subscribeToLobby(
          code,
          (lobbyData) => {
            if (lobbyData) {
              setLobby(lobbyData as LobbyData);
              setConnectionStatus("connected");
              setError(null);
            } else {
              // Lobby was deleted or doesn't exist
              setLobby(null);
              setConnectionStatus("disconnected");
              setError("Lobby no longer exists.");
            }
          },
        );

        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        setConnectionStatus("disconnected");
        handleError(error, "subscribe_to_lobby");
      }
    },
    [handleError],
  );

  /**
   * Clean up subscriptions
   */
  const cleanup = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setConnectionStatus("disconnected");
  }, []);

  /**
   * Create a new lobby
   */
  const createLobby = useCallback(
    async (settings?: Partial<GameSettings>): Promise<string> => {
      console.log(
        "useLobbyManagement.createLobby called with settings:",
        settings,
      );
      console.log("Current user:", user);

      if (!user) {
        console.error("No user found, cannot create lobby");
        throw new Error("User must be authenticated to create a lobby");
      }

      console.log("Setting loading state to true");
      setIsLoading(true);
      setError(null);

      try {
        const params: CreateLobbyParams = {
          hostUid: user.id,
          hostDisplayName: user.name,
          hostAvatarId: user.avatarId || "default",
          hostProfileURL: user.profileURL,
          settings,
        };

        const result = await lobbyService.current.createLobby(params);

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to create lobby");
        }

        const { code, lobby: createdLobby } = result.data;
        setLobby(createdLobby);

        // Set up real-time subscription
        subscribeToLobby(code);

        setIsLoading(false);
        return code;
      } catch (error) {
        handleError(error, "create_lobby");
        throw error;
      }
    },
    [user, subscribeToLobby, handleError],
  );

  /**
   * Join an existing lobby
   */
  const joinLobby = useCallback(
    async (code: string): Promise<void> => {
      if (!user) {
        throw new Error("User must be authenticated to join a lobby");
      }

      setIsLoading(true);
      setError(null);

      try {
        const params: JoinLobbyParams = {
          uid: user.id,
          displayName: user.name,
          avatarId: user.avatarId || "default",
          profileURL: user.profileURL,
        };

        const result = await lobbyService.current.joinLobby(code, params);

        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to join lobby");
        }

        setLobby(result.data);

        // Set up real-time subscription
        subscribeToLobby(code);

        setIsLoading(false);
      } catch (error) {
        handleError(error, "join_lobby");
        throw error;
      }
    },
    [user, subscribeToLobby, handleError],
  );

  /**
   * Leave the current lobby
   */
  const leaveLobby = useCallback(async (): Promise<void> => {
    if (!user || !lobby) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await lobbyService.current.leaveLobby(lobby.code, user.id);

      if (!result.success) {
        throw new Error(result.error || "Failed to leave lobby");
      }

      // Clean up subscriptions and state
      cleanup();
      setLobby(null);
      setIsLoading(false);
    } catch (error) {
      handleError(error, "leave_lobby");
      throw error;
    }
  }, [user, lobby, cleanup, handleError]);

  /**
   * Update lobby settings (host only)
   */
  const updateSettings = useCallback(
    async (settings: Partial<GameSettings>): Promise<void> => {
      if (!user || !lobby || !isHost) {
        throw new Error("Only the host can update lobby settings");
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await lobbyService.current.updateLobbySettings(
          lobby.code,
          settings,
          user.id,
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to update settings");
        }

        // The real-time subscription will update the lobby state
        setIsLoading(false);
      } catch (error) {
        handleError(error, "update_settings");
        throw error;
      }
    },
    [user, lobby, isHost, handleError],
  );

  /**
   * Start the game (host only)
   */
  const startGame = useCallback(async (): Promise<void> => {
    if (!user || !lobby || !isHost) {
      throw new Error("Only the host can start the game");
    }

    if (playerCount < 3) {
      throw new Error("Need at least 3 players to start the game");
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await lobbyService.current.startGame(lobby.code, user.id);

      if (!result.success) {
        throw new Error(result.error || "Failed to start game");
      }

      // The real-time subscription will update the lobby state
      setIsLoading(false);
    } catch (error) {
      handleError(error, "start_game");
      throw error;
    }
  }, [user, lobby, isHost, playerCount, handleError]);

  /**
   * Complete the game transition and start the actual game
   */
  const completeGameTransition = useCallback(async (): Promise<void> => {
    console.log("🎮 completeGameTransition called", {
      user: user?.id,
      lobby: lobby?.code,
      isHost,
    });

    if (!user) {
      console.error("❌ No user available for game transition");
      throw new Error("User not available. Please refresh the page.");
    }

    if (!lobby) {
      console.error("❌ No lobby available for game transition");
      throw new Error("Lobby not available. Please refresh the page.");
    }

    // More robust host check - also allow if user is the original host
    const isUserHost = lobby.hostUid === user.id || isHost;
    if (!isUserHost) {
      console.error("❌ User is not host", {
        userUid: user.id,
        lobbyHostUid: lobby.hostUid,
        isHost,
      });
      throw new Error("Only the host can complete the game transition");
    }

    console.log("✅ Host validation passed, proceeding with game transition");

    setIsLoading(true);
    setError(null);

    try {
      const result = await lobbyService.current.completeGameTransition(
        lobby.code,
        user.id,
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to complete game transition");
      }

      // The real-time subscription will update the lobby state
      setIsLoading(false);
    } catch (error) {
      handleError(error, "complete_game_transition");
      throw error;
    }
  }, [user, lobby, isHost, handleError]);

  /**
   * Kick a player from the lobby (host only)
   */
  const kickPlayer = useCallback(
    async (playerUid: string): Promise<void> => {
      if (!user || !lobby || !isHost) {
        throw new Error("Only the host can kick players");
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await lobbyService.current.kickPlayer(
          lobby.code,
          playerUid,
          user.id,
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to kick player");
        }

        // The real-time subscription will update the lobby state
        setIsLoading(false);
      } catch (error) {
        handleError(error, "kick_player");
        throw error;
      }
    },
    [user, lobby, isHost, handleError],
  );

  /**
   * Add an AI bot to the lobby (host only)
   */
  const addBot = useCallback(
    async (botConfig: {
      personalityId: string;
      difficulty: "easy" | "medium" | "hard";
    }): Promise<void> => {
      if (!user || !lobby || !isHost) {
        throw new Error("Only the host can add AI players");
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log("Hook: Adding bot with config:", botConfig);
        console.log("Hook: Lobby code:", lobby.code);
        console.log("Hook: User ID:", user.id);
        console.log("Hook: User object:", user);
        console.log("Hook: Is user anonymous:", user.isAnonymous);

        const result = await lobbyService.current.addBot(
          lobby.code,
          user.id,
          botConfig,
        );

        console.log("Hook: Add bot result:", result);

        if (!result.success) {
          throw new Error(result.error || "Failed to add AI player");
        }

        // The real-time subscription will update the lobby state
        setIsLoading(false);
      } catch (error) {
        console.error("Hook: Add bot error:", error);
        handleError(error, "add_bot");
        throw error;
      }
    },
    [user, lobby, isHost, handleError],
  );

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(async (): Promise<void> => {
    if (lobbyCode && !lobby) {
      // Try to rejoin the lobby
      if (user) {
        await joinLobby(lobbyCode);
      }
    } else if (lobby) {
      // Resubscribe to the current lobby
      subscribeToLobby(lobby.code);
    }
  }, [lobbyCode, lobby, user, joinLobby, subscribeToLobby]);

  // Set up initial subscription if lobbyCode is provided
  useEffect(() => {
    if (lobbyCode && user) {
      subscribeToLobby(lobbyCode);
    }

    return cleanup;
  }, [lobbyCode, user, subscribeToLobby, cleanup]);

  // Update player status periodically to maintain connection
  useEffect(() => {
    if (!user || !lobby || connectionStatus !== "connected") {
      return;
    }

    const updateStatus = async () => {
      try {
        await lobbyService.current.updatePlayerStatus(
          lobby.code,
          user.id,
          "waiting",
        );
      } catch (error) {
        // Silently handle status update errors
        console.warn("Failed to update player status:", error);
      }
    };

    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000);

    return () => clearInterval(interval);
  }, [user, lobby, connectionStatus]);

  return {
    // State
    lobby,
    players,
    isLoading,
    error,
    connectionStatus,

    // Actions
    createLobby,
    joinLobby,
    leaveLobby,
    updateSettings,
    startGame,
    completeGameTransition,
    kickPlayer,
    addBot,

    // Utilities
    isHost,
    canStartGame,
    playerCount,
    clearError,
    retry,
  };
}
