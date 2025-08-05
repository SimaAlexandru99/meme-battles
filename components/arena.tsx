"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  RiSwordLine,
  RiLightbulbLine,
  RiArrowLeftLine,
  RiFullscreenLine,
  RiFullscreenExitLine,
  RiChat1Line,
  RiFireLine,
  RiTrophyLine,
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSituationGeneration } from "@/hooks/useSituationGeneration";
import { useLobbyData } from "@/hooks/useLobbyData";
import { useScoreTracking } from "@/hooks/useScoreTracking";
import { useCardSubmission } from "@/hooks/useCardSubmission";
import { useCardReplenishment } from "@/hooks/useCardReplenishment";
import { getRandomPrompt } from "@/lib/utils/game-prompts";
import { MemeCardHand } from "@/components/meme-card-hand";
import { TopBar } from "@/components/top-bar";
import { ChatPanel } from "@/components/chat-panel";
import { PlayersList } from "@/components/players-panel";
import { VotingPhase } from "@/components/voting-phase";
import { ResultsPhase } from "@/components/results-phase";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useInterval, useFullscreen, useNetwork } from "react-haiku";
import { RoundCountdown } from "@/components/round-countdown";

interface ArenaProps {
  lobbyCode: string;
  currentUser: User;
}

export function Arena({ lobbyCode, currentUser }: ArenaProps) {
  const router = useRouter();
  const arenaRef = useRef<HTMLDivElement>(null);
  const { generateSituation, isGenerating } = useSituationGeneration();

  // Use real Firebase data instead of mock data
  const {
    players,
    currentPlayer,
    isLoading: lobbyLoading,
    error: lobbyError,
    lobbyData,
  } = useLobbyData({
    lobbyCode,
    currentUser,
    refreshInterval: 5000, // Poll every 5 seconds to reduce timer resets
    enabled: true,
  });

  // Game state management - use Firebase as source of truth
  const [gameState, setGameState] = useState<GameState>({
    phase: "playing",
    currentRound: 1,
    totalRounds: 5,
    currentPrompt: "",
    timeLeft: 60,
  });

  // Track if game has been initialized to prevent unnecessary updates
  const gameInitializedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPhaseRef = useRef<string | null>(null);

  // Chat and loading state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Voting and submission state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Real-time submission tracking
  const [submissionCount, setSubmissionCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Round countdown state
  const [showCountdown, setShowCountdown] = useState(false);
  const [roundStarted, setRoundStarted] = useState(false);

  // Panel visibility state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Fullscreen functionality
  const { isFullscreen, toggleFullscreen } = useFullscreen(arenaRef);
  const online = useNetwork();
  const prevOnlineRef = useRef(online);

  // Score tracking functionality
  const {
    awardWinner,
    isLoading: scoreLoading,
    error: scoreError,
  } = useScoreTracking({
    lobbyCode,
    currentUser,
  });

  // Card submission functionality
  const {
    submitCard,
    getSubmissions,
    isSubmitting,
    hasSubmitted,
    error: submissionError,
  } = useCardSubmission({
    lobbyCode,
    currentUser,
    onSubmissionSuccess: () => {
      // Clear selection after successful submission
      clearSelection();
    },
    onPhaseTransition: (newPhase) => {
      // Update game state when phase transitions
      setGameState((prev) => ({
        ...prev,
        phase: newPhase as never,
        timeLeft: newPhase === "voting" ? 30 : prev.timeLeft,
      }));
    },
  });

  // Card replenishment functionality
  const {
    replenishToTargetSize,
    isReplenishing,
    error: replenishmentError,
  } = useCardReplenishment({
    lobbyCode,
    currentUser,
    targetHandSize: 7,
    enabled: true,
    onCardReplenished: (newCard) => {
      // Show notification when a new card is added
      console.log("New card replenished:", newCard.id);
    },
  });

  // Check if we should show countdown (game started but no round in progress)
  useEffect(() => {
    if (lobbyData?.status === "started" && !lobbyData?.gameState?.phase) {
      setShowCountdown(true);
    } else if (
      lobbyData?.gameState?.phase &&
      lobbyData.gameState.phase !== "submission"
    ) {
      setShowCountdown(false);
      setRoundStarted(true);
    }
  }, [lobbyData?.status, lobbyData?.gameState?.phase]);

  // Update game state when lobby data changes (but preserve timer)
  useEffect(() => {
    if (lobbyData) {
      setGameState((prev) => ({
        ...prev,
        totalRounds: lobbyData.settings?.rounds || 5,
        // Only update timeLeft if game hasn't been initialized yet
        timeLeft: !gameInitializedRef.current
          ? lobbyData.settings?.timeLimit || 60
          : prev.timeLeft,
      }));

      // Mark game as initialized after first lobby data load
      if (!gameInitializedRef.current) {
        gameInitializedRef.current = true;
      }

      // Update game phase based on Firebase state
      if (lobbyData.gameState?.phase) {
        const newPhase = lobbyData.gameState.phase;
        const currentPhase = gameState.phase;

        // Only update phase and timeLeft if phase actually changed
        if (newPhase !== currentPhase && newPhase !== lastPhaseRef.current) {
          lastPhaseRef.current = newPhase;
          console.log(
            `Phase change: ${currentPhase} -> ${newPhase}, resetting timer`
          );
          setGameState((prev) => ({
            ...prev,
            phase: newPhase as never,
            // Set appropriate time limits based on phase
            timeLeft:
              newPhase === "voting"
                ? 30
                : newPhase === "results"
                  ? 10
                  : lobbyData.settings?.timeLimit || 60,
          }));
        } else if (newPhase !== currentPhase) {
          console.log(
            `Phase update blocked: ${currentPhase} -> ${newPhase} (already processed)`
          );
        }
      }

      // Update current situation from Firebase
      if (lobbyData.gameState?.currentSituation) {
        setGameState((prev) => ({
          ...prev,
          currentPrompt: lobbyData.gameState!.currentSituation,
        }));
      }

      // Update current round from Firebase
      if (lobbyData.gameState?.currentRound) {
        setGameState((prev) => ({
          ...prev,
          currentRound: lobbyData.gameState!.currentRound,
        }));
      }

      // Update submissions from Firebase
      if (lobbyData.gameState?.submissions) {
        const firebaseSubmissions = lobbyData.gameState.submissions;
        const convertedSubmissions: Submission[] = Object.entries(
          firebaseSubmissions
        ).map(
          ([playerId, submissionData]: [
            string,
            { cardId: string; submittedAt: string; playerId: string },
          ]) => {
            const player = players.find((p) => p.id === playerId);
            return {
              id: playerId,
              playerId,
              playerName: player?.name || "Unknown Player",
              memeCard: {
                id: submissionData.cardId,
                filename: submissionData.cardId + ".jpg",
                url: `/memes/${submissionData.cardId}.jpg`,
                alt: `Meme card ${submissionData.cardId}`,
              },
              votes: 0, // Will be calculated from votes object
              submittedAt: new Date(submissionData.submittedAt),
            };
          }
        );
        setSubmissions(convertedSubmissions);
        setSubmissionCount(convertedSubmissions.length);
        setTotalPlayers(players.length);
      }

      // Update votes from Firebase
      if (lobbyData.gameState?.votes) {
        const firebaseVotes = lobbyData.gameState.votes;
        const convertedVotes: Vote[] = Object.entries(firebaseVotes).map(
          ([playerId, votedFor]: [string, string]) => ({
            id: playerId,
            voterId: playerId,
            submissionId: votedFor,
            votedAt: new Date(),
          })
        );
        setVotes(convertedVotes);
      }
    }
  }, [lobbyData, players, gameState.phase]);

  // Check if current player has already submitted for this round
  useEffect(() => {
    if (!lobbyData?.gameState?.submissions || !currentPlayer) return;

    const hasPlayerSubmitted = lobbyData.gameState.submissions.hasOwnProperty(
      currentPlayer.id
    );
    if (hasPlayerSubmitted) {
      // Player has already submitted, show success message
      toast.success("You have already submitted a card for this round!");
    }
  }, [lobbyData?.gameState?.submissions, currentPlayer, hasSubmitted]);

  // Initialize game data
  useEffect(() => {
    const initializeGame = async () => {
      setIsLoading(true);

      // Wait for lobby data to load
      if (lobbyLoading) {
        return;
      }

      // Check for lobby errors
      if (lobbyError) {
        toast.error(lobbyError);
        setIsLoading(false);
        return;
      }

      // Generate initial AI situation
      const initialSituation = await generateSituation();
      if (initialSituation) {
        setGameState((prev) => ({
          ...prev,
          currentPrompt: initialSituation,
        }));
      }

      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        playerId: "system",
        playerName: "System",
        message: `Welcome to the arena! Game starting soon...`,
        timestamp: new Date(),
        type: "system",
      };
      setChatMessages([welcomeMessage]);

      setIsLoading(false);
    };

    initializeGame();
  }, [lobbyLoading, lobbyError, generateSituation]);

  // Network status monitoring
  useEffect(() => {
    if (prevOnlineRef.current !== online) {
      if (!online) {
        toast.error("You are offline. Some features may not work.");
      } else {
        toast.success("You are back online!");
      }
      prevOnlineRef.current = online;
    }
  }, [online]);

  // Timer countdown
  useInterval(
    () => {
      if (gameState.timeLeft > 0) {
        setGameState((prev) => {
          const newTimeLeft = prev.timeLeft - 1;
          console.log(
            `Timer tick: ${prev.timeLeft} -> ${newTimeLeft} (phase: ${prev.phase})`
          );
          return {
            ...prev,
            timeLeft: newTimeLeft,
          };
        });
      }
    },
    gameState.timeLeft > 0 ? 1000 : 0
  );

  // Card selection functionality
  const { selectedCard, selectCard, clearSelection } = useMemeCardSelection({
    cards: currentPlayer?.cards ?? [],
  });

  // Handler functions
  const handleSendMessage = useCallback(
    (message: string) => {
      if (!currentPlayer) return;

      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        message: message,
        timestamp: new Date(),
        type: "chat",
      };

      setChatMessages((prev) => [...prev, chatMessage]);
    },
    [currentPlayer]
  );

  const handleSubmitCard = useCallback(async () => {
    if (!selectedCard || !currentPlayer || isSubmitting || hasSubmitted) return;

    // Additional check to prevent multiple submissions
    if (lobbyData?.gameState?.submissions?.[currentPlayer.id]) {
      toast.error("You have already submitted a card for this round");
      return;
    }

    // Check if we're in submission phase
    if (lobbyData?.gameState?.phase !== "submission") {
      toast.error("Submissions are not currently being accepted");
      return;
    }

    try {
      // Submit the card using the real Firebase submission system
      await submitCard(selectedCard.id);

      // Add action message to chat
      const actionMessage: ChatMessage = {
        id: Date.now().toString(),
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        message: "Submitted their meme! 🎯",
        timestamp: new Date(),
        type: "action",
      };

      setChatMessages((prev) => [...prev, actionMessage]);
    } catch (error) {
      console.error("Failed to submit card:", error);
      // Error handling is done in the hook
    }
  }, [
    selectedCard,
    currentPlayer,
    isSubmitting,
    hasSubmitted,
    submitCard,
    lobbyData?.gameState,
  ]);

  const handleVote = useCallback(
    async (submissionId: string) => {
      if (!currentPlayer) return;

      try {
        setIsVoting(true);

        // TODO: Implement actual voting logic with Firebase
        // For now, simulate voting
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setHasVoted(true);
        setIsVoting(false);

        // Add action message to chat
        const actionMessage: ChatMessage = {
          id: Date.now().toString(),
          playerId: currentPlayer.id,
          playerName: currentPlayer.name,
          message: "Voted for a meme! 👍",
          timestamp: new Date(),
          type: "action",
        };

        setChatMessages((prev) => [...prev, actionMessage]);
      } catch (error) {
        console.error("Failed to submit vote:", error);
        setIsVoting(false);
      }
    },
    [currentPlayer]
  );

  const handleNextRound = useCallback(() => {
    if (gameState.currentRound < gameState.totalRounds) {
      setGameState((prev) => ({
        ...prev,
        currentRound: prev.currentRound + 1,
        timeLeft: 60,
        phase: "playing",
        currentPrompt: getRandomPrompt(),
      }));
      setHasVoted(false);
      setSubmissions([]);
    } else {
      // Game over
      setGameState((prev) => ({
        ...prev,
        phase: "game_over",
        timeLeft: 0,
      }));
    }
  }, [gameState.currentRound, gameState.totalRounds]);

  const handleGameOver = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      phase: "game_over",
      timeLeft: 0,
    }));
  }, []);

  const handleLeaveGame = useCallback(() => {
    // TODO: Implement proper leave game logic with confirmation
    // For now, go back to main menu since game should be in progress
    if (
      confirm(
        "Are you sure you want to leave the game? You won't be able to rejoin this round."
      )
    ) {
      router.push("/");
      toast.info("Left the game");
    }
  }, [router]);

  const handleToggleFullscreen = useCallback(() => {
    toggleFullscreen();
    toast.info(isFullscreen ? "Exiting fullscreen" : "Entering fullscreen");
  }, [toggleFullscreen, isFullscreen]);

  const networkStatusBadge = (
    <Badge
      variant="secondary"
      className={cn(
        "flex items-center gap-1 font-bangers tracking-wide text-xs sm:text-sm",
        online
          ? "bg-green-500/20 text-green-400 border-green-500/30"
          : "bg-red-500/20 text-red-400 border-red-500/30"
      )}
    >
      <motion.div
        className={cn(
          "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
          online ? "bg-green-400" : "bg-red-400"
        )}
        animate={online ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
    </Badge>
  );

  // Show countdown component when needed
  if (showCountdown) {
    return (
      <RoundCountdown
        lobbyCode={lobbyCode}
        currentUser={currentUser}
        players={players}
        onRoundStart={() => {
          setShowCountdown(false);
          setRoundStarted(true);
        }}
      />
    );
  }

  // Show loading state while lobby data is loading
  if (lobbyLoading || isLoading || scoreLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <motion.div
          className="flex flex-col items-center gap-6 p-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <RiSwordLine className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bangers text-white tracking-wide mb-2">
              Entering The Arena...
            </h2>
            <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide">
              {lobbyLoading
                ? "Loading game data..."
                : scoreLoading
                  ? "Setting up score tracking..."
                  : "Preparing your meme cards"}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show error state if lobby data failed to load
  if (lobbyError || scoreError || submissionError || replenishmentError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <motion.div
          className="flex flex-col items-center gap-6 p-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bangers text-white tracking-wide mb-2">
              Failed to Load Game
            </h2>
            <p className="text-red-200/70 text-sm sm:text-base font-bangers tracking-wide mb-4">
              {lobbyError ||
                scoreError ||
                submissionError ||
                replenishmentError}
            </p>
            <Button
              onClick={() => router.push("/")}
              className="font-bangers tracking-wide"
            >
              Return to Main Menu
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={arenaRef}
      className="min-h-screen relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden pt-20 sm:pt-24 md:pt-28"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-sm border-b rounded-md border-slate-700/50"
      >
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleLeaveGame}
              variant="ghost"
              className="text-white hover:bg-slate-800/50 font-bangers tracking-wide h-10 sm:h-11"
            >
              <RiArrowLeftLine className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Leave Game</span>
            </Button>
            <div className="text-center">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bangers text-white tracking-wide">
                Meme Battle Arena
              </h1>
              <p className="text-xs sm:text-sm text-purple-200/70 font-bangers tracking-wide">
                Lobby: {lobbyCode}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsChatOpen(!isChatOpen)}
                size="sm"
                variant="secondary"
                className={cn(
                  "min-h-[36px] min-w-[36px] rounded-full shadow-lg text-white border-0 transition-all duration-200",
                  isChatOpen
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/50"
                    : "bg-blue-500 hover:bg-blue-600"
                )}
                aria-label={isChatOpen ? "Close chat" : "Open chat"}
              >
                <RiChat1Line className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setIsPlayersOpen(!isPlayersOpen)}
                size="sm"
                variant="secondary"
                className={cn(
                  "min-h-[36px] min-w-[36px] rounded-full shadow-lg text-white border-0 transition-all duration-200",
                  isPlayersOpen
                    ? "bg-orange-600 hover:bg-orange-700 shadow-orange-500/50"
                    : "bg-orange-500 hover:bg-orange-600"
                )}
                aria-label={
                  isPlayersOpen ? "Close players list" : "Open players list"
                }
              >
                <RiFireLine className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Bar */}
      <TopBar
        currentRound={gameState.currentRound}
        totalRounds={gameState.totalRounds}
        timeLeft={gameState.timeLeft}
        networkStatus={networkStatusBadge}
        fullscreenButton={
          <Button
            onClick={handleToggleFullscreen}
            variant="outline"
            size="sm"
            className={cn(
              "border-slate-600/50 text-white hover:bg-slate-700/50",
              "font-bangers tracking-wide text-xs",
              "focus-visible:ring-2 focus-visible:ring-slate-500/50",
              "transition-all duration-200"
            )}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <RiFullscreenExitLine className="w-3 h-3" />
            ) : (
              <RiFullscreenLine className="w-3 h-3" />
            )}
          </Button>
        }
      />

      {/* Chat Panel */}
      <ChatPanel
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        players={players}
        currentPlayer={currentPlayer || undefined}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Players List */}
      <PlayersList
        players={players}
        currentPlayer={currentPlayer || undefined}
        isOpen={isPlayersOpen}
        onToggle={() => setIsPlayersOpen(!isPlayersOpen)}
      />

      {/* Center Arena - Game Phases */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 w-full max-w-6xl">
        <AnimatePresence mode="wait">
          {/* Playing Phase */}
          {gameState.phase === "playing" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-2 shadow-xl max-w-md mx-auto bg-slate-800/90 backdrop-blur-sm border-slate-700/50">
                <CardHeader className="text-center">
                  <CardTitle className="text-white flex items-center justify-center gap-2 font-bangers tracking-wide">
                    <RiLightbulbLine className="w-5 h-5" />
                    Current Situation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="relative">
                    <p className="text-white text-base md:text-lg font-medium mb-4 md:mb-6 leading-relaxed px-4 font-bangers tracking-wide">
                      &ldquo;{gameState.currentPrompt}&rdquo;
                    </p>
                    {isGenerating && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-slate-800/90 backdrop-blur-sm rounded-lg flex items-center justify-center"
                      >
                        <div className="flex items-center gap-2 text-purple-300">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          >
                            <RiLightbulbLine className="w-5 h-5" />
                          </motion.div>
                          <span className="font-bangers tracking-wide">
                            Generating AI situation...
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {currentPlayer && (
                      <>
                        <Button
                          onClick={handleSubmitCard}
                          disabled={
                            !selectedCard ||
                            isSubmitting ||
                            hasSubmitted ||
                            !!lobbyData?.gameState?.submissions?.[
                              currentPlayer.id
                            ] ||
                            lobbyData?.gameState?.phase !== "submission"
                          }
                          size="default"
                          className={cn(
                            "font-bangers text-lg tracking-wide min-h-[48px] px-8 py-3",
                            hasSubmitted ||
                              !!lobbyData?.gameState?.submissions?.[
                                currentPlayer.id
                              ]
                              ? "bg-gradient-to-r from-blue-600 to-blue-700"
                              : "bg-gradient-to-r from-green-600 to-green-700",
                            hasSubmitted ||
                              !!lobbyData?.gameState?.submissions?.[
                                currentPlayer.id
                              ]
                              ? "hover:from-blue-500 hover:to-blue-600"
                              : "hover:from-green-500 hover:to-green-600",
                            "disabled:from-slate-600 disabled:to-slate-700",
                            "shadow-lg shadow-green-500/30",
                            "focus-visible:ring-2 focus-visible:ring-green-500/50"
                          )}
                          aria-label={
                            hasSubmitted ||
                            !!lobbyData?.gameState?.submissions?.[
                              currentPlayer.id
                            ]
                              ? "Card submitted"
                              : "Submit selected meme card"
                          }
                        >
                          <RiSwordLine className="w-4 h-4 mr-2" />
                          {isSubmitting
                            ? "Submitting..."
                            : hasSubmitted ||
                                !!lobbyData?.gameState?.submissions?.[
                                  currentPlayer.id
                                ]
                              ? "Submitted ✓"
                              : "Submit Meme"}
                        </Button>

                        {/* Submission Status */}
                        <div className="text-center text-sm text-purple-200/70 font-bangers tracking-wide">
                          <div className="flex items-center gap-2">
                            <span>
                              Submissions: {submissionCount}/{totalPlayers}
                            </span>
                            {submissionCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {Math.round(
                                  (submissionCount / totalPlayers) * 100
                                )}
                                %
                              </Badge>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Voting Phase */}
          {gameState.phase === "voting" && (
            <VotingPhase
              submissions={submissions}
              currentPlayerId={currentPlayer?.id || ""}
              onVote={handleVote}
              timeLeft={gameState.timeLeft}
              isVoting={isVoting}
              hasVoted={hasVoted}
            />
          )}

          {/* Results Phase */}
          {gameState.phase === "results" && (
            <ResultsPhase
              submissions={submissions}
              currentSituation={gameState.currentPrompt}
              currentRound={gameState.currentRound}
              totalRounds={gameState.totalRounds}
              onNextRound={handleNextRound}
              onGameOver={handleGameOver}
              timeLeft={gameState.timeLeft}
              isHost={lobbyData?.hostUid === currentUser?.id || false}
            />
          )}

          {/* Game Over Phase */}
          {gameState.phase === "game_over" && (
            <motion.div
              key="game-over"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-2 shadow-xl max-w-md mx-auto bg-slate-800/90 backdrop-blur-sm border-slate-700/50">
                <CardHeader className="text-center">
                  <CardTitle className="text-white flex items-center justify-center gap-2 font-bangers tracking-wide">
                    <RiTrophyLine className="w-6 h-6" />
                    Game Over!
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-white text-base md:text-lg font-medium mb-4 md:mb-6 leading-relaxed px-4 font-bangers tracking-wide">
                    Thanks for playing! 🎉
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Button
                      onClick={() => router.push("/")}
                      size="default"
                      className="font-bangers text-lg tracking-wide min-h-[48px] px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 shadow-lg shadow-green-500/30"
                    >
                      Return to Main Menu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player's Hand */}
      {currentPlayer && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
          <div className="md:absolute md:bottom-2 md:left-1/2 md:transform md:-translate-x-1/2 md:w-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <MemeCardHand
                cards={currentPlayer.cards.slice(0, 7)}
                selectedCard={selectedCard}
                onCardSelect={selectCard}
                disabled={
                  gameState.phase !== "playing" ||
                  currentPlayer.status === "submitted" ||
                  hasSubmitted ||
                  isSubmitting
                }
                theme="hearthstone"
                showRarity={false}
                className="w-full"
              />
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
