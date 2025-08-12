"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RiCheckLine, RiTimeLine } from "react-icons/ri";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";

interface VotingPhaseProps {
  lobbyCode: string;
  currentUser: User;
  players: Player[];
  situation: string;
  submissions: Record<
    string,
    { cardId: string; cardName: string; submittedAt: string }
  >;
  onVote: (submissionPlayerId: string) => void;
  onAbstain?: () => void;
  hasVoted: boolean;
  hasAbstained?: boolean;
  timeLeft: number;
  isOpen: boolean;
  onClose: () => void;
}

export function VotingPhase({
  currentUser,
  players,
  situation,
  submissions,
  onVote,
  onAbstain,
  hasVoted,
  hasAbstained,
  timeLeft,
  isOpen,
  onClose,
}: VotingPhaseProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(
    null
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
    })
  );

  // Filter out current player's submission
  const votableSubmissions = submissionArray.filter(
    (submission) => submission.playerId !== currentUser.id
  );

  const handleVote = useCallback(
    (playerId: string) => {
      if (hasVoted || hasAbstained) return;
      onVote(playerId);
      setSelectedSubmission(playerId);
      toast.success("Vote submitted!");
      setTimeout(() => onClose(), 1500);
    },
    [hasVoted, hasAbstained, onVote, onClose]
  );

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-slate-800/95 backdrop-blur-sm border-slate-700/50 max-w-7xl w-[99vw] max-h-[92vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white font-bangers text-2xl tracking-wide text-center flex items-center justify-center gap-4">
            <span>Vote for the Best Meme!</span>
            <div className="flex items-center gap-2">
              <RiTimeLine
                className={cn(
                  "w-5 h-5",
                  timeLeft <= 10 ? "text-red-400" : "text-purple-400"
                )}
              />
              <span
                className={cn(
                  "font-bangers text-lg",
                  timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-white"
                )}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="p-6">
          {/* Situation Display */}
          {situation && (
            <div className="mb-6">
              <div className="bg-purple-600/20 border border-purple-500/30 rounded-xl p-4">
                <p className="text-white font-bangers text-lg tracking-wide text-center">
                  &quot;{situation}&quot;
                </p>
              </div>
            </div>
          )}
          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            {hasVoted ? (
              <Badge className="bg-green-600 text-white font-bangers text-lg px-4 py-2">
                ✓ Vote Submitted
              </Badge>
            ) : (
              <Badge className="bg-purple-600 text-white font-bangers text-lg px-4 py-2">
                {votableSubmissions.length} Submissions to Vote On
              </Badge>
            )}
          </div>

          {/* Submissions Grid */}
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
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
                    "group cursor-pointer transition-all duration-200 hover:scale-105",
                    "bg-slate-700/50 border-slate-600/50",
                    selectedSubmission === submission.id &&
                      "ring-2 ring-purple-400 border-purple-400",
                    hasVoted &&
                      selectedSubmission === submission.id &&
                      "ring-2 ring-green-400 border-green-400",
                    hasVoted &&
                      selectedSubmission !== submission.id &&
                      "opacity-50"
                  )}
                  onClick={() => !hasVoted && handleVote(submission.playerId)}
                >
                  <CardContent className="p-5">
                    <AspectRatio
                      ratio={4 / 3}
                      className="relative overflow-hidden rounded-lg mb-4 bg-slate-900"
                    >
                      <Image
                        src={submission.memeCard.url}
                        alt={submission.memeCard.alt}
                        fill
                        className="object-contain p-2 sm:p-4 transition-transform duration-200 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    </AspectRatio>
                    <p className="text-white font-bangers text-center text-2xl tracking-wide">
                      {submission.playerName}
                    </p>

                    {/* Vote Indicator */}
                    {hasVoted && selectedSubmission === submission.id && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-2">
                        <RiCheckLine className="w-4 h-4" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Instructions */}
          {!hasVoted && !hasAbstained && (
            <p className="text-center text-purple-200/70 font-bangers text-sm mt-6">
              Click on a meme to cast your vote!
            </p>
          )}

          {/* Already Voted/Abstained Message */}
          {(hasVoted || hasAbstained) && (
            <div className="text-center mt-6">
              <p className="text-green-400 font-bangers text-lg">
                {hasVoted ? "Thanks for voting!" : "You abstained."} Waiting for
                others...
              </p>
            </div>
          )}

          {/* Abstain Button */}
          {!hasVoted && !hasAbstained && onAbstain && (
            <div className="flex justify-center mt-6">
              <Button
                variant="secondary"
                className="bg-slate-700 hover:bg-slate-600 text-white font-bangers"
                onClick={() => {
                  onAbstain();
                  toast.info("You abstained this round.");
                  setTimeout(() => onClose(), 1000);
                }}
              >
                Skip Voting
              </Button>
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
