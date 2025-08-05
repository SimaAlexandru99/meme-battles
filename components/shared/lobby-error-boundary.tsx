"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw, Users } from "lucide-react";
import { ErrorHandler } from "@/lib/utils/error-handler";
import { ErrorBoundary } from "./error-boundary";
import { useRouter } from "next/navigation";

interface LobbyErrorFallbackProps {
  error: Error;
  resetError: () => void;
  errorId: string | null;
}

/**
 * Specialized error fallback for lobby-related errors
 */
const LobbyErrorFallback: React.FC<LobbyErrorFallbackProps> = ({
  error,
  resetError,
  errorId,
}) => {
  const router = useRouter();
  const friendlyError = ErrorHandler.getUserFriendlyMessage(error);

  const handleGoHome = () => {
    router.push("/");
  };

  const handleCreateLobby = () => {
    router.push("/create");
  };

  const handleJoinLobby = () => {
    router.push("/join");
  };

  // Determine which actions to show based on error type
  // Safely access custom properties that might not exist on Error
  const errorWithType = error as Error & { type?: string };
  const showLobbyActions =
    errorWithType.type === "LOBBY_NOT_FOUND" ||
    errorWithType.type === "LOBBY_FULL" ||
    errorWithType.type === "LOBBY_ALREADY_STARTED";

  return (
    <div className="flex items-center justify-center min-h-[500px] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Lobby Error</CardTitle>
          <CardDescription className="text-base">
            {friendlyError.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {friendlyError.action && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground text-center">
                💡 {friendlyError.action}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {friendlyError.canRetry && (
              <Button onClick={resetError} className="w-full" size="lg">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}

            {showLobbyActions && (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCreateLobby}
                    className="flex-1"
                    size="lg"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Create Lobby
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleJoinLobby}
                    className="flex-1"
                    size="lg"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Join Lobby
                  </Button>
                </div>
              </>
            )}

            <Button
              variant="ghost"
              onClick={handleGoHome}
              className="w-full"
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          {errorId && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Error ID:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">{errorId}</code>
              </p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Please include this ID when contacting support
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Error boundary specifically designed for lobby components
 */
interface LobbyErrorBoundaryProps {
  children: React.ReactNode;
  lobbyCode?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const LobbyErrorBoundary: React.FC<LobbyErrorBoundaryProps> = ({
  children,
  lobbyCode,
  onError,
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log lobby-specific error context
    ErrorHandler.logError(error, {
      operation: "lobby_error_boundary",
      lobbyCode,
      additionalData: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
  };

  return (
    <ErrorBoundary
      fallback={LobbyErrorFallback}
      onError={handleError}
      resetKeys={lobbyCode ? [lobbyCode] : []} // Reset when lobby code changes
      resetOnPropsChange={true}
    >
      {children}
    </ErrorBoundary>
  );
};
