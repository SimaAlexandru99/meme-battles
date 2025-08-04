import { useState, useCallback } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import {
  updatePlayerScore,
  getLobbyScores,
  awardRoundWinner,
} from "@/lib/actions/lobby.action";

interface UseScoreTrackingOptions {
  lobbyCode: string;
  currentUser: User;
}

interface UseScoreTrackingReturn {
  updateScore: (
    playerId: string,
    points: number,
    reason: "win" | "participation" | "bonus",
    roundNumber?: number
  ) => Promise<void>;
  awardWinner: (winnerId: string, roundNumber: number) => Promise<void>;
  getScores: () => Promise<GameScore[]>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing score tracking in Firebase
 */
export function useScoreTracking({
  lobbyCode,
  currentUser,
}: UseScoreTrackingOptions): UseScoreTrackingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateScore = useCallback(
    async (
      playerId: string,
      points: number,
      reason: "win" | "participation" | "bonus",
      roundNumber?: number
    ) => {
      setIsLoading(true);
      setError(null);

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Update Player Score",
        },
        async (span) => {
          try {
            span.setAttribute("player.id", playerId);
            span.setAttribute("score.points", points);
            span.setAttribute("score.reason", reason);

            const result = await updatePlayerScore(lobbyCode, playerId, {
              points,
              reason,
              roundNumber,
            });

            if (result.success) {
              toast.success(result.message);
              span.setAttribute("success", true);
            } else {
              throw new Error("Failed to update score");
            }
          } catch (error) {
            console.error("Error updating score:", error);
            Sentry.captureException(error);
            const errorMessage =
              error instanceof Error ? error.message : "Failed to update score";
            setError(errorMessage);
            toast.error(errorMessage);
            span.setAttribute("success", false);
          } finally {
            setIsLoading(false);
          }
        }
      );
    },
    [lobbyCode]
  );

  const awardWinner = useCallback(
    async (winnerId: string, roundNumber: number) => {
      setIsLoading(true);
      setError(null);

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Award Round Winner",
        },
        async (span) => {
          try {
            span.setAttribute("winner.id", winnerId);
            span.setAttribute("round.number", roundNumber);

            const result = await awardRoundWinner(
              lobbyCode,
              winnerId,
              roundNumber
            );

            if (result.success) {
              toast.success(result.message);
              span.setAttribute("success", true);
            } else {
              throw new Error("Failed to award winner");
            }
          } catch (error) {
            console.error("Error awarding winner:", error);
            Sentry.captureException(error);
            const errorMessage =
              error instanceof Error ? error.message : "Failed to award winner";
            setError(errorMessage);
            toast.error(errorMessage);
            span.setAttribute("success", false);
          } finally {
            setIsLoading(false);
          }
        }
      );
    },
    [lobbyCode]
  );

  const getScores = useCallback(async (): Promise<GameScore[]> => {
    setIsLoading(true);
    setError(null);

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Get Lobby Scores",
      },
      async (span) => {
        try {
          const result = await getLobbyScores(lobbyCode);

          if (result.success) {
            span.setAttribute("scores.count", result.scores.length);
            span.setAttribute("success", true);
            return result.scores;
          } else {
            throw new Error("Failed to get scores");
          }
        } catch (error) {
          console.error("Error getting scores:", error);
          Sentry.captureException(error);
          const errorMessage =
            error instanceof Error ? error.message : "Failed to get scores";
          setError(errorMessage);
          toast.error(errorMessage);
          span.setAttribute("success", false);
          return [];
        } finally {
          setIsLoading(false);
        }
      }
    );
  }, [lobbyCode]);

  return {
    updateScore,
    awardWinner,
    getScores,
    isLoading,
    error,
  };
}
