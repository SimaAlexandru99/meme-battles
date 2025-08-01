"use client";

import { useCallback, useEffect, useRef } from "react";
import { MemeCard } from "@/components/meme-card";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MemeCardHandProps {
  cards: MemeCard[];
  selectedCard: MemeCard | null;
  onCardSelect: (card: MemeCard) => void;
  disabled?: boolean;
  className?: string;
  layout?: "grid" | "horizontal";
}

export function MemeCardHand({
  cards,
  selectedCard,
  onCardSelect,
  disabled = false,
  className,
  layout = "horizontal", // Will be responsive by default
}: MemeCardHandProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleCardSelect = useCallback(
    (card: MemeCard) => {
      if (!disabled) {
        onCardSelect(card);
      }
    },
    [disabled, onCardSelect]
  );

  // Auto-scroll to selected card in horizontal layout
  useEffect(() => {
    if (selectedCard && scrollAreaRef.current) {
      const selectedIndex = cards.findIndex(
        (card) => card.id === selectedCard.id
      );
      if (selectedIndex !== -1) {
        const cardElement = scrollAreaRef.current.querySelector(
          `[data-card-index="${selectedIndex}"]`
        ) as HTMLElement;

        if (cardElement && cardElement.scrollIntoView) {
          cardElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }
    }
  }, [selectedCard, cards]);

  if (cards.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-8 text-muted-foreground",
          className
        )}
      >
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No cards available</div>
          <div className="text-sm">Waiting for cards to be dealt...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Hand Layout - Hearthstone-style overlapping cards */}
      <div className="hidden md:block">
        {cards.length <= 10 ? (
          // Hearthstone-style hand layout for 10 or fewer cards
          <div className="relative flex justify-center items-end min-h-[220px]">
            {/* Hand background effect - more prominent like Hearthstone */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-96 h-24 bg-gradient-to-t from-muted/30 to-transparent rounded-full blur-md" />

            <div className="relative flex items-end">
              {cards.map((card, index) => {
                // Hearthstone-style calculations
                const totalCards = cards.length;
                const maxRotation = 18; // More rotation like Hearthstone
                const maxOffset = 100; // Wider spread like Hearthstone

                // Calculate position based on card index - Hearthstone style
                const centerIndex = (totalCards - 1) / 2;
                const distanceFromCenter = index - centerIndex;
                const rotation =
                  (distanceFromCenter / centerIndex) * maxRotation;
                const horizontalOffset =
                  (distanceFromCenter / centerIndex) * maxOffset;

                // Z-index for proper layering (center cards on top)
                const zIndex = totalCards - Math.abs(distanceFromCenter);

                // Hearthstone-style base positioning with better overlap
                const baseLeft = index * 16; // Better spacing for overlap

                return (
                  <div
                    key={card.id}
                    data-card-index={index}
                    className="absolute transition-all duration-300 ease-out"
                    style={{
                      transform: `translateX(${horizontalOffset}px) rotate(${rotation}deg)`,
                      zIndex: zIndex,
                      left: `${baseLeft}px`,
                    }}
                  >
                    <MemeCard
                      card={card}
                      isSelected={selectedCard?.id === card.id}
                      onSelect={handleCardSelect}
                      disabled={disabled}
                      size="md"
                      className={cn(
                        "transition-all duration-300 ease-out",
                        // Hearthstone-style hover effects
                        "hover:z-50 hover:scale-110 hover:-translate-y-6",
                        selectedCard?.id === card.id &&
                          "z-50 scale-110 -translate-y-6",
                        // Enhanced shadows for 3D effect
                        "shadow-xl hover:shadow-2xl"
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Grid layout for more than 10 cards
          <div className="grid grid-cols-5 gap-3 justify-items-center max-w-4xl mx-auto">
            {cards.map((card, index) => (
              <div
                key={card.id}
                data-card-index={index}
                className="flex justify-center"
              >
                <MemeCard
                  card={card}
                  isSelected={selectedCard?.id === card.id}
                  onSelect={handleCardSelect}
                  disabled={disabled}
                  size="sm"
                  className="transition-transform duration-200 hover:scale-105 hover:z-10"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Horizontal Scroll Layout - Simplified for touch */}
      <div className="block md:hidden">
        <ScrollArea className="w-full" ref={scrollAreaRef}>
          <div className="flex gap-2 p-4 pb-6">
            {cards.map((card, index) => (
              <div
                key={card.id}
                data-card-index={index}
                className="flex-shrink-0"
              >
                <MemeCard
                  card={card}
                  isSelected={selectedCard?.id === card.id}
                  onSelect={handleCardSelect}
                  disabled={disabled}
                  size="md"
                  className="transition-transform duration-200 hover:scale-105"
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Card count indicator */}
      <div className="flex justify-center mt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50">
          <span>Cards in hand:</span>
          <span className="font-medium">{cards.length}</span>
          {selectedCard && (
            <>
              <span>•</span>
              <span className="text-primary font-medium">1 selected</span>
            </>
          )}
        </div>
      </div>

      {/* Accessibility instructions */}
      <div className="sr-only" aria-live="polite">
        {selectedCard
          ? `Selected card: ${selectedCard.alt}. Press Enter or Space to confirm selection.`
          : `${cards.length} cards available. Use Tab to navigate and Enter or Space to select.`}
      </div>
    </div>
  );
}
