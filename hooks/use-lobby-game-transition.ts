import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useLobbyManagement } from "@/hooks/use-lobby-management";

interface UseLobbyGameTransitionReturn {
  startGame: () => Promise<void>;
  isStarting: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Custom hook for handling lobby to game transitions
 * Manages the transition from lobby state to active game state
 */
export function useLobbyGameTransition(
  lobbyCode: string,
): UseLobbyGameTransitionReturn {
  const router = useRouter();
  const {
    startGame: startLobbyGame,
    lobby,
    isHost,
  } = useLobbyManagement(lobbyCode);

  // Handle game start transition
  const startGame = useCallback(async (): Promise<void> => {
    if (!isHost) {
      throw new Error("Only the host can start the game");
    }

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Start Game Transition",
      },
      async () => {
        try {
          // Start the game in the lobby; visual cues are handled by the caller
          await startLobbyGame();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to start game";
          toast.error(errorMessage);
          Sentry.captureException(error);
          throw error;
        }
      },
    );
  }, [isHost, startLobbyGame]);

  // Monitor lobby status changes and handle navigation
  useEffect(() => {
    if (lobby?.status === "started") {
      // Use setTimeout to defer navigation to prevent React Router errors
      setTimeout(() => {
        router.push(`/game/${lobbyCode}/play`);
      }, 100);
    }
  }, [lobby?.status, lobbyCode, router]);

  return {
    startGame,
    // Consider the game as "starting" during the server-side transition phase
    isStarting:
      (typeof (lobby as LobbyData)?.gameState === "object" &&
        (lobby as LobbyData)?.gameState?.phase === "waiting") ||
      false,
    error: null,
    clearError: () => {},
  };
}
