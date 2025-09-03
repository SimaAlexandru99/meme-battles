"use client";

import { motion } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";
import { RiGamepadLine, RiTimeLine } from "react-icons/ri";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RoundCountdownProps {
  lobbyCode: string;
  currentUser: User;
  players: Player[];
  roundNumber: number;
  totalRounds: number;
  onRoundStart: () => void;
}

export const RoundCountdown = memo(
  function RoundCountdown({
    lobbyCode,
    players,
    roundNumber,
    totalRounds,
    onRoundStart,
  }: RoundCountdownProps) {
    // console.log("⏰ RoundCountdown render:", { roundNumber, totalRounds });
    const [countdown, setCountdown] = useState(5);
    const [isStarting, setIsStarting] = useState(false);
    const isStartingRef = useRef(false);
    const onRoundStartRef = useRef(onRoundStart);

    // Keep refs in sync
    useEffect(() => {
      onRoundStartRef.current = onRoundStart;
      isStartingRef.current = isStarting;
    }, [onRoundStart, isStarting]);

    // Start countdown when component mounts
    useEffect(() => {
      let timer: NodeJS.Timeout;

      const startTimer = () => {
        timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              // Use the ref directly to avoid dependencies
              if (!isStartingRef.current) {
                isStartingRef.current = true;
                setIsStarting(true);
                setTimeout(() => {
                  toast.success("Round started!");
                  onRoundStartRef.current();
                }, 1000);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      };

      startTimer();
      return () => clearInterval(timer);
    }, []); // Remove all dependencies

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
                    Get ready!
                  </p>
                </motion.div>

                {/* Game Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <RiGamepadLine className="w-5 h-5 text-purple-400" />
                      <span className="text-white font-bangers tracking-wide">
                        Round {roundNumber}/{totalRounds}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RiTimeLine className="w-5 h-5 text-purple-400" />
                      <span className="text-white font-bangers tracking-wide">
                        {countdown}s
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className="text-purple-200/70 font-bangers tracking-wide">
                      Code:
                    </span>
                    <Badge className="bg-purple-600 text-white font-bangers">
                      {lobbyCode}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Players Section */}
            <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
              <CardHeader>
                <CardTitle className="text-white font-bangers text-xl tracking-wide text-center">
                  Players Ready
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bangers text-purple-400 mb-2">
                    {players.length}/8
                  </div>
                  <p className="text-purple-200/70 font-bangers text-sm tracking-wide">
                    Players joined
                  </p>
                </div>

                {/* Players List */}
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg",
                        "bg-slate-700/30 border border-slate-600/50",
                        player.isCurrentPlayer &&
                          "ring-2 ring-purple-500 bg-purple-600/20",
                      )}
                    >
                      <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {player.name[0]}
                      </div>
                      <span
                        className={cn(
                          "font-bangers text-sm tracking-wide flex-1",
                          player.isCurrentPlayer
                            ? "text-purple-300"
                            : "text-white",
                        )}
                      >
                        {player.name}
                      </span>
                      {player.isCurrentPlayer && (
                        <Badge className="text-xs bg-purple-600 text-white">
                          YOU
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.lobbyCode === nextProps.lobbyCode &&
      prevProps.roundNumber === nextProps.roundNumber &&
      prevProps.totalRounds === nextProps.totalRounds &&
      prevProps.players.length === nextProps.players.length &&
      prevProps.players.every(
        (player, index) =>
          player.id === nextProps.players[index]?.id &&
          player.name === nextProps.players[index]?.name &&
          player.isCurrentPlayer === nextProps.players[index]?.isCurrentPlayer,
      )
    );
  },
);
