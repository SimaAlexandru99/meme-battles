"use client";

import * as Sentry from "@sentry/nextjs";
import { motion } from "framer-motion";
import { Check, Flame, ThumbsUp, Timer, User } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  // Track voting phase renders for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      Sentry.addBreadcrumb({
        message: "VotingPhase render",
        category: "navigation",
        level: "info",
        data: { roundNumber, totalRounds, timeLeft },
      });
    }
  }, [roundNumber, totalRounds, timeLeft]);
  const hasVoted = useMemo(
    () => Boolean(votes?.[currentUser.id]),
    [votes, currentUser.id],
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
    }),
  );

  // Use stable order instead of shuffling to prevent position changes
  const stableSubmissions = useMemo(() => {
    // Sort by playerId for consistent ordering across renders
    return [...submissionArray].sort((a, b) =>
      a.playerId.localeCompare(b.playerId),
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
          submissionId,
        );
        toast.success("Vote submitted!");
      } catch (error) {
        console.error("Failed to submit vote:", error);
        toast.error("Failed to submit vote. Please try again.");
      }
    },
    [hasVoted, currentUser.id, timeLeft, lobbyCode],
  );

  const isCriticalTime = timeLeft <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-6xl mx-auto px-4"
    >
      {/* Enhanced Header with dramatic timer */}
      <div className="text-center mb-6 sm:mb-8">
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-2xl sm:text-4xl font-bangers text-white tracking-wide mb-4 sm:mb-6"
        >
          🗳️ Round {roundNumber} Voting
        </motion.h2>

        {/* Enhanced timer section */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mb-4 sm:mb-6">
          <Badge
            variant="secondary"
            className="text-base sm:text-lg font-bangers tracking-wide bg-purple-600/80 backdrop-blur text-white border border-purple-400/50 px-3 sm:px-4 py-2"
          >
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Round {roundNumber}/{totalRounds}
          </Badge>

          {/* Dramatic timer display */}
          <div
            className={cn(
              "flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl border-2 font-bangers text-lg sm:text-2xl transition-all duration-300",
              isCriticalTime
                ? "bg-red-600/90 border-red-400 text-white animate-pulse shadow-lg shadow-red-500/50"
                : timeLeft <= 20
                  ? "bg-orange-600/90 border-orange-400 text-white shadow-lg shadow-orange-500/30"
                  : "bg-green-600/90 border-green-400 text-white shadow-lg shadow-green-500/30",
            )}
            style={
              isCriticalTime
                ? {
                    textShadow: "0 0 10px rgba(239, 68, 68, 0.8)",
                    boxShadow:
                      "0 0 20px rgba(239, 68, 68, 0.4), 0 8px 32px rgba(239, 68, 68, 0.3)",
                  }
                : undefined
            }
          >
            <Timer
              className={cn(
                "w-5 h-5 sm:w-6 sm:h-6",
                isCriticalTime && "animate-bounce",
              )}
            />
            <span
              className={cn(
                "font-bold tracking-wider",
                isCriticalTime && "animate-pulse",
              )}
            >
              {timeLeft}s
            </span>
          </div>
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
                <Check className="inline w-5 h-5 mr-2 text-green-400" />
                You&apos;ve voted! Waiting for others...
              </>
            ) : (
              <>
                <ThumbsUp className="inline w-5 h-5 mr-2 text-green-400" />
                Click on a meme to vote for it!
              </>
            )}
          </p>
        </div>
      </div>

      {/* Enhanced Voting Grid */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
        {stableSubmissions.map((submission) => (
          <div key={submission.playerId} className="relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.random() * 0.3 }}
              whileHover={
                !hasVoted &&
                submission.playerId !== currentUser.id &&
                timeLeft > 0
                  ? { scale: 1.02 }
                  : {}
              }
              whileTap={
                !hasVoted &&
                submission.playerId !== currentUser.id &&
                timeLeft > 0
                  ? { scale: 0.98 }
                  : {}
              }
            >
              <Card
                className={cn(
                  "transition-all duration-300 transform",
                  "bg-slate-800/60 backdrop-blur-sm border shadow-xl",
                  // Voting interactions
                  !hasVoted &&
                    submission.playerId !== currentUser.id &&
                    timeLeft > 0 &&
                    "hover:shadow-2xl hover:shadow-green-500/20 border-slate-600/50 hover:border-green-500/80 cursor-pointer hover:bg-slate-700/80",
                  // Already voted indicator
                  hasVoted &&
                    safeVotes[currentUser.id] === submission.playerId &&
                    "ring-2 ring-green-500 border-green-500/80 shadow-green-500/20 bg-green-900/20",
                  // Own submission (cannot vote)
                  submission.playerId === currentUser.id &&
                    "border-purple-500/50 bg-purple-900/20 cursor-not-allowed",
                  // Default state
                  hasVoted &&
                    safeVotes[currentUser.id] !== submission.playerId &&
                    submission.playerId !== currentUser.id &&
                    "opacity-70 border-slate-600/30",
                )}
                onClick={() => handleVote(submission.playerId)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-white font-bangers text-base sm:text-lg tracking-wide text-center">
                    {submission.playerName}
                    {submission.playerId === currentUser.id && (
                      <span className="text-xs sm:text-sm text-purple-300 block">
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
                          <Check className="w-4 h-4" />
                        </div>
                      )}

                    {/* Vote count indicator (only show current vote count during voting) */}
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
                      <span className="text-white text-sm font-bangers">
                        {
                          Object.values(safeVotes).filter(
                            (vote) => vote === submission.playerId,
                          ).length
                        }{" "}
                        votes
                      </span>
                    </div>
                  </div>

                  {/* Enhanced voting status indicator */}
                  <div className="text-center">
                    {hasVoted &&
                    safeVotes[currentUser.id] === submission.playerId ? (
                      <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bangers px-3 py-1 text-sm shadow-lg">
                        <Check className="w-4 h-4 mr-1" />
                        Your Vote ✨
                      </Badge>
                    ) : submission.playerId === currentUser.id ? (
                      <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bangers px-3 py-1 text-sm">
                        <User className="w-4 h-4 mr-1" />
                        Your Submission
                      </Badge>
                    ) : hasVoted ? (
                      <Badge
                        variant="outline"
                        className="text-slate-400 font-bangers border-slate-500/50 px-3 py-1 text-xs"
                      >
                        You voted elsewhere
                      </Badge>
                    ) : timeLeft > 0 ? (
                      <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bangers hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 px-3 py-1 text-sm shadow-lg animate-pulse">
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        🗳️ Tap to Vote!
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-slate-400 font-bangers border-slate-600/50 px-3 py-1 text-xs"
                      >
                        ⏰ Voting Closed
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Enhanced voting status message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div
          className={cn(
            "inline-flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg",
            hasVoted
              ? "bg-green-600/20 border border-green-400/30"
              : isCriticalTime
                ? "bg-red-600/20 border border-red-400/30"
                : "bg-blue-600/20 border border-blue-400/30",
          )}
        >
          {hasVoted ? (
            <>
              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              <div className="text-left">
                <p className="text-green-300 font-bangers text-base sm:text-lg tracking-wide">
                  Vote submitted successfully!
                </p>
                <p className="text-green-200/80 font-bangers text-sm">
                  Waiting for other players...
                </p>
              </div>
            </>
          ) : (
            <>
              <Timer
                className={cn(
                  "w-5 h-5 sm:w-6 sm:h-6",
                  isCriticalTime
                    ? "text-red-400 animate-bounce"
                    : "text-blue-400",
                )}
              />
              <div className="text-left">
                <p
                  className={cn(
                    "font-bangers text-base sm:text-lg tracking-wide",
                    isCriticalTime ? "text-red-300" : "text-blue-300",
                  )}
                >
                  {isCriticalTime
                    ? "⚠️ Hurry up!"
                    : "Choose your favorite meme!"}
                </p>
                <p
                  className={cn(
                    "font-bangers text-sm",
                    isCriticalTime ? "text-red-200/80" : "text-blue-200/80",
                  )}
                >
                  {timeLeft}s remaining
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
