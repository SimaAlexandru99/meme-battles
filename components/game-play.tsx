"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { RiArrowLeftLine, RiGamepadLine, RiEmotionLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  buttonVariants,
  microInteractionVariants,
  successVariants,
} from "@/lib/animations/private-lobby-variants";

interface GamePlayProps {
  lobbyCode: string;
  currentUser: User;
}

export function GamePlay({ lobbyCode }: GamePlayProps) {
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
            <motion.div variants={buttonVariants}>
              <Button
                onClick={handleBackToMain}
                variant="ghost"
                className="text-white hover:bg-slate-800/50 font-bangers tracking-wide"
              >
                <RiArrowLeftLine className="w-5 h-5 mr-2" />
                Back to Main Menu
              </Button>
            </motion.div>
            <motion.div
              className="text-center"
              variants={microInteractionVariants}
            >
              <h1 className="text-xl sm:text-2xl font-bangers text-white tracking-wide">
                Meme Battle
              </h1>
              <p className="text-sm text-purple-200/70 font-bangers tracking-wide">
                Lobby: {lobbyCode}
              </p>
            </motion.div>
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
          <motion.div
            className="w-full max-w-md p-6 sm:p-8"
            variants={microInteractionVariants}
            initial="initial"
            animate="animate"
          >
            <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
              <CardHeader>
                <motion.div
                  className="text-center"
                  variants={microInteractionVariants}
                >
                  <div className="flex justify-center mb-4">
                    <motion.div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30"
                      variants={successVariants}
                      animate="animate"
                    >
                      <RiGamepadLine className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </motion.div>
                  </div>
                  <CardTitle className="text-white font-bangers text-xl sm:text-2xl tracking-wide">
                    Game Coming Soon!
                  </CardTitle>
                </motion.div>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <motion.div variants={microInteractionVariants}>
                  <p className="text-purple-200/70 text-sm sm:text-base font-bangers tracking-wide mb-4">
                    The meme battle game is currently under development.
                    You&apos;ll be able to create, vote, and laugh with friends
                    in real-time meme battles!
                  </p>
                  <div className="flex items-center justify-center gap-2 text-purple-200/50 text-xs font-bangers tracking-wide">
                    <RiEmotionLine className="w-4 h-4" />
                    <span>Get ready for epic meme battles!</span>
                  </div>
                </motion.div>

                <motion.div variants={buttonVariants}>
                  <Button
                    onClick={handleBackToMain}
                    className={cn(
                      "w-full h-12 sm:h-14",
                      "bg-gradient-to-r from-purple-600 to-purple-700",
                      "hover:from-purple-500 hover:to-purple-600",
                      "text-white font-bangers text-lg sm:text-xl tracking-wide",
                      "shadow-lg shadow-purple-500/30",
                      "focus-visible:ring-2 focus-visible:ring-purple-500/50",
                      "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    )}
                  >
                    <RiArrowLeftLine className="w-5 h-5 mr-2" />
                    Return to Main Menu
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
