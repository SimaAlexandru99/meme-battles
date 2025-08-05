"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiThumbUpLine, RiCheckLine, RiCloseLine } from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import Image from "next/image";

interface VotingPhaseProps {
  submissions: Submission[];
  currentPlayerId: string;
  onVote: (submissionId: string) => Promise<void>;
  timeLeft: number;
  isVoting: boolean;
  hasVoted: boolean;
}

export function VotingPhase({
  submissions,
  currentPlayerId,
  onVote,
  timeLeft,
  isVoting,
  hasVoted,
}: VotingPhaseProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(
    null
  );
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  // Filter out current player's submission
  const votableSubmissions = submissions.filter(
    (submission) => submission.playerId !== currentPlayerId
  );

  const handleVote = useCallback(async () => {
    if (!selectedSubmission || isSubmittingVote || hasVoted) return;

    setIsSubmittingVote(true);

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Submit Vote",
      },
      async (span) => {
        try {
          span.setAttribute("submission.id", selectedSubmission);
          span.setAttribute("player.id", currentPlayerId);

          await onVote(selectedSubmission);

          toast.success("Vote submitted successfully!");
          span.setAttribute("success", true);
        } catch (error) {
          console.error("Error submitting vote:", error);
          Sentry.captureException(error);
          toast.error("Failed to submit vote. Please try again.");
          span.setAttribute("success", false);
        } finally {
          setIsSubmittingVote(false);
        }
      }
    );
  }, [selectedSubmission, isSubmittingVote, hasVoted, onVote, currentPlayerId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
          Vote for the Best Meme!
        </motion.h2>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Badge
            variant="secondary"
            className={cn(
              "text-lg font-bangers tracking-wide",
              timeLeft <= 10
                ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
            )}
          >
            <RiThumbUpLine className="w-4 h-4 mr-2" />
            Time Left: {formatTime(timeLeft)}
          </Badge>

          {hasVoted && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <RiCheckLine className="w-4 h-4 mr-2" />
              Voted ✓
            </Badge>
          )}
        </div>

        <p className="text-purple-200/70 font-bangers tracking-wide text-lg">
          Choose the meme that best fits the situation. You cannot vote for your
          own submission.
        </p>
      </div>

      {/* Submissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <AnimatePresence>
          {votableSubmissions.map((submission, index) => (
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
                  "cursor-pointer transition-all duration-200 hover:shadow-lg",
                  selectedSubmission === submission.id
                    ? "ring-2 ring-green-500 shadow-green-500/50 bg-green-500/10"
                    : "hover:ring-2 hover:ring-blue-500/50 hover:bg-blue-500/5",
                  hasVoted && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => {
                  if (!hasVoted && !isSubmittingVote) {
                    setSelectedSubmission(
                      selectedSubmission === submission.id
                        ? null
                        : submission.id
                    );
                  }
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-center text-purple-200/70 font-bangers tracking-wide">
                    Submission #{index + 1}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4">
                  <div className="relative aspect-square mb-4">
                    <Image
                      src={submission.memeCard.url}
                      alt={submission.memeCard.alt}
                      className="w-full h-full object-cover rounded-lg"
                      loading="lazy"
                      width={100}
                      height={100}
                    />

                    {/* Selection Indicator */}
                    {selectedSubmission === submission.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                      >
                        <RiCheckLine className="w-5 h-5 text-white" />
                      </motion.div>
                    )}
                  </div>

                  {/* Vote Count */}
                  <div className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {submission.votes} vote{submission.votes !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        {!hasVoted ? (
          <>
            <Button
              onClick={handleVote}
              disabled={!selectedSubmission || isSubmittingVote || isVoting}
              size="lg"
              className={cn(
                "font-bangers text-xl tracking-wide min-h-[56px] px-8 py-4",
                selectedSubmission
                  ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
                  : "bg-slate-600 hover:bg-slate-700",
                "shadow-lg shadow-green-500/30",
                "focus-visible:ring-2 focus-visible:ring-green-500/50"
              )}
            >
              <RiThumbUpLine className="w-5 h-5 mr-2" />
              {isSubmittingVote ? "Submitting..." : "Submit Vote"}
            </Button>

            {selectedSubmission && (
              <Button
                onClick={() => setSelectedSubmission(null)}
                variant="outline"
                size="lg"
                className="font-bangers text-xl tracking-wide min-h-[56px] px-8 py-4 border-slate-600 text-white hover:bg-slate-700"
              >
                <RiCloseLine className="w-5 h-5 mr-2" />
                Clear Selection
              </Button>
            )}
          </>
        ) : (
          <div className="text-center">
            <p className="text-green-400 font-bangers tracking-wide text-lg mb-4">
              ✓ Your vote has been submitted!
            </p>
            <p className="text-purple-200/70 font-bangers tracking-wide">
              Waiting for other players to vote...
            </p>
          </div>
        )}
      </div>

      {/* Auto-complete warning */}
      {timeLeft <= 10 && !hasVoted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center"
        >
          <Badge
            variant="destructive"
            className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
          >
            ⚠️ Voting will end automatically in {timeLeft} seconds!
          </Badge>
        </motion.div>
      )}
    </motion.div>
  );
}
