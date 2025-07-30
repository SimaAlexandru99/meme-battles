import { useReducer, useCallback } from "react";

export interface PrivateLobbyState {
  showPrivateLobby: boolean;
  isJoining: boolean;
  isCreating: boolean;
  invitationCode: string;
  error: string | null;
  createdLobbyCode: string | null;
}

export interface LobbyInvitation {
  code: string; // 5-character alphanumeric
  lobbyId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  maxPlayers: number;
  currentPlayers: number;
}

export interface PrivateLobby {
  id: string;
  invitationCode: string;
  hostId: string;
  players: Player[];
  status: "waiting" | "starting" | "in-progress" | "completed";
  createdAt: Date;
  settings: {
    maxPlayers: number;
    gameMode: string;
    timeLimit: number;
  };
}

export interface Player {
  id: string;
  nickname: string;
  avatarId: string;
  profileURL?: string;
  isHost: boolean;
  joinedAt: Date;
}

export type LobbyError =
  | "INVALID_CODE"
  | "LOBBY_NOT_FOUND"
  | "LOBBY_FULL"
  | "LOBBY_EXPIRED"
  | "NETWORK_ERROR"
  | "CREATION_FAILED"
  | "PERMISSION_DENIED";

const initialState: PrivateLobbyState = {
  showPrivateLobby: false,
  isJoining: false,
  isCreating: false,
  invitationCode: "",
  error: null,
  createdLobbyCode: null,
};

type Action =
  | { type: "SHOW_LOBBY" }
  | { type: "HIDE_LOBBY" }
  | { type: "SET_INVITATION_CODE"; payload: string }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_JOINING"; payload: boolean }
  | { type: "SET_CREATING"; payload: boolean }
  | { type: "SET_CREATED_LOBBY_CODE"; payload: string | null }
  | { type: "RESET_STATE" };

function privateLobbyReducer(
  state: PrivateLobbyState,
  action: Action
): PrivateLobbyState {
  switch (action.type) {
    case "SHOW_LOBBY":
      return { ...state, showPrivateLobby: true, error: null };
    case "HIDE_LOBBY":
      return initialState;
    case "SET_INVITATION_CODE":
      return { ...state, invitationCode: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_JOINING":
      return { ...state, isJoining: action.payload, error: null };
    case "SET_CREATING":
      return { ...state, isCreating: action.payload, error: null };
    case "SET_CREATED_LOBBY_CODE":
      return { ...state, createdLobbyCode: action.payload };
    case "RESET_STATE":
      return initialState;
    default:
      return state;
  }
}

export function usePrivateLobby() {
  const [state, dispatch] = useReducer(privateLobbyReducer, initialState);

  const showPrivateLobby = useCallback(
    () => dispatch({ type: "SHOW_LOBBY" }),
    []
  );
  const hidePrivateLobby = useCallback(
    () => dispatch({ type: "HIDE_LOBBY" }),
    []
  );
  const setInvitationCode = useCallback(
    (code: string) => dispatch({ type: "SET_INVITATION_CODE", payload: code }),
    []
  );
  const setError = useCallback(
    (error: string | null) => dispatch({ type: "SET_ERROR", payload: error }),
    []
  );

  const joinLobby = useCallback(async (code: string): Promise<void> => {
    dispatch({ type: "SET_JOINING", payload: true });
    try {
      if (!code || code.length !== 5 || !/^[A-Z0-9]{5}$/.test(code)) {
        throw new Error("INVALID_CODE");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (Math.random() > 0.7) {
        throw new Error("LOBBY_NOT_FOUND");
      }
      console.log("Successfully joined lobby with code:", code);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "NETWORK_ERROR";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: "SET_JOINING", payload: false });
    }
  }, []);

  const createLobby = useCallback(async (): Promise<string> => {
    dispatch({ type: "SET_CREATING", payload: true });
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      if (Math.random() > 0.8) {
        throw new Error("CREATION_FAILED");
      }
      const code = Math.random().toString(36).substring(2, 7).toUpperCase();
      dispatch({ type: "SET_CREATED_LOBBY_CODE", payload: code });
      console.log("Successfully created lobby with code:", code);
      return code;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "NETWORK_ERROR";
      dispatch({ type: "SET_ERROR", payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: "SET_CREATING", payload: false });
    }
  }, []);

  const resetState = useCallback(() => dispatch({ type: "RESET_STATE" }), []);

  return {
    ...state,
    showPrivateLobby,
    hidePrivateLobby,
    setInvitationCode,
    setError,
    joinLobby,
    createLobby,
    resetState,
  };
}
