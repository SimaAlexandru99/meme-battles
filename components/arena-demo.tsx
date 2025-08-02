"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { getRandomMemeCards } from "@/lib/utils/meme-card-pool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  RiFireLine,
  RiSwordLine,
  RiTimerLine,
  RiMedalLine,
  RiLightbulbLine,
  RiSendPlaneLine,
  RiChat1Line,
} from "react-icons/ri";

interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  status: "waiting" | "playing" | "submitted" | "winner";
  cards: MemeCard[];
  selectedCard?: MemeCard;
  isCurrentPlayer?: boolean;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  type: "chat" | "system" | "action";
}

interface GameState {
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  phase: "waiting" | "prompt" | "playing" | "voting" | "results";
  currentPrompt: string;
  winner?: Player;
}

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
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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

  // Timer countdown
  useEffect(() => {
    if (gameState.phase === "playing" && gameState.timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setGameState((prev) => ({
          ...prev,
          timeLeft: Math.max(0, prev.timeLeft - 1),
        }));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [gameState.phase, gameState.timeLeft]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      const scrollContainer = chatScrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatMessages]);

  const currentPlayer = players.find((p) => p.isCurrentPlayer);
  const { selectedCard, selectCard, clearSelection } = useMemeCardSelection({
    cards: currentPlayer?.cards || [],
  });

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !currentPlayer) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      message: newMessage.trim(),
      timestamp: new Date(),
      type: "chat",
    };

    setChatMessages((prev) => [...prev, message]);
    setNewMessage("");
  }, [newMessage, currentPlayer]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const otherPlayers = players.filter((p) => !p.isCurrentPlayer);

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
      {/* Top Bar - Rounds & Timer */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <Badge variant="secondary" className="text-sm px-3 py-2">
              <RiMedalLine className="w-4 h-4 mr-2" />
              Round {gameState.currentRound} / {gameState.totalRounds}
            </Badge>
            <Badge
              variant="outline"
              className="text-sm px-3 py-2 bg-orange-50 text-orange-600 border-orange-200"
            >
              <RiFireLine className="w-4 h-4 mr-2" />
              THE ARENA
            </Badge>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-lg shadow-xs",
              gameState.timeLeft <= 10
                ? "bg-destructive/10 border border-destructive/20 text-destructive animate-pulse"
                : "bg-card border text-card-foreground"
            )}
          >
            <RiTimerLine className="w-5 h-5" />
            {formatTime(gameState.timeLeft)}
          </motion.div>
        </div>
      </div>

      {/* Chat Panel (Left Side) */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-20 left-4 bottom-4 w-64 z-40"
      >
        <Card className="h-full bg-card/95 backdrop-blur-sm border shadow-lg flex flex-col">
          <CardHeader className="pb-3 border-b shrink-0">
            <CardTitle className="text-card-foreground text-lg flex items-center gap-2">
              <RiChat1Line className="w-5 h-5 text-blue-500" />
              Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <div className="flex-1 overflow-hidden min-h-0">
              <ScrollArea className="h-full px-3" ref={chatScrollRef}>
                <div className="space-y-2 py-3 pb-4">
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-2.5 rounded-md text-sm",
                        msg.type === "system" &&
                          "bg-blue-50 border border-blue-200 text-blue-700",
                        msg.type === "action" &&
                          "bg-green-50 border border-green-200 text-green-700",
                        msg.type === "chat" &&
                          "bg-muted/30 border border-border/50"
                      )}
                    >
                      <div className="font-semibold text-xs mb-1 flex items-center gap-2">
                        {msg.type === "chat" && (
                          <Avatar className="w-4 h-4">
                            <AvatarImage
                              src={
                                players.find((p) => p.id === msg.playerId)
                                  ?.avatar
                              }
                            />
                            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                              {msg.playerName[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span
                          className={cn(
                            msg.type === "system" && "text-blue-600",
                            msg.type === "action" && "text-green-600",
                            msg.type === "chat" && "text-card-foreground"
                          )}
                        >
                          {msg.playerName}
                        </span>
                      </div>
                      <div
                        className={cn(
                          msg.type === "system" && "text-blue-700",
                          msg.type === "action" && "text-green-700",
                          msg.type === "chat" && "text-card-foreground/90"
                        )}
                      >
                        {msg.message}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="shrink-0 p-3 border-t border-border/50 bg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="text-sm bg-background/50 flex-1"
                  maxLength={200}
                  disabled={!currentPlayer}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim() || !currentPlayer}
                  aria-label="Send message"
                >
                  <RiSendPlaneLine className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* TFT-Style Player List (Right Side) */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-20 right-4 bottom-4 w-64 z-40"
      >
        <Card className="h-full bg-card/95 backdrop-blur-sm border shadow-lg flex flex-col">
          <CardHeader className="pb-3 border-b shrink-0">
            <CardTitle className="text-card-foreground text-lg flex items-center gap-2">
              <RiFireLine className="w-5 h-5 text-orange-500" />
              Players
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 px-3 min-h-0">
              <div className="space-y-2 py-3">
                {/* Current Player - Always at top */}
                {currentPlayer && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                  >
                    <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gradient-to-r from-primary/15 to-primary/10 border border-primary/30 shadow-sm">
                      <div className="relative">
                        <Avatar className="w-9 h-9 ring-2 ring-primary/50 shadow-sm">
                          <AvatarImage src={currentPlayer.avatar} />
                          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                            {currentPlayer.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm border border-white">
                          1
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-card-foreground truncate text-sm">
                          {currentPlayer.name}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">
                          {currentPlayer.score} points
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={
                            currentPlayer.status === "submitted"
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs font-bold px-2 py-0.5"
                        >
                          {currentPlayer.status === "submitted"
                            ? "✓ DONE"
                            : "YOU"}
                        </Badge>
                        <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                          {currentPlayer.cards.length} cards
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Other Players - Sorted by score */}
                {otherPlayers
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => {
                    const isSubmitted = player.status === "submitted";
                    const rank = index + 2;

                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative"
                      >
                        <div
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-lg transition-all duration-200 border",
                            "hover:shadow-sm hover:scale-[1.01]",
                            isSubmitted
                              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm"
                              : "bg-card hover:bg-muted/20 border-border/50"
                          )}
                        >
                          <div className="relative">
                            <Avatar
                              className={cn(
                                "w-8 h-8 shadow-sm transition-all duration-200",
                                isSubmitted && "ring-2 ring-green-300"
                              )}
                            >
                              <AvatarImage src={player.avatar} />
                              <AvatarFallback
                                className={cn(
                                  "font-semibold",
                                  isSubmitted
                                    ? "bg-green-100 text-green-700"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {player.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={cn(
                                "absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold border border-white shadow-sm",
                                rank === 2 &&
                                  "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700",
                                rank === 3 &&
                                  "bg-gradient-to-br from-amber-600 to-orange-700 text-white",
                                rank > 3 &&
                                  "bg-gradient-to-br from-slate-400 to-slate-500 text-white"
                              )}
                            >
                              {rank}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                "font-semibold truncate text-sm",
                                isSubmitted
                                  ? "text-green-800"
                                  : "text-card-foreground"
                              )}
                            >
                              {player.name}
                            </div>
                            <div
                              className={cn(
                                "text-xs font-medium",
                                isSubmitted
                                  ? "text-green-600"
                                  : "text-muted-foreground"
                              )}
                            >
                              {player.score} points
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant={isSubmitted ? "default" : "outline"}
                              className={cn(
                                "text-xs font-medium px-2 py-0.5",
                                isSubmitted
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "border-muted-foreground/30 text-muted-foreground"
                              )}
                            >
                              {isSubmitted ? "✓ DONE" : "THINKING"}
                            </Badge>
                            <div
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                isSubmitted
                                  ? "text-green-600 bg-green-100"
                                  : "text-muted-foreground bg-muted/50"
                              )}
                            >
                              {player.cards.length} cards
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* Center Arena - Prompt */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
      >
        <Card className="border-2 shadow-xl max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-foreground flex items-center justify-center gap-2">
              <RiLightbulbLine className="w-5 h-5" />
              Current Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <motion.p
              key={gameState.currentPrompt}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-foreground text-lg font-medium mb-6 leading-relaxed"
            >
              &ldquo;{gameState.currentPrompt}&rdquo;
            </motion.p>
            <Button onClick={handleNewPrompt} variant="outline">
              <RiLightbulbLine className="w-4 h-4 mr-2" />
              New Prompt
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Minimized Player's Hand (Bottom) */}
      {currentPlayer && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-20"
        >
          <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                {/* Submit Button */}
                <Button
                  onClick={handleSubmitCard}
                  disabled={!selectedCard}
                  size="sm"
                  className="font-bold shrink-0"
                >
                  <RiSwordLine className="w-4 h-4 mr-1" />
                  Submit
                </Button>

                {/* Minimized Hand */}
                <div className="flex gap-3 items-center">
                  {currentPlayer.cards.slice(0, 7).map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "relative cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10",
                        selectedCard?.id === card.id &&
                          "scale-110 ring-2 ring-primary"
                      )}
                      onClick={() => selectCard(card)}
                      style={{
                        transform: `rotate(${(index - 3) * 0.8}deg) translateY(${index % 2 === 0 ? -3 : 3}px)`,
                        zIndex: selectedCard?.id === card.id ? 10 : 7 - index,
                      }}
                    >
                      <div className="w-24 h-32 bg-gradient-to-br from-amber-100 to-orange-200 rounded border border-amber-300 shadow-sm overflow-hidden">
                        <Image
                          src={card.url}
                          alt={card.alt}
                          width={96}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <div className="text-white text-xs font-medium truncate">
                            {card.filename.replace(/\.[^/.]+$/, "")}
                          </div>
                        </div>
                      </div>
                      {selectedCard?.id === card.id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Clear Button */}
                <Button
                  onClick={clearSelection}
                  variant="outline"
                  disabled={!selectedCard}
                  size="sm"
                  className="shrink-0"
                >
                  Clear
                </Button>

                {/* Hand Info */}
                <div className="text-xs text-muted-foreground shrink-0">
                  {currentPlayer.cards.length} cards
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
