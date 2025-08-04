"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { RiFireLine, RiCloseLine } from "react-icons/ri";

interface PlayersListProps {
  players: Player[];
  currentPlayer?: Player;
  isOpen?: boolean;
  onToggle?: () => void;
  className?: string;
  showMobileToggle?: boolean;
}

export function PlayersList({
  players,
  currentPlayer,
  isOpen = true,
  onToggle,
  className,
  showMobileToggle = true,
}: PlayersListProps) {
  const isMobile = useIsMobile();

  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle();
    }
  }, [onToggle]);

  const getStatusBadge = useCallback((status: Player["status"]) => {
    switch (status) {
      case "submitted":
        return (
          <Badge
            variant="default"
            className="text-xs font-bold px-2 py-0.5 flex items-center gap-1 bg-green-700 text-white border-2 border-green-900 shadow-lg"
          >
            <div className="w-2 h-2 bg-white rounded-full" />✓ DONE
          </Badge>
        );
      case "playing":
        return (
          <Badge
            variant="destructive"
            className="text-xs font-bold px-2 py-0.5 flex items-center gap-1 bg-orange-600 text-white border-2 border-orange-800 animate-pulse shadow-lg"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            PLAYING
          </Badge>
        );
      case "waiting":
        return (
          <Badge
            variant="secondary"
            className="text-xs font-bold px-2 py-0.5 flex items-center gap-1 bg-slate-600 text-white border-2 border-slate-800 shadow-lg"
          >
            <div className="w-2 h-2 bg-white rounded-full" />
            WAITING
          </Badge>
        );
      case "winner":
        return (
          <Badge
            variant="default"
            className="text-xs font-bold px-2 py-0.5 flex items-center gap-1 bg-yellow-600 text-white border-2 border-yellow-800 shadow-lg"
          >
            <div className="w-2 h-2 bg-white rounded-full" />
            WINNER
          </Badge>
        );
      default:
        return null;
    }
  }, []);

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && showMobileToggle && (
        <div className="fixed top-20 right-4 z-50">
          <Button
            onClick={handleToggle}
            size="sm"
            variant="secondary"
            className="min-h-[44px] min-w-[44px] rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white border-0"
            aria-label={isOpen ? "Close players list" : "Open players list"}
          >
            <RiFireLine className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">
                {players.length}
              </span>
            </div>
          </Button>
        </div>
      )}

      {/* Players List Panel */}
      <div
        className={cn(
          "absolute z-40 transition-all duration-300 ease-in-out",
          isMobile
            ? "top-16 left-0 right-0 bottom-20 mx-4"
            : "top-20 right-4 bottom-4 w-64",
          isMobile &&
            !isOpen &&
            "opacity-0 pointer-events-none transform translate-x-[100%]",
          !isMobile && "opacity-100",
          className,
        )}
      >
        <Card className="h-full bg-card/95 backdrop-blur-sm border shadow-lg flex flex-col">
          <CardHeader className="pb-3 border-b shrink-0">
            <CardTitle className="text-card-foreground text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiFireLine className="w-5 h-5 text-orange-500" />
                Players
              </div>
              {isMobile && showMobileToggle && (
                <Button
                  onClick={handleToggle}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label="Close players list"
                >
                  <RiCloseLine className="w-4 h-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 min-h-0">
            <ScrollArea className="flex-1 px-3 min-h-0">
              <div className="space-y-2 py-3">
                {/* Current Player */}
                {currentPlayer && (
                  <div className="relative">
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
                        {getStatusBadge(currentPlayer.status)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Other Players */}
                {players
                  .filter((player) => !player.isCurrentPlayer)
                  .map((player, index) => (
                    <div key={player.id} className="relative">
                      <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-card/50 border border-border/50 shadow-sm hover:bg-card/70 transition-colors">
                        <div className="relative">
                          <Avatar className="w-9 h-9 ring-2 ring-border/50 shadow-sm">
                            <AvatarImage src={player.avatar} />
                            <AvatarFallback className="bg-muted text-muted-foreground font-bold text-sm">
                              {player.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-gradient-to-br from-slate-400 to-slate-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm border border-white">
                            {index + 2}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-card-foreground truncate text-sm">
                            {player.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
                            {player.score} points
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {getStatusBadge(player.status)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
