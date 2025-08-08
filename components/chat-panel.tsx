"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RiChat1Line, RiSendPlaneLine } from "react-icons/ri";
import type { ChatMessage, User } from "@/types/index";

interface ChatPanelProps {
  messages: ChatMessage[];
  newMessage: string;
  onNewMessageChange: (message: string) => void;
  onSendMessage: () => void;
  currentUser: User;
}

export function ChatPanel({
  messages,
  newMessage,
  onNewMessageChange,
  onSendMessage,
}: ChatPanelProps) {
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    onSendMessage();
  }, [newMessage, onSendMessage]);

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b shrink-0">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <RiChat1Line className="w-5 h-5 text-blue-500" />
          Chat
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
                      "bg-slate-700/30 border border-slate-600/50 text-white",
                  )}
                >
                  <div className="font-semibold text-xs mb-1 flex items-center gap-2">
                    {msg.type === "chat" && (
                      <Avatar className="w-4 h-4">
                        <AvatarFallback className="text-xs bg-slate-600 text-white">
                          {msg.playerName[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-purple-300">{msg.playerName}</span>
                    <span className="text-slate-400 text-xs">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-sm">{msg.message}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="p-3 border-t border-slate-600/50">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => onNewMessageChange(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key !== "Enter") {
                  return;
                }
                handleSendMessage();
              }}
            />
            <Button
              onClick={handleSendMessage}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RiSendPlaneLine className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
