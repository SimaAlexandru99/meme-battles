"use client";

import { useCallback, useState } from "react";
import { MemeCard, CardTheme } from "@/components/meme-card";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MemeCardHandProps {
  cards: MemeCard[];
  selectedCard: MemeCard | null;
  onSelectCard: (card: MemeCard) => void;
  hasSubmitted: boolean;
  className?: string;
  theme?: CardTheme;
  showRarity?: boolean;
}

export function MemeCardHand({
  cards,
  selectedCard,
  onSelectCard,
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
    [showRarity]
  );

  const handleCardSelect = useCallback(
    (card: MemeCard) => {
      if (hasSubmitted) return;
      onSelectCard(card);
    },
    [hasSubmitted, onSelectCard]
  );

  const handleCardHover = useCallback((cardId: string | null) => {
    setHoveredCard(cardId);
  }, []);

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
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
          <div className="flex gap-3 justify-center p-16">
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
                    hasSubmitted && "opacity-50 cursor-not-allowed"
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

      {/* Mobile Layout - Centered and visible */}
      <div className="lg:hidden w-full">
        {/* Mobile Cards Horizontal Scroll */}
        <div 
          className="w-full overflow-x-auto overflow-y-hidden" 
          style={{ 
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none', /* Internet Explorer 10+ */
          }}
        >
          <style dangerouslySetInnerHTML={{
            __html: `
              .overflow-x-auto::-webkit-scrollbar {
                display: none; /* Safari and Chrome */
              }
            `
          }} />
          <div className="flex items-center justify-center gap-4 px-8 py-4 min-w-full" style={{ minWidth: `${Math.max(cards.length * 100, 320)}px` }}>
            {cards.map((card) => {
              const isSelected = selectedCard?.id === card.id;
              const rarity = getCardRarity(card.id);

              return (
                <div
                  key={card.id}
                  className={cn(
                    "relative transition-all duration-300 flex-shrink-0",
                    "w-20 h-28", // Slightly larger for better visibility
                    isSelected && "z-10",
                    hasSubmitted && "opacity-50 cursor-not-allowed"
                  )}
                  style={{
                    transform: isSelected ? 'scale(1.15) translateY(-4px)' : 'scale(1)',
                    boxShadow: isSelected 
                      ? '0 8px 25px rgba(168, 85, 247, 0.4), 0 0 0 3px rgb(168 85 247 / 0.8)' 
                      : '0 4px 12px rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    filter: isSelected ? 'brightness(1.1)' : 'brightness(1)',
                  }}
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
        </div>

        {/* Mobile Selected Card Indicator */}
        {selectedCard && (
          <div className="text-center px-4 mt-2">
            <div className="inline-flex items-center gap-2 bg-purple-600/20 border border-purple-400/30 rounded-lg px-3 py-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <p className="text-purple-200 text-sm font-bangers">
                Selected: {selectedCard.filename?.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '') || 'Card'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
