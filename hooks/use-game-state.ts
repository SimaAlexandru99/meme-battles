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
import { calculateRoundScoring, type PlayerStreak } from "@/lib/utils/scoring";
import * as Sentry from "@sentry/nextjs";

interface GameState {
  phase:
    | "waiting"
    | "transition"
    | "countdown"
    | "submission"
    | "voting"
    | "results"
    | "leaderboard"
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
  playerStreaks?: Record<string, PlayerStreak>;
  // Optional phase start marker written with serverTimestamp() when transitioning
  phaseStartTime?: number;
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
  resetGameState: () => Promise<void>;
  completeGameTransition: () => Promise<void>;

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
  const [cardsLoadedOnce, setCardsLoadedOnce] = useState(false);
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
  // Total rounds from lobby settings
  const [totalRounds, setTotalRounds] = useState<number>(8);
  const isHost = Boolean(user && hostUid && user.id === hostUid);

  const gameStateUnsubscribeRef = useRef<UnsubscribeFunction | null>(null);
  const playersUnsubscribeRef = useRef<UnsubscribeFunction | null>(null);
  const playerCardsUnsubscribeRef = useRef<UnsubscribeFunction | null>(null);
  // Guards to avoid repeated side-effects per phase
  const aiVotesPhaseKeyRef = useRef<string | null>(null);
  const aiSubmissionsPhaseKeyRef = useRef<string | null>(null);

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
   * Reset game state to initial values (host only)
   */
  const resetGameState = useCallback(async (): Promise<void> => {
    if (!user || !lobbyCode) {
      throw new Error("Cannot reset game state: missing user or lobby code");
    }

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Reset Game State",
      },
      async () => {
        try {
          const gameStatePath = `lobbies/${lobbyCode}/gameState`;
          const updates: Record<string, unknown> = {
            phase: "waiting",
            roundNumber: 0,
            totalRounds: totalRounds,
            timeLeft: 0,
            currentSituation: "",
            submissions: {},
            votes: {},
            abstentions: {},
            winner: null,
            scores: {},
            phaseStartTime: serverTimestamp(),
          };

          await update(ref(rtdb, gameStatePath), updates);

          // Reset all player statuses to waiting
          const playerUpdates: Record<string, unknown> = {};
          for (const p of players) {
            playerUpdates[`lobbies/${lobbyCode}/players/${p.id}/status`] =
              "waiting";
          }

          if (Object.keys(playerUpdates).length > 0) {
            await update(ref(rtdb), playerUpdates);
          }
        } catch (error) {
          handleError(error, "reset_game_state");
          throw error;
        }
      }
    );
  }, [user, lobbyCode, totalRounds, players, handleError]);

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
            // DON'T reset roundNumber - preserve existing round number from nextRound()
            totalRounds: totalRounds, // Use total rounds from lobby settings
            currentSituation: "", // Initialize empty situation
            submissions: {},
            votes: {},
            abstentions: {}, // Reset abstentions
            winner: null, // Reset winner
            scores: {}, // Reset scores
            phaseStartTime: serverTimestamp(),
          };

          console.log("🎬 startRound called:", {
            currentRoundNumber: gameState.roundNumber,
            phase: gameState.phase,
            preservingRoundNumber: true,
          });

          // Generate a new situation if one doesn't exist or is empty
          if (
            !gameState.currentSituation ||
            gameState.currentSituation.trim() === ""
          ) {
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
          } else {
            // Always ensure we have a situation for the new round
            updates.currentSituation = gameState.currentSituation;
          }

          await update(ref(rtdb, gameStatePath), updates);
        } catch (error) {
          handleError(error, "start_round");
          throw error;
        }
      }
    );
  }, [
    user,
    gameState,
    lobbyCode,
    submissionDuration,
    totalRounds,
    handleError,
  ]);

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

            // CRITICAL: Always ensure exactly 7 cards per player as per game rules
            let newHand = [...filtered];
            const needed = Math.max(0, 7 - newHand.length);
            if (needed > 0) {
              try {
                const extra = pool.getPlayerCards(needed);
                newHand = newHand.concat(extra);
              } catch (error) {
                console.error(
                  `Failed to get ${needed} cards for player ${playerId}:`,
                  error
                );
                // If we can't get enough unique cards, at least try to maintain the hand
                Sentry.captureException(error, {
                  tags: { operation: "card_refill", lobbyCode },
                  extra: { playerId, needed, currentHandSize: newHand.length },
                });
              }
            }

            // Ensure we have exactly 7 cards (game rule requirement)
            if (newHand.length !== 7) {
              console.warn(
                `Player ${playerId} has ${newHand.length} cards instead of 7`
              );
            }

            updates[`lobbies/${lobbyCode}/players/${playerId}/cards`] = newHand;

            // Reset player status for new round
            updates[`lobbies/${lobbyCode}/players/${playerId}/status`] =
              "waiting";
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

          // Add game state transition to the same batch - RESET ALL STATE FOR NEW ROUND
          // This ensures each round starts with a completely clean slate
          console.log("🚀 Starting next round:", {
            currentRound: gameState.roundNumber,
            nextRound: nextRoundNumber,
            totalRounds: gameState.totalRounds,
          });
          updates[`${gameStatePath}/roundNumber`] = nextRoundNumber;
          updates[`${gameStatePath}/phase`] = "countdown";
          updates[`${gameStatePath}/timeLeft`] = 5; // 5 second countdown
          updates[`${gameStatePath}/phaseStartTime`] = serverTimestamp();
          updates[`${gameStatePath}/currentSituation`] = newSituation;
          updates[`${gameStatePath}/submissions`] = {}; // Reset all submissions
          updates[`${gameStatePath}/votes`] = {}; // Reset all votes
          updates[`${gameStatePath}/abstentions`] = {}; // Reset all abstentions
          updates[`${gameStatePath}/winner`] = null; // Reset winner
          // DON'T reset scores - keep cumulative scores across rounds!

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

  /**
   * Complete game transition (host only)
   */
  const completeGameTransition = useCallback(async (): Promise<void> => {
    if (!user || !lobbyCode) {
      throw new Error(
        "Cannot complete game transition: missing user or lobby code"
      );
    }

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Complete Game Transition",
      },
      async () => {
        try {
          console.log("🎮 GameState: Completing game transition");

          // Transition from "transition" phase to "submission" phase
          const gameStatePath = `lobbies/${lobbyCode}/gameState`;
          const updates: Record<string, unknown> = {
            phase: "submission",
            phaseStartTime: serverTimestamp(),
          };

          await update(ref(rtdb, gameStatePath), updates);
          console.log("✅ GameState: Game transition completed successfully");
        } catch (error) {
          handleError(error, "complete_game_transition");
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
        // Move to separate voting phase
        await update(ref(rtdb, `lobbies/${lobbyCode}/gameState`), {
          phase: "voting",
          timeLeft: Math.min(30, Math.floor((submissionDuration || 60) / 2)), // Voting time = half of submission time, max 30s
          votes: {}, // Ensure votes object exists
          abstentions: {}, // Ensure abstentions object exists
          phaseStartTime: serverTimestamp(),
        });
      } else if (gameState.phase === "voting") {
        // Calculate scores and move to results phase
        const scoringResult = calculateRoundScoring(
          players as unknown as Player[],
          gameState.submissions || {},
          gameState.votes || {},
          gameState.roundNumber || 1,
          gameState.scores || {},
          gameState.playerStreaks || {}
        );

        await update(ref(rtdb, `lobbies/${lobbyCode}/gameState`), {
          phase: "results",
          timeLeft: 10, // 10 seconds to view results
          scores: scoringResult.updatedScores,
          playerStreaks: scoringResult.updatedStreaks,
          winner: scoringResult.winner,
          phaseStartTime: serverTimestamp(),
        });
      } else if (gameState.phase === "results") {
        // Move to leaderboard after results
        await update(ref(rtdb, `lobbies/${lobbyCode}/gameState`), {
          phase: "leaderboard",
          timeLeft: 15, // 15 seconds to view leaderboard
          phaseStartTime: serverTimestamp(),
        });
      } else if (gameState.phase === "leaderboard") {
        // Move to next round or end game
        console.log("🏁 Leaderboard phase ending - checking rounds:", {
          currentRound: gameState.roundNumber,
          totalRounds: gameState.totalRounds,
          shouldContinue: gameState.roundNumber < gameState.totalRounds,
        });
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
  }, [
    isHost,
    gameState,
    lobbyCode,
    nextRound,
    endGame,
    startRound,
    players,
    submissionDuration,
  ]);

  // --- Early transition to voting when all submissions are in (host only) ---
  useEffect(() => {
    if (!isHost) return;
    if (!gameState || gameState.phase !== "submission") return;

    const totalPlayers = players.length;
    const submissions = gameState.submissions || {};
    const submittedCount = Object.keys(submissions).length;

    // Calculate time elapsed since submission phase started
    const phaseStartTime = gameState.phaseStartTime || Date.now();
    const timeElapsed = Date.now() - phaseStartTime;
    const MIN_SUBMISSION_TIME = 10000; // Minimum 10 seconds for human players

    console.log("🗳️ Checking early transition to voting:", {
      phase: gameState.phase,
      roundNumber: gameState.roundNumber,
      totalPlayers,
      submittedCount,
      submissions: Object.keys(submissions),
      timeElapsed: Math.round(timeElapsed / 1000) + "s",
      minTimeReached: timeElapsed >= MIN_SUBMISSION_TIME,
      shouldTransition:
        totalPlayers > 0 &&
        submittedCount >= totalPlayers &&
        timeElapsed >= MIN_SUBMISSION_TIME,
    });

    // Only transition early if all players submitted AND minimum time has passed
    if (
      totalPlayers > 0 &&
      submittedCount >= totalPlayers &&
      timeElapsed >= MIN_SUBMISSION_TIME
    ) {
      console.log(
        "✅ All players submitted and minimum time passed, transitioning to voting early"
      );
      const gameStatePath = `lobbies/${lobbyCode}/gameState`;
      update(ref(rtdb, gameStatePath), {
        phase: "voting",
        timeLeft: Math.min(30, Math.floor((submissionDuration || 60) / 2)), // Voting time = half of submission time, max 30s
        votes: {}, // Ensure votes object exists
        abstentions: {}, // Ensure abstentions object exists
        phaseStartTime: serverTimestamp(),
      }).catch((err) => {
        Sentry.captureException(err, {
          tags: {
            operation: "early_transition_voting_from_submission",
            lobbyCode,
          },
          extra: { submittedCount, totalPlayers, submissions, timeElapsed },
        });
      });
    }
  }, [isHost, gameState, players.length, lobbyCode, submissionDuration]);

  // --- During submission phase, trigger AI submissions (host only) ---
  useEffect(() => {
    if (!isHost) return;
    if (!gameState || gameState.phase !== "submission") return;
    const phaseKey = String(
      gameState.phaseStartTime ?? `${gameState.roundNumber}-submission`
    );

    // Trigger AI submissions once per submission phase
    if (aiSubmissionsPhaseKeyRef.current !== phaseKey) {
      aiSubmissionsPhaseKeyRef.current = phaseKey;
      console.log(
        "🤖 Triggering AI bot submissions for round",
        gameState.roundNumber
      );

      try {
        const aiBotService = AIBotService.getInstance();
        const playersRecord: Record<string, PlayerData> = {};
        for (const p of players) {
          playersRecord[p.id] = {
            id: p.id,
            displayName: p.name,
            avatarId: p.avatar,
            profileURL: p.avatar,
            joinedAt: p.lastSeen || new Date().toISOString(),
            isHost: p.isHost || false,
            score: p.score || 0,
            status: (p.status as PlayerStatus) || "waiting",
            lastSeen: p.lastSeen || new Date().toISOString(),
            isAI: p.isAI,
            aiPersonalityId: p.aiPersonalityId,
            aiDifficulty: p.aiDifficulty,
            cards: p.cards || [],
          };
        }

        aiBotService
          .processAIBotSubmissions(
            lobbyCode,
            playersRecord,
            gameState.currentSituation
          )
          .catch((err) =>
            Sentry.captureException(err, {
              tags: {
                operation: "ai_bot_submissions_on_submission_phase",
                lobbyCode,
              },
            })
          );
      } catch (err) {
        Sentry.captureException(err, {
          tags: {
            operation: "ai_bot_submissions_on_submission_phase_setup",
            lobbyCode,
          },
        });
      }
    }
  }, [isHost, gameState, players, lobbyCode]);

  // --- During voting phase, trigger AI votes and early transition when all votes are in (host only) ---
  useEffect(() => {
    if (!isHost) return;
    if (!gameState || gameState.phase !== "voting") return;
    const phaseKey = String(
      gameState.phaseStartTime ?? `${gameState.roundNumber}-voting`
    );

    // Trigger AI votes once per voting phase
    if (aiVotesPhaseKeyRef.current !== phaseKey) {
      aiVotesPhaseKeyRef.current = phaseKey;
      try {
        const aiBotService = AIBotService.getInstance();
        const playersRecord: Record<string, PlayerData> = {};
        for (const p of players) {
          playersRecord[p.id] = {
            id: p.id,
            displayName: p.name,
            avatarId: p.avatar,
            profileURL: p.avatar,
            joinedAt: p.lastSeen || new Date().toISOString(),
            isHost: p.isHost || false,
            score: p.score || 0,
            status: (p.status as PlayerStatus) || "waiting",
            lastSeen: p.lastSeen || new Date().toISOString(),
            isAI: p.isAI,
            aiPersonalityId: p.aiPersonalityId,
            aiDifficulty: p.aiDifficulty,
            cards: p.cards || [],
          };
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
    }

    // If all votes/abstentions are in, calculate scores and move to results phase early
    const totalPlayers = players.length;
    const votesCount = Object.keys(gameState.votes || {}).length;
    const abstainCount = Object.keys(gameState.abstentions || {}).length;
    if (totalPlayers > 0 && votesCount + abstainCount >= totalPlayers) {
      try {
        // Calculate scores for this round
        const scoringResult = calculateRoundScoring(
          players as unknown as Player[],
          gameState.submissions || {},
          gameState.votes || {},
          gameState.roundNumber || 1,
          gameState.scores || {},
          gameState.playerStreaks || {}
        );

        const gameStatePath = `lobbies/${lobbyCode}/gameState`;
        update(ref(rtdb, gameStatePath), {
          phase: "results",
          timeLeft: 10, // 10 seconds to view results
          scores: scoringResult.updatedScores,
          playerStreaks: scoringResult.updatedStreaks,
          winner: scoringResult.winner,
          phaseStartTime: serverTimestamp(),
        }).catch((err) => {
          Sentry.captureException(err, {
            tags: {
              operation: "early_transition_results_from_voting",
              lobbyCode,
            },
            extra: { votesCount, abstainCount, totalPlayers },
          });
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { operation: "scoring_calculation", lobbyCode },
        });
      }
    }
  }, [isHost, gameState, players.length, lobbyCode, players]);

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
          console.log("🔄 GameState update from Firebase:", {
            phase: data.phase,
            roundNumber: data.roundNumber,
            totalRounds: data.totalRounds,
            timeLeft: data.timeLeft,
            timestamp: new Date().toISOString(),
          });

          // Force a new object reference to ensure React re-renders
          setGameState({ ...data });
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

          // Safety check for playersData
          if (!playersData || typeof playersData !== "object") {
            console.warn("⚠️ Invalid players data received:", playersData);
            return;
          }

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
                aiDifficulty: player.aiDifficulty,
                isHost: Boolean(player.isHost),
              };
            }
          );

          // Ensure we always have a valid array
          setPlayers(gamePlayers || []);
        } else {
          console.log("No players data found, keeping existing players");
          // Don't clear players if snapshot doesn't exist - they might be loading
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
          // Validate that we have exactly 7 cards as per game rules
          if (cards && cards.length !== 7) {
            console.warn(`Player has ${cards.length} cards instead of 7`);
          }
          setPlayerCards(cards || []);
          setCardsLoadedOnce(true);
        } else {
          console.log("No player cards found at path:", playerCardsPath);
          // Only clear cards if we haven't loaded them before or if we're in waiting phase
          setPlayerCards((prevCards) => {
            if (cardsLoadedOnce && prevCards.length > 0) {
              console.warn(
                "⚠️ Cards snapshot is null but we had cards before - keeping previous cards to prevent loss"
              );
              return prevCards; // Keep existing cards to prevent loss during transitions
            }
            console.log("Setting empty cards array");
            return []; // Only set empty if we haven't loaded cards before
          });
        }
      },
      (error) => {
        handleError(error, "player_cards_listener");
      }
    );

    return () => {
      // Properly cleanup Firebase listeners
      if (gameStateUnsubscribeRef.current) {
        gameStateUnsubscribeRef.current();
        gameStateUnsubscribeRef.current = null;
      }
      if (playersUnsubscribeRef.current) {
        playersUnsubscribeRef.current();
        playersUnsubscribeRef.current = null;
      }
      if (playerCardsUnsubscribeRef.current) {
        playerCardsUnsubscribeRef.current();
        playerCardsUnsubscribeRef.current = null;
      }
    };
  }, [user, handleError, lobbyCode, cardsLoadedOnce]);

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
        const rounds = Number(lobby?.settings?.rounds);
        setTotalRounds(Number.isFinite(rounds) && rounds > 0 ? rounds : 8);
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
    const timedPhases = [
      "submission",
      "voting",
      "countdown",
      "results",
      "leaderboard",
    ];
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
    resetGameState,
    completeGameTransition,

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
