"use client";

import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  RiTimeLine,
  RiFireLine,
  RiCheckLine,
  RiThumbUpLine,
} from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { toast } from "sonner";

interface VotingPhaseProps {
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
  timeLeft: number;
}

export function VotingPhase({
  lobbyCode,
  currentUser,
  players,
  situation,
  submissions,
  votes,
  roundNumber,
  totalRounds,
  timeLeft,
}: VotingPhaseProps) {
  console.log("🗳️ VotingPhase render:", { roundNumber, totalRounds, timeLeft });
  const hasVoted = useMemo(
    () => Boolean(votes?.[currentUser.id]),
    [votes, currentUser.id]
  );

  // Ensure votes object exists to prevent runtime errors
  const safeVotes = useMemo(() => votes || {}, [votes]);

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
      submittedAt: new Date(submission.submittedAt),
    })
  );

  // Use stable order instead of shuffling to prevent position changes
  const stableSubmissions = useMemo(() => {
    // Sort by playerId for consistent ordering across renders
    return [...submissionArray].sort((a, b) =>
      a.playerId.localeCompare(b.playerId)
    );
  }, [submissionArray]);

  const handleVote = useCallback(
    async (submissionId: string) => {
      if (hasVoted || submissionId === currentUser.id || timeLeft <= 0) return;

      try {
        const { ref, set } = await import("firebase/database");
        const { rtdb } = await import("@/firebase/client");
        await set(
          ref(rtdb, `lobbies/${lobbyCode}/gameState/votes/${currentUser.id}`),
          submissionId
        );
        toast.success("Vote submitted!");
      } catch (error) {
        console.error("Failed to submit vote:", error);
        toast.error("Failed to submit vote. Please try again.");
      }
    },
    [hasVoted, currentUser.id, timeLeft, lobbyCode]
  );

  const isCriticalTime = timeLeft <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-6xl mx-auto px-4"
    >
      {/* Header with phase indicator and timer */}
      <div className="text-center mb-8">
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-bangers text-white tracking-wide mb-4"
        >
          Round {roundNumber} Voting
        </motion.h2>

        <div className="flex items-center justify-center gap-4 mb-6">
          <Badge
            variant="secondary"
            className="text-lg font-bangers tracking-wide bg-purple-600 text-white"
          >
            <RiFireLine className="w-4 h-4 mr-2" />
            Round {roundNumber}/{totalRounds}
          </Badge>

          <Badge
            className={cn(
              "font-bangers",
              isCriticalTime
                ? "bg-red-600 text-white animate-pulse"
                : "bg-green-600 text-white"
            )}
          >
            <RiTimeLine className="w-4 h-4 mr-2" />
            Voting: {timeLeft}s
          </Badge>
        </div>

        {situation && (
          <div className="max-w-3xl mx-auto bg-purple-600/20 border border-purple-500/30 rounded-xl p-4 mb-4">
            <p className="text-white font-bangers text-lg tracking-wide">
              &quot;{situation}&quot;
            </p>
          </div>
        )}

        {/* Voting instructions */}
        <div className="max-w-2xl mx-auto bg-green-600/20 border border-green-500/30 rounded-xl p-4">
          <p className="text-white font-bangers text-lg tracking-wide">
            {hasVoted ? (
              <>
                <RiCheckLine className="inline w-5 h-5 mr-2 text-green-400" />
                You&apos;ve voted! Waiting for others...
              </>
            ) : (
              <>
                <RiThumbUpLine className="inline w-5 h-5 mr-2 text-green-400" />
                Click on a meme to vote for it!
              </>
            )}
          </p>
        </div>
      </div>

      {/* Voting Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {stableSubmissions.map((submission) => (
          <div key={submission.playerId} className="relative">
            <Card
              className={cn(
                "transition-colors duration-200",
                "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50",
                "shadow-2xl shadow-purple-500/10",
                // Voting interactions
                !hasVoted &&
                  submission.playerId !== currentUser.id &&
                  timeLeft > 0 &&
                  "hover:ring-2 hover:ring-green-500 hover:border-green-500 cursor-pointer hover:bg-slate-700/60",
                // Already voted indicator
                hasVoted &&
                  safeVotes[currentUser.id] === submission.playerId &&
                  "ring-2 ring-green-500 border-green-500",
                // Own submission (cannot vote)
                submission.playerId === currentUser.id &&
                  "opacity-60 cursor-not-allowed"
              )}
              onClick={() => handleVote(submission.playerId)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-white font-bangers text-lg tracking-wide text-center">
                  {submission.playerName}
                  {submission.playerId === currentUser.id && (
                    <span className="text-sm text-slate-400 block">
                      (Your Submission)
                    </span>
                  )}
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
                    safeVotes[currentUser.id] === submission.playerId && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-2">
                        <RiCheckLine className="w-4 h-4" />
                      </div>
                    )}

                  {/* Vote count indicator (only show current vote count during voting) */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                    <span className="text-white text-sm font-bangers">
                      {
                        Object.values(safeVotes).filter(
                          (vote) => vote === submission.playerId
                        ).length
                      }{" "}
                      votes
                    </span>
                  </div>
                </div>

                {/* Voting status indicator */}
                <div className="text-center">
                  {hasVoted &&
                  safeVotes[currentUser.id] === submission.playerId ? (
                    <Badge className="bg-green-600 text-white font-bangers">
                      <RiCheckLine className="w-4 h-4 mr-1" />
                      Your Vote
                    </Badge>
                  ) : submission.playerId === currentUser.id ? (
                    <Badge
                      variant="outline"
                      className="text-slate-400 font-bangers border-slate-500"
                    >
                      Your Submission
                    </Badge>
                  ) : hasVoted ? (
                    <Badge
                      variant="outline"
                      className="text-slate-400 font-bangers border-slate-600"
                    >
                      You voted for someone else
                    </Badge>
                  ) : timeLeft > 0 ? (
                    <Badge className="bg-blue-600 text-white font-bangers hover:bg-blue-700 transition-colors">
                      <RiThumbUpLine className="w-4 h-4 mr-1" />
                      Click to Vote
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-slate-400 font-bangers border-slate-600"
                    >
                      Voting Closed
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Voting status message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="text-white font-bangers text-lg tracking-wide">
          {hasVoted
            ? "🗳️ Vote submitted! Waiting for other players to vote..."
            : `⏱️ ${timeLeft}s left to vote! Choose your favorite meme!`}
        </p>
      </motion.div>
    </motion.div>
  );
}
