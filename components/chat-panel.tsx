"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { RiChat1Line, RiCloseLine, RiSendPlaneLine } from "react-icons/ri";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  players: Player[];
  currentPlayer: Player | undefined;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatPanel({
  messages,
  onSendMessage,
  players,
  currentPlayer,
  isOpen,
  onToggle,
}: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const isMobile = useIsMobile();

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !currentPlayer) return;

    onSendMessage(newMessage.trim());
    setNewMessage("");
  }, [newMessage, currentPlayer, onSendMessage]);

  const chatMessages = messages.filter((msg) => msg.type === "chat");

  return (
    <>
      {/* Mobile Chat Toggle Button */}
      {isMobile && (
        <div className="fixed top-20 left-4 z-50">
          <Button
            onClick={onToggle}
            size="sm"
            variant="secondary"
            className="min-h-[44px] min-w-[44px] rounded-full shadow-lg bg-blue-500 hover:bg-blue-600 text-white border-0"
            aria-label={isOpen ? "Close chat" : "Open chat"}
          >
            <RiChat1Line className="w-5 h-5" />
            {chatMessages.length > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">
                  {Math.min(chatMessages.length, 9)}
                </span>
              </div>
            )}
          </Button>
        </div>
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          "absolute z-40 transition-all duration-300 ease-in-out",
          isMobile
            ? "top-16 left-0 right-0 bottom-20 mx-4"
            : "top-20 left-4 bottom-4 w-64",
          isMobile &&
            !isOpen &&
            "opacity-0 pointer-events-none transform translate-x-[-100%]",
          !isMobile && "opacity-100",
        )}
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
                  onClick={onToggle}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label="Close chat"
                >
                  <RiCloseLine className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <div className="flex-1 overflow-hidden min-h-0">
              <ScrollArea className="h-full px-3">
                <div className="space-y-2 py-3 pb-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "p-2.5 rounded-md text-sm",
                        msg.type === "system" &&
                          "bg-blue-50 border border-blue-200 text-blue-700",
                        msg.type === "action" &&
                          "bg-green-50 border border-green-200 text-green-700",
                        msg.type === "chat" &&
                          "bg-muted/30 border border-border/50",
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
                            msg.type === "chat" && "text-card-foreground",
                          )}
                        >
                          {msg.playerName}
                        </span>
                      </div>
                      <div
                        className={cn(
                          msg.type === "system" && "text-blue-700",
                          msg.type === "action" && "text-green-700",
                          msg.type === "chat" && "text-card-foreground/90",
                        )}
                      >
                        {msg.message}
                      </div>
                    </div>
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
                  className="flex-1 bg-background/50"
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
      </div>
    </>
  );
}
