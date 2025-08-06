import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLobbyManagement } from "@/hooks/use-lobby-management";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

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
          // Start the game in the lobby
          await startLobbyGame();

          // Navigate to the game interface
          router.push(`/game/${lobbyCode}/play`);

          toast.success("Game started! Redirecting to game...");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to start game";
          toast.error(errorMessage);
          Sentry.captureException(error);
          throw error;
        }
      },
    );
  }, [isHost, startLobbyGame, lobbyCode, router]);

  // Monitor lobby status changes
  useEffect(() => {
    if (lobby?.status === "started") {
      // Game has been started, redirect to game interface
      router.push(`/game/${lobbyCode}/play`);
    }
  }, [lobby?.status, lobbyCode, router]);

  return {
    startGame,
    isStarting: lobby?.status === "starting",
    error: null,
    clearError: () => {},
  };
}
