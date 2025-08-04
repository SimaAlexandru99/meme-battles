"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RiSwordLine, RiLightbulbLine, RiArrowLeftLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { useIsMobile } from "@/hooks/use-mobile";
import { getRandomMemeCards } from "@/lib/utils/meme-card-pool";
import { getRandomPrompt } from "@/lib/utils/game-prompts";
import { MemeCardHand } from "@/components/meme-card-hand";
import { TopBar } from "@/components/top-bar";
import { ChatPanel } from "@/components/chat-panel";
import { PlayersList } from "@/components/players-list";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ArenaProps {
  lobbyCode: string;
  currentUser: User;
}

export function Arena({ lobbyCode, currentUser }: ArenaProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 1,
    totalRounds: 5,
    timeLeft: 60,
    phase: "playing",
    currentPrompt: getRandomPrompt(),
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Panel visibility state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Initialize game data
  useEffect(() => {
    const initializeGame = async () => {
      setIsLoading(true);

      // Initialize current player with cards
      const currentPlayer: Player = {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.profileURL || "/icons/cool-pepe.png",
        score: 0,
        status: "playing",
        cards: getRandomMemeCards(7),
        isCurrentPlayer: true,
      };

      // TODO: Replace with real Firebase data
      // For now, initialize with mock data including current player
      const mockPlayers: Player[] = [
        currentPlayer,
        {
          id: "2",
          name: "GigaChad",
          avatar: "/icons/baby-yoda.png",
          score: 0,
          status: "playing",
          cards: getRandomMemeCards(7),
        },
        {
          id: "3",
          name: "SusAmogus",
          avatar: "/icons/harold.png",
          score: 0,
          status: "playing",
          cards: getRandomMemeCards(7),
        },
      ];

      setPlayers(mockPlayers);

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
  }, [currentUser]);

  // Auto-close panels when switching to mobile
  useEffect(() => {
    if (isMobile) {
      setIsChatOpen(false);
      setIsPlayersOpen(false);
    }
  }, [isMobile]);

  // Timer countdown and phase management
  useEffect(() => {
    if (gameState.phase === "playing" && gameState.timeLeft > 0) {
      const timer = setInterval(() => {
        setGameState((prev) => {
          const newTimeLeft = Math.max(0, prev.timeLeft - 1);

          // Auto-transition to voting phase when time runs out
          if (newTimeLeft === 0 && prev.phase === "playing") {
            toast.info("Time's up! Moving to voting phase...");
            return {
              ...prev,
              timeLeft: 30, // 30 seconds for voting
              phase: "voting",
            };
          }

          // Auto-transition to results when voting time runs out
          if (newTimeLeft === 0 && prev.phase === "voting") {
            toast.info("Voting complete! Showing results...");
            return {
              ...prev,
              timeLeft: 10, // 10 seconds to show results
              phase: "results",
            };
          }

          // Auto-transition to next round or game over
          if (newTimeLeft === 0 && prev.phase === "results") {
            if (prev.currentRound < prev.totalRounds) {
              toast.success("Starting next round!");
              return {
                ...prev,
                currentRound: prev.currentRound + 1,
                timeLeft: 60,
                phase: "playing",
                currentPrompt: getRandomPrompt(),
              };
            } else {
              toast.success("Game Over! Thanks for playing!");
              return {
                ...prev,
                phase: "game_over",
                timeLeft: 0,
              };
            }
          }

          return {
            ...prev,
            timeLeft: newTimeLeft,
          };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState.phase, gameState.timeLeft]);

  const currentPlayer = players.find((p) => p.isCurrentPlayer);
  const { selectedCard, selectCard, clearSelection } = useMemeCardSelection({
    cards: currentPlayer?.cards ?? [],
  });

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
    [currentPlayer],
  );

  const handleSubmitCard = useCallback(() => {
    if (!selectedCard || !currentPlayer) return;

    // TODO: Submit to Firebase
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentPlayer.id
          ? { ...p, selectedCard, status: "submitted" }
          : p,
      ),
    );

    const actionMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      message: "Submitted their meme! 🎯",
      timestamp: new Date(),
      type: "action",
    };

    setChatMessages((prev) => [...prev, actionMessage]);
    clearSelection();
    toast.success("Meme submitted!");
  }, [selectedCard, currentPlayer, clearSelection]);

  const handleLeaveGame = useCallback(() => {
    // TODO: Implement proper leave game logic with confirmation
    // For now, go back to main menu since game should be in progress
    if (
      confirm(
        "Are you sure you want to leave the game? You won't be able to rejoin this round.",
      )
    ) {
      router.push("/");
      toast.info("Left the game");
    }
  }, [router]);

  const handleNewPrompt = useCallback(() => {
    const newPrompt = getRandomPrompt();
    setGameState((prev) => ({
      ...prev,
      currentPrompt: newPrompt,
      timeLeft: 60,
      phase: "playing",
    }));

    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: "system",
      playerName: "System",
      message: `New situation: "${newPrompt}"`,
      timestamp: new Date(),
      type: "system",
    };

    setChatMessages((prev) => [...prev, systemMessage]);
    toast.success("New situation generated!");
  }, []);

  if (isLoading) {
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
              Preparing your meme cards
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
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
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </motion.div>

      {/* Top Bar */}
      <TopBar
        currentRound={gameState.currentRound}
        totalRounds={gameState.totalRounds}
        timeLeft={gameState.timeLeft}
      />

      {/* Chat Panel */}
      <ChatPanel
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        players={players}
        currentPlayer={currentPlayer}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Players List */}
      <PlayersList
        players={players}
        currentPlayer={currentPlayer}
        isOpen={isPlayersOpen}
        onToggle={() => setIsPlayersOpen(!isPlayersOpen)}
      />

      {/* Center Arena - Prompt */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 shadow-xl max-w-md bg-slate-800/90 backdrop-blur-sm border-slate-700/50">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2 font-bangers tracking-wide">
                <RiLightbulbLine className="w-5 h-5" />
                {gameState.phase === "playing" && "Current Situation"}
                {gameState.phase === "voting" && "Vote for the Best Meme!"}
                {gameState.phase === "results" && "Round Results"}
                {gameState.phase === "game_over" && "Game Over!"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-white text-base md:text-lg font-medium mb-4 md:mb-6 leading-relaxed px-4 font-bangers tracking-wide">
                &ldquo;{gameState.currentPrompt}&rdquo;
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {currentPlayer && gameState.phase === "playing" && (
                  <Button
                    onClick={handleSubmitCard}
                    disabled={!selectedCard}
                    size="default"
                    className={cn(
                      "font-bangers text-lg tracking-wide min-h-[48px] px-8 py-3",
                      "bg-gradient-to-r from-green-600 to-green-700",
                      "hover:from-green-500 hover:to-green-600",
                      "disabled:from-slate-600 disabled:to-slate-700",
                      "shadow-lg shadow-green-500/30",
                      "focus-visible:ring-2 focus-visible:ring-green-500/50",
                    )}
                    aria-label="Submit selected meme card"
                  >
                    <RiSwordLine className="w-4 h-4 mr-2" />
                    Submit Meme
                  </Button>
                )}

                <Button
                  onClick={handleNewPrompt}
                  variant="outline"
                  size="default"
                  className={cn(
                    "font-bangers text-lg tracking-wide min-h-[48px] px-6 py-3",
                    "border-purple-500/50 text-purple-300 hover:bg-purple-500/20",
                    "hover:border-purple-400/70 hover:text-purple-200",
                    "shadow-lg shadow-purple-500/20",
                  )}
                  aria-label="Generate new situation"
                >
                  <RiLightbulbLine className="w-4 h-4 mr-2" />
                  New Situation
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Player's Hand */}
      {currentPlayer && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
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
                  currentPlayer.status === "submitted"
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
