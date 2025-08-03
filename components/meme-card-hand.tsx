"use client";

import { useCallback, useState } from "react";
import { MemeCard, CardTheme } from "@/components/meme-card";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MemeCardHandProps {
  cards: MemeCard[];
  selectedCard: MemeCard | null;
  onCardSelect: (card: MemeCard) => void;
  disabled?: boolean;
  className?: string;
  theme?: CardTheme;
  showRarity?: boolean;
}

export function MemeCardHand({
  cards,
  selectedCard,
  onCardSelect,
  disabled = false,
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
      if (disabled) return;
      onCardSelect(card);
    },
    [disabled, onCardSelect]
  );

  const handleCardHover = useCallback((cardId: string | null) => {
    setHoveredCard(cardId);
  }, []);

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-muted-foreground/30 rounded border-dashed"></div>
          </div>
          <p className="text-muted-foreground font-medium">No cards in hand</p>
          <p className="text-muted-foreground/70 text-sm mt-1">
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
                    isSelected && "scale-110 z-40"
                  )}
                  onMouseEnter={() => handleCardHover(card.id)}
                  onMouseLeave={() => handleCardHover(null)}
                >
                  <MemeCard
                    card={card}
                    isSelected={isSelected}
                    onSelect={handleCardSelect}
                    disabled={disabled}
                    theme={theme}
                    rarity={rarity}
                    size="md"
                    className={cn(
                      "cursor-pointer transition-all duration-300",
                      "shadow-lg hover:shadow-xl",
                      isSelected && "ring-2 ring-blue-400 ring-opacity-75",
                      isHovered && "shadow-2xl",
                      rarity === "legendary" && "shadow-orange-400/30",
                      rarity === "epic" && "shadow-purple-400/30",
                      rarity === "rare" && "shadow-blue-400/30"
                    )}
                  />

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 rounded-lg border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse pointer-events-none"></div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Tablet Layout */}
      <div className="hidden md:block lg:hidden">
        <div className="bg-card/50 rounded-lg border p-4">
          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-2 justify-center">
              {cards.map((card) => {
                const isSelected = selectedCard?.id === card.id;
                const rarity = getCardRarity(card.id);

                return (
                  <div
                    key={card.id}
                    className="flex-shrink-0 transition-all duration-300"
                  >
                    <MemeCard
                      card={card}
                      isSelected={isSelected}
                      onSelect={handleCardSelect}
                      disabled={disabled}
                      theme={theme}
                      rarity={rarity}
                      size="md"
                      className={cn(
                        "transition-all duration-300",
                        "hover:scale-105 active:scale-95",
                        isSelected &&
                          "scale-110 ring-2 ring-blue-400 ring-opacity-75",
                        rarity === "legendary" && "shadow-orange-400/30",
                        rarity === "epic" && "shadow-purple-400/30",
                        rarity === "rare" && "shadow-blue-400/30"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="block md:hidden">
        <div className="w-full flex justify-center items-center min-h-[350px] relative">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-radial from-muted/20 via-background to-transparent"></div>
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[350px] h-14 bg-gradient-to-t from-black/20 to-transparent rounded-full blur-xl"></div>

          <div className="relative">
            {cards.map((card, index) => {
              const totalCards = cards.length;
              const centerIndex = (totalCards - 1) / 2;
              const distanceFromCenter = index - centerIndex;

              // Simplified positioning
              const maxAngle = Math.min(60, totalCards * 8);
              const anglePerCard = maxAngle / Math.max(totalCards - 1, 1);
              const angle = distanceFromCenter * anglePerCard;
              const radius = 140 + totalCards * 5;

              const angleRad = (angle * Math.PI) / 180;
              const x = Math.sin(angleRad) * radius;
              const y = Math.cos(angleRad) * radius * 0.3 - 50;

              const isSelected = selectedCard?.id === card.id;
              const isHovered = hoveredCard === card.id;
              const rarity = getCardRarity(card.id);
              const zIndex = 50 + totalCards - Math.abs(distanceFromCenter);

              return (
                <div
                  key={card.id}
                  className="absolute transition-all duration-500 ease-out"
                  style={{
                    transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
                    transformOrigin: "center bottom",
                    zIndex: isHovered || isSelected ? 100 : zIndex,
                  }}
                  onMouseEnter={() => handleCardHover(card.id)}
                  onMouseLeave={() => handleCardHover(null)}
                >
                  <MemeCard
                    card={card}
                    isSelected={isSelected}
                    onSelect={handleCardSelect}
                    disabled={disabled}
                    theme={theme}
                    rarity={rarity}
                    size="sm"
                    className={cn(
                      "transition-all duration-500 ease-out cursor-pointer",
                      "shadow-lg hover:shadow-xl",
                      isHovered && "scale-110 -translate-y-8 rotate-0 z-50",
                      isSelected && "scale-110 -translate-y-8 rotate-0 z-50",
                      rarity === "legendary" && "shadow-orange-400/20",
                      rarity === "epic" && "shadow-purple-400/20",
                      rarity === "rare" && "shadow-blue-400/20"
                    )}
                  />

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute inset-0 rounded-lg border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse pointer-events-none"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Guide line */}
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-[300px] h-1 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent rounded-full"></div>
        </div>
      </div>

      {/* Accessibility */}
      <div className="sr-only" aria-live="polite">
        {selectedCard
          ? `Selected card: ${selectedCard.alt}. Press Enter to confirm.`
          : `${cards.length} cards available. Navigate with Tab and select with Enter.`}
      </div>
    </div>
  );
}
