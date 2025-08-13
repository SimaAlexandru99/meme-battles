"use client";

import { useState, useEffect, useCallback } from "react";
import { ref, onValue, push } from "firebase/database";
import { rtdb } from "@/firebase/client";
import { Clock, Gamepad2, MessageCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { MemeCardHand } from "./meme-card-hand";
import { PlayersList } from "./players-panel";
import { ChatPanel } from "./chat-panel";
import { ResultsPhase } from "./results-phase";
import { VotingPhase } from "./voting-phase";
import { LeaderboardPhase } from "./leaderboard-phase";
import { RoundCountdown } from "./round-countdown";
import { GameTransition } from "./game-transition";
import { GameOver } from "./game-over";
import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { useGameState } from "@/hooks/use-game-state";
import { useLobbyManagement } from "@/hooks/use-lobby-management";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { cn } from "@/lib/utils";

interface ArenaProps {
  lobbyCode: string;
  currentUser: User;
}

export function Arena({ lobbyCode, currentUser }: ArenaProps) {
  const router = useRouter();

  // Use real-time game state from lobby system
  const {
    gameState,
    players,
    playerCards,
    isLoading,
    error,
    connectionStatus,
    submitCard,
    startRound,
    hasSubmitted,
    clearError,
  } = useGameState(lobbyCode);

  // Track game state changes for debugging in non-production
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      Sentry.addBreadcrumb({
        message: "Arena re-render",
        category: "navigation",
        level: "info",
        data: {
          phase: gameState?.phase,
          roundNumber: gameState?.roundNumber,
          totalRounds: gameState?.totalRounds,
        },
      });
    }
  }, [gameState?.phase, gameState?.roundNumber, gameState?.totalRounds]);

  // Use lobby management for lobby-specific operations
  const { isHost, leaveLobby, completeGameTransition } =
    useLobbyManagement(lobbyCode);

  // Card selection functionality
  const { selectedCard, selectCard, clearSelection } = useMemeCardSelection({
    cards: playerCards,
  });

  // Chat functionality - now using Firebase real-time data
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Real-time chat listener
  useEffect(() => {
    if (!lobbyCode) return;

    const chatRef = ref(rtdb, `lobbies/${lobbyCode}/chat`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const chatData = snapshot.val() as Record<string, ChatMessage>;
        const messagesList = Object.values(chatData).sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(messagesList);
      } else {
        setMessages([]);
      }
    });

    return unsubscribe;
  }, [lobbyCode]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Handle game state changes
  useEffect(() => {
    // Note: Removed automatic redirect for game_over phase
    // GameOver component now handles navigation with better UX
    if (gameState?.phase === "game_over") {
      toast.success("Game finished! Check out the results!");
    }
  }, [gameState?.phase, lobbyCode, router]);

  // Handler functions
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !lobbyCode) return;

    try {
      const message: ChatMessage = {
        id: Date.now().toString(),
        playerId: currentUser.id,
        playerName: currentUser.name,
        message: newMessage.trim(),
        timestamp: new Date(),
        type: "chat",
      };

      const chatRef = ref(rtdb, `lobbies/${lobbyCode}/chat`);
      await push(chatRef, message);
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      Sentry.captureException(error, {
        tags: { operation: "send_chat_message", lobbyCode },
        extra: { message: newMessage.trim() },
      });
    }
  }, [newMessage, currentUser, lobbyCode]);

  const handleSubmitCard = useCallback(async () => {
    if (!selectedCard) {
      toast.error("Please select a card first!");
      return;
    }

    try {
      await submitCard(selectedCard.id);
      toast.success("Card submitted successfully!");
      clearSelection();
    } catch (error) {
      toast.error("Failed to submit card. Please try again.");
      Sentry.captureException(error);
    }
  }, [selectedCard, submitCard, clearSelection]);

  const handleStartRound = useCallback(async () => {
    try {
      await startRound();
    } catch (error) {
      toast.error("Failed to start round. Please try again.");
      Sentry.captureException(error);
    }
  }, [startRound]);

  const handleGoHome = useCallback(async () => {
    try {
      // Clean up Firebase data before navigating
      await leaveLobby();
      toast.success("Thanks for playing! See you next time!");
      router.push("/");
    } catch (error) {
      // Even if leave fails, still navigate home
      Sentry.captureException(error, {
        tags: { operation: "go_home_cleanup", lobbyCode },
      });
      toast.warning("Left game, but cleanup may be incomplete.");
      router.push("/");
    }
  }, [leaveLobby, router, lobbyCode]);

  // Clean up Firebase when user navigates away or closes browser
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for reliable cleanup on page unload
      // This works even when the page is being closed
      if (
        typeof navigator.sendBeacon === "function" &&
        lobbyCode &&
        currentUser?.id
      ) {
        const cleanup = async () => {
          try {
            await leaveLobby();
          } catch (error) {
            // Silent fail on unload - user is already leaving
            Sentry.captureException(error, {
              tags: { operation: "beforeunload_cleanup", lobbyCode },
            });
          }
        };
        // Don't await - page is unloading
        cleanup();
      }
    };

    // Add beforeunload listener for browser close/refresh/navigation
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also cleanup Firebase if component unmounts unexpectedly
      if (lobbyCode && currentUser?.id) {
        leaveLobby().catch((error) => {
          Sentry.captureException(error, {
            tags: { operation: "unmount_cleanup", lobbyCode },
          });
        });
      }
    };
  }, [lobbyCode, currentUser?.id, leaveLobby]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
              Loading Game...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bangers text-purple-400 mb-4">
                Connecting
              </div>
              <p className="text-purple-200/70 font-bangers text-lg tracking-wide">
                Setting up your game
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connection error state
  if (connectionStatus === "disconnected") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
              Connection Lost
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-purple-200/70 font-bangers text-lg tracking-wide mb-4">
                Unable to connect to the game
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg"
              >
                Reconnect
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No game state - should not happen but handle gracefully
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
              Game Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-purple-200/70 font-bangers text-lg tracking-wide mb-4">
                The game you&apos;re looking for doesn&apos;t exist
              </p>
              <Button
                onClick={() => router.push("/")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render different phases
  if (gameState.phase === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
              Waiting for Players...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bangers text-purple-400 mb-4">
                {players.length}/8
              </div>
              <p className="text-purple-200/70 font-bangers text-lg tracking-wide">
                Players joined
              </p>
            </div>

            {isHost && (
              <Button
                onClick={handleStartRound}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg"
              >
                Start Game
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState.phase === "transition") {
    return (
      <GameTransition
        lobbyCode={lobbyCode}
        currentUser={currentUser}
        players={players.map((p) => ({
          id: p.id,
          displayName: p.name,
          avatarId: p.avatar,
          profileURL: p.avatar,
          joinedAt: p.lastSeen || new Date().toISOString(),
          isHost: p.isHost || false,
          score: p.score,
          status: p.status as PlayerStatus,
          lastSeen: p.lastSeen || new Date().toISOString(),
          isCurrentPlayer: p.isCurrentPlayer,
          cards: p.cards,
          isAI: p.isAI,
          aiPersonalityId: p.aiPersonalityId,
          aiDifficulty: p.aiDifficulty,
        }))}
        onTransitionComplete={completeGameTransition}
      />
    );
  }

  if (gameState.phase === "countdown") {
    return (
      <RoundCountdown
        lobbyCode={lobbyCode}
        currentUser={currentUser}
        players={players}
        roundNumber={gameState.roundNumber || 1}
        totalRounds={gameState.totalRounds || 8}
        onRoundStart={handleStartRound}
      />
    );
  }

  if (gameState.phase === "submission") {
    // Show the main game interface for card submission
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Fixed Top Bar */}
        <div className="fixed top-0 left-0 right-0 z-10 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              {/* Mobile Menu Buttons (Left) */}
              <div className="flex items-center gap-2 lg:hidden">
                {/* Chat Sheet Trigger */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-slate-700/50"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="w-[350px] bg-slate-800 border-slate-700"
                  >
                    <SheetHeader>
                      <SheetTitle className="text-white font-bangers tracking-wide">
                        Chat
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-8 h-full">
                      <ChatPanel
                        messages={messages}
                        newMessage={newMessage}
                        onNewMessageChange={setNewMessage}
                        onSendMessage={handleSendMessage}
                        currentUser={currentUser}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Players Sheet Trigger */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-slate-700/50"
                    >
                      <Users className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-[350px] bg-slate-800 border-slate-700"
                  >
                    <SheetHeader>
                      <SheetTitle className="text-white font-bangers tracking-wide">
                        Players
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-8 h-full">
                      <PlayersList players={players} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Game Info (Center on mobile, Left on desktop) */}
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1 sm:gap-3 bg-purple-600/20 border border-purple-400/30 rounded-lg px-2 sm:px-3 py-1 sm:py-2">
                  <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
                    <span className="text-purple-200 font-bangers tracking-wide text-xs sm:text-sm uppercase">
                      Round
                    </span>
                    <span className="text-white font-bangers tracking-wide text-lg sm:text-xl font-bold">
                      {gameState.roundNumber || 1}
                      <span className="text-purple-300 font-normal">
                        /{gameState.totalRounds || 8}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  {(() => {
                    const timeLeftValue =
                      typeof gameState.timeLeft === "number"
                        ? gameState.timeLeft
                        : 0;
                    const isCritical = timeLeftValue <= 15;
                    const isVeryLow = timeLeftValue <= 5;

                    return (
                      <>
                        <Clock
                          className={cn(
                            "w-4 h-4 sm:w-6 sm:h-6",
                            isCritical ? "text-red-400" : "text-purple-400",
                            isVeryLow && "animate-bounce"
                          )}
                        />
                        <span
                          className={cn(
                            "font-bangers tracking-wide",
                            isCritical
                              ? "text-lg sm:text-2xl text-red-400 font-bold"
                              : "text-sm sm:text-lg text-white",
                            isVeryLow && "animate-pulse text-red-300",
                            isCritical && "drop-shadow-lg"
                          )}
                          style={
                            isVeryLow
                              ? {
                                  textShadow:
                                    "0 0 10px rgba(248, 113, 113, 0.8), 0 0 20px rgba(248, 113, 113, 0.4)",
                                }
                              : undefined
                          }
                        >
                          {timeLeftValue}s
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Lobby Code (Right) */}
              <div className="flex items-center gap-1 sm:gap-2 bg-purple-600/20 border border-purple-400/30 rounded-lg px-2 sm:px-3 py-1 sm:py-2">
                <span className="text-purple-200 font-bangers tracking-wide text-xs sm:text-sm uppercase">
                  Code:
                </span>
                <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bangers text-sm sm:text-base px-2 sm:px-3 py-1 tracking-wider border border-purple-400/50">
                  {lobbyCode}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Main Game Area */}
        <div className="pt-16 sm:pt-20 h-screen flex gap-2 sm:gap-4 p-2 sm:p-4 min-h-0">
          {/* Desktop: Chat Panel (Left) - Hidden on mobile */}
          <div className="hidden lg:flex w-[350px] flex-col bg-slate-800/30 border border-slate-700/40 rounded-lg p-4 pt-8">
            <ChatPanel
              messages={messages}
              newMessage={newMessage}
              onNewMessageChange={setNewMessage}
              onSendMessage={handleSendMessage}
              currentUser={currentUser}
            />
          </div>

          {/* Center Column - Situation + Cards (Full width on mobile) */}
          <div className="flex-1 flex flex-col justify-between min-h-0">
            {/* Situation (Top Center) - Enhanced readability */}
            <div className="flex-1 flex items-center justify-center text-center px-2 sm:px-4">
              <div className="max-w-4xl w-full">
                <div className="bg-slate-800/40 border border-purple-400/20 rounded-xl sm:rounded-2xl p-3 sm:p-6 mb-3 sm:mb-4">
                  <h2 className="text-purple-300 font-bangers text-sm sm:text-xl mb-2 sm:mb-3 uppercase tracking-wider">
                    Current Situation
                  </h2>
                  <p className="text-white font-bangers text-lg sm:text-3xl md:text-4xl leading-tight break-words drop-shadow-lg">
                    {gameState.currentSituation}
                  </p>
                </div>
              </div>
            </div>

            {/* Cards + Submit Button (Bottom Center) - Mobile optimized */}
            <div className="flex flex-col items-center gap-2 sm:gap-4 pb-2 sm:pb-4 px-1 sm:px-2 lg:px-4">
              <div className="w-full max-w-full overflow-hidden">
                <MemeCardHand
                  cards={playerCards}
                  selectedCard={selectedCard}
                  onSelectCard={selectCard}
                  hasSubmitted={hasSubmitted}
                />
              </div>

              {/* Submit Button - Enhanced prominence & mobile-friendly */}
              {!hasSubmitted && (
                <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                  {selectedCard && (
                    <div className="text-center px-2">
                      <p className="text-purple-200 font-bangers text-xs sm:text-base">
                        Ready to submit:{" "}
                        <span className="text-white font-bold">
                          {selectedCard.filename?.replace(
                            /\.(jpg|jpeg|png|gif|webp)$/i,
                            ""
                          ) || "Card"}
                        </span>
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={handleSubmitCard}
                    disabled={!selectedCard}
                    className={cn(
                      "font-bangers w-full min-h-[44px] transition-all duration-300 transform shadow-2xl",
                      "text-base sm:text-xl px-4 sm:px-12 py-3 sm:py-4",
                      selectedCard
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:scale-105 text-white"
                        : "bg-slate-600 cursor-not-allowed opacity-60 text-slate-300",
                      selectedCard &&
                        "animate-pulse hover:animate-none border-2 border-purple-400/50"
                    )}
                    style={
                      selectedCard
                        ? {
                            boxShadow:
                              "0 10px 30px rgba(168, 85, 247, 0.4), 0 0 0 2px rgba(168, 85, 247, 0.2)",
                          }
                        : undefined
                    }
                  >
                    <span className="block sm:hidden">
                      {selectedCard ? "🎭 Submit!" : "⚡ Select First"}
                    </span>
                    <span className="hidden sm:block">
                      {selectedCard
                        ? "🎭 Submit Your Meme!"
                        : "⚡ Select a Card First"}
                    </span>
                  </Button>
                </div>
              )}

              {/* Submitted Indicator - Enhanced styling & mobile-friendly */}
              {hasSubmitted && (
                <div className="inline-flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 sm:px-8 py-2 sm:py-4 rounded-lg sm:rounded-xl font-bangers text-base sm:text-xl shadow-2xl border-2 border-green-400/50">
                  <span className="text-lg sm:text-2xl">✅</span>
                  <span className="block sm:hidden">Submitted!</span>
                  <span className="hidden sm:block">
                    Card Submitted Successfully!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop: Players List (Right) - Hidden on mobile */}
          <div className="hidden lg:flex w-[350px] flex-col bg-slate-800/30 border border-slate-700/40 rounded-lg p-4 pt-8">
            <PlayersList players={players} />
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === "voting") {
    // Allow voting phase to render - component handles loading states internally

    // Ensure we have safe default values for optional properties
    const safeSubmissions = gameState.submissions || {};
    const safeVotes = gameState.votes || {};
    const safeRoundNumber = gameState.roundNumber || 1;
    const safeTotalRounds = gameState.totalRounds || 8;
    const safeTimeLeft =
      typeof gameState.timeLeft === "number"
        ? gameState.timeLeft
        : Math.min(30, Math.floor(60 / 2)); // Default voting time = half of default submission time

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <VotingPhase
          lobbyCode={lobbyCode}
          currentUser={currentUser}
          players={players}
          situation={gameState.currentSituation}
          submissions={safeSubmissions}
          votes={safeVotes}
          roundNumber={safeRoundNumber}
          totalRounds={safeTotalRounds}
          timeLeft={safeTimeLeft}
        />
      </div>
    );
  }

  if (gameState.phase === "results") {
    // Allow results phase to render - component handles loading states internally

    // Ensure we have safe default values for optional properties
    const safeSubmissions = gameState.submissions || {};
    const safeVotes = gameState.votes || {};
    const safeRoundNumber = gameState.roundNumber || 1;
    const safeTotalRounds = gameState.totalRounds || 8;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <ResultsPhase
          lobbyCode={lobbyCode}
          currentUser={currentUser}
          players={players}
          situation={gameState.currentSituation}
          submissions={safeSubmissions}
          votes={safeVotes}
          roundNumber={safeRoundNumber}
          totalRounds={safeTotalRounds}
        />
      </div>
    );
  }

  if (gameState.phase === "leaderboard") {
    // Allow leaderboard phase to render - component handles loading states internally

    // Ensure we have safe default values for optional properties
    const safeSubmissions = gameState.submissions || {};
    const safeVotes = gameState.votes || {};
    const safeScores = gameState.scores || {};
    const safePlayerStreaks = gameState.playerStreaks || {};
    const safeRoundNumber = gameState.roundNumber || 1;
    const safeTotalRounds = gameState.totalRounds || 8;
    const safeTimeLeft =
      typeof gameState.timeLeft === "number" ? gameState.timeLeft : 15;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <LeaderboardPhase
          currentUser={currentUser}
          players={players}
          situation={gameState.currentSituation}
          submissions={safeSubmissions}
          votes={safeVotes}
          scores={safeScores}
          playerStreaks={safePlayerStreaks}
          roundNumber={safeRoundNumber}
          totalRounds={safeTotalRounds}
          timeLeft={safeTimeLeft}
        />
      </div>
    );
  }

  if (gameState.phase === "game_over") {
    return (
      <GameOver
        players={players}
        scores={gameState.scores || {}}
        totalRounds={gameState.totalRounds || 8}
        currentUser={currentUser}
        lobbyCode={lobbyCode}
        onReturnToLobby={() => {
          router.push(`/game/${lobbyCode}`);
        }}
        onGoHome={handleGoHome}
      />
    );
  }

  // Log unknown game phase for debugging
  if (gameState) {
    Sentry.captureMessage("Unknown game phase encountered", {
      level: "warning",
      tags: { lobbyCode, phase: gameState.phase },
      extra: { gameState, playerCards },
    });
  }

  // If we reach here, we have an unknown game phase
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
        <CardHeader>
          <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
            Unknown Game Phase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-purple-200/70 font-bangers text-lg tracking-wide mb-4">
              Current phase: {gameState.phase}
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg"
            >
              Reload Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
