"use client";

import { useState, useEffect, useCallback } from "react";

import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { useIsMobile } from "@/hooks/use-mobile";
import { getRandomMemeCards } from "@/lib/utils/meme-card-pool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { MemeCardHand } from "@/components/meme-card-hand";
import { TopBar } from "@/components/top-bar";
import { ChatPanel } from "@/components/chat-panel";
import { PlayersList } from "@/components/players-list";
import { RiSwordLine, RiLightbulbLine } from "react-icons/ri";

const MOCK_PLAYERS: Omit<Player, "cards">[] = [
  {
    id: "1",
    name: "MemeLord",
    avatar: "/icons/cool-pepe.png",
    score: 245,
    status: "playing",
    isCurrentPlayer: true,
  },
  {
    id: "2",
    name: "GigaChad",
    avatar: "/icons/baby-yoda.png",
    score: 189,
    status: "submitted",
  },
  {
    id: "3",
    name: "SusAmogus",
    avatar: "/icons/harold.png",
    score: 156,
    status: "playing",
  },
  {
    id: "4",
    name: "BasedBot",
    avatar: "/icons/evil-doge.png",
    score: 134,
    status: "waiting",
  },
  {
    id: "5",
    name: "NoobMaster",
    avatar: "/icons/akward-look-monkey.png",
    score: 98,
    status: "playing",
  },
  {
    id: "6",
    name: "MemeQueen",
    avatar: "/icons/cool-pepe.png",
    score: 203,
    status: "submitted",
  },
];

const MOCK_PROMPTS = [
  "When you realize it's Monday tomorrow",
  "Trying to explain cryptocurrency to your parents",
  "When the wifi goes down during an important meeting",
  "Your reaction when someone spoils a movie",
  "When you find out pineapple pizza is actually good",
  "Trying to act normal when your crush texts you",
];

const MOCK_CHAT: ChatMessage[] = [
  {
    id: "1",
    playerId: "2",
    playerName: "GigaChad",
    message: "Let's gooo! 🔥",
    timestamp: new Date(),
    type: "chat",
  },
  {
    id: "2",
    playerId: "system",
    playerName: "System",
    message: "Round 3 has started!",
    timestamp: new Date(),
    type: "system",
  },
  {
    id: "3",
    playerId: "3",
    playerName: "SusAmogus",
    message: "This prompt is sus 😅",
    timestamp: new Date(),
    type: "chat",
  },
  {
    id: "4",
    playerId: "6",
    playerName: "MemeQueen",
    message: "Already submitted! 👑",
    timestamp: new Date(),
    type: "action",
  },
  {
    id: "5",
    playerId: "4",
    playerName: "BasedBot",
    message: "gg ez clap",
    timestamp: new Date(),
    type: "chat",
  },
];

export function ArenaDemo() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentRound: 3,
    totalRounds: 5,
    timeLeft: 45,
    phase: "playing",
    currentPrompt: "When you realize it's Monday tomorrow",
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [isLoading, setIsLoading] = useState(true);

  // Panel visibility state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const isMobile = useIsMobile();

  // Initialize players with cards
  useEffect(() => {
    const initializePlayers = async () => {
      setIsLoading(true);
      const playersWithCards = MOCK_PLAYERS.map((player) => ({
        ...player,
        cards: getRandomMemeCards(7),
      }));
      setPlayers(playersWithCards);
      setIsLoading(false);
    };
    initializePlayers();
  }, []);

  // Auto-close panels when switching to mobile
  useEffect(() => {
    if (isMobile) {
      setIsChatOpen(false);
      setIsPlayersOpen(false);
    }
  }, [isMobile]);

  // Timer countdown
  useEffect(() => {
    if (gameState.phase === "playing" && gameState.timeLeft > 0) {
      const timer = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          timeLeft: Math.max(0, prev.timeLeft - 1),
        }));
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
    [currentPlayer]
  );

  const handleSubmitCard = useCallback(() => {
    if (!selectedCard || !currentPlayer) return;

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === currentPlayer.id
          ? { ...p, selectedCard, status: "submitted" }
          : p
      )
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
  }, [selectedCard, currentPlayer, clearSelection]);

  const handleNewPrompt = useCallback(() => {
    const randomPrompt =
      MOCK_PROMPTS[Math.floor(Math.random() * MOCK_PROMPTS.length)];
    setGameState((prev) => ({
      ...prev,
      currentPrompt: randomPrompt,
      timeLeft: 60,
      phase: "playing",
    }));

    const systemMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: "system",
      playerName: "System",
      message: `New prompt: "${randomPrompt}"`,
      timestamp: new Date(),
      type: "system",
    };

    setChatMessages((prev) => [...prev, systemMessage]);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-xl">
          Loading The Arena...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-background overflow-hidden">
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

      {/* Mobile Players Toggle Button */}
      <PlayersList
        players={players}
        currentPlayer={currentPlayer}
        isOpen={isPlayersOpen}
        onToggle={() => setIsPlayersOpen(!isPlayersOpen)}
      />

      {/* Center Arena - Prompt */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
        <Card className="border-2 shadow-xl max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-foreground flex items-center justify-center gap-2">
              <RiLightbulbLine className="w-5 h-5" />
              Current Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-foreground text-base md:text-lg font-medium mb-4 md:mb-6 leading-relaxed px-4">
              &ldquo;{gameState.currentPrompt}&rdquo;
            </p>
            <Button onClick={handleNewPrompt} variant="outline">
              <RiLightbulbLine className="w-4 h-4 mr-2" />
              New Prompt
            </Button>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {currentPlayer && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              onClick={handleSubmitCard}
              disabled={!selectedCard}
              size="default"
              className="font-bold min-h-[48px] px-8 py-3"
              aria-label="Submit selected meme card"
            >
              <RiSwordLine className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </div>
        )}
      </div>

      {/* Player's Hand */}
      {currentPlayer && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="md:absolute md:bottom-2 md:left-1/2 md:transform md:-translate-x-1/2 md:w-auto">
            <div>
              <div>
                <MemeCardHand
                  cards={(currentPlayer?.cards ?? []).slice(0, 7)}
                  selectedCard={selectedCard}
                  onCardSelect={selectCard}
                  disabled={false}
                  theme="hearthstone"
                  showRarity={false}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
