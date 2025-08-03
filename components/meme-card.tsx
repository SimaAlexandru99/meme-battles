"use client";

import { useState, useCallback, memo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type CardTheme =
  | "classic"
  | "hearthstone"
  | "magic"
  | "pokemon"
  | "yugioh"
  | "poker";

interface MemeCardProps {
  card: MemeCard;
  isSelected?: boolean;
  onSelect?: (card: MemeCard) => void;
  disabled?: boolean;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  theme?: CardTheme;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

// Simplified size configurations
const sizeConfig = {
  xs: {
    container: "w-16 h-20",
    image: "w-12 h-16",
    imageSize: { width: 48, height: 64 },
  },
  sm: {
    container: "w-20 h-24",
    image: "w-16 h-12",
    imageSize: { width: 64, height: 48 },
  },
  md: {
    container: "w-32 h-44",
    image: "w-28 h-36",
    imageSize: { width: 112, height: 144 },
  },
  lg: {
    container: "w-40 h-56",
    image: "w-36 h-48",
    imageSize: { width: 144, height: 192 },
  },
} as const;

// Simplified theme configurations
const themeConfig = {
  classic: {
    cardBg:
      "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900",
    border: "border-2 border-slate-300 dark:border-slate-700",
    selectedBorder: "border-blue-500 dark:border-blue-400",
    shadow: "shadow-lg",
  },
  hearthstone: {
    cardBg:
      "bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 dark:from-amber-900 dark:via-orange-900 dark:to-amber-800",
    border: "border-2 border-amber-400 dark:border-amber-600",
    selectedBorder: "border-orange-500 dark:border-orange-400",
    shadow: "shadow-xl shadow-amber-500/25",
  },
  magic: {
    cardBg:
      "bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 dark:from-purple-900 dark:via-indigo-900 dark:to-blue-900",
    border: "border-2 border-purple-400 dark:border-purple-600",
    selectedBorder: "border-violet-500 dark:border-violet-400",
    shadow: "shadow-xl shadow-purple-500/25",
  },
  pokemon: {
    cardBg:
      "bg-gradient-to-br from-yellow-100 via-red-50 to-blue-100 dark:from-yellow-900 dark:via-red-900 dark:to-blue-900",
    border: "border-2 border-yellow-400 dark:border-yellow-600",
    selectedBorder: "border-red-500 dark:border-red-400",
    shadow: "shadow-xl shadow-yellow-500/25",
  },
  yugioh: {
    cardBg:
      "bg-gradient-to-br from-gray-100 via-slate-50 to-gray-200 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900",
    border: "border-2 border-gray-400 dark:border-gray-600",
    selectedBorder: "border-slate-500 dark:border-slate-400",
    shadow: "shadow-xl shadow-gray-500/25",
  },
  poker: {
    cardBg:
      "bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-red-950 dark:via-gray-900 dark:to-red-950",
    border: "border-2 border-red-300 dark:border-red-700",
    selectedBorder: "border-red-600 dark:border-red-400",
    shadow: "shadow-lg shadow-red-500/20",
  },
} as const;

// Simplified rarity configurations
const rarityConfig = {
  common: { glow: "", border: "" },
  rare: { glow: "shadow-blue-400/50", border: "border-blue-400" },
  epic: { glow: "shadow-purple-400/50", border: "border-purple-400" },
  legendary: {
    glow: "shadow-orange-400/50 shadow-2xl",
    border: "border-orange-400",
  },
} as const;

export const MemeCard = memo(function MemeCard({
  card,
  isSelected = false,
  onSelect,
  disabled = false,
  className,
  size = "md",
  theme = "hearthstone",
  rarity = "common",
}: MemeCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled && onSelect) {
      onSelect(card);
    }
  }, [card, disabled, onSelect]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const config = sizeConfig[size];
  const currentTheme = themeConfig[theme];
  const currentRarity = rarityConfig[rarity];

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-300 ease-out overflow-hidden",
        "hover:scale-105 focus-visible:scale-105 group",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "touch-manipulation",
        config.container,
        currentTheme.cardBg,
        currentTheme.border,
        currentTheme.shadow,
        currentRarity.glow,
        currentRarity.border,
        isSelected &&
          cn(
            currentTheme.selectedBorder,
            "scale-105 ring-2 ring-current ring-opacity-50"
          ),
        disabled &&
          "cursor-not-allowed opacity-50 hover:scale-100 focus-visible:scale-100",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={`Meme card: ${card.alt}${isSelected ? " (selected)" : ""} (${rarity})`}
      aria-pressed={isSelected}
      aria-disabled={disabled}
    >
      {/* Card Content Container */}
      <div className="relative h-full p-1 sm:p-2 flex flex-col">
        {/* Card Header with Rarity Indicator */}
        <div className="flex justify-between items-start mb-1">
          <div className="text-[8px] sm:text-xs font-bold text-foreground/70 truncate flex-1">
            {theme === "poker" ? "MEME" : card.alt.slice(0, 12)}
          </div>
          {rarity !== "common" && (
            <div
              className={cn(
                "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ml-1 flex-shrink-0",
                rarity === "rare" && "bg-blue-400",
                rarity === "epic" && "bg-purple-400",
                rarity === "legendary" && "bg-orange-400"
              )}
            />
          )}
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center relative">
          {isLoading && <Skeleton className={cn("rounded-md", config.image)} />}

          {hasError && (
            <div className="flex flex-col items-center justify-center text-center p-1 sm:p-2">
              <div className="text-muted-foreground text-[8px] sm:text-xs mb-1 sm:mb-2">
                Failed to load
              </div>
            </div>
          )}

          {!hasError && (
            <Image
              src={card.url}
              alt={card.alt}
              width={config.imageSize.width}
              height={config.imageSize.height}
              className={cn(
                "object-contain rounded-md transition-all duration-300",
                config.image,
                isLoading && "opacity-0",
                "group-hover:scale-105"
              )}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              unoptimized={true}
            />
          )}
        </div>

        {/* Card Footer */}
        {theme !== "poker" && (
          <div className="text-[6px] sm:text-[10px] text-foreground/50 text-center truncate mt-1">
            {card.filename.split(".")[0].slice(0, 15)}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
          <div className="animate-spin w-3 h-3 sm:w-4 sm:h-4 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </Card>
  );
});
