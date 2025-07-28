import { Button } from "@/components/ui/button";
import { RiGlobalLine } from "react-icons/ri";
import GameCards from "@/components/game-cards";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-8 max-w-6xl w-full">
        {/* Main Cards Container */}
        <GameCards />

        {/* Browse Lobbies Button */}
        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bangers font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 tracking-wide">
          <RiGlobalLine className="w-6 h-6 mr-2" />
          Browse lobbies
        </Button>
      </div>
    </div>
  );
}
