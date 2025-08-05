"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import {
  submitMemeCard,
  getRoundSubmissions,
  updateGameSituation,
  removeCardFromHand,
  replenishPlayerCard,
} from "@/lib/actions/lobby.action";

// Type definitions for submission data
interface SubmissionData {
  id: string;
  playerId: string;
  playerName: string;
  cardId: string;
  submittedAt: string;
  votes: number;
}

interface RoundSubmissionsResult {
  success: boolean;
  submissions: SubmissionData[];
  phase: string;
  currentRound: number;
  currentSituation?: string;
}

interface UseCardSubmissionOptions {
  lobbyCode: string;
  currentUser: User;
  onSubmissionSuccess?: () => void;
  onPhaseTransition?: (newPhase: string) => void;
}

interface UseCardSubmissionReturn {
  submitCard: (cardId: string) => Promise<void>;
  getSubmissions: () => Promise<RoundSubmissionsResult | null>;
  updateSituation: (situation: string) => Promise<void>;
  replenishCard: () => Promise<MemeCard | null>;
  isSubmitting: boolean;
  isLoading: boolean;
  error: string | null;
  hasSubmitted: boolean;
  submissionData: SubmissionData | null;
}

/**
 * Hook for managing meme card submissions in the game
 */
export function useCardSubmission({
  lobbyCode,
  currentUser,
  onSubmissionSuccess,
  onPhaseTransition,
}: UseCardSubmissionOptions): UseCardSubmissionReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState<SubmissionData | null>(
    null,
  );

  const submitCard = useCallback(
    async (cardId: string) => {
      if (!cardId || !currentUser) {
        toast.error("Invalid card or user data");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Submit Meme Card",
        },
        async (span) => {
          try {
            span.setAttribute("card.id", cardId);
            span.setAttribute("lobby.code", lobbyCode);
            span.setAttribute("user.id", currentUser.id);

            const result = await submitMemeCard(lobbyCode, cardId);

            if (result.success) {
              // Create submission data from the result
              const submission: SubmissionData = {
                id: currentUser.id,
                playerId: currentUser.id,
                playerName: currentUser.name || "Unknown Player",
                cardId: cardId,
                submittedAt: new Date().toISOString(),
                votes: 0,
              };

              setHasSubmitted(true);
              setSubmissionData(submission);

              // Remove the card from the player's hand
              try {
                await removeCardFromHand(lobbyCode, cardId);
                span.setAttribute("card_removed", true);
              } catch (removeError) {
                console.warn("Failed to remove card from hand:", removeError);
                // Don't fail the submission if card removal fails
              }

              toast.success(result.message);
              onSubmissionSuccess?.();

              // Handle phase transition
              if (result.phaseTransition) {
                toast.info(
                  `All players submitted! Moving to ${result.phaseTransition} phase...`,
                );
                onPhaseTransition?.(result.phaseTransition);
              }

              span.setAttribute("success", true);
              span.setAttribute("phase_transition", !!result.phaseTransition);
            } else {
              throw new Error("Submission failed");
            }
          } catch (error) {
            console.error("Error submitting card:", error);
            Sentry.captureException(error);
            const errorMessage =
              error instanceof Error ? error.message : "Failed to submit card";
            setError(errorMessage);
            toast.error(errorMessage);
            span.setAttribute("success", false);
          } finally {
            setIsSubmitting(false);
          }
        },
      );
    },
    [lobbyCode, currentUser, onSubmissionSuccess, onPhaseTransition],
  );

  const getSubmissions =
    useCallback(async (): Promise<RoundSubmissionsResult | null> => {
      setIsLoading(true);
      setError(null);

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Get Round Submissions",
        },
        async (span) => {
          try {
            span.setAttribute("lobby.code", lobbyCode);

            const result = await getRoundSubmissions(lobbyCode);

            if (result.success) {
              span.setAttribute("submissions.count", result.submissions.length);
              span.setAttribute("game.phase", result.phase);
              return result as RoundSubmissionsResult;
            } else {
              throw new Error("Failed to get submissions");
            }
          } catch (error) {
            console.error("Error getting submissions:", error);
            Sentry.captureException(error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to get submissions";
            setError(errorMessage);
            toast.error(errorMessage);
            span.setAttribute("success", false);
            return null;
          } finally {
            setIsLoading(false);
          }
        },
      );
    }, [lobbyCode]);

  const updateSituation = useCallback(
    async (situation: string) => {
      if (!situation.trim()) {
        toast.error("Situation cannot be empty");
        return;
      }

      setIsLoading(true);
      setError(null);

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Update Game Situation",
        },
        async (span) => {
          try {
            span.setAttribute("lobby.code", lobbyCode);
            span.setAttribute("situation.length", situation.length);

            const result = await updateGameSituation(lobbyCode, situation);

            if (result.success) {
              toast.success(result.message);
              span.setAttribute("success", true);
            } else {
              throw new Error("Failed to update situation");
            }
          } catch (error) {
            console.error("Error updating situation:", error);
            Sentry.captureException(error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to update situation";
            setError(errorMessage);
            toast.error(errorMessage);
            span.setAttribute("success", false);
          } finally {
            setIsLoading(false);
          }
        },
      );
    },
    [lobbyCode],
  );

  const replenishCard = useCallback(async (): Promise<MemeCard | null> => {
    setIsLoading(true);
    setError(null);

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Replenish Player Card",
      },
      async (span) => {
        try {
          span.setAttribute("lobby.code", lobbyCode);

          const result = await replenishPlayerCard(lobbyCode);

          if (result.success) {
            span.setAttribute("success", true);
            span.setAttribute("new_card.id", result.newCard.id);
            return result.newCard;
          } else {
            throw new Error("Failed to replenish card");
          }
        } catch (error) {
          console.error("Error replenishing card:", error);
          Sentry.captureException(error);
          const errorMessage =
            error instanceof Error ? error.message : "Failed to replenish card";
          setError(errorMessage);
          toast.error(errorMessage);
          span.setAttribute("success", false);
          return null;
        } finally {
          setIsLoading(false);
        }
      },
    );
  }, [lobbyCode]);

  return {
    submitCard,
    getSubmissions,
    updateSituation,
    replenishCard,
    isSubmitting,
    isLoading,
    error,
    hasSubmitted,
    submissionData,
  };
}
