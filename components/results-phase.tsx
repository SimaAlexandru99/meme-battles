"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiTrophyLine,
  RiStarLine,
  RiFireLine,
  RiTimeLine,
  RiCheckLine,
} from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ResultsPhaseProps {
  lobbyCode: string;
  currentUser: User;
  players: Player[];
  situation?: string;
  submissions: Record<
    string,
    { cardId: string; cardName: string; submittedAt: string }
  >;
  votes: Record<string, string>;
  roundNumber: number;
  totalRounds: number;
}

export function ResultsPhase({
  lobbyCode,
  currentUser,
  players,
  situation,
  submissions,
  votes,
  roundNumber,
  totalRounds,
}: ResultsPhaseProps) {
  const [winner, setWinner] = useState<string | null>(null);
  const hasVoted = useMemo(
    () => Boolean(votes?.[currentUser.id]),
    [votes, currentUser.id]
  );

  // Calculate votes for each submission
  useEffect(() => {
    const voteCounts: Record<string, number> = {};

    // Count votes for each submission
    Object.values(votes).forEach((votedFor) => {
      voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    });

    // Find winner (player with most votes)
    const winnerPlayerId = Object.entries(voteCounts).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev
    )[0];

    setWinner(winnerPlayerId);
  }, [votes]);

  // Convert submissions to array format for display
  const submissionArray = Object.entries(submissions).map(
    ([playerId, submission]) => ({
      id: playerId,
      playerId,
      playerName:
        players.find((p) => p.id === playerId)?.name || "Unknown Player",
      memeCard: {
        id: submission.cardId,
        filename: submission.cardName,
        url: `/memes/${submission.cardId}.jpg`,
        alt: `Meme card ${submission.cardId}`,
      },
      votes: Object.values(votes).filter((vote) => vote === playerId).length,
      submittedAt: new Date(submission.submittedAt),
    })
  );

  // Sort submissions by vote count (highest first)
  const sortedSubmissions = [...submissionArray].sort(
    (a, b) => b.votes - a.votes
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-6xl mx-auto px-4"
    >
      {/* Header with timer and situation */}
      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-bangers text-white tracking-wide mb-4"
        >
          Round {roundNumber} Voting & Results
        </motion.h2>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Badge
            variant="secondary"
            className="text-lg font-bangers tracking-wide bg-purple-600 text-white"
          >
            <RiFireLine className="w-4 h-4 mr-2" />
            Round {roundNumber}/{totalRounds}
          </Badge>

          <div className="flex items-center gap-2">
            <RiTimeLine className="w-5 h-5 text-purple-400" />
          </div>

          {winner && (
            <Badge className="bg-yellow-600 text-white font-bangers">
              <RiStarLine className="w-4 h-4 mr-2" />
              Winner: {players.find((p) => p.id === winner)?.name || "Unknown"}
            </Badge>
          )}
        </div>

        {situation && (
          <div className="max-w-3xl mx-auto bg-purple-600/20 border border-purple-500/30 rounded-xl p-4">
            <p className="text-white font-bangers text-lg tracking-wide">
              &quot;{situation}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Voting + Results Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <AnimatePresence>
          {sortedSubmissions.map((submission, index) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
              onClick={async () => {
                if (hasVoted || submission.playerId === currentUser.id) return;
                try {
                  const { ref, set } = await import("firebase/database");
                  const { rtdb } = await import("@/firebase/client");
                  await set(
                    ref(
                      rtdb,
                      `lobbies/${lobbyCode}/gameState/votes/${currentUser.id}`
                    ),
                    submission.playerId
                  );
                } catch {}
              }}
            >
              <Card
                className={cn(
                  "transition-all duration-200",
                  "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50",
                  "shadow-2xl shadow-purple-500/10",
                  winner === submission.playerId &&
                    "ring-2 ring-yellow-500 border-yellow-500"
                )}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-white font-bangers text-lg tracking-wide text-center">
                    {submission.playerName}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Meme Image */}
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-700/50">
                    <Image
                      src={submission.memeCard.url}
                      alt={submission.memeCard.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />

                    {/* Voted indicator for current user */}
                    {hasVoted &&
                      votes[currentUser.id] === submission.playerId && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-2">
                          <RiCheckLine className="w-4 h-4" />
                        </div>
                      )}

                    {/* Winner Crown */}
                    {winner === submission.playerId && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <RiTrophyLine className="w-5 h-5 text-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Vote Count */}
                  <div className="text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-sm font-bangers",
                        winner === submission.playerId
                          ? "bg-yellow-600 text-white border-yellow-500"
                          : "bg-slate-600 text-white border-slate-500"
                      )}
                    >
                      {submission.votes} vote{submission.votes !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* No Next Round button; auto-advance via timers */}
    </motion.div>
  );
}
