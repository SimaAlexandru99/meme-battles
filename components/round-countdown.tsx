"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiTimeLine, RiUserLine, RiGamepadLine } from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { autoStartRound } from "@/lib/actions/lobby.action";

interface RoundCountdownProps {
  lobbyCode: string;
  currentUser: User;
  players: Player[];
  onRoundStart: () => void;
}

export function RoundCountdown({
  lobbyCode,
  currentUser,
  players,
  onRoundStart,
}: RoundCountdownProps) {
  const [countdown, setCountdown] = useState(5);
  const [isStarting, setIsStarting] = useState(false);
  const [roundStarted, setRoundStarted] = useState(false);

  // Start countdown when component mounts
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleStartRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleStartRound = async () => {
    if (isStarting) return;

    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Start Round",
      },
      async () => {
        setIsStarting(true);
        try {
          const result = await autoStartRound(lobbyCode);

          if (result.success) {
            toast.success(`Round ${result.roundState.currentRound} started!`);
            setRoundStarted(true);
            onRoundStart();
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to start round";
          toast.error(errorMessage);
          Sentry.captureException(error);
        } finally {
          setIsStarting(false);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl p-6"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Countdown Section */}
          <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
            <CardHeader>
              <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
                Round Starting Soon!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Countdown Timer */}
              <motion.div
                className="text-center"
                key={countdown}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-8xl font-bangers text-purple-400 mb-4">
                  {countdown}
                </div>
                <p className="text-purple-200/70 font-bangers text-lg tracking-wide">
                  {countdown > 0 ? "Get ready to play!" : "Round starting..."}
                </p>
              </motion.div>

              {/* Player Count */}
              <div className="flex items-center justify-center gap-2">
                <RiUserLine className="w-5 h-5 text-purple-400" />
                <span className="text-purple-200/70 font-bangers tracking-wide">
                  {players.length} players ready
                </span>
              </div>

              {/* Loading State */}
              {isStarting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2"
                >
                  <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  <span className="text-purple-200/70 font-bangers tracking-wide">
                    Starting round...
                  </span>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Players List */}
          <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
            <CardHeader>
              <CardTitle className="text-white font-bangers text-xl tracking-wide">
                Players Ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <AnimatePresence>
                  {players.map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg",
                        "bg-slate-700/30 border border-slate-600/30",
                        player.id === currentUser.id &&
                          "bg-purple-600/20 border-purple-500/30"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                        <RiUserLine className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-white font-bangers tracking-wide">
                          {player.name}
                        </span>
                        {player.id === currentUser.id && (
                          <Badge className="ml-2 bg-purple-600 text-white text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <RiGamepadLine className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm">Ready</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <div className="text-purple-200/70 font-bangers tracking-wide">
            <p>• Each player will receive 7 meme cards</p>
            <p>• Submit your best meme for the situation</p>
            <p>• Vote for the funniest submission</p>
            <p>• Winner gets points and bragging rights!</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
