import { toast } from "sonner";
import { ErrorHandler } from "./error-handler";

/**
 * Enhanced error toast utility using Sonner for user-friendly error notifications
 */
export class ErrorToast {
  /**
   * Show an error toast with user-friendly messaging and retry options
   */
  static showError(
    error: unknown,
    options: {
      title?: string;
      onRetry?: () => void;
      duration?: number;
      dismissible?: boolean;
    } = {}
  ): void {
    const {
      title = "Error",
      onRetry,
      duration = 5000,
      dismissible = true,
    } = options;

    const friendlyError = ErrorHandler.getUserFriendlyMessage(error);

    // Show error toast with action button if retryable
    if (friendlyError.canRetry && onRetry) {
      toast.error(friendlyError.message, {
        description: friendlyError.action,
        duration,
        dismissible,
        action: {
          label: "Try Again",
          onClick: onRetry,
        },
      });
    } else {
      toast.error(friendlyError.message, {
        description: friendlyError.action,
        duration,
        dismissible,
      });
    }

    // Log the error for monitoring
    ErrorHandler.logError(error, {
      operation: "error_toast",
      additionalData: { title },
    });
  }

  /**
   * Show a network error toast with specific messaging
   */
  static showNetworkError(
    error: unknown,
    options: {
      onRetry?: () => void;
      operation?: string;
    } = {}
  ): void {
    const { onRetry, operation = "operation" } = options;

    toast.error("Connection Problem", {
      description: `Unable to complete ${operation}. Please check your internet connection.`,
      duration: 6000,
      action: onRetry
        ? {
            label: "Retry",
            onClick: onRetry,
          }
        : undefined,
    });

    ErrorHandler.logError(error, {
      operation: "network_error_toast",
      additionalData: { operation },
    });
  }

  /**
   * Show a lobby-specific error toast
   */
  static showLobbyError(
    error: unknown,
    options: {
      lobbyCode?: string;
      onRetry?: () => void;
      onCreateNew?: () => void;
      onJoinDifferent?: () => void;
    } = {}
  ): void {
    const { lobbyCode, onRetry, onCreateNew, onJoinDifferent } = options;
    const friendlyError = ErrorHandler.getUserFriendlyMessage(error);

    // Handle specific lobby error types with custom actions
    if (error && typeof error === "object" && "type" in error) {
      const errorType = (error as { type: unknown }).type;

      if (errorType === "LOBBY_NOT_FOUND") {
        toast.error("Lobby Not Found", {
          description: "The lobby code you entered doesn't exist.",
          duration: 6000,
          action: onCreateNew
            ? {
                label: "Create New",
                onClick: onCreateNew,
              }
            : undefined,
        });
      } else if (errorType === "LOBBY_FULL") {
        toast.error("Lobby Full", {
          description: "This lobby has reached its maximum capacity.",
          duration: 6000,
          action: onJoinDifferent
            ? {
                label: "Find Another",
                onClick: onJoinDifferent,
              }
            : undefined,
        });
      } else if (errorType === "LOBBY_ALREADY_STARTED") {
        toast.error("Game in Progress", {
          description: "This game has already started. You cannot join now.",
          duration: 6000,
          action: onCreateNew
            ? {
                label: "Create New",
                onClick: onCreateNew,
              }
            : undefined,
        });
      } else if (errorType === "PERMISSION_DENIED") {
        toast.error("Permission Denied", {
          description: friendlyError.message,
          duration: 5000,
        });
      } else if (errorType === "CODE_GENERATION_FAILED") {
        toast.error("Unable to Create Lobby", {
          description: "High traffic detected. Please try again in a moment.",
          duration: 6000,
          action: onRetry
            ? {
                label: "Try Again",
                onClick: onRetry,
              }
            : undefined,
        });
      } else {
        // Generic lobby error
        this.showError(error, { onRetry });
      }
    } else {
      // Generic error handling for non-lobby errors
      this.showError(error, { onRetry });
    }

    ErrorHandler.logError(error, {
      operation: "lobby_error_toast",
      lobbyCode,
    });
  }

