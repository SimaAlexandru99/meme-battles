"use client";

import { useCallback, useState } from "react";
import { MemeCard, CardTheme } from "@/components/meme-card";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
    [showRarity],
  );

  const handleCardSelect = useCallback(
    (card: MemeCard) => {
      if (disabled) return;
      onCardSelect(card);
    },
    [disabled, onCardSelect],
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
                    isSelected && "scale-110 z-40",
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
                      rarity === "rare" && "shadow-blue-400/30",
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
                        rarity === "rare" && "shadow-blue-400/30",
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Mobile Layout - Carousel */}
      <div className="block md:hidden">
        <div className="w-full min-h-[280px] relative">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-radial from-muted/20 via-background to-transparent"></div>

          <div className="flex items-center justify-center h-full py-8">
            <Carousel
              opts={{
                align: "center",
                loop: true,
              }}
              className="w-full max-w-xs"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {cards.map((card) => {
                  const isSelected = selectedCard?.id === card.id;
                  const rarity = getCardRarity(card.id);

                  return (
                    <CarouselItem
                      key={card.id}
                      className="pl-2 md:pl-4 basis-4/5"
                    >
                      <div className="flex items-center justify-center">
                        <MemeCard
                          card={card}
                          isSelected={isSelected}
                          onSelect={handleCardSelect}
                          disabled={disabled}
                          theme={theme}
                          rarity={rarity}
                          size="md"
                          className={cn(
                            "transition-all duration-300 cursor-pointer",
                            "shadow-lg hover:shadow-xl active:scale-95",
                            isSelected &&
                              "scale-110 ring-2 ring-blue-400 ring-opacity-75",
                            rarity === "legendary" && "shadow-orange-400/30",
                            rarity === "epic" && "shadow-purple-400/30",
                            rarity === "rare" && "shadow-blue-400/30",
                          )}
                        />
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious
                className="left-2 bg-background/80 backdrop-blur-sm border-muted-foreground/20"
                disabled={disabled}
              />
              <CarouselNext
                className="right-2 bg-background/80 backdrop-blur-sm border-muted-foreground/20"
                disabled={disabled}
              />
            </Carousel>
          </div>

          {/* Card indicator */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="flex gap-1">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    selectedCard?.id === card.id
                      ? "bg-blue-400 scale-125"
                      : "bg-muted-foreground/30",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Card info */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground/60 text-center">
            {selectedCard
              ? `Selected: ${selectedCard.alt}`
              : "Swipe to browse cards"}
          </div>
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
