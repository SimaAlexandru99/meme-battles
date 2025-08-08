"use client";

import { useState, useEffect, useCallback } from "react";
import { RiTimeLine, RiGamepadLine } from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MemeCardHand } from "./meme-card-hand";
import { PlayersList } from "./players-panel";
import { ChatPanel } from "./chat-panel";
import { VotingPhase } from "./voting-phase";
import { ResultsPhase } from "./results-phase";
import { RoundCountdown } from "./round-countdown";
import { GameTransition } from "./game-transition";
import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { useGameState } from "@/hooks/use-game-state";
import { useLobbyManagement } from "@/hooks/use-lobby-management";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

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
    vote,
    startRound,
    hasSubmitted,
    hasVoted,
    clearError,
  } = useGameState(lobbyCode);

  // Use lobby management for lobby-specific operations
  const { isHost, leaveLobby, completeGameTransition } =
    useLobbyManagement(lobbyCode);

  // Card selection functionality
  const { selectedCard, selectCard, clearSelection } = useMemeCardSelection({
    cards: playerCards,
  });

  // Chat functionality
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Handle game state changes
  useEffect(() => {
    if (gameState?.phase === "game_over") {
      toast.success("Game finished! Returning to lobby...");
      setTimeout(() => {
        router.push(`/game/${lobbyCode}`);
      }, 3000);
    }
  }, [gameState?.phase, lobbyCode, router]);

  // Handler functions
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      playerId: currentUser.id,
      playerName: currentUser.name,
      message: newMessage,
      timestamp: new Date(),
      type: "chat",
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  }, [newMessage, currentUser]);

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

  const handleVote = useCallback(
    async (submissionPlayerId: string) => {
      try {
        await vote(submissionPlayerId);
        toast.success("Vote submitted!");
      } catch (error) {
        toast.error("Failed to submit vote. Please try again.");
        Sentry.captureException(error);
      }
    },
    [vote]
  );

  const handleStartRound = useCallback(async () => {
    try {
      await startRound();
    } catch (error) {
      toast.error("Failed to start round. Please try again.");
      Sentry.captureException(error);
    }
  }, [startRound]);

  const handleLeaveGame = useCallback(async () => {
    try {
      await leaveLobby();
      router.push("/");
    } catch (error) {
      toast.error("Failed to leave game. Please try again.");
      Sentry.captureException(error);
    }
  }, [leaveLobby, router]);

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
        players={players}
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
        onRoundStart={handleStartRound}
      />
    );
  }

  if (gameState.phase === "results") {
    return (
      <ResultsPhase
        lobbyCode={lobbyCode}
        currentUser={currentUser}
        players={players}
        submissions={gameState.submissions}
        votes={gameState.votes}
        roundNumber={gameState.roundNumber}
        totalRounds={gameState.totalRounds}
      />
    );
  }

  if (gameState.phase === "game_over") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
              Game Over!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-purple-200/70 font-bangers text-lg tracking-wide mb-4">
                Thanks for playing!
              </p>
              <Button
                onClick={handleLeaveGame}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg"
              >
                Return to Lobby
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Debug game state
  console.log("Current game state:", gameState);
  console.log("Player cards:", playerCards);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Game Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <RiGamepadLine className="w-5 h-5 text-purple-400" />
                <span className="text-white font-bangers tracking-wide">
                  Round {gameState.roundNumber || 1}/{gameState.totalRounds || 8}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RiTimeLine className="w-5 h-5 text-purple-400" />
                <span className="text-white font-bangers tracking-wide">
                  {gameState.timeLeft || 60}s
                </span>
              </div>
            </div>
            {/* Lobby Code */}
            <div className="flex items-center gap-2">
              <span className="text-purple-200/70 font-bangers tracking-wide">Code:</span>
              <Badge className="bg-purple-600 text-white font-bangers">{lobbyCode}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 grid grid-cols-[300px_1fr_300px] grid-rows-[1fr_auto] h-full min-h-0">
        {/* Chat Panel (Left) */}
        <div className="col-start-1 row-span-2 flex flex-col min-h-0 bg-slate-800/30 border-r border-slate-700/40">
          <ChatPanel
            messages={messages}
            newMessage={newMessage}
            onNewMessageChange={setNewMessage}
            onSendMessage={handleSendMessage}
            currentUser={currentUser}
          />
        </div>

        {/* Situation (Center, Vertically and Horizontally Centered) */}
        <div className="col-start-2 row-start-1 flex items-center justify-center min-h-0">
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-white font-bangers text-2xl mb-2 text-center">Current Situation:</h2>
            <p className="text-purple-200 font-bangers text-xl text-center max-w-2xl break-words">
              {gameState.currentSituation}
            </p>
          </div>
        </div>

        {/* Players List (Right) */}
        <div className="col-start-3 row-span-2 flex flex-col min-h-0 bg-slate-800/30 border-l border-slate-700/40">
          {gameState.phase === "voting" ? (
            <VotingPhase
              lobbyCode={lobbyCode}
              currentUser={currentUser}
              players={players}
              submissions={gameState.submissions}
              onVote={handleVote}
              hasVoted={hasVoted}
            />
          ) : (
            <PlayersList players={players} />
          )}
        </div>

        {/* Cards (Bottom Center) */}
        <div className="col-start-2 row-start-2 flex justify-center items-end pb-4">
          <MemeCardHand
            cards={playerCards}
            selectedCard={selectedCard}
            onSelectCard={selectCard}
            onSubmitCard={handleSubmitCard}
            isSubmitting={false}
            hasSubmitted={hasSubmitted}
          />
        </div>
      </div>
    </div>
  );
}
