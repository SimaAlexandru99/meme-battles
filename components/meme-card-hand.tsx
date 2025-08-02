"use client";

import { useCallback, useRef, useState } from "react";
import { MemeCard, CardTheme } from "@/components/meme-card";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type HandLayout =
  | "professional"
  | "classic"
  | "spread"
  | "grid"
  | "vertical";

interface MemeCardHandProps {
  cards: MemeCard[];
  selectedCard: MemeCard | null;
  onCardSelect: (card: MemeCard) => void;
  onCardClear?: () => void;
  disabled?: boolean;
  className?: string;
  layout?: HandLayout;
  theme?: CardTheme;
  showRarity?: boolean;
}

export function MemeCardHand({
  cards,
  selectedCard,
  onCardSelect,
  onCardClear,
  disabled = false,
  className,
  layout = "professional",
  theme = "hearthstone",
  showRarity = true,
}: MemeCardHandProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());

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

      // Add visual feedback animation
      setAnimatingCards((prev) => new Set(prev).add(card.id));
      setTimeout(() => {
        setAnimatingCards((prev) => {
          const newSet = new Set(prev);
          newSet.delete(card.id);
          return newSet;
        });
      }, 300);

      onCardSelect(card);
    },
    [disabled, onCardSelect]
  );

  const handleCardHover = useCallback((cardId: string | null) => {
    setHoveredCard(cardId);
  }, []);

  // Professional layout - inspired by MTG Arena
  const renderProfessionalLayout = () => (
    <div className="w-full max-w-7xl mx-auto">
      {/* Hand area with professional styling */}
      <div className="relative bg-gradient-to-b from-slate-900/50 to-slate-800/30 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
        {/* Hand label */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="bg-slate-800/50 text-slate-200 border-slate-600"
            >
              Your Hand
            </Badge>
            <span className="text-sm text-slate-400">{cards.length} cards</span>
            {selectedCard && (
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                1 selected
              </Badge>
            )}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">
            {theme} • {layout}
          </div>
        </div>

        {/* Cards display area */}
        <div className="relative min-h-[280px] flex items-center justify-center">
          {cards.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-500 rounded border-dashed"></div>
              </div>
              <p className="text-slate-400 font-medium">No cards in hand</p>
              <p className="text-slate-500 text-sm mt-1">
                Deal some cards to get started
              </p>
            </div>
          ) : (
            <ScrollArea className="w-full" ref={scrollAreaRef}>
              <div className="flex gap-4 justify-center p-12">
                {cards.map((card, index) => {
                  const isSelected = selectedCard?.id === card.id;
                  const isHovered = hoveredCard === card.id;
                  const isAnimating = animatingCards.has(card.id);
                  const rarity = getCardRarity(card.id);

                  // Natural hand positioning - slight arc
                  const totalCards = cards.length;
                  const centerIndex = (totalCards - 1) / 2;
                  const distanceFromCenter = index - centerIndex;
                  const arcOffset =
                    distanceFromCenter * distanceFromCenter * 0.5; // Subtle arc

                  return (
                    <div
                      key={card.id}
                      className={cn(
                        "relative transition-all duration-400 ease-out",
                        "transform-gpu", // Use GPU acceleration
                        isHovered && "scale-110 -translate-y-3 z-50",
                        isSelected && "scale-115 -translate-y-5 z-40",
                        isAnimating && "scale-95",
                        "hover:z-50"
                      )}
                      style={{
                        transitionDelay: `${index * 60}ms`, // Staggered animation
                        transform: `translateY(${arcOffset}px)`, // Natural arc
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

                      {/* Selection indicator - glowing border */}
                      {isSelected && (
                        <div className="absolute inset-0 rounded-lg border-2 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse pointer-events-none"></div>
                      )}

                      {/* Hover glow effect */}
                      {isHovered && !isSelected && (
                        <div className="absolute inset-0 bg-white/10 rounded-lg animate-pulse pointer-events-none"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>💡 Tip:</span>
            <span>Click cards to select, hover for preview</span>
          </div>

          {selectedCard && onCardClear && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCardClear}
              className="bg-slate-800/50 border-slate-600 hover:bg-slate-700/50"
            >
              Deselect Card
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // Classic layout - inspired by traditional card games
  const renderClassicLayout = () => (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-xl border border-green-700/30 p-8">
        <div className="text-center mb-6">
          <h3 className="text-lg font-bold text-green-100 mb-2">Your Hand</h3>
          <p className="text-green-300/70 text-sm">
            {cards.length} cards • Classic Layout
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-5">
          {cards.map((card, index) => {
            const isSelected = selectedCard?.id === card.id;
            const rarity = getCardRarity(card.id);

            // Natural card table positioning - slight stagger
            const staggerOffset = (index % 2) * 8; // Every other card slightly offset

            return (
              <div
                key={card.id}
                className={cn(
                  "transition-all duration-300 ease-out",
                  isSelected && "scale-115 -translate-y-3"
                )}
                style={{
                  transform: `translateY(${staggerOffset}px)`,
                }}
              >
                <MemeCard
                  card={card}
                  isSelected={isSelected}
                  onSelect={handleCardSelect}
                  disabled={disabled}
                  theme={theme}
                  rarity={rarity}
                  size="md"
                  className="hover:scale-110 transition-transform duration-300 shadow-lg hover:shadow-xl"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Spread layout - natural hand arrangement
  const renderSpreadLayout = () => (
    <div className="w-full flex justify-center items-center min-h-[450px] relative overflow-hidden">
      {/* Natural hand background effect */}
      <div className="absolute inset-0 bg-gradient-radial from-slate-800/20 via-slate-900/10 to-transparent"></div>

      {/* Hand shadow effect */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-[500px] h-20 bg-gradient-to-t from-black/20 to-transparent rounded-full blur-xl"></div>

      <div className="relative">
        {cards.map((card, index) => {
          const totalCards = cards.length;
          const centerIndex = (totalCards - 1) / 2;
          const distanceFromCenter = index - centerIndex;

          // Natural hand calculations - more realistic spacing
          const maxAngle = Math.min(75, totalCards * 10); // Reduced angle for more natural look
          const anglePerCard = maxAngle / Math.max(totalCards - 1, 1);
          const angle = distanceFromCenter * anglePerCard;

          // Dynamic radius based on card count - mimics natural hand curvature
          const baseRadius = 180;
          const radiusVariation = totalCards * 6;
          const radius = baseRadius + radiusVariation;

          const angleRad = (angle * Math.PI) / 180;
          const x = Math.sin(angleRad) * radius;
          let y = Math.cos(angleRad) * radius * 0.25; // Flatter arc for natural hand

          // Natural elevation curve - center cards higher, outer cards lower
          const elevationCurve = Math.cos(
            ((Math.abs(distanceFromCenter) / centerIndex) * Math.PI) / 2
          );
          const maxElevation = 35; // More subtle elevation
          y = y - elevationCurve * maxElevation;

          // Add slight forward tilt for natural hand grip
          const forwardTilt = Math.abs(distanceFromCenter) * 2; // Outer cards tilt more
          const tiltDirection = distanceFromCenter > 0 ? 1 : -1;
          const forwardOffset = forwardTilt * tiltDirection * 0.3;

          // Natural rotation - cards slightly rotate inward
          const naturalRotation = angle + distanceFromCenter * 2; // Slight inward curve

          const isSelected = selectedCard?.id === card.id;
          const isHovered = hoveredCard === card.id;
          const rarity = getCardRarity(card.id);
          const zIndex = 50 + totalCards - Math.abs(distanceFromCenter);

          return (
            <div
              key={card.id}
              className="absolute transition-all duration-700 ease-out"
              style={{
                transform: `translate(${x + forwardOffset}px, ${y}px) rotate(${naturalRotation}deg)`,
                transformOrigin: "center bottom",
                zIndex: isHovered || isSelected ? 100 : zIndex,
              }}
              onMouseEnter={() => handleCardHover(card.id)}
              onMouseLeave={() => handleCardHover(null)}
            >
              <div className="relative">
                <MemeCard
                  card={card}
                  isSelected={isSelected}
                  onSelect={handleCardSelect}
                  disabled={disabled}
                  theme={theme}
                  rarity={rarity}
                  size="md"
                  className={cn(
                    "transition-all duration-700 ease-out cursor-pointer",
                    "shadow-xl hover:shadow-2xl",
                    isHovered && "scale-120 -translate-y-10 rotate-0 z-50",
                    isSelected && "scale-120 -translate-y-10 rotate-0 z-50",
                    // Natural card shadows
                    "hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]",
                    rarity === "legendary" && "shadow-orange-400/20",
                    rarity === "epic" && "shadow-purple-400/20",
                    rarity === "rare" && "shadow-blue-400/20"
                  )}
                />

                {/* Selection indicator - glowing border for spread layout */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-lg border-2 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.6)] animate-pulse pointer-events-none"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subtle hand guide line */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-[400px] h-1 bg-gradient-to-r from-transparent via-slate-400/10 to-transparent rounded-full"></div>
    </div>
  );

  // Grid layout - organized and clean
  const renderGridLayout = () => (
    <div className="w-full max-w-7xl mx-auto">
      <div className="bg-slate-900/30 rounded-xl border border-slate-700/50 p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 justify-items-center">
          {cards.map((card) => {
            const isSelected = selectedCard?.id === card.id;
            const rarity = getCardRarity(card.id);

            return (
              <div
                key={card.id}
                className={cn(
                  "transition-all duration-200",
                  isSelected && "scale-110"
                )}
              >
                <MemeCard
                  card={card}
                  isSelected={isSelected}
                  onSelect={handleCardSelect}
                  disabled={disabled}
                  theme={theme}
                  rarity={rarity}
                  size="sm"
                  className="hover:scale-105 transition-transform duration-200"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Vertical layout - mobile optimized
  const renderVerticalLayout = () => (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-2">
        {cards.map((card) => {
          const isSelected = selectedCard?.id === card.id;
          const rarity = getCardRarity(card.id);

          return (
            <div
              key={card.id}
              className={cn(
                "transition-all duration-200",
                isSelected && "scale-105 ml-4"
              )}
            >
              <MemeCard
                card={card}
                isSelected={isSelected}
                onSelect={handleCardSelect}
                disabled={disabled}
                theme={theme}
                rarity={rarity}
                size="md"
                className="hover:scale-105 transition-transform duration-200"
              />
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderLayout = () => {
    switch (layout) {
      case "professional":
        return renderProfessionalLayout();
      case "classic":
        return renderClassicLayout();
      case "spread":
        return renderSpreadLayout();
      case "grid":
        return renderGridLayout();
      case "vertical":
        return renderVerticalLayout();
      default:
        return renderProfessionalLayout();
    }
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Layout */}
      <div className="hidden md:block">{renderLayout()}</div>

      {/* Mobile Layout - Always professional but compact */}
      <div className="block md:hidden">
        <div className="bg-slate-900/50 rounded-lg border border-slate-700/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="text-xs">
              Hand ({cards.length})
            </Badge>
            {selectedCard && (
              <Badge className="bg-blue-500/20 text-blue-300 text-xs">
                Selected
              </Badge>
            )}
          </div>

          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {cards.map((card) => {
                const isSelected = selectedCard?.id === card.id;
                const rarity = getCardRarity(card.id);

                return (
                  <div key={card.id} className="flex-shrink-0">
                    <MemeCard
                      card={card}
                      isSelected={isSelected}
                      onSelect={handleCardSelect}
                      disabled={disabled}
                      theme={theme}
                      rarity={rarity}
                      size="sm"
                      className="transition-transform duration-200 active:scale-95"
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
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
