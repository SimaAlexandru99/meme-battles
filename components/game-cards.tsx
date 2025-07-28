"use client";

import { RiFireLine, RiGroupLine } from "react-icons/ri";
import GameCard from "./game-card";
import AvatarSetupCard from "./avatar-setup-card";

export default function GameCards() {
  return (
    <div className="flex flex-wrap justify-center items-center gap-8">
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
        buttonIcon={<RiFireLine className="w-5 h-5" />}
        badgeText="HOT"
        badgeColor="bg-red-500"
        className="w-80 h-[455px]"
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
        buttonIcon={<RiGroupLine className="w-5 h-5" />}
        badgeText="FRIENDS"
        badgeColor="bg-green-500"
        className="w-64 h-[320px]"
      />
    </div>
  );
}
