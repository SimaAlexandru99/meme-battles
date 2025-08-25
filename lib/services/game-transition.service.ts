import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";

/**
 * Service for handling smooth transitions from lobby to game interface
 */
export class GameTransitionService {
  private static instance: GameTransitionService;

  static getInstance(): GameTransitionService {
    if (!GameTransitionService.instance) {
      GameTransitionService.instance = new GameTransitionService();
    }
    return GameTransitionService.instance;
  }

  /**
   * Handle transition from lobby to game with loading states
   */
  async transitionToGame(
    lobbyCode: string,
    onTransitionStart?: () => void,
    onTransitionComplete?: () => void,
    onTransitionError?: (error: Error) => void,
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ui.transition",
        name: "Transition to Game",
      },
      async () => {
        try {
          onTransitionStart?.();

          // Show loading toast
          const loadingToast = toast.loading("Starting game...", {
            description: "Preparing your meme cards and situation",
          });

          // Simulate transition delay for smooth UX
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Dismiss loading toast
          toast.dismiss(loadingToast);

          // Show success message
          toast.success("Game started!", {
            description: "Get ready to battle with memes!",
          });

          // Navigate to game interface
          if (typeof window !== "undefined") {
            window.location.href = `/game/${lobbyCode}/play`;
          }

          onTransitionComplete?.();
        } catch (error) {
          const gameError =
            error instanceof Error
              ? error
              : new Error("Unknown transition error");

          Sentry.captureException(gameError, {
            tags: {
              operation: "game_transition",
              lobbyCode,
            },
          });

          toast.error("Failed to start game", {
            description: gameError.message,
          });

          onTransitionError?.(gameError);
          throw gameError;
        }
      },
    );
  }

  /**
   * Handle fallback when game start fails
   */
  async handleGameStartFailure(
    lobbyCode: string,
    error: Error,
    onRetry?: () => Promise<void>,
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ui.error_recovery",
        name: "Handle Game Start Failure",
      },
      async () => {
        Sentry.captureException(error, {
          tags: {
            operation: "game_start_failure",
            lobbyCode,
          },
        });

        // Show error with retry option
        toast.error("Failed to start game", {
          description: error.message,
          action: onRetry
            ? {
                label: "Retry",
                onClick: async () => {
                  try {
                    await onRetry();
                  } catch (retryError) {
                    console.error("Retry failed:", retryError);
                    toast.error("Retry failed. Please try again later.");
                  }
                },
              }
            : undefined,
        });
      },
    );
  }

  /**
   * Validate game start conditions before transition
   */
  validateGameStartConditions(
    playerCount: number,
    isHost: boolean,
    lobbyStatus: LobbyStatus,
  ): { isValid: boolean; errorMessage?: string } {
    if (!isHost) {
      return {
        isValid: false,
        errorMessage: "Only the host can start the game",
      };
    }

    if (playerCount < 3) {
      return {
        isValid: false,
        errorMessage: `Need at least 3 players to start (currently ${playerCount})`,
      };
    }

    if (lobbyStatus !== "waiting") {
      return {
        isValid: false,
        errorMessage: "Game cannot be started in current state",
      };
    }

    return { isValid: true };
  }

  /**
   * Cleanup lobby listeners when transitioning to game
   */
  cleanupLobbyListeners(unsubscribeFunctions: (() => void)[]): void {
    unsubscribeFunctions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn("Failed to cleanup lobby listener:", error);
      }
    });
  }
}
