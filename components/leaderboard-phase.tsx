"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiTrophyLine, RiFireLine, RiStarLine } from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  calculateRoundScoring,
  getLeaderboard,
  formatScoreBreakdown,
  type PlayerStreak,
} from "@/lib/utils/scoring";

interface LeaderboardPhaseProps {
  currentUser: User;
  players: Player[];
  situation?: string;
  submissions: Record<
    string,
    { cardId: string; cardName: string; submittedAt: string }
  >;
  votes: Record<string, string>;
  scores: Record<string, number>;
  playerStreaks?: Record<string, PlayerStreak>;
  roundNumber: number;
  totalRounds: number;
  timeLeft: number;
}

export function LeaderboardPhase({
  currentUser,
  players,
  situation,
  submissions,
  votes,
  scores,
  playerStreaks,
  roundNumber,
  totalRounds,
  timeLeft,
}: LeaderboardPhaseProps) {
  console.log("🏆 LeaderboardPhase render:", {
    roundNumber,
    totalRounds,
    timeLeft,
  });
  const [showRoundDetails, setShowRoundDetails] = useState(true);

  // Calculate current round scoring
  const roundScoring = useMemo(() => {
    const result = calculateRoundScoring(
      players,
      submissions,
      votes,
      roundNumber,
      {}, // Don't pass existing scores to get just this round's points
      playerStreaks || {}
    );
    return result.roundScoring;
  }, [players, submissions, votes, roundNumber, playerStreaks]);

  // Get overall leaderboard
  const leaderboard = useMemo(() => {
    return getLeaderboard(players, scores);
  }, [players, scores]);

  // Auto-hide round details after 8 seconds to focus on leaderboard
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRoundDetails(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Find current user's position change (simplified - would need historical data for real change)
  const currentUserLeaderboardEntry = leaderboard.find(
    (entry) => entry.playerId === currentUser.id
  );

  const isGameEnd = roundNumber >= totalRounds;
  const gameWinner = leaderboard[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-5xl mx-auto px-4"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-bangers text-white tracking-wide mb-4"
        >
          {isGameEnd ? "Final Results!" : `Round ${roundNumber} Complete`}
        </motion.h2>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Badge
            variant="secondary"
            className="text-lg font-bangers tracking-wide bg-purple-600 text-white"
          >
            <RiFireLine className="w-4 h-4 mr-2" />
            Round {roundNumber}/{totalRounds}
          </Badge>

          <Badge className="bg-blue-600 text-white font-bangers">
            <RiStarLine className="w-4 h-4 mr-2" />
            Leaderboard
          </Badge>

          {!isGameEnd && (
            <Badge className="bg-green-600 text-white font-bangers">
              Next Round: {timeLeft}s
            </Badge>
          )}
        </div>

        {isGameEnd && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6"
          >
            <div className="text-center bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 text-black rounded-2xl p-6 shadow-2xl">
              <RiTrophyLine className="w-12 h-12 mx-auto mb-2" />
              <h3 className="text-2xl font-bangers tracking-wide">
                🎉 Game Winner: {gameWinner?.playerName} 🎉
              </h3>
              <p className="font-bangers text-lg">
                Final Score: {gameWinner?.totalScore} points
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Toggle between Round Details and Leaderboard */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setShowRoundDetails(true)}
          className={cn(
            "px-4 py-2 rounded-lg font-bangers transition-all",
            showRoundDetails
              ? "bg-purple-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          )}
        >
          Round {roundNumber} Results
        </button>
        <button
          onClick={() => setShowRoundDetails(false)}
          className={cn(
            "px-4 py-2 rounded-lg font-bangers transition-all",
            !showRoundDetails
              ? "bg-purple-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          )}
        >
          Overall Standings
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showRoundDetails ? (
          <motion.div
            key="round-results"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Round Results */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-2xl mb-6">
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl tracking-wide text-center">
                  Round {roundNumber} Scoring
                </CardTitle>
                {situation && (
                  <p className="text-purple-200 font-bangers text-center italic">
                    &quot;{situation}&quot;
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roundScoring.map((scoring, index) => (
                    <motion.div
                      key={scoring.playerId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg",
                        scoring.isWinner
                          ? "bg-yellow-500/20 border border-yellow-500/30"
                          : "bg-slate-700/30 border border-slate-600/30",
                        scoring.playerId === currentUser.id &&
                          "ring-2 ring-blue-500/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {scoring.isWinner && (
                            <RiTrophyLine className="w-5 h-5 text-yellow-400" />
                          )}
                          <span
                            className={cn(
                              "font-bangers text-lg",
                              scoring.isWinner
                                ? "text-yellow-300"
                                : "text-white"
                            )}
                          >
                            {scoring.playerName}
                          </span>
                          {scoring.playerId === currentUser.id && (
                            <Badge className="text-xs bg-blue-600">You</Badge>
                          )}
                        </div>

                        {/* Streak indicator */}
                        {scoring.streakBonus > 0 && (
                          <Badge className="bg-orange-600 text-white font-bangers text-xs">
                            <RiFireLine className="w-3 h-3 mr-1" />
                            Streak!
                          </Badge>
                        )}
                      </div>

                      <div className="text-right">
                        <div
                          className={cn(
                            "font-bangers text-xl",
                            scoring.isWinner ? "text-yellow-300" : "text-white"
                          )}
                        >
                          +{scoring.roundScore}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatScoreBreakdown(scoring)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Overall Leaderboard */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl tracking-wide text-center">
                  Overall Standings
                </CardTitle>
                {currentUserLeaderboardEntry && (
                  <p className="text-center text-slate-300 font-bangers">
                    You are in {currentUserLeaderboardEntry.rank}
                    {currentUserLeaderboardEntry.rank === 1
                      ? "st"
                      : currentUserLeaderboardEntry.rank === 2
                        ? "nd"
                        : currentUserLeaderboardEntry.rank === 3
                          ? "rd"
                          : "th"}{" "}
                    place
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => {
                    const isCurrentUser = entry.playerId === currentUser.id;
                    const streak = playerStreaks?.[entry.playerId];

                    return (
                      <motion.div
                        key={entry.playerId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg",
                          entry.rank === 1 &&
                            "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30",
                          entry.rank === 2 &&
                            "bg-gradient-to-r from-slate-400/20 to-slate-500/20 border border-slate-400/30",
                          entry.rank === 3 &&
                            "bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-600/30",
                          entry.rank > 3 &&
                            "bg-slate-700/30 border border-slate-600/30",
                          isCurrentUser && "ring-2 ring-blue-500/50"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div
                            className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-full font-bangers text-lg",
                              entry.rank === 1 &&
                                "bg-yellow-500 text-black shadow-lg",
                              entry.rank === 2 &&
                                "bg-slate-400 text-black shadow-lg",
                              entry.rank === 3 &&
                                "bg-orange-600 text-white shadow-lg",
                              entry.rank > 3 &&
                                "bg-slate-600 text-white shadow-md"
                            )}
                          >
                            {entry.rank === 1 && (
                              <RiTrophyLine className="w-5 h-5" />
                            )}
                            {entry.rank !== 1 && entry.rank}
                          </div>

                          {/* Player Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bangers text-lg">
                                {entry.playerName}
                              </span>
                              {isCurrentUser && (
                                <Badge className="text-xs bg-blue-600">
                                  You
                                </Badge>
                              )}
                            </div>

                            {/* Streak display */}
                            {streak && streak.currentStreak > 1 && (
                              <div className="flex items-center gap-1 mt-1">
                                <RiFireLine className="w-4 h-4 text-orange-400" />
                                <span className="text-orange-300 text-sm font-bangers">
                                  {streak.currentStreak} win streak
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
                    );
                  })}
                </div>

                {/* Game Progress */}
                {!isGameEnd && (
                  <div className="mt-6 pt-4 border-t border-slate-600">
                    <div className="flex items-center justify-between text-sm text-slate-400 font-bangers mb-2">
                      <span>Game Progress</span>
                      <span>
                        {roundNumber}/{totalRounds} rounds
                      </span>
                    </div>
                    <Progress
                      value={(roundNumber / totalRounds) * 100}
                      className="h-3 bg-slate-700"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mt-6"
      >
        <p className="text-white font-bangers text-lg tracking-wide">
          {isGameEnd ? (
            "🎮 Game Complete! Thanks for playing!"
          ) : (
            <>⏱️ Next round starting in {timeLeft} seconds...</>
          )}
        </p>
      </motion.div>
    </motion.div>
  );
}
