"use client";

import { Button } from "@/components/ui/button";
import {
  RiGlobalLine,
  RiFireLine,
  RiGroupLine,
  RiEditLine,
  RiDiceLine,
  RiLoginBoxLine,
} from "react-icons/ri";
import Particles from "@/components/ui/particles-background";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactNode, useState } from "react";
import { generateFunnyName } from "@/lib/utils";

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

function GameCard({
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

      <CardContent className="relative h-full flex flex-col items-center justify-center p-4 gap-3 z-10">
        <h2 className="text-2xl font-bangers text-white text-center drop-shadow-lg tracking-wider">
          {title}
        </h2>

        {description && (
          <p className="text-white/80 text-center text-xs drop-shadow-md font-bangers tracking-wide">
            {description}
          </p>
        )}

        {children}

        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/30">
          {buttonIcon}
          <span className="text-white font-bangers font-medium tracking-wide text-sm">
            {buttonText}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AvatarSetupCard() {
  const [nickname, setNickname] = useState("MemeLord");

  const generateRandomName = () => {
    const newName = generateFunnyName();
    setNickname(newName);
  };

  return (
    <Card className="relative w-56 h-[280px] bg-gradient-to-br from-slate-800 to-slate-700 border-0 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-lg"></div>
      <CardContent className="relative h-full flex flex-col items-center justify-center p-4 gap-4">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar className="w-16 h-16 border-4 border-purple-400/50 shadow-lg">
              <AvatarImage src="/memes/Angry doge.jpg" alt="Avatar" />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                ML
              </AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 hover:bg-purple-700"
            >
              <RiEditLine className="w-2.5 h-2.5" />
            </Button>
          </div>

          {/* Nickname Input */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-purple-200 text-center text-xs font-bangers font-medium tracking-wide">
              Choose your meme identity
            </p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Meme name"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 w-24 text-xs h-7"
                maxLength={20}
              />
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-600 w-5 h-5 p-0"
                onClick={generateRandomName}
                title="Generate random funny name"
              >
                <RiDiceLine className="w-2.5 h-2.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="MEME BATTLES"
            width={100}
            height={40}
            className="drop-shadow-lg"
            priority
          />
        </div>

        {/* Sign In Button */}
        <Button
          variant="outline"
          className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-200 font-bangers tracking-wide backdrop-blur-sm text-sm px-3 py-1.5"
        >
          <RiLoginBoxLine className="w-3 h-3 mr-1" />
          Sign In
        </Button>
      </div>
    </header>
  );
}

function BottomNavigation() {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      <div className="flex justify-between items-end w-full px-4 pb-4 gap-4">
        {/* Left side - Social links */}
        <div className="flex items-center gap-4">
          {/* Discord Button */}
          <a
            href="https://discord.gg/t3GZmuQndv"
            target="_blank"
            rel="noreferrer noopener"
            className="w-10 h-10 bg-[#5865F2] hover:bg-[#4752C4] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
          >
            <img
              src="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20id='Layer_1'%20x='0'%20y='0'%20baseProfile='basic'%20version='1.1'%20viewBox='0%200%2048%2048'%20fill='%23fff'%3e%3cpath%20d='M47.98%2031.08a41.2%2041.2%200%200%201-.21%205.38%201.1%201.1%200%200%201-.5.8A49.2%2049.2%200%200%201%2037%2042.38a3.21%203.21%200%200%201-3.67-1.26l-1.73-2.59a30.98%2030.98%200%200%201-7.62%201.11%2031.2%2031.2%200%200%201-7.67-1.1l-1.66%202.53a3.17%203.17%200%200%201-3.7%201.3%2049.47%2049.47%200%200%201-10.22-5.1%201.1%201.1%200%200%201-.5-.81c-.2-1.84-.27-3.63-.22-5.39A35.24%2035.24%200%200%201%206.08%209.96%206.21%206.21%200%200%201%208.97%207.6a37.73%2037.73%200%200%201%206.7-2.08c1.4-.28%202.8.4%203.45%201.71l.14.27a35.8%2035.8%200%200%201%204.76-.16c1.75-.04%203.29%200%204.72.16l.14-.28a3.17%203.17%200%200%201%203.45-1.7c1.97.38%204.16%201.06%206.7%202.08a6.24%206.24%200%200%201%202.93%202.42%2035.25%2035.25%200%200%201%206.02%2021.06ZM34.25%2038.3a2.07%202.07%200%200%200%202.43.85%2048.37%2048.37%200%200%200%2010-5c.85-8-.57-15.9-5.67-23.6a5.14%205.14%200%200%200-2.39-1.94%2036.82%2036.82%200%200%200-6.5-2.03%202.1%202.1%200%200%200-2.27%201.14l-.49.96c-1.39-.2-3.05-.3-5.36-.25-2.31-.06-3.97.05-5.36.25l-.5-.96a2.1%202.1%200%200%200-2.26-1.14%2037.43%2037.43%200%200%200-6.5%202.03c-.98.4-1.8%201.06-2.39%201.94-5.1%207.7-6.52%2015.6-5.67%2023.6a48.78%2048.78%200%200%200%2010.02%205.01c.9.3%201.87-.03%202.41-.83l2.18-3.25a29.6%2029.6%200%200%200%208.1%201.29c2.9-.06%205.61-.52%208.12-1.29l2.1%203.22Z'/%3e%3cpath%20d='M12%2040.36c-.34%200-.68-.05-1-.16A49.17%2049.17%200%200%201%20.73%2035.08a1.1%201.1%200%200%201-.5-.8c-.95-8.97.95-16.9%205.8-24.26A6.24%206.24%200%200%201%208.97%207.6a37.7%2037.7%200%200%201%206.7-2.08c1.4-.28%202.8.4%203.45%201.71l.14.27c1.44-.15%202.98-.2%204.77-.16%201.74-.04%203.27%200%204.7.16l.15-.27a3.17%203.17%200%200%201%203.45-1.71%2037.7%2037.7%200%200%201%206.7%202.08%206.2%206.2%200%200%201%202.89%202.36c4.88%207.37%206.8%2015.32%205.84%2024.31-.03.34-.21.63-.5.81-3.7%202.34-7.05%204-10.23%205.1a3.16%203.16%200%200%201-3.7-1.29l-1.65-2.54a31.02%2031.02%200%200%201-7.63%201.1c-2.63-.05-5.2-.42-7.66-1.1l-1.73%202.59A3.2%203.2%200%200%201%2012%2040.36Zm-9.65-6.84a46.28%2046.28%200%200%200%209.35%204.61%201%201%200%200%200%201.15-.41l2.18-3.25c.27-.4.76-.58%201.22-.43%202.55.78%205.1%201.18%207.8%201.24%202.65-.06%205.28-.48%207.78-1.24.47-.14.97.04%201.24.44l2.1%203.22c.25.4.73.57%201.15.42%202.9-1%205.95-2.5%209.33-4.6a33.42%2033.42%200%200%200-5.55-22.36%204.05%204.05%200%200%200-1.88-1.53%2035.62%2035.62%200%200%200-6.3-1.97c-.44-.09-.88.14-1.1.56l-.49.96c-.2.41-.65.65-1.11.58-1.55-.21-3.2-.29-5.19-.24a32.3%2032.3%200%200%200-5.24.24c-.46.07-.9-.17-1.11-.58l-.5-.95a1%201%200%200%200-1.09-.57c-1.83.36-3.89%201-6.3%201.97-.75.3-1.39.81-1.85%201.47l-.03.06a33.4%2033.4%200%200%200-5.56%2022.36Z'/%3e%3cpath%20d='M35.7%2033c-.3-.52-.96-.7-1.48-.4a20.88%2020.88%200%200%201-20.48%200%201.1%201.1%200%200%200-1.08%201.9%2022.9%2022.9%200%200%200%2011.32%203c3.94%200%207.86-1.04%2011.32-3.01.52-.3.7-.97.4-1.5ZM16.91%2018.55c-2.1%200-3.82%201.97-3.82%204.36%200%202.4%201.72%204.36%203.82%204.36%202.1%200%203.82-1.97%203.82-4.36%200-2.4-1.73-4.36-3.82-4.36Zm10.36%204.36c0%202.4%201.73%204.36%203.82%204.36%202.1%200%203.82-1.97%203.82-4.36%200-2.4-1.72-4.36-3.82-4.36-2.1%200-3.82%201.97-3.82%204.36Z'/%3e%3c/svg%3e"
              alt="Discord"
              className="w-6 h-6"
            />
          </a>

          {/* News Icon */}
          <a
            href="/news"
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 backdrop-blur-sm border border-white/20"
          >
            <Image
              src="https://makeitmeme.com/assets/static/news.D7TVSTHq.png"
              alt="News"
              width={24}
              height={24}
              className="w-6 h-6"
            />
          </a>
        </div>

        {/* Center - How to Play Button */}
        <button className="flex flex-col items-center gap-1 text-white font-bangers text-2xl hover:scale-110 transition-all duration-200">
          <span className="text-shadow-lg">How to Play</span>
          <svg
            width="32"
            height="32"
            viewBox="0 0 48 48"
            fill="currentColor"
            className="-mt-1"
          >
            <path d="M23.6913 30.2627C22.665 31.3014 20.9791 31.2337 20.0377 30.116L12.2967 20.9246C11.666 20.1757 12.0959 19.0361 13.0658 18.9508C14.7963 18.7987 17.0521 18.7246 17.9383 19.2413C18.9896 19.8542 28.5847 17.5356 34.4227 16.0418C35.6547 15.7266 36.5293 17.2688 35.6316 18.1774L23.6913 30.2627Z" />
          </svg>
        </button>

        {/* Right side - Spacer */}
        <div className="w-30"></div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Header */}
      <Header />

      {/* Particles Background */}
      <div className="absolute inset-0 z-0">
        <Particles
          particleCount={150}
          particleSpread={8}
          speed={0.08}
          particleColors={[
            "#ffffff",
            "#e2e8f0",
            "#cbd5e1",
            "#a855f7",
            "#ec4899",
          ]}
          moveParticlesOnHover={true}
          particleHoverFactor={2}
          alphaParticles={true}
          particleBaseSize={60}
          sizeRandomness={0.8}
          cameraDistance={15}
          disableRotation={false}
          className="w-full h-full"
        />
      </div>

      {/* Content Container */}
      <div className="h-full flex flex-col items-center justify-center gap-6 w-full max-w-7xl mx-auto px-4 pt-12 pb-20 relative z-10">
        {/* Logo */}
        <div className="transition-transform duration-300 hover:scale-110 cursor-pointer">
          <Image
            src="/logo.png"
            alt="MEME BATTLES"
            width={200}
            height={80}
            className="drop-shadow-2xl"
            priority
          />
        </div>

        {/* Game Cards Container */}
        <div className="flex flex-wrap justify-center items-center gap-6">
          {/* Meme Lord Setup Card */}
          <AvatarSetupCard />

          {/* Meme Battle Royale Card */}
          <GameCard
            title="Meme Battle Royale"
            description="Join the chaos! Fight for meme supremacy"
            backgroundImage="https://makeitmeme.com/assets/static/quick-play.ClEdP5yD.png"
            gradientFrom="from-orange-600/80"
            gradientTo="to-red-600/80"
            hoverShadowColor="hover:shadow-orange-500/20"
            buttonText="Enter the arena"
            buttonIcon={<RiFireLine className="w-4 h-4" />}
            badgeText="HOT"
            badgeColor="bg-red-500"
            className="w-72 h-[400px]"
          />

          {/* Private Meme War Card */}
          <GameCard
            title="Private Meme War"
            description="Battle with friends only"
            backgroundImage="https://makeitmeme.com/assets/static/private-game.c_DPCftE.png"
            gradientFrom="from-green-600"
            gradientTo="to-emerald-600"
            hoverShadowColor="hover:shadow-green-500/20"
            buttonText="Start war"
            buttonIcon={<RiGroupLine className="w-4 h-4" />}
            badgeText="FRIENDS"
            badgeColor="bg-green-500"
            className="w-56 h-[280px]"
          />
        </div>

        {/* Browse Lobbies Button */}
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bangers font-semibold px-6 py-2 rounded-full shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 tracking-wide text-sm">
          <RiGlobalLine className="w-5 h-5 mr-2" />
          Browse lobbies
        </Button>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
