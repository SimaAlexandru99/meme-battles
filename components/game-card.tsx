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
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <motion.div
      variants={microInteractionVariants}
      whileHover="hover"
      whileTap="tap"
      className="w-full h-full"
    >
      <Card
        className={`relative border-0 shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden ${hoverShadowColor} ${className} group w-full h-full`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={onClick ? 0 : -1}
        aria-label={`${title} - ${description || ""}`}
      >
        {/* Hover Badge */}
        {badgeText && (
          <motion.div
            variants={badgeVariants}
            initial="initial"
            whileHover="pulse"
            className={`absolute top-3 right-3 sm:top-4 sm:right-4 ${badgeColor} text-white text-xs font-bold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 shadow-lg`}
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
          >
            {title}
          </motion.h2>

          {description && (
            <motion.p
              className="text-white/80 text-center text-xs sm:text-sm drop-shadow-md font-bangers tracking-wide"
              variants={microInteractionVariants}
            >
              {description}
            </motion.p>
          )}

          {children}

          <motion.div
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-4 sm:py-2 border border-white/30"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            {buttonIcon}
            <span className="text-white font-bangers font-medium tracking-wide text-xs sm:text-sm">
              {buttonText}
            </span>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
