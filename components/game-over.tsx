"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  Medal,
  Crown,
  Star,
  Sparkles,
  PartyPopper,
  Home,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface GameOverProps {
  players: Player[];
  scores: Record<string, number>;
  totalRounds: number;
  currentUser: User;
  lobbyCode: string;
  onReturnToLobby: () => void;
  onGoHome: () => void;
}

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  totalScore: number;
  rank: number;
  avatar?: string;
  isCurrentUser: boolean;
}

export function GameOver({
  players,
  scores,
  totalRounds,
  currentUser,
  lobbyCode,
  onReturnToLobby,
  onGoHome,
}: GameOverProps) {
  // Calculate final leaderboard
  const leaderboard: LeaderboardEntry[] = players
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      totalScore: scores[player.id] || 0,
      rank: 0,
      avatar: player.avatar,
      isCurrentUser: player.id === currentUser.id,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const winner = leaderboard[0];
  const currentUserEntry = leaderboard.find((entry) => entry.isCurrentUser);
  const isWinner = currentUserEntry?.rank === 1;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-8 h-8 text-yellow-400" />;
      case 2:
        return <Medal className="w-8 h-8 text-slate-400" />;
      case 3:
        return <Trophy className="w-8 h-8 text-orange-500" />;
      default:
        return (
          <div className="w-8 h-8 bg-slate-600 text-white rounded-full flex items-center justify-center font-bangers text-lg">
            {rank}
          </div>
        );
    }
  };

  const getRankColors = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-500/30 to-yellow-600/30 border-yellow-500/50";
      case 2:
        return "from-slate-400/30 to-slate-500/30 border-slate-400/50";
      case 3:
        return "from-orange-500/30 to-orange-600/30 border-orange-500/50";
      default:
        return "from-slate-700/30 to-slate-800/30 border-slate-600/50";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl mx-auto"
      >
        {/* Winner Celebration */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="relative">
            {/* Confetti animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <PartyPopper className="w-16 h-16 text-yellow-400 opacity-20" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-6xl font-bangers text-white tracking-wider mb-4"
            >
              🎉 Game Over! 🎉
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black rounded-2xl p-6 sm:p-8 shadow-2xl mx-auto max-w-2xl"
            >
              <div className="flex items-center justify-center gap-4 mb-4">
                <Crown className="w-12 h-12 text-black" />
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bangers tracking-wide">
                    Champion: {winner.playerName}
                  </h2>
                  <p className="font-bangers text-lg sm:text-xl">
                    Final Score: {winner.totalScore} points
                  </p>
                </div>
                <Crown className="w-12 h-12 text-black" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-black" />
                <span className="font-bangers text-lg">
                  {totalRounds} Rounds of Epic Memes!
                </span>
                <Sparkles className="w-6 h-6 text-black" />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Personal Result */}
        {currentUserEntry && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <Card
              className={cn(
                "border-2",
                isWinner
                  ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/70"
                  : currentUserEntry.rank <= 3
                    ? "bg-gradient-to-r from-green-500/20 to-emerald-600/20 border-green-500/70"
                    : "bg-gradient-to-r from-blue-500/20 to-purple-600/20 border-blue-500/70"
              )}
            >
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl text-center">
                  Your Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getRankIcon(currentUserEntry.rank)}
                    <div>
                      <p className="text-white font-bangers text-lg">
                        You finished in {currentUserEntry.rank}
                        {currentUserEntry.rank === 1
                          ? "st"
                          : currentUserEntry.rank === 2
                            ? "nd"
                            : currentUserEntry.rank === 3
                              ? "rd"
                              : "th"}{" "}
                        place!
                      </p>
                      <p className="text-slate-300 font-bangers">
                        {isWinner
                          ? "🏆 Congratulations, Champion!"
                          : currentUserEntry.rank <= 3
                            ? "🎖️ Well played!"
                            : "🎮 Great effort!"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bangers text-2xl">
                      {currentUserEntry.totalScore}
                    </p>
                    <p className="text-slate-400 font-bangers text-sm">
                      points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Final Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8"
        >
          <Card className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6" />
                Final Standings
                <Trophy className="w-6 h-6" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <motion.div
                    key={entry.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                      `bg-gradient-to-r ${getRankColors(entry.rank)}`,
                      entry.isCurrentUser && "ring-2 ring-blue-500/50 shadow-lg"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex-shrink-0">
                        {getRankIcon(entry.rank)}
                      </div>

                      {/* Player Avatar */}
                      <Avatar className="w-12 h-12 border-2 border-white/20">
                        <AvatarImage
                          src={entry.avatar}
                          alt={entry.playerName}
                        />
                        <AvatarFallback className="bg-slate-600 text-white font-bangers">
                          {entry.playerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Player Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bangers text-lg">
                            {entry.playerName}
                          </span>
                          {entry.isCurrentUser && (
                            <Badge className="text-xs bg-blue-600">You</Badge>
                          )}
                          {entry.rank === 1 && (
                            <Badge className="text-xs bg-yellow-600 text-black">
                              <Crown className="w-3 h-3 mr-1" />
                              Winner
                            </Badge>
                          )}
                        </div>
                        {entry.rank <= 3 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-300 text-sm font-bangers">
                              {entry.rank === 1
                                ? "Champion"
                                : entry.rank === 2
                                  ? "Runner-up"
                                  : "Third Place"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <div
                        className={cn(
                          "font-bangers text-2xl",
                          entry.rank === 1 && "text-yellow-300",
                          entry.rank === 2 && "text-slate-300",
                          entry.rank === 3 && "text-orange-300",
                          entry.rank > 3 && "text-white"
                        )}
                      >
                        {entry.totalScore}
                      </div>
                      <div className="text-slate-400 text-sm font-bangers">
                        points
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={onReturnToLobby}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bangers text-lg px-8 py-3 shadow-lg"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Play Again
          </Button>

          <Button
            onClick={onGoHome}
            variant="outline"
            className="border-slate-500 text-white hover:bg-slate-700 font-bangers text-lg px-8 py-3"
          >
            <Home className="w-5 h-5 mr-2" />
            Go Home
          </Button>
        </motion.div>

        {/* Game Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center mt-8"
        >
          <p className="text-slate-400 font-bangers text-sm">
            Game Code: <span className="text-purple-300">{lobbyCode}</span> •
            {totalRounds} rounds completed • {players.length} players
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
