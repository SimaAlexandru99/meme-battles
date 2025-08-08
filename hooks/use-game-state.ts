import { useState, useEffect, useCallback, useRef } from "react";
import { ref, onValue, off, set, update } from "firebase/database";
import { rtdb } from "@/firebase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import * as Sentry from "@sentry/nextjs";

interface GameState {
  phase:
    | "waiting"
    | "transition"
    | "countdown"
    | "submission"
    | "voting"
    | "results"
    | "game_over";
  timeLeft: number;
  currentSituation: string;
  submissions: Record<
    string,
    { cardId: string; cardName: string; submittedAt: string }
  >;
  votes: Record<string, string>;
  roundNumber: number;
  totalRounds: number;
  winner?: string;
  scores: Record<string, number>;
}

interface PlayerGameData {
  id: string;
  name: string;
  avatar: string;
  score: number;
  status: "waiting" | "playing" | "submitted" | "winner";
  cards: MemeCard[];
  selectedCard?: MemeCard;
  isCurrentPlayer?: boolean;
  isAI?: boolean;
  aiPersonalityId?: string;
}

interface UseGameStateReturn {
  // State
  gameState: GameState | null;
  players: PlayerGameData[];
  playerCards: MemeCard[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: "connected" | "disconnected" | "reconnecting";

  // Actions
  submitCard: (cardId: string) => Promise<void>;
  vote: (submissionPlayerId: string) => Promise<void>;
  startRound: () => Promise<void>;
  nextRound: () => Promise<void>;
  endGame: () => Promise<void>;

  // Utilities
  isCurrentPlayer: boolean;
  hasSubmitted: boolean;
  hasVoted: boolean;
  canVote: (playerId: string) => boolean;
  clearError: () => void;
  isHost: boolean;
}

/**
 * Custom hook for managing game state with real-time synchronization
 * Integrates with lobby system and handles all game operations
 */
export function useGameState(lobbyCode: string): UseGameStateReturn {
  const { user } = useCurrentUser();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<PlayerGameData[]>([]);
  const [playerCards, setPlayerCards] = useState<MemeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "reconnecting"
  >("disconnected");

  // --- Add state for hostUid and isHost ---
  const [hostUid, setHostUid] = useState<string | null>(null);
  const isHost = user && hostUid && user.id === hostUid;

  const gameStateUnsubscribeRef = useRef<UnsubscribeFunction | null>(null);
  const playersUnsubscribeRef = useRef<UnsubscribeFunction | null>(null);
  const playerCardsUnsubscribeRef = useRef<UnsubscribeFunction | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle errors with Sentry tracking
   */
  const handleError = useCallback(
    (error: unknown, operation: string) => {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);

      Sentry.captureException(error, {
        tags: { operation, lobbyCode },
        extra: { lobbyCode, operation },
      });
    },
    [lobbyCode]
  );

  /**
   * Set up real-time listeners for game state
   */
  useEffect(() => {
    if (!lobbyCode || !user) return;

    setIsLoading(true);
    setError(null);

    // Listen to game state changes
    const gameStatePath = `lobbies/${lobbyCode}/gameState`;
    const gameStateRef = ref(rtdb, gameStatePath);

    gameStateUnsubscribeRef.current = onValue(
      gameStateRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val() as GameState;
          setGameState(data);
          setConnectionStatus("connected");
        } else {
          setGameState(null);
        }
        setIsLoading(false);
      },
      (error) => {
        handleError(error, "game_state_listener");
        setConnectionStatus("disconnected");
      }
    );

    // Listen to players data
    const playersPath = `lobbies/${lobbyCode}/players`;
    const playersRef = ref(rtdb, playersPath);

