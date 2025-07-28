"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface GameCardProps {
  title: string;
  description?: string;
  backgroundImage?: string;
  gradientFrom: string;
  gradientTo: string;
  hoverShadowColor: string;
  buttonText: string;
  buttonIcon: ReactNode;
  badgeText?: string;
  badgeColor?: string;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
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
  return (
    <Card
      className={`relative border-0 shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden ${hoverShadowColor} ${className} group`}
      onClick={onClick}
    >
      {/* Hover Badge */}
      {badgeText && (
        <div
          className={`absolute top-4 right-4 ${badgeColor} text-white text-xs font-bold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 shadow-lg`}
        >
          {badgeText}
        </div>
      )}

      {/* Background Image */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: `url('${backgroundImage}')`,
          }}
        ></div>
      )}

      {/* Gradient Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-lg`}
        style={{
          opacity: backgroundImage ? 0.8 : 0.2,
        }}
      ></div>

      <CardContent className="relative h-full flex flex-col items-center justify-center p-6 gap-4 z-10">
        <h2 className="text-3xl font-bangers text-white text-center drop-shadow-lg tracking-wider">
          {title}
        </h2>

        {description && (
          <p className="text-white/80 text-center text-sm drop-shadow-md font-bangers tracking-wide">
            {description}
          </p>
        )}

        {children}

        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
          {buttonIcon}
          <span className="text-white font-bangers font-medium tracking-wide">
            {buttonText}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
