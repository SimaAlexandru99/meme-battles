"use client";

import { useCallback } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { RiFireLine } from "react-icons/ri";

interface PlayersListProps {
  players: Player[];
  currentPlayer?: Player;
}

export function PlayersList({ players }: PlayersListProps) {
  // Safety check for undefined players
  const safePlayers = players || [];

  // Sort players by score (highest first), with current player always first
  const sortedPlayers = [...safePlayers].sort((a, b) => {
    if (a.isCurrentPlayer) return -1;
    if (b.isCurrentPlayer) return 1;
    return b.score - a.score;
  });

  const getStatusBadge = useCallback((status: Player["status"]) => {
    switch (status) {
      case "submitted":
        return (
          <Badge className="text-xs font-bold px-2 py-0.5 flex items-center gap-1 bg-green-600 text-white">
            <div className="w-2 h-2 bg-white rounded-full" />✓ DONE
          </Badge>
        );
      case "playing":
        return (
          <Badge className="text-xs font-bold px-2 py-0.5 flex items-center gap-1 bg-orange-600 text-white">
            <div className="w-2 h-2 bg-white rounded-full" />
            PLAYING
          </Badge>
        );
      case "waiting":
        return (
          <Badge className="text-xs font-bold px-2 py-0.5 flex items-center gap-1 bg-slate-600 text-white">
            <div className="w-2 h-2 bg-white rounded-full" />
            WAITING
          </Badge>
        );
      case "winner":
        return (
          <Badge className="text-xs font-bold px-2 py-0.5 flex items-center gap-1 bg-yellow-600 text-white">
            <div className="w-2 h-2 bg-white rounded-full" />
            WINNER
          </Badge>
        );
      default:
        return null;
    }
  }, []);

  const getScoreBadge = useCallback((score: number, index: number) => {
    const getScoreColor = (score: number, index: number) => {
      if (index === 0) return "bg-yellow-600 text-white";
      if (index === 1) return "bg-gray-600 text-white";
      if (index === 2) return "bg-orange-600 text-white";
      return "bg-slate-600 text-white";
    };

    return (
      <Badge
        variant="default"
        className={cn(
          "text-xs font-bold px-2 py-0.5 flex items-center gap-1",
          getScoreColor(score, index)
        )}
      >
        <RiFireLine className="w-3 h-3" />
        {score}
      </Badge>
    );
  }, []);

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b shrink-0">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <RiFireLine className="w-5 h-5 text-orange-500" />
          Players ({safePlayers.length})
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-0 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-2 p-3">
            {sortedPlayers.map((player, index) => {
              const isCurrentPlayer = player.isCurrentPlayer;

              return (
                <div
                  key={player.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                    "bg-slate-700/30 border border-slate-600/50",
                    isCurrentPlayer && "ring-2 ring-purple-500 bg-purple-600/20"
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={player.avatar} alt={player.name} />
                    <AvatarFallback className="bg-slate-600 text-white font-bold">
                      {player.name[0]}
                    </AvatarFallback>
                  </Avatar>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="relative inline-flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "font-bangers text-sm tracking-wide truncate",
                            isCurrentPlayer ? "text-purple-300" : "text-white"
                          )}
                        >
                          {player.name}
                        </span>
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            player.isOnline ? "bg-green-400" : "bg-slate-500"
                          )}
                          title={player.isOnline ? "Online" : "Offline"}
                        />
                      </span>
                      {isCurrentPlayer && (
                        <Badge className="text-xs bg-purple-600 text-white">
                          YOU
                        </Badge>
                      )}
                    </div>

                    {/* Status and Score */}
                    <div className="flex items-center gap-2">
                      {getStatusBadge(player.status)}
                      {getScoreBadge(player.score, index)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </div>
  );
}
