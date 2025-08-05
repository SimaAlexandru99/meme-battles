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
import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { getRandomMemeCards } from "@/lib/utils/meme-card-pool";

interface ArenaProps {
  lobbyCode: string;
  currentUser: User;
}

type GamePhase = "waiting" | "countdown" | "submission" | "voting" | "results";

interface GameState {
  phase: GamePhase;
  timeLeft: number;
  currentSituation: string;
  submissions: Record<
    string,
    { cardId: string; cardName: string; submittedAt: string }
  >;
  votes: Record<string, string>;
  roundNumber: number;
  totalRounds: number;
}

export function Arena({ lobbyCode, currentUser }: ArenaProps) {
  // Static game state for now
  const [gameState, setGameState] = useState<GameState>({
    phase: "waiting",
    timeLeft: 30,
    currentSituation: "When your friend says 'I have a great idea' at 3 AM",
    submissions: {},
    votes: {},
    roundNumber: 1,
    totalRounds: 5,
  });

  // Mock players data
  const [players] = useState<Player[]>([
    {
      id: currentUser.id,
      name: currentUser.name,
      avatar: currentUser.profileURL || "",
      score: 0,
      status: "waiting",
      cards: [],
      isCurrentPlayer: true,
    },
    {
      id: "player2",
      name: "Alice",
      avatar: "",
      score: 15,
      status: "waiting",
      cards: [],
    },
    {
      id: "player3",
      name: "Bob",
      avatar: "",
      score: 8,
      status: "waiting",
      cards: [],
    },
  ]);

  // Mock cards for current player
  const [playerCards] = useState(() =>
    getRandomMemeCards(7).map((card, index) => ({
      ...card,
      id: `card_${index}`,
    })),
  );

  // Card selection functionality
  const { selectedCard, selectCard, clearSelection } = useMemeCardSelection({
    cards: playerCards,
  });

  // Chat functionality
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      playerId: "player2",
      playerName: "Alice",
      message: "This is going to be fun! 😄",
      timestamp: new Date(Date.now() - 5000),
      type: "chat",
    },
    {
      id: "2",
      playerId: "player3",
      playerName: "Bob",
      message: "Ready to play! 🎮",
      timestamp: new Date(Date.now() - 3000),
      type: "chat",
    },
  ]);

  const [newMessage, setNewMessage] = useState("");

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

  const handleSubmitCard = useCallback(() => {
    if (!selectedCard) {
      toast.error("Please select a card first!");
      return;
    }

    // Mock submission
    setGameState((prev) => ({
      ...prev,
      submissions: {
        ...prev.submissions,
        [currentUser.id]: {
          cardId: selectedCard.id,
          cardName: selectedCard.filename,
          submittedAt: new Date().toISOString(),
        },
      },
    }));

    toast.success("Card submitted successfully!");
    clearSelection();
  }, [selectedCard, currentUser.id, clearSelection]);

  const handleVote = useCallback(
    (submissionPlayerId: string) => {
      setGameState((prev) => ({
        ...prev,
        votes: {
          ...prev.votes,
          [currentUser.id]: submissionPlayerId,
        },
      }));

      toast.success("Vote submitted!");
    },
    [currentUser.id],
  );

  const handleStartRound = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      phase: "submission",
      timeLeft: 30,
    }));
  }, []);

  // Timer effect
  useEffect(() => {
    if (gameState.phase !== "submission" && gameState.phase !== "voting") {
      return;
    }

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.timeLeft <= 1) {
          // Phase transition logic
          if (prev.phase === "submission") {
            return {
              ...prev,
              phase: "voting",
              timeLeft: 20,
            };
          } else if (prev.phase === "voting") {
            return {
              ...prev,
              phase: "results",
              timeLeft: 0,
            };
          }
        }

        return {
          ...prev,
          timeLeft: prev.timeLeft - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.phase]);

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

            <Button
              onClick={handleStartRound}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg"
            >
              Start Game
            </Button>
          </CardContent>
        </Card>
      </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Top Bar */}
      <div className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Game Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <RiGamepadLine className="w-5 h-5 text-purple-400" />
                <span className="text-white font-bangers tracking-wide">
                  Round {gameState.roundNumber}/{gameState.totalRounds}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <RiTimeLine className="w-5 h-5 text-purple-400" />
                <span className="text-white font-bangers tracking-wide">
                  {gameState.timeLeft}s
                </span>
              </div>
            </div>

            {/* Lobby Code */}
            <div className="flex items-center gap-2">
              <span className="text-purple-200/70 font-bangers tracking-wide">
                Code:
              </span>
              <Badge className="bg-purple-600 text-white font-bangers">
                {lobbyCode}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Game Area */}
        <div className="flex-1 flex flex-col">
          {/* Situation Display */}
          <div className="p-6">
            <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl tracking-wide text-center">
                  Current Situation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-purple-200/90 font-bangers text-lg tracking-wide text-center">
                  {gameState.currentSituation}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Game Phase Content */}
          <div className="flex-1 px-6 pb-6">
            {gameState.phase === "submission" && (
              <div className="space-y-6">
                {/* Card Hand */}
                <MemeCardHand
                  cards={playerCards}
                  selectedCard={selectedCard}
                  onSelectCard={selectCard}
                  onSubmitCard={handleSubmitCard}
                  isSubmitting={false}
                  hasSubmitted={!!gameState.submissions[currentUser.id]}
                />

                {/* Submit Button */}
                {!gameState.submissions[currentUser.id] && (
                  <div className="text-center">
                    <Button
                      onClick={handleSubmitCard}
                      disabled={!selectedCard}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg px-8 py-3"
                    >
                      Submit Card
                    </Button>
                  </div>
                )}
              </div>
            )}

            {gameState.phase === "voting" && (
              <VotingPhase
                lobbyCode={lobbyCode}
                currentUser={currentUser}
                players={players}
                submissions={gameState.submissions}
                onVote={handleVote}
                hasVoted={!!gameState.votes[currentUser.id]}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Players & Chat */}
        <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-l border-slate-700/50">
          <div className="h-full flex flex-col">
            {/* Players Panel */}
            <div className="flex-1 p-4">
              <PlayersList players={players} />
            </div>

            {/* Chat Panel */}
            <div className="border-t border-slate-700/50">
              <ChatPanel
                messages={messages}
                newMessage={newMessage}
                onNewMessageChange={setNewMessage}
                onSendMessage={handleSendMessage}
                currentUser={currentUser}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
