// Arena component specific state
export interface ArenaState {
  // Card loading state
  cardLoadingState: {
    status: "idle" | "loading" | "loaded" | "error" | "retrying";
    retryCount: number;
    lastRetryTime: number | null;
  };

  // Chat state
  messages: ChatMessage[];
  newMessage: string;
}

// Arena reducer actions
export type ArenaAction =
  | { type: "SET_CARD_LOADING_STATE"; payload: ArenaState["cardLoadingState"] }
  | {
      type: "UPDATE_CARD_LOADING_STATE";
      payload: Partial<ArenaState["cardLoadingState"]>;
    }
  | { type: "RESET_CARD_LOADING" }
  | { type: "SET_MESSAGES"; payload: ChatMessage[] }
  | { type: "SET_NEW_MESSAGE"; payload: string };

// Initial arena state
export const initialArenaState: ArenaState = {
  cardLoadingState: {
    status: "idle",
    retryCount: 0,
    lastRetryTime: null,
  },
  messages: [],
  newMessage: "",
};

// Arena reducer with optimized comparisons
export function arenaReducer(
  state: ArenaState,
  action: ArenaAction,
): ArenaState {
  switch (action.type) {
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

    case "RESET_CARD_LOADING":
      return {
        ...state,
        cardLoadingState: {
          status: "idle",
          retryCount: 0,
          lastRetryTime: null,
        },
      };

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

    default:
      return state;
  }
}