    playersUnsubscribeRef.current = onValue(
      playersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const playersData = snapshot.val() as Record<string, PlayerData>;
          const gamePlayers: PlayerGameData[] = Object.entries(playersData).map(
            ([id, player]) => ({
              id,
              name: player.displayName,
              avatar: player.profileURL || "",
              score: player.score || 0,
              status: "waiting",
              cards: player.cards || [],
              isCurrentPlayer: id === user.id,
              isAI: player.isAI || false,
              aiPersonalityId: player.aiPersonalityId,
            })
          );
          setPlayers(gamePlayers);
        }
      },
      (error) => {
        handleError(error, "players_listener");
      }
    );

    // Listen to current player's cards
    const playerCardsPath = `lobbies/${lobbyCode}/players/${user.id}/cards`;
    const playerCardsRef = ref(rtdb, playerCardsPath);

    playerCardsUnsubscribeRef.current = onValue(
      playerCardsRef,
      (snapshot) => {
        console.log(
          "Player cards snapshot:",
          snapshot.exists(),
          snapshot.val()
        );
        if (snapshot.exists()) {
          const cards = snapshot.val() as MemeCard[];
          console.log("Setting player cards:", cards);
          setPlayerCards(cards || []);
        } else {
          console.log("No player cards found at path:", playerCardsPath);
        }
      },
      (error) => {
        handleError(error, "player_cards_listener");
      }
    );

    // --- Listen to lobby data for hostUid ---
    useEffect(() => {
      if (!lobbyCode) return;
      const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
      const unsubscribe = onValue(lobbyRef, (snapshot) => {
        if (snapshot.exists()) {
          const lobby = snapshot.val();
          setHostUid(lobby.hostUid || null);
        } else {
          setHostUid(null);
        }
      });
      return () => off(lobbyRef, "value", unsubscribe);
    }, [lobbyCode]);

    return () => {
      if (gameStateUnsubscribeRef.current) {
        off(ref(rtdb, gameStatePath), "value", gameStateUnsubscribeRef.current);
      }
      if (playersUnsubscribeRef.current) {
        off(ref(rtdb, playersPath), "value", playersUnsubscribeRef.current);
      }
      if (playerCardsUnsubscribeRef.current) {
        off(
          ref(rtdb, playerCardsPath),
          "value",
          playerCardsUnsubscribeRef.current
        );
      }
    };
  }, [lobbyCode, user, handleError]);

  // --- Helper: handle phase/round transition when timer expires ---
  const handleTimerExpire = useCallback(async () => {
    if (!isHost || !gameState) return;
    try {
      if (gameState.phase === "submission") {
        // Move to voting phase
        await update(ref(rtdb, `lobbies/${lobbyCode}/gameState`), {
          phase: "voting",
          timeLeft: 30, // e.g., 30 seconds for voting
        });
      } else if (gameState.phase === "voting") {
        // Move to results phase
        await update(ref(rtdb, `lobbies/${lobbyCode}/gameState`), {
          phase: "results",
          timeLeft: 10, // e.g., 10 seconds for results
        });
      } else if (gameState.phase === "results") {
        // Move to next round or end game
        if (gameState.roundNumber < gameState.totalRounds) {
          await nextRound();
        } else {
          await endGame();
        }
      } else if (gameState.phase === "countdown") {
        // Start the round after countdown
        await startRound();
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { operation: "phase_transition", lobbyCode } });
    }
  }, [isHost, gameState, lobbyCode, nextRound, endGame, startRound]);

  // --- Timer decrement logic for host ---
  useEffect(() => {
    if (!isHost || !gameState || typeof gameState.timeLeft !== "number") return;
    const timedPhases = ["submission", "voting", "countdown", "results"];
    if (!timedPhases.includes(gameState.phase)) return;
    if (gameState.timeLeft <= 0) {
      handleTimerExpire();
      return;
    }
    const gameStatePath = `lobbies/${lobbyCode}/gameState`;
    const timer = setInterval(async () => {
      try {
        const current = gameState.timeLeft;
        if (current > 0) {
          await update(ref(rtdb, gameStatePath), { timeLeft: current - 1 });
        } else {
          clearInterval(timer);
          handleTimerExpire();
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { operation: "timer_decrement", lobbyCode } });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isHost, gameState, lobbyCode, handleTimerExpire]);

  /**
   * Submit a card for the current round
   */
  const submitCard = useCallback(
    async (cardId: string): Promise<void> => {
      if (!user || !gameState || !lobbyCode) {
        throw new Error("Cannot submit card: missing user or game state");
      }

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Submit Card",
        },
        async () => {
          try {
            const submission = {
              cardId,
              cardName:
                playerCards.find((card) => card.id === cardId)?.filename || "",
              submittedAt: new Date().toISOString(),
            };

            const submissionPath = `lobbies/${lobbyCode}/gameState/submissions/${user.id}`;
            await set(ref(rtdb, submissionPath), submission);

            // Update player status
            const playerStatusPath = `lobbies/${lobbyCode}/players/${user.id}/status`;
            await set(ref(rtdb, playerStatusPath), "submitted");
          } catch (error) {
            handleError(error, "submit_card");
            throw error;
          }
        }
      );
    },
    [user, gameState, lobbyCode, playerCards, handleError]
  );

  /**
   * Vote for a submission
   */
  const vote = useCallback(
    async (submissionPlayerId: string): Promise<void> => {
      if (!user || !gameState || !lobbyCode) {
        throw new Error("Cannot vote: missing user or game state");
      }

      if (submissionPlayerId === user.id) {
        throw new Error("Cannot vote for your own submission");
      }

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Vote",
        },
        async () => {
          try {
            const votePath = `lobbies/${lobbyCode}/gameState/votes/${user.id}`;
            await set(ref(rtdb, votePath), submissionPlayerId);
          } catch (error) {
            handleError(error, "vote");
            throw error;
          }
        }
      );
    },
    [user, gameState, lobbyCode, handleError]
  );

  /**
   * Start a new round (host only)
   */
  const startRound = useCallback(async (): Promise<void> => {
    if (!user || !gameState || !lobbyCode) {
      throw new Error("Cannot start round: missing user or game state");
    }

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Start Round",
      },
      async () => {
        try {
          const gameStatePath = `lobbies/${lobbyCode}/gameState`;
          await update(ref(rtdb, gameStatePath), {
            phase: "submission",
            timeLeft: 60, // 60 seconds for submission
            submissions: {},
            votes: {},
          });
        } catch (error) {
          handleError(error, "start_round");
          throw error;
        }
      }
    );
  }, [user, gameState, lobbyCode, handleError]);

  /**
   * Move to next round (host only)
   */
  const nextRound = useCallback(async (): Promise<void> => {
    if (!user || !gameState || !lobbyCode) {
      throw new Error("Cannot start next round: missing user or game state");
    }

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Next Round",
      },
      async () => {
        try {
          const nextRoundNumber = (gameState.roundNumber || 1) + 1;
          const gameStatePath = `lobbies/${lobbyCode}/gameState`;

          await update(ref(rtdb, gameStatePath), {
            roundNumber: nextRoundNumber,
            phase: "countdown",
            timeLeft: 5, // 5 second countdown
            submissions: {},
            votes: {},
          });
        } catch (error) {
          handleError(error, "next_round");
          throw error;
        }
      }
    );
  }, [user, gameState, lobbyCode, handleError]);

  /**
   * End the game (host only)
   */
  const endGame = useCallback(async (): Promise<void> => {
    if (!user || !lobbyCode) {
      throw new Error("Cannot end game: missing user");
    }

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "End Game",
      },
      async () => {
        try {
          const gameStatePath = `lobbies/${lobbyCode}/gameState`;
          await update(ref(rtdb, gameStatePath), {
            phase: "game_over",
            timeLeft: 0,
          });
        } catch (error) {
          handleError(error, "end_game");
          throw error;
        }
      }
    );
  }, [user, lobbyCode, handleError]);

  // Derived state
  const isCurrentPlayer = !!user;
  const hasSubmitted = gameState?.submissions?.[user?.id || ""] !== undefined;
  const hasVoted = gameState?.votes?.[user?.id || ""] !== undefined;

  const canVote = useCallback(
    (playerId: string) => {
      return (
        isCurrentPlayer &&
        gameState?.phase === "voting" &&
        !hasVoted &&
        playerId !== user?.id &&
        gameState?.submissions?.[playerId] !== undefined
      );
    },
    [isCurrentPlayer, gameState, hasVoted, user?.id]
  );

  return {
    // State
    gameState,
    players,
    playerCards,
    isLoading,
    error,
    connectionStatus,

    // Actions
    submitCard,
    vote,
    startRound,
    nextRound,
    endGame,

    // Utilities
    isCurrentPlayer,
    hasSubmitted,
    hasVoted,
    canVote,
    clearError,
    isHost,
  };
}
