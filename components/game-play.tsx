"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { RiArrowLeftLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@/types";
import { useRouter } from "next/navigation";

interface GamePlayProps {
  lobbyCode: string;
  currentUser: User;
}

export function GamePlay({ lobbyCode, currentUser }: GamePlayProps) {
  const router = useRouter();

  const handleBackToMain = React.useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleBackToMain}
              variant="ghost"
              className="text-white hover:bg-slate-800/50"
            >
              <RiArrowLeftLine className="w-5 h-5 mr-2" />
              Back to Main Menu
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-bangers text-white tracking-wide">
                Meme Battle
              </h1>
              <p className="text-sm text-purple-200/70">Lobby: {lobbyCode}</p>
            </div>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center min-h-[60vh]"
        >
          <Card className="w-full max-w-md bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white font-bangers text-xl tracking-wide text-center">
                Game Coming Soon!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-purple-200/70 mb-6">
                The meme battle game is currently under development. You'll be
                able to create, vote, and laugh with friends in real-time meme
                battles!
              </p>
              <Button onClick={handleBackToMain} className="w-full">
                Return to Main Menu
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
