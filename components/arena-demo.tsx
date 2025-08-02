"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";

import { useMemeCardSelection } from "@/hooks/useMemeCardSelection";
import { useIsMobile } from "@/hooks/use-mobile";
import { getRandomMemeCards } from "@/lib/utils/meme-card-pool";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MemeCardHand } from "@/components/meme-card-hand";
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

  // Mobile UI state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPlayersOpen, setIsPlayersOpen] = useState(false);
  const isMobile = useIsMobile();

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

      {/* Mobile Chat Toggle Button */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-20 left-4 z-50"
        >
          <Button
            onClick={() => setIsChatOpen(!isChatOpen)}
            size="sm"
            variant="secondary"
            className="min-h-[44px] min-w-[44px] rounded-full shadow-lg bg-blue-500 hover:bg-blue-600 text-white border-0 touch-manipulation"
            aria-label={isChatOpen ? "Close chat" : "Open chat"}
          >
            <RiChat1Line className="w-5 h-5" />
            {chatMessages.filter((msg) => msg.type === "chat").length > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">
                  {Math.min(
                    chatMessages.filter((msg) => msg.type === "chat").length,
                    9
                  )}
                </span>
              </div>
            )}
          </Button>
        </motion.div>
      )}

      {/* Chat Panel - Responsive */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{
          opacity: isMobile ? (isChatOpen ? 1 : 0) : 1,
          x: isMobile ? (isChatOpen ? 0 : -100) : 0,
        }}
        className={cn(
          "absolute z-40",
          isMobile
            ? "top-16 left-0 right-0 bottom-20 mx-4"
            : "top-20 left-4 bottom-4 w-64"
        )}
        style={{
          pointerEvents: isMobile && !isChatOpen ? "none" : "auto",
        }}
      >
        <Card className="h-full bg-card/95 backdrop-blur-sm border shadow-lg flex flex-col">
          <CardHeader className="pb-3 border-b shrink-0">
            <CardTitle className="text-card-foreground text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiChat1Line className="w-5 h-5 text-blue-500" />
                Chat
              </div>
              {isMobile && (
                <Button
                  onClick={() => setIsChatOpen(false)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label="Close chat"
                >
                  ✕
                </Button>
              )}
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
                  className={cn(
                    "flex-1 bg-background/50",
                    isMobile ? "text-base min-h-[44px]" : "text-sm"
                  )}
                  maxLength={200}
                  disabled={!currentPlayer}
                />
                <Button
                  type="submit"
                  size={isMobile ? "default" : "sm"}
                  disabled={!newMessage.trim() || !currentPlayer}
                  aria-label="Send message"
                  className={cn(
                    isMobile && "min-h-[44px] min-w-[44px] touch-manipulation"
                  )}
                >
                  <RiSendPlaneLine className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile Players Toggle Button */}
      {isMobile && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-20 right-4 z-50"
        >
          <Button
            onClick={() => setIsPlayersOpen(!isPlayersOpen)}
            size="sm"
            variant="secondary"
            className="min-h-[44px] min-w-[44px] rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white border-0 touch-manipulation"
            aria-label={
              isPlayersOpen ? "Close players list" : "Open players list"
            }
          >
            <RiFireLine className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {players.length}
              </span>
            </div>
          </Button>
        </motion.div>
      )}

      {/* TFT-Style Player List - Responsive */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{
          opacity: isMobile ? (isPlayersOpen ? 1 : 0) : 1,
          x: isMobile ? (isPlayersOpen ? 0 : 100) : 0,
        }}
        className={cn(
          "absolute z-40",
          isMobile
            ? "top-16 left-0 right-0 bottom-20 mx-4"
            : "top-20 right-4 bottom-4 w-64"
        )}
        style={{
          pointerEvents: isMobile && !isPlayersOpen ? "none" : "auto",
        }}
      >
        <Card className="h-full bg-card/95 backdrop-blur-sm border shadow-lg flex flex-col">
          <CardHeader className="pb-3 border-b shrink-0">
            <CardTitle className="text-card-foreground text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiFireLine className="w-5 h-5 text-orange-500" />
                Players
              </div>
              {isMobile && (
                <Button
                  onClick={() => setIsPlayersOpen(false)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label="Close players list"
                >
                  ✕
                </Button>
              )}
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
                          className={cn(
                            "text-xs font-bold px-2 py-0.5 flex items-center gap-1",
                            // Color-blind friendly: Add patterns/shapes + high contrast
                            currentPlayer.status === "submitted"
                              ? "bg-green-700 text-white border-2 border-green-900 shadow-lg"
                              : "bg-orange-600 text-white border-2 border-orange-800 animate-pulse shadow-lg"
                          )}
                        >
                          {/* Visual indicators beyond just color */}
                          {currentPlayer.status === "submitted" ? (
                            <>
                              <div className="w-2 h-2 bg-white rounded-full" />✓
                              DONE
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-white animate-ping rounded-full" />
                              YOU
                            </>
                          )}
                        </Badge>
                        <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-muted-foreground/30">
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
                                "text-xs font-medium px-2 py-0.5 flex items-center gap-1",
                                // Color-blind friendly: Better contrast + visual patterns
                                isSubmitted
                                  ? "bg-green-700 hover:bg-green-800 text-white border-2 border-green-900 shadow-md"
                                  : "border-2 border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100 animate-pulse"
                              )}
                            >
                              {/* Shape indicators beyond color */}
                              {isSubmitted ? (
                                <>
                                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                  ✓ DONE
                                </>
                              ) : (
                                <>
                                  <div className="w-1.5 h-1.5 bg-blue-700 rounded-full animate-pulse" />
                                  THINKING
                                </>
                              )}
                            </Badge>
                            <div
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border",
                                isSubmitted
                                  ? "text-green-700 bg-green-50 border-green-300"
                                  : "text-muted-foreground bg-muted/50 border-muted-foreground/30"
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
              className="text-foreground text-base md:text-lg font-medium mb-4 md:mb-6 leading-relaxed px-4"
            >
              &ldquo;{gameState.currentPrompt}&rdquo;
            </motion.p>
            <Button onClick={handleNewPrompt} variant="outline">
              <RiLightbulbLine className="w-4 h-4 mr-2" />
              New Prompt
            </Button>
          </CardContent>
        </Card>

        {/* Action Buttons - Centered under prompt */}
        {currentPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 flex items-center justify-center gap-3"
          >
            <Button
              onClick={() => {
                handleSubmitCard();
                if ("vibrate" in navigator) {
                  navigator.vibrate([100, 50, 100]);
                }
              }}
              disabled={!selectedCard}
              size="default"
              className="font-bold min-h-[48px] min-w-[48px] px-8 py-3 touch-manipulation"
              aria-label="Submit selected meme card"
            >
              <RiSwordLine className="w-4 h-4 mr-2" />
              Submit
            </Button>

            <Button
              variant="outline"
              size="default"
              className="font-medium min-h-[48px] min-w-[48px] px-6 py-3 touch-manipulation"
              onClick={() => {
                // Skip current card selection
                if ("vibrate" in navigator) {
                  navigator.vibrate(25);
                }
              }}
              aria-label="Skip card selection"
            >
              Skip
            </Button>

            <Button
              onClick={clearSelection}
              variant="outline"
              disabled={!selectedCard}
              size="default"
              className="min-h-[48px] px-6 py-3 touch-manipulation"
              aria-label="Clear card selection"
            >
              Clear
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* One-handed play mode: Floating action button */}
      {isMobile && currentPlayer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-20 right-4 z-50"
        >
          <Button
            size="lg"
            className="w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            onClick={() => {
              // Quick submit with one hand
              if (selectedCard) {
                handleSubmitCard();
                if ("vibrate" in navigator) {
                  navigator.vibrate([100, 50, 100]);
                }
              }
            }}
            disabled={!selectedCard}
            aria-label="Quick submit card"
          >
            <RiSwordLine className="w-6 h-6" />
            {/* One-handed mode indicator */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
          </Button>
        </motion.div>
      )}

      {/* Mobile-Optimized Player's Hand */}
      {currentPlayer && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 left-0 right-0 z-20"
        >
          {/* Mobile: Full-width bottom drawer */}
          <div className="md:absolute md:bottom-2 md:left-1/2 md:transform md:-translate-x-1/2 md:w-auto ">
            <Card className="bg-background/95 backdrop-blur-sm border-t md:border md:rounded-lg shadow-lg">
              <CardContent>
                <MemeCardHand
                  cards={currentPlayer.cards.slice(0, 7)}
                  selectedCard={selectedCard}
                  onCardSelect={selectCard}
                  disabled={false}
                  layout="professional"
                  theme="hearthstone"
                  showRarity={false}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}
