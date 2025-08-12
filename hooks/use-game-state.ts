import { useState, useEffect, useCallback, useRef } from "react";
import {
  ref,
  onValue,
  off,
  set,
  update,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "@/firebase/client";
import { MemeCardPool } from "@/lib/utils/meme-card-pool";
import { AIBotService } from "@/lib/services/ai-bot.service";
import { lobbyService } from "@/lib/services/lobby.service";
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
  abstentions?: Record<string, boolean>;
  roundNumber: number;
  totalRounds: number;
  winner?: string;
  scores: Record<string, number>;
}

interface UseGameStateReturn {
  // State
  gameState: GameState | null;
  players: Player[];
  playerCards: MemeCard[];
  isLoading: boolean;
  error: string | null;
  connectionStatus: "connected" | "disconnected" | "reconnecting";

  // Actions
  submitCard: (cardId: string) => Promise<void>;
  vote: (submissionPlayerId: string) => Promise<void>;
  abstain: () => Promise<void>;
  startRound: () => Promise<void>;
  nextRound: () => Promise<void>;
  endGame: () => Promise<void>;

  // Utilities
  isCurrentPlayer: boolean;
  hasSubmitted: boolean;
  hasVoted: boolean;
  hasAbstained: boolean;
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
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerCards, setPlayerCards] = useState<MemeCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "reconnecting"
  >("disconnected");

  // --- Add state for hostUid and isHost ---
  const [hostUid, setHostUid] = useState<string | null>(null);
  // Duration for submission phase (derived from lobby settings.timeLimit)
  const [submissionDuration, setSubmissionDuration] = useState<number | null>(
    null
  );
  const isHost = Boolean(user && hostUid && user.id === hostUid);

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
              submittedAt: serverTimestamp(),
            };

            const submissionPath = `lobbies/${lobbyCode}/gameState/submissions/${user.id}`;
            await set(ref(rtdb, submissionPath), submission);

            // Update player status to "submitted"
            const playerStatusPath = `lobbies/${lobbyCode}/players/${user.id}`;
            await update(ref(rtdb, playerStatusPath), {
              status: "submitted",
              lastSeen: new Date().toISOString(),
            });
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
   * Abstain from voting
   */
  const abstain = useCallback(async (): Promise<void> => {
    if (!user || !gameState || !lobbyCode) {
      throw new Error("Cannot abstain: missing user or game state");
    }

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Abstain",
      },
      async () => {
        try {
          const abstainPath = `lobbies/${lobbyCode}/gameState/abstentions/${user.id}`;
          await set(ref(rtdb, abstainPath), true);
        } catch (error) {
          handleError(error, "abstain");
          throw error;
        }
      }
    );
  }, [user, gameState, lobbyCode, handleError]);

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
          const updates: Record<string, unknown> = {
            phase: "submission",
            timeLeft: submissionDuration ?? 60,
            submissions: {},
            votes: {},
            phaseStartTime: serverTimestamp(),
          };

          // Generate a new situation if one doesn't exist
          if (!gameState.currentSituation) {
            let newSituation: string;
            try {
              const response = await fetch("/api/situation", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              });

              if (response.ok) {
                const data = await response.json();
                newSituation =
                  data.situation ||
                  "When you're trying to be productive but your bed is calling your name";
              } else {
                throw new Error("Situation API failed");
              }
            } catch (error) {
              // Fallback to a default situation if AI generation fails
              const fallbackSituations = [
                "When you realize you've been pronouncing a word wrong your entire life",
                "When your phone battery dies right before you need to show someone a funny video",
                "When you're trying to be productive but your bed is calling your name",
                "When you finally understand a meme that's been popular for months",
                "When you're pretending to listen but actually thinking about something else entirely",
              ];
              newSituation =
                fallbackSituations[
                  Math.floor(Math.random() * fallbackSituations.length)
                ];
              Sentry.captureException(error, {
                tags: { operation: "situation_generation", lobbyCode },
              });
            }
            updates.currentSituation = newSituation;
          }

          await update(ref(rtdb, gameStatePath), updates);
        } catch (error) {
          handleError(error, "start_round");
          throw error;
        }
      }
    );
  }, [user, gameState, lobbyCode, handleError, submissionDuration]);

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

          // Refill player hands back to 7 by replacing submitted card(s)
          // Build a pool of used cards across all players to avoid duplicates
          const pool = new MemeCardPool();

          const submissions = gameState.submissions || {};

          // Collect all currently held card IDs across players (pre-removal)
          const allHeldCardIds: string[] = [];
          for (const p of players) {
            const playerCardsArray = (p.cards || []) as MemeCard[];
            for (const c of playerCardsArray) {
              allHeldCardIds.push(c.id);
            }
          }
          // Mark all currently held as used to maintain uniqueness when drawing
          pool.markCardsAsUsed(allHeldCardIds);

          // Build batched updates for each player's cards
          const updates: Record<string, unknown> = {};
          for (const p of players) {
            const playerId = p.id;
            const playerCardsArray = (p.cards || []) as MemeCard[];

            // Remove submitted card for this player if present
            const submitted = submissions[playerId];
            const filtered = submitted
              ? playerCardsArray.filter((c) => c.id !== submitted.cardId)
              : playerCardsArray;

            // Ensure uniqueness by marking remaining as used (already done globally),
            // then draw additional cards to reach 7
            let newHand = [...filtered];
            const needed = Math.max(0, 7 - newHand.length);
            if (needed > 0) {
              const extra = pool.getPlayerCards(needed);
              newHand = newHand.concat(extra);
            }

            updates[`lobbies/${lobbyCode}/players/${playerId}/cards`] = newHand;
          }

          // Generate a new situation for the next round
          let newSituation: string;
          try {
            const response = await fetch("/api/situation", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (response.ok) {
              const data = await response.json();
              newSituation =
                data.situation ||
                "When you're trying to be productive but your bed is calling your name";
            } else {
              throw new Error("Situation API failed");
            }
          } catch (error) {
            // Fallback to a default situation if AI generation fails
            const fallbackSituations = [
              "When you realize you've been pronouncing a word wrong your entire life",
              "When your phone battery dies right before you need to show someone a funny video",
              "When you're trying to be productive but your bed is calling your name",
              "When you finally understand a meme that's been popular for months",
              "When you're pretending to listen but actually thinking about something else entirely",
            ];
            newSituation =
              fallbackSituations[
                Math.floor(Math.random() * fallbackSituations.length)
              ];
            Sentry.captureException(error, {
              tags: { operation: "situation_generation", lobbyCode },
            });
          }

          // Add game state transition to the same batch
          updates[`${gameStatePath}/roundNumber`] = nextRoundNumber;
          updates[`${gameStatePath}/phase`] = "countdown";
          updates[`${gameStatePath}/timeLeft`] = 5; // 5 second countdown
          updates[`${gameStatePath}/phaseStartTime`] = serverTimestamp();
          updates[`${gameStatePath}/currentSituation`] = newSituation;
          updates[`${gameStatePath}/submissions`] = {};
          updates[`${gameStatePath}/votes`] = {};

          await update(ref(rtdb), updates);
        } catch (error) {
          handleError(error, "next_round");
          throw error;
        }
      }
    );
  }, [user, gameState, lobbyCode, handleError, players]);

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

  // --- Helper: handle phase/round transition when timer expires ---
  const handleTimerExpire = useCallback(async () => {
    if (!isHost || !gameState) return;
    try {
      if (gameState.phase === "submission") {
        // Move directly to results phase (combined voting + results)
        await update(ref(rtdb, `lobbies/${lobbyCode}/gameState`), {
          phase: "results",
          timeLeft: 30, // voting window inside results
          phaseStartTime: serverTimestamp(),
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
      Sentry.captureException(err, {
        tags: { operation: "phase_transition", lobbyCode },
      });
    }
  }, [isHost, gameState, lobbyCode, nextRound, endGame, startRound]);

  // --- Early transition to results (with voting window) when all submissions are in (host only) ---
  useEffect(() => {
    if (!isHost) return;
    if (!gameState || gameState.phase !== "submission") return;
    const totalPlayers = players.length;
    const submittedCount = Object.keys(gameState.submissions || {}).length;
    if (totalPlayers > 0 && submittedCount >= totalPlayers) {
      const gameStatePath = `lobbies/${lobbyCode}/gameState`;
      update(ref(rtdb, gameStatePath), {
        phase: "results",
        timeLeft: 30,
        phaseStartTime: serverTimestamp(),
      }).catch((err) => {
        Sentry.captureException(err, {
          tags: {
            operation: "early_transition_results_from_submission",
            lobbyCode,
          },
          extra: { submittedCount, totalPlayers },
        });
      });
    }
  }, [isHost, gameState, players.length, lobbyCode]);

  // --- During results (voting window), if all votes/abstentions are in, shorten display window (host only) ---
  useEffect(() => {
    if (!isHost) return;
    if (!gameState || gameState.phase !== "results") return;
    // Trigger AI votes once when entering voting
    try {
      const aiBotService = AIBotService.getInstance();
      const playersRecord: Record<string, PlayerData> = {} as any;
      for (const p of players) {
        playersRecord[p.id] = {
          id: p.id,
          displayName: p.name,
          profileURL: p.avatar,
          isAI: (p as any).isAI,
          aiPersonalityId: (p as any).aiPersonalityId,
          aiDifficulty: (p as any).aiDifficulty,
        } as any;
      }
      const submissionsRecord = (gameState.submissions || {}) as Record<
        string,
        { cardId: string; cardName: string }
      >;
      aiBotService
        .processAIBotVotes(
          lobbyCode,
          playersRecord,
          submissionsRecord,
          gameState.currentSituation
        )
        .catch((err) =>
          Sentry.captureException(err, {
            tags: { operation: "ai_bot_votes_on_voting_phase", lobbyCode },
          })
        );
    } catch (err) {
      Sentry.captureException(err, {
        tags: { operation: "ai_bot_votes_on_voting_phase_setup", lobbyCode },
      });
    }
    const totalPlayers = players.length;
    const votesCount = Object.keys(gameState.votes || {}).length;
    const abstainCount = Object.keys(gameState.abstentions || {}).length;
    if (totalPlayers > 0 && votesCount + abstainCount >= totalPlayers) {
      const gameStatePath = `lobbies/${lobbyCode}/gameState`;
      update(ref(rtdb, gameStatePath), {
        timeLeft: 10,
        phaseStartTime: serverTimestamp(),
      }).catch((err) => {
        Sentry.captureException(err, {
          tags: {
            operation: "early_results_shorten_after_all_votes",
            lobbyCode,
          },
          extra: { votesCount, abstainCount, totalPlayers },
        });
      });
    }
  }, [isHost, gameState, players.length, lobbyCode]);

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
          const playersData = snapshot.val() as unknown as Record<
            string,
            PlayerData
          >;
          const nowMs = Date.now();
          const ONLINE_WINDOW_MS = 30_000; // 30 seconds window considered online
          const gamePlayers: Player[] = Object.entries(playersData).map(
            ([id, player]: [string, PlayerData]) => {
              const lastSeenIso = player.lastSeen;
              const lastSeenMs = lastSeenIso
                ? new Date(lastSeenIso).getTime()
                : 0;
              const isOnline = nowMs - lastSeenMs < ONLINE_WINDOW_MS;
              return {
                id,
                name: player.displayName,
                avatar: player.profileURL || "",
                score: player.score || 0,
                status: (player.status as Player["status"]) || "waiting",
                cards: player.cards || [],
                isCurrentPlayer: id === user.id,
                // Presence and metadata for UI
                lastSeen: lastSeenIso,
                isOnline,
                // Extended optional flags used by UI components
                isAI: player.isAI || false,
                aiPersonalityId: player.aiPersonalityId,
                isHost: Boolean(player.isHost),
              };
            }
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
  }, [user, handleError, lobbyCode]);

  // --- Initialize presence with onDisconnect handler ---
  useEffect(() => {
    if (!user || !lobbyCode) return;
    const unsubscribePresence = lobbyService.initializePresence(
      lobbyCode,
      user.id
    );
    return () => {
      try {
        unsubscribePresence();
      } catch (err) {
        Sentry.captureException(err, {
          tags: { operation: "presence_unsubscribe", lobbyCode },
          extra: { userId: user.id },
        });
      }
    };
  }, [user, lobbyCode]);

  // --- Listen to lobby data for hostUid and time limit; maintain heartbeat ---
  useEffect(() => {
    if (!lobbyCode) return;
    const lobbyRef = ref(rtdb, `lobbies/${lobbyCode}`);
    const unsubscribe = onValue(lobbyRef, (snapshot) => {
      if (snapshot.exists()) {
        const lobby = snapshot.val();
        setHostUid(lobby.hostUid || null);
        const limit = Number(lobby?.settings?.timeLimit);
        setSubmissionDuration(Number.isFinite(limit) && limit > 0 ? limit : 60);
      } else {
        setHostUid(null);
        setSubmissionDuration(null);
      }
    });
    return () => off(lobbyRef, "value", unsubscribe);
  }, [lobbyCode]);

  // --- Heartbeat: periodically bump current player's lastSeen ---
  useEffect(() => {
    if (!user || !lobbyCode) return;
    const interval = setInterval(() => {
      const now = new Date().toISOString();
      const playerRef = ref(rtdb, `lobbies/${lobbyCode}/players/${user.id}`);
      update(playerRef, { lastSeen: now }).catch((err) =>
        Sentry.captureException(err, {
          tags: { operation: "presence_heartbeat", lobbyCode },
          extra: { userId: user.id },
        })
      );
    }, 15000); // 15s heartbeat
    return () => clearInterval(interval);
  }, [user, lobbyCode]);

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
          await handleTimerExpire();
        }
      } catch (err) {
        Sentry.captureException(err, {
          tags: { operation: "timer_decrement", lobbyCode },
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isHost, gameState, handleTimerExpire, lobbyCode]);

  // Derived state
  const isCurrentPlayer = !!user;
  const hasSubmitted = gameState?.submissions?.[user?.id || ""] !== undefined;
  const hasVoted = gameState?.votes?.[user?.id || ""] !== undefined;
  const hasAbstained = gameState?.abstentions?.[user?.id || ""] === true;

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
    abstain,
    startRound,
    nextRound,
    endGame,

    // Utilities
    isCurrentPlayer,
    hasSubmitted,
    hasVoted,
    hasAbstained,
    canVote,
    clearError,
    isHost,
  };
}
