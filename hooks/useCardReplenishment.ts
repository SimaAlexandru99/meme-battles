"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { replenishPlayerCard } from "@/lib/actions/lobby.action";

interface UseCardReplenishmentOptions {
  lobbyCode: string;
  currentUser: User;
  targetHandSize?: number; // Default 7 cards
  enabled?: boolean;
  onCardReplenished?: (newCard: MemeCard) => void;
}

interface UseCardReplenishmentReturn {
  replenishToTargetSize: (currentHandSize: number) => Promise<void>;
  isReplenishing: boolean;
  error: string | null;
  replenishedCards: MemeCard[];
}

/**
 * Hook for managing automatic card replenishment to maintain hand size
 */
export function useCardReplenishment({
  lobbyCode,
  targetHandSize = 7,
  enabled = true,
  onCardReplenished,
}: UseCardReplenishmentOptions): UseCardReplenishmentReturn {
  const [isReplenishing, setIsReplenishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replenishedCards, setReplenishedCards] = useState<MemeCard[]>([]);

  const replenishToTargetSize = useCallback(
    async (currentHandSize: number) => {
      if (!enabled || currentHandSize >= targetHandSize) {
        return;
      }

      const cardsNeeded = targetHandSize - currentHandSize;
      if (cardsNeeded <= 0) {
        return;
      }

      setIsReplenishing(true);
      setError(null);

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Replenish Cards To Target Size",
        },
        async (span) => {
          try {
            span.setAttribute("lobby.code", lobbyCode);
            span.setAttribute("cards.needed", cardsNeeded);
            span.setAttribute("cards.current_size", currentHandSize);
            span.setAttribute("cards.target_size", targetHandSize);

            const newCards: MemeCard[] = [];

            // Replenish cards one by one to avoid conflicts
            for (let i = 0; i < cardsNeeded; i++) {
              try {
                const result = await replenishPlayerCard(lobbyCode);

                if (result.success && result.newCard) {
                  newCards.push(result.newCard);
                  onCardReplenished?.(result.newCard);
                } else {
                  console.warn(
                    `Failed to replenish card ${i + 1}/${cardsNeeded}`,
                  );
                  break; // Stop if we can't get more cards
                }
              } catch (cardError) {
                console.warn(`Error replenishing card ${i + 1}:`, cardError);
                // If this is the first card and it fails, throw the error
                if (i === 0) {
                  throw cardError;
                }
                // Otherwise continue trying to get other cards
              }
            }

            setReplenishedCards((prev) => [...prev, ...newCards]);

            if (newCards.length > 0) {
              toast.success(
                `Added ${newCards.length} new card${newCards.length > 1 ? "s" : ""} to your hand`,
              );
            }

            span.setAttribute("cards.replenished", newCards.length);
            span.setAttribute("success", true);
          } catch (error) {
            console.error("Error replenishing cards:", error);
            Sentry.captureException(error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to replenish cards";
            setError(errorMessage);
            toast.error(errorMessage);
            span.setAttribute("success", false);
          } finally {
            setIsReplenishing(false);
          }
        },
      );
    },
    [lobbyCode, targetHandSize, enabled, onCardReplenished],
  );

  return {
    replenishToTargetSize,
    isReplenishing,
    error,
    replenishedCards,
  };
}
