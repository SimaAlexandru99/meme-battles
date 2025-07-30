"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { RiArrowRightLine, RiPlayLine, RiHomeLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface GameRedirectProps {
  lobbyCode: string;
  gameStatus: "waiting" | "started" | "finished";
  onRedirect?: () => void;
}

export function GameRedirect({
  lobbyCode,
  gameStatus,
  onRedirect,
}: GameRedirectProps) {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const handleRedirect = React.useCallback(async () => {
    setIsRedirecting(true);
    onRedirect?.();

    // Add a small delay for better UX
    setTimeout(() => {
      if (gameStatus === "started") {
        router.push(`/game/${lobbyCode}/play`);
      } else if (gameStatus === "finished") {
        router.push("/");
        toast.info("Game has finished. Redirecting to main menu.");
      }
    }, 1000);
  }, [gameStatus, lobbyCode, router, onRedirect]);

  const handleBackToMain = React.useCallback(() => {
    router.push("/");
  }, [router]);

  const getRedirectContent = () => {
    switch (gameStatus) {
      case "started":
        return {
          title: "Game Already Started",
          description:
            "The game has already begun! You can still join and catch up.",
          icon: <RiPlayLine className="w-8 h-8 text-green-400" />,
          buttonText: "Join Game",
          buttonIcon: <RiArrowRightLine className="w-4 h-4" />,
          buttonAction: handleRedirect,
        };
      case "finished":
        return {
          title: "Game Finished",
          description:
            "This game has already finished. Start a new game to play again!",
          icon: <RiHomeLine className="w-8 h-8 text-purple-400" />,
          buttonText: "Back to Main Menu",
          buttonIcon: <RiHomeLine className="w-4 h-4" />,
          buttonAction: handleBackToMain,
        };
      default:
        return {
          title: "Redirecting...",
          description: "Preparing to join the game...",
          icon: (
            <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
          ),
          buttonText: "Continue",
          buttonIcon: <RiArrowRightLine className="w-4 h-4" />,
          buttonAction: handleRedirect,
        };
    }
  };

  const content = getRedirectContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-xl tracking-wide text-center">
              {content.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                {content.icon}
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-purple-200/70">{content.description}</p>
              <p className="text-sm text-purple-200/50">
                Lobby Code:{" "}
                <code className="bg-slate-700/50 px-2 py-1 rounded text-purple-300">
                  {lobbyCode}
                </code>
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={content.buttonAction}
                disabled={isRedirecting}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {content.buttonIcon}
                {isRedirecting ? "Redirecting..." : content.buttonText}
              </Button>

              {gameStatus !== "finished" && (
                <Button
                  onClick={handleBackToMain}
                  variant="outline"
                  className="border-slate-600/50 text-white hover:bg-slate-700/50"
                >
                  <RiHomeLine className="w-4 h-4 mr-2" />
                  Main Menu
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
