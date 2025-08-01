import * as React from "react";
import { createLobby, joinLobby } from "@/lib/actions";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";

export function useLobbyOperations(): UseLobbyOperationsReturn {
  const router = useRouter();
  const [lobbyState, setLobbyState] = React.useState<LobbyState>({
    isLoading: false,
    error: null,
    createdLobbyCode: null,
    joinSuccess: false,
  });

  const handleJoinLobby = React.useCallback(
    async (code: string) => {
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

            // Redirect to game lobby
            router.push(`/game/${code}`);
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
        },
      );
    },
    [router],
  );

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

          // Redirect to game lobby
          router.push(`/game/${response.lobby.code}`);
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
      },
    );
  }, [router]);

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
