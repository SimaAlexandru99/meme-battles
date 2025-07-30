import * as React from "react";
import { joinLobby, createLobby } from "@/lib/services/lobby.service";
import * as Sentry from "@sentry/nextjs";

interface LobbyState {
  isLoading: boolean;
  error: string | null;
  createdLobbyCode: string | null;
  joinSuccess: boolean;
}

interface UseLobbyOperationsReturn {
  lobbyState: LobbyState;
  handleJoinLobby: (code: string) => Promise<void>;
  handleCreateLobby: () => Promise<string>;
  resetLobbyState: () => void;
}

export function useLobbyOperations(): UseLobbyOperationsReturn {
  const [lobbyState, setLobbyState] = React.useState<LobbyState>({
    isLoading: false,
    error: null,
    createdLobbyCode: null,
    joinSuccess: false,
  });

  const handleJoinLobby = React.useCallback(async (code: string) => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Join Lobby",
      },
      async () => {
        setLobbyState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
          const response = await joinLobby(code);
          console.log("Successfully joined lobby:", response.lobby);

          setLobbyState((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
            joinSuccess: true,
          }));

          // TODO: Navigate to game lobby or show success message
          // For now, just show success feedback
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to join lobby";

          setLobbyState((prev) => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
            joinSuccess: false,
          }));

          throw error;
        }
      }
    );
  }, []);

  const handleCreateLobby = React.useCallback(async () => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Create Lobby",
      },
      async () => {
        setLobbyState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
          const response = await createLobby();
          console.log("Successfully created lobby:", response.lobby);

          setLobbyState((prev) => ({
            ...prev,
            createdLobbyCode: response.lobby.code,
            isLoading: false,
            error: null,
          }));

          return response.lobby.code;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to create lobby";

          setLobbyState((prev) => ({
            ...prev,
            error: errorMessage,
            isLoading: false,
          }));

          throw error;
        }
      }
    );
  }, []);

  const resetLobbyState = React.useCallback(() => {
    setLobbyState({
      isLoading: false,
      error: null,
      createdLobbyCode: null,
      joinSuccess: false,
    });
  }, []);

  return {
    lobbyState,
    handleJoinLobby,
    handleCreateLobby,
    resetLobbyState,
  };
}
