"use client";

import { useCallback, useState } from "react";
import type { MemeCard as MemeCardType } from "@/types/index";
import { MemeCard, CardTheme } from "@/components/meme-card";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RiSendPlaneFill } from "react-icons/ri";

interface MemeCardHandProps {
  cards: MemeCardType[];
  selectedCard: MemeCardType | null;
  onSelectCard: (card: MemeCardType) => void;
  onSubmitCard: () => void;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  className?: string;
  theme?: CardTheme;
  showRarity?: boolean;
}

export function MemeCardHand({
  cards,
  selectedCard,
  onSelectCard,
  onSubmitCard,
  isSubmitting,
  hasSubmitted,
  className,
  theme = "hearthstone",
  showRarity = true,
}: MemeCardHandProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Generate consistent rarity for each card
  const getCardRarity = useCallback(
    (cardId: string): "common" | "rare" | "epic" | "legendary" => {
      if (!showRarity) return "common";

      // Use card ID for consistent rarity
      const hash = cardId.split("").reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
      }, 0);
      const randomValue = Math.abs(hash) / 2147483647;

      if (randomValue < 0.05) return "legendary"; // 5%
      if (randomValue < 0.15) return "epic"; // 10%
      if (randomValue < 0.35) return "rare"; // 20%
      return "common"; // 65%
    },
    [showRarity],
  );

  const handleCardSelect = useCallback(
    (card: MemeCardType) => {
      if (hasSubmitted) return;
      onSelectCard(card);
    },
    [hasSubmitted, onSelectCard],
  );

  const handleCardHover = useCallback((cardId: string | null) => {
    setHoveredCard(cardId);
  }, []);

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-400/30 rounded border-dashed"></div>
          </div>
          <p className="text-slate-300 font-medium">No cards in hand</p>
          <p className="text-slate-400 text-sm mt-1">
            Deal some cards to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <ScrollArea className="w-full">
          <div className="flex gap-3 justify-center p-6">
            {cards.map((card) => {
              const isSelected = selectedCard?.id === card.id;
              const isHovered = hoveredCard === card.id;
              const rarity = getCardRarity(card.id);

              return (
                <div
                  key={card.id}
                  className={cn(
                    "relative transition-all duration-300 ease-out",
                    isHovered && "scale-110 z-50",
                    isSelected && "scale-110 z-40",
                    hasSubmitted && "opacity-50 cursor-not-allowed",
                  )}
                  onMouseEnter={() => handleCardHover(card.id)}
                  onMouseLeave={() => handleCardHover(null)}
                  onClick={() => handleCardSelect(card)}
                >
                  <MemeCard
                    card={card}
                    theme={theme}
                    rarity={rarity}
                    isSelected={isSelected}
                    disabled={hasSubmitted}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <ScrollArea className="w-full">
          <div className="flex gap-2 p-4">
            {cards.map((card) => {
              const isSelected = selectedCard?.id === card.id;
              const rarity = getCardRarity(card.id);

              return (
                <div
                  key={card.id}
                  className={cn(
                    "relative transition-all duration-200",
                    isSelected && "scale-105",
                    hasSubmitted && "opacity-50",
                  )}
                  onClick={() => handleCardSelect(card)}
                >
                  <MemeCard
                    card={card}
                    theme={theme}
                    rarity={rarity}
                    isSelected={isSelected}
                    disabled={hasSubmitted}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Submit Button */}
      {selectedCard && !hasSubmitted && (
        <div className="text-center mt-6">
          <Button
            onClick={onSubmitCard}
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg px-8 py-3"
          >
            <RiSendPlaneFill className="w-5 h-5 mr-2" />
            {isSubmitting ? "Submitting..." : "Submit Card"}
          </Button>
        </div>
      )}

      {/* Submitted Indicator */}
      {hasSubmitted && (
        <div className="text-center mt-6">
          <div className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bangers">
            ✓ Card Submitted
          </div>
        </div>
      )}
    </div>
  );
}
