"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, Bug, Home, RefreshCw } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { firebaseConnectionManager } from "@/lib/services/firebase-connection-manager";
import { cn } from "@/lib/utils";

interface GameErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  lastErrorTime: number;
  errorType: "network" | "game_state" | "rendering" | "firebase" | "unknown";
  canRecover: boolean;
  recoveryActions: string[];
}

interface GameErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    reset: () => void;
    errorInfo: React.ErrorInfo;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  lobbyCode?: string;
  currentUser?: { id: string; name: string };
}

export class GameErrorBoundary extends React.Component<
  GameErrorBoundaryProps,
  GameErrorBoundaryState
> {
  private retryTimeout: NodeJS.Timeout | null = null;
  private readonly MAX_AUTO_RETRIES = 3;
  private readonly RETRY_DELAY = 2000;

  constructor(props: GameErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: 0,
      errorType: "unknown",
      canRecover: true,
      recoveryActions: [],
    };
  }

  static getDerivedStateFromError(
    error: Error,
  ): Partial<GameErrorBoundaryState> {
    const errorType = GameErrorBoundary.categorizeError(error);
    const { canRecover, recoveryActions } = GameErrorBoundary.getRecoveryInfo(
      error,
      errorType,
    );

    return {
      hasError: true,
      error,
      errorType,
      canRecover,
      recoveryActions,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = Sentry.captureException(error, {
      tags: {
        component: "GameErrorBoundary",
        error_type: this.state.errorType,
        lobby_code: this.props.lobbyCode || "unknown",
        user_id: this.props.currentUser?.id || "anonymous",
      },
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
        game: {
          lobbyCode: this.props.lobbyCode,
          currentUser: this.props.currentUser,
          retryCount: this.state.retryCount,
        },
      },
      extra: {
        errorInfo,
        connectionInfo: firebaseConnectionManager.getConnectionInfo(),
      },
    });

    this.setState({ errorId, errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Attempt auto-recovery for certain error types
    if (
      this.shouldAutoRecover(error) &&
      this.state.retryCount < this.MAX_AUTO_RETRIES
    ) {
      this.scheduleAutoRetry();
    }
  }

  private static categorizeError(
    _error: Error,
  ): GameErrorBoundaryState["errorType"] {
    const message = _error.message.toLowerCase();
    const stack = _error.stack?.toLowerCase() || "";

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection")
    ) {
      return "network";
    }

    if (message.includes("firebase") || stack.includes("firebase")) {
      return "firebase";
    }

    if (
      message.includes("game") ||
      message.includes("lobby") ||
      message.includes("player")
    ) {
      return "game_state";
    }

    if (
      message.includes("render") ||
      message.includes("hook") ||
      stack.includes("react")
    ) {
      return "rendering";
    }

    return "unknown";
  }

  private static getRecoveryInfo(
    _error: Error,
    errorType: GameErrorBoundaryState["errorType"],
  ): {
    canRecover: boolean;
    recoveryActions: string[];
  } {
    switch (errorType) {
      case "network":
        return {
          canRecover: true,
          recoveryActions: [
            "Check your internet connection",
            "Retry the connection",
            "Refresh the page if issues persist",
          ],
        };

      case "firebase":
        return {
          canRecover: true,
          recoveryActions: [
            "Reconnecting to game servers",
            "Your progress should be saved",
            "Try refreshing if connection fails",
          ],
        };

      case "game_state":
        return {
          canRecover: true,
          recoveryActions: [
            "Refreshing game state",
            "Your current game progress may be lost",
            "Return to lobby to start fresh",
          ],
        };

      case "rendering":
        return {
          canRecover: false,
          recoveryActions: [
            "A display error occurred",
            "Please refresh the page",
            "Report this issue if it continues",
          ],
        };

      default:
        return {
          canRecover: false,
          recoveryActions: [
            "An unexpected error occurred",
            "Please refresh the page",
            "Contact support if this persists",
          ],
        };
    }
  }

  private shouldAutoRecover(_error: Error): boolean {
    const { errorType } = this.state;

    // Auto-recover for network and Firebase errors
    return errorType === "network" || errorType === "firebase";
  }

  private scheduleAutoRetry(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      this.handleRetry(true);
    }, this.RETRY_DELAY);
  }

  private handleRetry = (isAutoRetry: boolean = false): void => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    // Clean up Firebase connections before retry
    try {
      firebaseConnectionManager.cleanup();
    } catch (cleanupError) {
      console.warn("Error during Firebase cleanup:", cleanupError);
    }

    Sentry.addBreadcrumb({
      message: isAutoRetry
        ? "Auto-retrying after error"
        : "Manual retry triggered",
      data: {
        errorType: this.state.errorType,
        retryCount: this.state.retryCount + 1,
        errorId: this.state.errorId,
      },
      level: "info",
    });

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  private handleGoHome = (): void => {
    // Clean up before navigation
    firebaseConnectionManager.cleanup();

    Sentry.addBreadcrumb({
      message: "User navigating home from error boundary",
      data: {
        errorType: this.state.errorType,
        errorId: this.state.errorId,
      },
      level: "info",
    });

    window.location.href = "/";
  };

  private handleRefresh = (): void => {
    Sentry.addBreadcrumb({
      message: "User refreshing page from error boundary",
      data: {
        errorType: this.state.errorType,
        errorId: this.state.errorId,
      },
      level: "info",
    });

    window.location.reload();
  };

  private handleReportBug = (): void => {
    const bugReportUrl = `mailto:support@example.com?subject=Game Error Report&body=${encodeURIComponent(
      `Error ID: ${this.state.errorId}\n` +
        `Error Type: ${this.state.errorType}\n` +
        `Lobby Code: ${this.props.lobbyCode || "N/A"}\n` +
        `User: ${this.props.currentUser?.name || "Anonymous"}\n` +
        `Time: ${new Date().toISOString()}\n` +
        `Error: ${this.state.error?.message || "Unknown"}\n\n` +
        `Please describe what you were doing when this error occurred:`,
    )}`;

    window.open(bugReportUrl);
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            reset={this.handleRetry}
            errorInfo={this.state.errorInfo as React.ErrorInfo}
          />
        );
      }

      // Default error UI
      const getErrorIcon = () => {
        switch (this.state.errorType) {
          case "network":
          case "firebase":
            return (
              <RefreshCw className="w-12 h-12 text-orange-400 animate-pulse" />
            );
          case "game_state":
            return <AlertTriangle className="w-12 h-12 text-yellow-400" />;
          default:
            return <Bug className="w-12 h-12 text-red-400" />;
        }
      };

      const getErrorTitle = () => {
        switch (this.state.errorType) {
          case "network":
            return "Connection Error";
          case "firebase":
            return "Server Connection Lost";
          case "game_state":
            return "Game State Error";
          case "rendering":
            return "Display Error";
          default:
            return "Unexpected Error";
        }
      };

      const isRetrying = this.retryTimeout !== null;
      const maxRetriesReached =
        this.state.retryCount >=
        (this.props.maxRetries || this.MAX_AUTO_RETRIES);

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10 max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white font-bangers text-2xl tracking-wide">
                  {getErrorTitle()}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    this.state.errorType === "network" &&
                      "border-orange-400 text-orange-400",
                    this.state.errorType === "firebase" &&
                      "border-blue-400 text-blue-400",
                    this.state.errorType === "game_state" &&
                      "border-yellow-400 text-yellow-400",
                    this.state.errorType === "rendering" &&
                      "border-red-400 text-red-400",
                    this.state.errorType === "unknown" &&
                      "border-gray-400 text-gray-400",
                  )}
                >
                  {this.state.errorType.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Icon and Message */}
              <div className="text-center">
                <div className="flex justify-center mb-4">{getErrorIcon()}</div>

                <p className="text-slate-300 font-bangers text-lg tracking-wide mb-4">
                  {this.state.error.message ||
                    "Something went wrong while playing the game."}
                </p>

                {this.state.errorId && (
                  <p className="text-slate-500 text-sm mb-4">
                    Error ID: {this.state.errorId.substring(0, 8)}
                  </p>
                )}
              </div>

              {/* Recovery Actions */}
              {this.state.recoveryActions.length > 0 && (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h3 className="text-white font-bangers text-sm tracking-wide mb-2 uppercase">
                    What's happening?
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-1">
                    {this.state.recoveryActions.map((action, index) => (
                      <li
                        key={`recovery-${index}-${action}`}
                        className="flex items-start gap-2"
                      >
                        <span className="text-purple-400 mt-0.5">•</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Auto-retry indicator */}
              {isRetrying && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-orange-400 mb-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-bangers tracking-wide">
                      Automatically retrying...
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1">
                    <div className="bg-orange-500 h-1 rounded-full animate-pulse w-3/4"></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {this.state.canRecover && !isRetrying && (
                  <Button
                    onClick={() => this.handleRetry(false)}
                    disabled={maxRetriesReached}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {maxRetriesReached
                      ? "Max Retries Reached"
                      : `Try Again (${this.state.retryCount}/${this.props.maxRetries || this.MAX_AUTO_RETRIES})`}
                  </Button>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={this.handleRefresh}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 font-bangers text-base"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Page
                  </Button>

                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 font-bangers text-base"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </div>

                {this.state.errorId && (
                  <Button
                    onClick={this.handleReportBug}
                    variant="ghost"
                    className="w-full text-slate-400 hover:text-white font-bangers text-sm"
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Report this issue
                  </Button>
                )}
              </div>

              {/* Debug info for development */}
              {process.env.NODE_ENV === "development" && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-400">
                    Debug Info
                  </summary>
                  <pre className="mt-2 p-2 bg-slate-900/50 rounded overflow-auto max-h-32">
                    {JSON.stringify(
                      {
                        error: this.state.error.message,
                        stack: this.state.error.stack?.substring(0, 500),
                        errorType: this.state.errorType,
                        retryCount: this.state.retryCount,
                        connectionInfo:
                          firebaseConnectionManager.getConnectionInfo(),
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
