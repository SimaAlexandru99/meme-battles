"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MemeCardProps {
  card: MemeCard;
  isSelected?: boolean;
  onSelect?: (card: MemeCard) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MemeCard({
  card,
  isSelected = false,
  onSelect,
  disabled = false,
  className,
  size = "md",
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
      container: "w-20 h-20",
      image: "w-16 h-16",
    },
    md: {
      container: "w-32 h-32",
      image: "w-28 h-28",
    },
    lg: {
      container: "w-40 h-40",
      image: "w-36 h-36",
    },
  };

  const config = sizeConfig[size];

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-200 hover:scale-105 focus-visible:scale-105",
        "border-2 border-border hover:border-primary focus-visible:border-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        config.container,
        isSelected && "border-primary bg-primary/10 scale-105",
        disabled &&
          "cursor-not-allowed opacity-50 hover:scale-100 focus-visible:scale-100",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={`Meme card: ${card.alt}${isSelected ? " (selected)" : ""}`}
      aria-pressed={isSelected}
      aria-disabled={disabled}
    >
      <div className="flex items-center justify-center p-2 h-full">
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
          <Image
            src={card.url}
            alt={card.alt}
            width={size === "sm" ? 64 : size === "md" ? 112 : 144}
            height={size === "sm" ? 64 : size === "md" ? 112 : 144}
            className={cn(
              "object-contain rounded-md transition-opacity duration-200",
              config.image,
              isLoading && "opacity-0"
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
            unoptimized={true} // Since these are static meme images
          />
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background flex items-center justify-center">
          <div className="w-2 h-2 bg-primary-foreground rounded-full" />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </Card>
  );
}
