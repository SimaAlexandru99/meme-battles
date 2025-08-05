"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTrophyLine,
  RiStarLine,
  RiFireLine,
  RiCheckLine,
} from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ResultsPhaseProps {
  submissions: Submission[];
  currentSituation: string;
  currentRound: number;
  totalRounds: number;
  onNextRound: () => void;
  onGameOver: () => void;
  timeLeft: number;
  isHost: boolean;
}

export function ResultsPhase({
  submissions,
  currentSituation,
  currentRound,
  totalRounds,
  onNextRound,
  onGameOver,
  timeLeft,
  isHost,
}: ResultsPhaseProps) {
  const [showPlayerNames, setShowPlayerNames] = useState(false);
  const [winner, setWinner] = useState<Submission | null>(null);

  // Find the winner (submission with most votes)
  useEffect(() => {
    if (submissions.length > 0) {
      const winningSubmission = submissions.reduce((prev, current) =>
        current.votes > prev.votes ? current : prev
      );
      setWinner(winningSubmission);
    }
  }, [submissions]);

  // Sort submissions by vote count (highest first)
  const sortedSubmissions = [...submissions].sort((a, b) => b.votes - a.votes);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleNextRound = () => {
    if (currentRound < totalRounds) {
      onNextRound();
    } else {
      onGameOver();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-6xl mx-auto px-4"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-bangers text-white tracking-wide mb-4"
        >
          Round {currentRound} Results
        </motion.h2>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Badge
            variant="secondary"
            className="text-lg font-bangers tracking-wide bg-purple-500/20 text-purple-400 border-purple-500/30"
          >
            <RiFireLine className="w-4 h-4 mr-2" />
            Next round in: {formatTime(timeLeft)}
          </Badge>

          {winner && (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <RiStarLine className="w-4 h-4 mr-2" />
              Winner: {winner.playerName}
            </Badge>
          )}
        </div>

        <div className="mb-6">
          <p className="text-purple-200/70 font-bangers tracking-wide text-lg mb-2">
            Situation: &ldquo;{currentSituation}&rdquo;
          </p>
          <p className="text-purple-200/50 font-bangers tracking-wide text-sm">
            Round {currentRound} of {totalRounds}
          </p>
        </div>
      </div>

      {/* Winner Announcement */}
      {winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card className="border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 shadow-lg shadow-yellow-500/30">
            <CardHeader className="text-center">
              <CardTitle className="text-yellow-400 flex items-center justify-center gap-2 font-bangers tracking-wide text-xl">
                <RiTrophyLine className="w-6 h-6" />
                🏆 WINNER! 🏆
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="relative aspect-square max-w-xs mx-auto mb-4">
                <Image
                  src={winner.memeCard.url}
                  alt={winner.memeCard.alt}
                  className="w-full h-full object-cover rounded-lg border-2 border-yellow-500/50"
                  loading="lazy"
                  width={100}
                  height={100}
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <RiStarLine className="w-5 h-5 text-white" />
                </motion.div>
              </div>
              <p className="text-yellow-400 font-bangers tracking-wide text-lg">
                {winner.playerName} wins with {winner.votes} vote
                {winner.votes !== 1 ? "s" : ""}!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* All Submissions Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bangers text-white tracking-wide">
            All Submissions
          </h3>
          <Button
            onClick={() => setShowPlayerNames(!showPlayerNames)}
            variant="outline"
            size="sm"
            className="font-bangers tracking-wide border-slate-600 text-white hover:bg-slate-700"
          >
            <RiCheckLine className="w-4 h-4 mr-2" />
            {showPlayerNames ? "Hide Names" : "Show Names"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {sortedSubmissions.map((submission, index) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <Card
                  className={cn(
                    "transition-all duration-200",
                    submission.id === winner?.id
                      ? "ring-2 ring-yellow-500 shadow-yellow-500/50 bg-yellow-500/10"
                      : "hover:ring-2 hover:ring-slate-500/50 hover:bg-slate-500/5"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-center text-purple-200/70 font-bangers tracking-wide">
                        #{index + 1}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          submission.id === winner?.id
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                        )}
                      >
                        {submission.votes} vote
                        {submission.votes !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    <div className="relative aspect-square mb-4">
                      <Image
                        width={100}
                        height={100}
                        src={submission.memeCard.url}
                        alt={submission.memeCard.alt}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                      />

                      {/* Winner Indicator */}
                      {submission.id === winner?.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5 }}
                          className="absolute top-2 right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <RiStarLine className="w-5 h-5 text-white" />
                        </motion.div>
                      )}
                    </div>

                    {/* Player Name */}
                    {showPlayerNames && (
                      <div className="text-center">
                        <p className="text-purple-200 font-bangers tracking-wide text-sm">
                          by {submission.playerName}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        {isHost && (
          <Button
            onClick={handleNextRound}
            size="lg"
            className="font-bangers text-xl tracking-wide min-h-[56px] px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 shadow-lg shadow-green-500/30 focus-visible:ring-2 focus-visible:ring-green-500/50"
          >
            <RiFireLine className="w-5 h-5 mr-2" />
            {currentRound < totalRounds ? "Start Next Round" : "End Game"}
          </Button>
        )}

        {!isHost && (
          <div className="text-center">
            <p className="text-purple-200/70 font-bangers tracking-wide text-lg">
              Waiting for host to start next round...
            </p>
          </div>
        )}
      </div>

      {/* Auto-transition warning */}
      {timeLeft <= 10 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <Badge
            variant="destructive"
            className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
          >
            ⚠️ Next round will start automatically in {timeLeft} seconds!
          </Badge>
        </motion.div>
      )}
    </motion.div>
  );
}