  /**
   * Show a success toast for lobby operations
   */
  static showLobbySuccess(
    message: string,
    options: {
      description?: string;
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    } = {}
  ): void {
    const { description, duration = 3000, action } = options;

    toast.success(message, {
      description,
      duration,
      action,
    });
  }

  /**
   * Show a loading toast for async operations
   */
  static showLoading(
    message: string,
    options: {
      description?: string;
    } = {}
  ): string | number {
    const { description } = options;

    return toast.loading(message, {
      description,
    });
  }

  /**
   * Update a loading toast to success
   */
  static updateToSuccess(
    toastId: string | number,
    message: string,
    options: {
      description?: string;
      duration?: number;
    } = {}
  ): void {
    const { description, duration = 3000 } = options;

    toast.success(message, {
      id: toastId,
      description,
      duration,
    });
  }

  /**
   * Update a loading toast to error
   */
  static updateToError(
    toastId: string | number,
    error: unknown,
    options: {
      onRetry?: () => void;
    } = {}
  ): void {
    const { onRetry } = options;
    const friendlyError = ErrorHandler.getUserFriendlyMessage(error);

    toast.error(friendlyError.message, {
      id: toastId,
      description: friendlyError.action,
      duration: 5000,
      action:
        friendlyError.canRetry && onRetry
          ? {
              label: "Try Again",
              onClick: onRetry,
            }
          : undefined,
    });
  }

  /**
   * Dismiss a specific toast
   */
  static dismiss(toastId: string | number): void {
    toast.dismiss(toastId);
  }

  /**
   * Dismiss all toasts
   */
  static dismissAll(): void {
    toast.dismiss();
  }

  /**
   * Show a warning toast
   */
  static showWarning(
    message: string,
    options: {
      description?: string;
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    } = {}
  ): void {
    const { description, duration = 4000, action } = options;

    toast.warning(message, {
      description,
      duration,
      action,
    });
  }

  /**
   * Show an info toast
   */
  static showInfo(
    message: string,
    options: {
      description?: string;
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    } = {}
  ): void {
    const { description, duration = 3000, action } = options;

    toast.info(message, {
      description,
      duration,
      action,
    });
  }

  /**
   * Show AI-only scenario notification to inform user
   */
  static showAIOnlyNotification(
    options: {
      gameEnded?: boolean;
      onGoHome?: () => void;
      onCreateNew?: () => void;
    } = {}
  ): void {
    const { gameEnded = false, onGoHome, onCreateNew } = options;

    if (gameEnded) {
      toast.info("Game Completed", {
        description:
          "All human players have left. The AI-only game has been ended automatically.",
        duration: 8000,
        action: onGoHome
          ? {
              label: "Go Home",
              onClick: onGoHome,
            }
          : undefined,
      });
    } else {
      toast.warning("Only AI Players Remain", {
        description:
          "Warning: If you leave, the game will end as AI players cannot continue alone.",
        duration: 6000,
        action: onCreateNew
          ? {
              label: "Create New Game",
              onClick: onCreateNew,
            }
          : undefined,
      });
    }
  }

  /**
   * Show host transfer warning when only AI available
   */
  static showAIHostWarning(options: {
    playerCount: number;
    onStayInGame?: () => void;
  }): void {
    const { playerCount, onStayInGame } = options;

    toast.warning("AI Players Only", {
      description: `Only ${playerCount} AI players remain. Game management may fail if all humans leave.`,
      duration: 7000,
      action: onStayInGame
        ? {
            label: "Stay in Game",
            onClick: onStayInGame,
          }
        : undefined,
    });
  }

  /**
   * Show game continuation warning for last human player
   */
  static showLastHumanWarning(options: {
    aiCount: number;
    onConfirmLeave?: () => void;
  }): void {
    const { aiCount, onConfirmLeave } = options;

    toast.warning("Last Human Player", {
      description: `You are the last human player with ${aiCount} AI players. Leaving will end the game.`,
      duration: 8000,
      action: onConfirmLeave
        ? {
            label: "Leave Anyway",
            onClick: onConfirmLeave,
          }
        : undefined,
    });
  }
}
