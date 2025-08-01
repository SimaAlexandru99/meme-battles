"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiGamepadLine, RiArrowRightLine, RiCloseLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

interface ActiveGameCheckProps {
  activeLobby: {
    code: string;
    status: "waiting" | "started";
    hostUid: string;
    players: Array<{
      uid: string;
      displayName: string;
      profileURL?: string | null;
      joinedAt: string | Date; // Can be ISO string, Date, or Firestore Timestamp
      isHost: boolean;
    }>;
    settings: {
      rounds: number;
      timeLimit: number;
      categories: string[];
    };
  } | null;
  currentUserId: string;
  onDismiss?: () => void;
}

export function ActiveGameCheck({
  activeLobby,
  currentUserId,
  onDismiss,
}: ActiveGameCheckProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);

  // Check if user is already on the game page
  const isOnGamePage = React.useMemo(() => {
    if (!activeLobby) return false;

    // Check if current path matches the active game
    const gameLobbyPath = `/game/${activeLobby.code}`;
    const gamePlayPath = `/game/${activeLobby.code}/play`;

    return pathname === gameLobbyPath || pathname === gamePlayPath;
  }, [activeLobby, pathname]);

  const handleReturnToGame = React.useCallback(async () => {
    if (!activeLobby) return;

    setIsRedirecting(true);

    // Add a small delay for better UX
    setTimeout(() => {
      if (activeLobby.status === "started") {
        router.push(`/game/${activeLobby.code}/play`);
        toast.info("Returning to your active game...");
      } else {
        router.push(`/game/${activeLobby.code}`);
        toast.info("Returning to your lobby...");
      }
    }, 500);
  }, [activeLobby, router]);

  const handleDismiss = React.useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // Don't show if user is already on the game page or if dismissed
  if (!activeLobby || isDismissed || isOnGamePage) {
    return null;
  }

  const isHost = activeLobby.hostUid === currentUserId;
  const playerCount = activeLobby.players.length;

  const getStatusInfo = () => {
    if (activeLobby.status === "started") {
      return {
        title: "Game in Progress",
        description: "You have an active game that's currently being played.",
        badgeText: "PLAYING",
        badgeColor: "bg-green-500/20 text-green-400 border-green-500/30",
        buttonText: "Return to Game",
        icon: <RiGamepadLine className="w-5 h-5" />,
      };
    } else {
      return {
        title: "Active Lobby",
        description: "You have an active lobby waiting for players.",
        badgeText: "WAITING",
        badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        buttonText: "Return to Lobby",
        icon: <RiGamepadLine className="w-5 h-5" />,
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md"
      >
        <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700/50 shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                  {statusInfo.icon}
                </div>
                <div>
                  <CardTitle className="text-white font-bangers text-lg tracking-wide">
                    {statusInfo.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className={statusInfo.badgeColor}
                    >
                      {statusInfo.badgeText}
                    </Badge>
                    <span className="text-sm text-purple-200/70">
                      {playerCount} player{playerCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-slate-700/50"
              >
                <RiCloseLine className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <p className="text-purple-200/70 text-sm">
                {statusInfo.description}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-200/70">Lobby Code:</span>
                  <code className="bg-slate-700/50 px-2 py-1 rounded text-purple-300 font-mono">
                    {activeLobby.code}
                  </code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-200/70">Your Role:</span>
                  <Badge
                    variant="secondary"
                    className={
                      isHost
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    }
                  >
                    {isHost ? "Host" : "Player"}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleReturnToGame}
                  disabled={isRedirecting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <RiArrowRightLine className="w-4 h-4 mr-2" />
                  {isRedirecting ? "Redirecting..." : statusInfo.buttonText}
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  className="border-slate-600/50 text-white hover:bg-slate-700/50"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
