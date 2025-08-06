import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLobbyManagement } from "./use-lobby-management";
import { GameTransitionService } from "@/lib/services/game-transition.service";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

interface UseLobbyGameTransitionReturn {
  // Lobby management state
  lobby: LobbyData | null;
  players: PlayerData[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;

  // Game transition state
  isStartingGame: boolean;
  isTransitioning: boolean;

  // Actions
  createLobby: (settings?: Partial<GameSettings>) => Promise<string>;
  joinLobby: (code: string) => Promise<void>;
  leaveLobby: () => Promise<void>;
  updateSettings: (settings: Partial<GameSettings>) => Promise<void>;
  startGameWithTransition: () => Promise<void>;
  kickPlayer: (playerUid: string) => Promise<void>;

  // Utilities
  isHost: boolean;
  canStartGame: boolean;
  playerCount: number;
  clearError: () => void;
  retry: () => Promise<void>;
}

/**
 * Enhanced lobby management hook with smooth game transition handling
 */
export function useLobbyGameTransition(
  lobbyCode?: string
): UseLobbyGameTransitionReturn {
  const router = useRouter();
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const gameTransitionService = useRef(GameTransitionService.getInstance());

  // Use the base lobby management hook
  const lobbyManagement = useLobbyManagement(lobbyCode);

  /**
   * Enhanced game start with transition handling
   */
  const startGameWithTransition = useCallback(async (): Promise<void> => {
    if (!lobbyManagement.lobby || !lobbyManagement.isHost) {
      throw new Error("Only the host can start the game");
    }

    // Validate conditions before starting
    const validation =
      gameTransitionService.current.validateGameStartConditions(
        lobbyManagement.playerCount,
        lobbyManagement.isHost,
        lobbyManagement.lobby.status
      );

    if (!validation.isValid) {
      toast.error(validation.errorMessage || "Cannot start game");
      return;
    }

    setIsStartingGame(true);

    try {
      // Start the game using the lobby service
      await lobbyManagement.startGame();

      // Handle smooth transition to game interface
      setIsTransitioning(true);

      await gameTransitionService.current.transitionToGame(
        lobbyManagement.lobby.code,
        () => {
          // Transition started
          Sentry.addBreadcrumb({
            message: "Game transition started",
            data: {
              lobbyCode: lobbyManagement.lobby?.code,
              playerCount: lobbyManagement.playerCount,
            },
            level: "info",
          });
        },
        () => {
          // Transition completed
          setIsTransitioning(false);
          setIsStartingGame(false);
        },
        (error) => {
          // Transition error
          setIsTransitioning(false);
          setIsStartingGame(false);
          throw error;
        }
      );
    } catch (error) {
      setIsStartingGame(false);
      setIsTransitioning(false);

      // Handle game start failure with retry option
      await gameTransitionService.current.handleGameStartFailure(
        lobbyManagement.lobby.code,
        error instanceof Error ? error : new Error("Unknown error"),
        async () => {
          // Retry function
          await startGameWithTransition();
        }
      );

      throw error;
    }
  }, [
    lobbyManagement.lobby,
    lobbyManagement.isHost,
    lobbyManagement.playerCount,
    lobbyManagement.startGame,
  ]);

  /**
   * Enhanced leave lobby with cleanup
   */
  const leaveLobbyWithCleanup = useCallback(async (): Promise<void> => {
    try {
      await lobbyManagement.leaveLobby();

      // Navigate back to main menu
      router.push("/");
    } catch (error) {
      console.error("Failed to leave lobby:", error);
      throw error;
    }
  }, [lobbyManagement.leaveLobby, router]);

  return {
    // Lobby management state
    lobby: lobbyManagement.lobby,
    players: lobbyManagement.players,
    isLoading: lobbyManagement.isLoading || isStartingGame,
    error: lobbyManagement.error,
    connectionStatus: lobbyManagement.connectionStatus,

    // Game transition state
    isStartingGame,
    isTransitioning,

    // Actions
    createLobby: lobbyManagement.createLobby,
    joinLobby: lobbyManagement.joinLobby,
    leaveLobby: leaveLobbyWithCleanup,
    updateSettings: lobbyManagement.updateSettings,
    startGameWithTransition,
    kickPlayer: lobbyManagement.kickPlayer,

    // Utilities
    isHost: lobbyManagement.isHost,
    canStartGame:
      lobbyManagement.canStartGame && !isStartingGame && !isTransitioning,
    playerCount: lobbyManagement.playerCount,
    clearError: lobbyManagement.clearError,
    retry: lobbyManagement.retry,
  };
}
