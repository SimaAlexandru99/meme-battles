/**
 * Battle Royale main page
 * Contains the complete Battle Royale interface with matchmaking queue
 */

"use client";

import { useRouter } from "next/navigation";
import { BattleRoyaleInterface } from "@/components/battle-royale-interface";
import ParticlesBackground from "@/components/ui/particles-background";

export default function BattleRoyalePage() {
  const router = useRouter();

  const handleBackToMain = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
      {/* Background particles effect - optimized for mobile */}
      <div className="absolute inset-0 opacity-60 sm:opacity-80">
        <ParticlesBackground />
      </div>

      {/* Main content - improved mobile layout */}
      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen p-3 sm:p-4 lg:p-6">
        <div className="w-full max-w-7xl mx-auto pt-safe">
          <BattleRoyaleInterface
            onBackToMain={handleBackToMain}
            className="w-full"
          />
        </div>
      </div>

      {/* Bottom gradient - mobile optimized */}
      <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-32 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
    </div>
  );
}
