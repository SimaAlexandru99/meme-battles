"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  buttonVariants,
  microInteractionVariants,
  badgeVariants,
} from "@/lib/animations/private-lobby-variants";

interface GameCardProps {
  title: string;
  description?: string;
  backgroundImage?: string;
  gradientFrom: string;
  gradientTo: string;
  hoverShadowColor: string;
  buttonText: string;
  buttonIcon: React.ReactNode;
  badgeText?: string;
  badgeColor?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function GameCard({
  title,
  description,
  backgroundImage,
  gradientFrom,
  gradientTo,
  hoverShadowColor,
  buttonText,
  buttonIcon,
  badgeText,
  badgeColor = "bg-purple-500",
  onClick,
  className = "",
  children,
}: GameCardProps) {
  // Focus management refs
  const cardRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLDivElement>(null);

  const handleClick = React.useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  // Announce card interaction to screen readers
  const handleCardInteraction = React.useCallback(() => {
    if (onClick) {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "polite");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = `Selected ${title} game mode`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 100);
    }
  }, [onClick, title]);

  const handleClickWithAnnouncement = React.useCallback(() => {
    handleClick();
    handleCardInteraction();
  }, [handleClick, handleCardInteraction]);

  return (
    <motion.div
      variants={microInteractionVariants}
      whileHover="hover"
      whileTap="tap"
      className="w-full h-full"
      role="article"
      aria-label={`${title} game card`}
    >
      <Card
        ref={cardRef}
        className={`relative border-0 shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden ${hoverShadowColor} ${className} group w-full h-full`}
        onClick={handleClickWithAnnouncement}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={onClick ? 0 : -1}
        aria-label={`${title} - ${description || ""}`}
        aria-describedby={`${title.toLowerCase().replace(/\s+/g, "-")}-description`}
        aria-pressed="false"
      >
        {/* Hover Badge */}
        {badgeText && (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            whileHover="pulse"
            className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${badgeColor} text-white text-xs font-bold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 shadow-lg`}
            role="img"
            aria-label={`Badge: ${badgeText}`}
          >
            {badgeText}
          </motion.div>
        )}

        {/* Background Image */}
        {backgroundImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url('${backgroundImage}')`,
            }}
            aria-hidden="true"
            role="img"
            aria-label="Game background image"
          />
        )}

        {/* Gradient Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-lg`}
          style={{
            opacity: backgroundImage ? 0.8 : 0.2,
          }}
          aria-hidden="true"
        />

        <CardContent className="relative h-full flex flex-col items-center justify-center p-4 sm:p-6 gap-3 sm:gap-4 z-10">
          <motion.h2
            className="text-2xl sm:text-3xl font-bangers text-white text-center drop-shadow-lg tracking-wider"
            variants={microInteractionVariants}
            whileHover="hover"
            id={`${title.toLowerCase().replace(/\s+/g, "-")}-title`}
          >
            {title}
          </motion.h2>

          {description && (
            <motion.p
              className="text-white/80 text-center text-xs sm:text-sm drop-shadow-md font-bangers tracking-wide"
              variants={microInteractionVariants}
              id={`${title.toLowerCase().replace(/\s+/g, "-")}-description`}
            >
              {description}
            </motion.p>
          )}

          {children}

          <motion.div
            ref={buttonRef}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 border border-white/30"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            role="button"
            tabIndex={-1}
            aria-label={`${buttonText} for ${title}`}
            aria-describedby={`${title.toLowerCase().replace(/\s+/g, "-")}-button-description`}
          >
            <span aria-hidden="true">{buttonIcon}</span>
            <span className="text-white font-bangers font-medium tracking-wide text-xs sm:text-sm">
              {buttonText}
            </span>
          </motion.div>
          <div
            id={`${title.toLowerCase().replace(/\s+/g, "-")}-button-description`}
            className="sr-only"
          >
            Click to start {title} game mode
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
