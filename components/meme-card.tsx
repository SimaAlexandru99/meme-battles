"use client";

import { useState, useCallback } from "react";
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
  size?: "sm" | "md" | "lg";
  theme?: CardTheme;
  rarity?: "common" | "rare" | "epic" | "legendary";
}

export function MemeCard({
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
  const [retryCount, setRetryCount] = useState(0);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setHasError(false);
      setIsLoading(true);
      setRetryCount((prev) => prev + 1);
    }
  }, [retryCount]);

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

  // Size configurations
  const sizeConfig = {
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
  };

  // Theme configurations
  const themeConfig = {
    classic: {
      cardBg:
        "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900",
      border: "border-2 border-slate-300 dark:border-slate-700",
      selectedBorder: "border-blue-500 dark:border-blue-400",
      shadow: "shadow-lg",
      overlay: "bg-gradient-to-t from-black/20 to-transparent",
    },
    hearthstone: {
      cardBg:
        "bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 dark:from-amber-900 dark:via-orange-900 dark:to-amber-800",
      border: "border-2 border-amber-400 dark:border-amber-600",
      selectedBorder: "border-orange-500 dark:border-orange-400",
      shadow: "shadow-xl shadow-amber-500/25",
      overlay: "bg-gradient-to-t from-amber-900/30 to-transparent",
    },
    magic: {
      cardBg:
        "bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 dark:from-purple-900 dark:via-indigo-900 dark:to-blue-900",
      border: "border-2 border-purple-400 dark:border-purple-600",
      selectedBorder: "border-violet-500 dark:border-violet-400",
      shadow: "shadow-xl shadow-purple-500/25",
      overlay: "bg-gradient-to-t from-purple-900/30 to-transparent",
    },
    pokemon: {
      cardBg:
        "bg-gradient-to-br from-yellow-100 via-red-50 to-blue-100 dark:from-yellow-900 dark:via-red-900 dark:to-blue-900",
      border: "border-2 border-yellow-400 dark:border-yellow-600",
      selectedBorder: "border-red-500 dark:border-red-400",
      shadow: "shadow-xl shadow-yellow-500/25",
      overlay: "bg-gradient-to-t from-red-900/30 to-transparent",
    },
    yugioh: {
      cardBg:
        "bg-gradient-to-br from-gray-100 via-slate-50 to-gray-200 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900",
      border: "border-2 border-gray-400 dark:border-gray-600",
      selectedBorder: "border-slate-500 dark:border-slate-400",
      shadow: "shadow-xl shadow-gray-500/25",
      overlay: "bg-gradient-to-t from-gray-900/30 to-transparent",
    },
    poker: {
      cardBg:
        "bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-red-950 dark:via-gray-900 dark:to-red-950",
      border: "border-2 border-red-300 dark:border-red-700",
      selectedBorder: "border-red-600 dark:border-red-400",
      shadow: "shadow-lg shadow-red-500/20",
      overlay: "bg-gradient-to-t from-red-900/20 to-transparent",
    },
  };

  // Rarity configurations
  const rarityConfig = {
    common: {
      glow: "",
      particle: "",
      border: "",
    },
    rare: {
      glow: "shadow-blue-400/50",
      particle: "animate-pulse",
      border: "border-blue-400",
    },
    epic: {
      glow: "shadow-purple-400/50",
      particle: "animate-pulse",
      border: "border-purple-400",
    },
    legendary: {
      glow: "shadow-orange-400/50 shadow-2xl",
      particle: "animate-pulse",
      border: "border-orange-400",
    },
  };

  const config = sizeConfig[size];
  const currentTheme = themeConfig[theme];
  const currentRarity = rarityConfig[rarity];

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-300 ease-out overflow-hidden",
        "hover:scale-105 focus-visible:scale-105 group",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        config.container,
        currentTheme.cardBg,
        currentTheme.border,
        currentTheme.shadow,
        currentRarity.glow,
        currentRarity.border && currentRarity.border,
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
      <div className="relative h-full p-2 flex flex-col">
        {/* Card Header with Rarity Indicator */}
        <div className="flex justify-between items-start mb-1">
          <div className="text-xs font-bold text-foreground/70 truncate flex-1">
            {theme === "poker" ? "MEME" : card.alt.slice(0, 12)}
          </div>
          {rarity !== "common" && (
            <div
              className={cn(
                "w-2 h-2 rounded-full ml-1 flex-shrink-0",
                currentRarity.particle,
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
            <div className="flex flex-col items-center justify-center text-center p-2">
              <div className="text-muted-foreground text-xs mb-2">
                Failed to load
              </div>
              {retryCount < 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRetry();
                  }}
                  className="text-xs text-primary hover:underline focus:outline-none focus:underline"
                  aria-label="Retry loading image"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {!hasError && (
            <div className="relative">
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
              {/* Image overlay for theme effect */}
              <div
                className={cn(
                  "absolute inset-0 rounded-md",
                  currentTheme.overlay
                )}
              />
            </div>
          )}
        </div>

        {/* Card Footer */}
        {theme !== "poker" && (
          <div className="text-[10px] text-foreground/50 text-center truncate mt-1">
            {card.filename.split(".")[0].slice(0, 15)}
          </div>
        )}
      </div>

      {/* Selection indicator - removed dot, using border glow instead */}

      {/* Legendary glow effect */}
      {rarity === "legendary" && (
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-400/20 via-yellow-400/20 to-orange-400/20 animate-pulse" />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {/* Theme-specific decorative elements */}
      {theme === "hearthstone" && (
        <div className="absolute top-1 left-1 w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full opacity-50" />
      )}
      {theme === "magic" && (
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-gradient-to-br from-purple-400 to-blue-500 rounded-sm opacity-50" />
      )}
      {theme === "pokemon" && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-br from-yellow-400 to-red-500 rounded-full opacity-60" />
      )}
    </Card>
  );
}
