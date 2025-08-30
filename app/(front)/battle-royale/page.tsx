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
      {/* Background particles effect */}
      <div className="absolute inset-0">
        <ParticlesBackground />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <BattleRoyaleInterface
          onBackToMain={handleBackToMain}
          className="w-full max-w-4xl"
        />
      </div>

      {/* Bottom gradient for aesthetics */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
}
