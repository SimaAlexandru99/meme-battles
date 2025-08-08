"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiThumbUpLine, RiCheckLine } from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import type { User } from "@/types/index";

interface VotingPhaseProps {
  lobbyCode: string;
  currentUser: User;
  players: Player[];
  submissions: Record<
    string,
    { cardId: string; cardName: string; submittedAt: string }
  >;
  onVote: (submissionPlayerId: string) => void;
  hasVoted: boolean;
}

export function VotingPhase({
  currentUser,
  players,
  submissions,
  onVote,
  hasVoted,
}: VotingPhaseProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(
    null,
  );

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
      votes: 0,
      submittedAt: new Date(submission.submittedAt),
    }),
  );

  // Filter out current player's submission
  const votableSubmissions = submissionArray.filter(
    (submission) => submission.playerId !== currentUser.id,
  );

  const handleVote = useCallback(() => {
    if (!selectedSubmission || hasVoted) return;

    onVote(selectedSubmission);
    toast.success("Vote submitted successfully!");
  }, [selectedSubmission, hasVoted, onVote]);

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
          Vote for the Best Meme!
        </motion.h2>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Badge
            variant="secondary"
            className="text-lg font-bangers tracking-wide bg-purple-600 text-white"
          >
            {votableSubmissions.length} Submissions
          </Badge>

          {hasVoted && (
            <Badge className="bg-green-600 text-white font-bangers">
              ✓ Voted
            </Badge>
          )}
        </div>
      </div>

      {/* Submissions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {votableSubmissions.map((submission, index) => (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:scale-105",
                  "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50",
                  "shadow-2xl shadow-purple-500/10",
                  selectedSubmission === submission.id &&
                    "ring-2 ring-purple-500 border-purple-500",
                  hasVoted && "opacity-75 cursor-not-allowed",
                )}
                onClick={() => {
                  if (!hasVoted) {
                    setSelectedSubmission(submission.id);
                  }
                }}
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
                  </div>

                  {/* Vote Button */}
                  {!hasVoted && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSubmission(submission.id);
                        handleVote();
                      }}
                      className={cn(
                        "w-full font-bangers text-lg tracking-wide",
                        "bg-purple-600 hover:bg-purple-700 text-white",
                        "transition-all duration-200",
                      )}
                    >
                      <RiThumbUpLine className="w-5 h-5 mr-2" />
                      Vote
                    </Button>
                  )}

                  {/* Voted Indicator */}
                  {hasVoted && selectedSubmission === submission.id && (
                    <div className="flex items-center justify-center gap-2 text-green-400 font-bangers">
                      <RiCheckLine className="w-5 h-5" />
                      Voted
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Instructions */}
      {!hasVoted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-purple-200/70 font-bangers text-lg tracking-wide">
            Click on a meme to vote for it!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
