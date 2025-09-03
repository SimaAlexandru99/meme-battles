// State interface for the game state reducer
export interface GameStateReducerState {
  // Core game data
  gameState: GameState | null;
  players: Player[];
  playerCards: MemeCard[];

  // Loading and connection states
  isLoading: boolean;
  error: string | null;
  connectionStatus: "connected" | "disconnected" | "reconnecting";

  // Card management
  cardsLoadedOnce: boolean;
  cardLoadingState: {
    status: "idle" | "loading" | "loaded" | "error" | "retrying";
    retryCount: number;
    lastRetryTime: number | null;
  };

  // Lobby management
  hostUid: string | null;
  submissionDuration: number | null;
  totalRounds: number;

  // Chat state
  messages: ChatMessage[];
  newMessage: string;
}

// Action types for the reducer
export type GameStateAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | {
      type: "SET_CONNECTION_STATUS";
      payload: "connected" | "disconnected" | "reconnecting";
    }
  | { type: "SET_GAME_STATE"; payload: GameState | null }
  | { type: "SET_PLAYERS"; payload: Player[] }
  | { type: "SET_PLAYER_CARDS"; payload: MemeCard[] }
  | { type: "SET_CARDS_LOADED_ONCE"; payload: boolean }
  | {
      type: "SET_CARD_LOADING_STATE";
      payload: GameStateReducerState["cardLoadingState"];
    }
  | {
      type: "UPDATE_CARD_LOADING_STATE";
      payload: Partial<GameStateReducerState["cardLoadingState"]>;
    }
  | { type: "SET_HOST_UID"; payload: string | null }
  | { type: "SET_SUBMISSION_DURATION"; payload: number | null }
  | { type: "SET_TOTAL_ROUNDS"; payload: number }
  | { type: "SET_MESSAGES"; payload: ChatMessage[] }
  | { type: "SET_NEW_MESSAGE"; payload: string }
  | { type: "RESET_CARD_LOADING" }
  | { type: "CLEAR_ERROR" };

// Initial state
export const initialGameStateReducerState: GameStateReducerState = {
  gameState: null,
  players: [],
  playerCards: [],
  isLoading: true,
  error: null,
  connectionStatus: "disconnected",
  cardsLoadedOnce: false,
  cardLoadingState: {
    status: "idle",
    retryCount: 0,
    lastRetryTime: null,
  },
  hostUid: null,
  submissionDuration: null,
  totalRounds: 8,
  messages: [],
  newMessage: "",
};

// Reducer function with optimized state updates
export function gameStateReducer(
  state: GameStateReducerState,
  action: GameStateAction,
): GameStateReducerState {
  switch (action.type) {
    case "SET_LOADING":
      if (state.isLoading === action.payload) return state;
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      if (state.error === action.payload) return state;
      return { ...state, error: action.payload };

    case "SET_CONNECTION_STATUS":
      if (state.connectionStatus === action.payload) return state;
      return { ...state, connectionStatus: action.payload };

    case "SET_GAME_STATE": {
      // Prevent unnecessary re-renders by comparing game state
      if (JSON.stringify(state.gameState) === JSON.stringify(action.payload)) {
        return state;
      }
      return { ...state, gameState: action.payload };
    }

    case "SET_PLAYERS": {
      // Prevent unnecessary re-renders by shallow comparison
      if (
        state.players.length === action.payload.length &&
        state.players.every(
          (player, index) =>
            player.id === action.payload[index]?.id &&
            player.status === action.payload[index]?.status &&
            player.score === action.payload[index]?.score,
        )
      ) {
        return state;
      }
      return { ...state, players: action.payload };
    }

    case "SET_PLAYER_CARDS": {
      // Prevent unnecessary re-renders for card arrays
      if (
        state.playerCards.length === action.payload.length &&
        state.playerCards.every(
          (card, index) => card.id === action.payload[index]?.id,
        )
      ) {
        return state;
      }
      return { ...state, playerCards: action.payload };
    }

    case "SET_CARDS_LOADED_ONCE":
      if (state.cardsLoadedOnce === action.payload) return state;
      return { ...state, cardsLoadedOnce: action.payload };

    case "SET_CARD_LOADING_STATE":
      if (
        JSON.stringify(state.cardLoadingState) ===
        JSON.stringify(action.payload)
      ) {
        return state;
      }
      return { ...state, cardLoadingState: action.payload };

    case "UPDATE_CARD_LOADING_STATE":
      return {
        ...state,
        cardLoadingState: { ...state.cardLoadingState, ...action.payload },
      };

    case "SET_HOST_UID":
      if (state.hostUid === action.payload) return state;
      return { ...state, hostUid: action.payload };

    case "SET_SUBMISSION_DURATION":
      if (state.submissionDuration === action.payload) return state;
      return { ...state, submissionDuration: action.payload };

    case "SET_TOTAL_ROUNDS":
      if (state.totalRounds === action.payload) return state;
      return { ...state, totalRounds: action.payload };

    case "SET_MESSAGES": {
      // Prevent unnecessary re-renders for messages
      if (
        state.messages.length === action.payload.length &&
        state.messages.every(
          (msg, index) =>
            msg.id === action.payload[index]?.id &&
            msg.message === action.payload[index]?.message,
        )
      ) {
        return state;
      }
      return { ...state, messages: action.payload };
    }

    case "SET_NEW_MESSAGE":
      if (state.newMessage === action.payload) return state;
      return { ...state, newMessage: action.payload };

    case "RESET_CARD_LOADING":
      return {
        ...state,
        cardLoadingState: {
          status: "idle",
          retryCount: 0,
          lastRetryTime: null,
        },
      };

    case "CLEAR_ERROR":
      if (state.error === null) return state;
      return { ...state, error: null };

    default:
      return state;
  }
}

// Selector functions for derived state (memoized)
export const selectIsHost = (state: GameStateReducerState, userId?: string) =>
  Boolean(userId && state.hostUid && userId === state.hostUid);

export const selectHasSubmitted = (
  state: GameStateReducerState,
  userId?: string,
) => state.gameState?.submissions?.[userId || ""] !== undefined;

export const selectHasVoted = (state: GameStateReducerState, userId?: string) =>
  state.gameState?.votes?.[userId || ""] !== undefined;

export const selectHasAbstained = (
  state: GameStateReducerState,
  userId?: string,
) => state.gameState?.abstentions?.[userId || ""] === true;

export const selectCanVote = (
  state: GameStateReducerState,
  userId?: string,
  targetPlayerId?: string,
) =>
  Boolean(
    userId &&
      targetPlayerId &&
      state.gameState?.phase === "voting" &&
      !selectHasVoted(state, userId) &&
      targetPlayerId !== userId &&
      state.gameState?.submissions?.[targetPlayerId] !== undefined,
  );
