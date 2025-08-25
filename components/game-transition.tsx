"use client";

import * as Sentry from "@sentry/nextjs";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { RiGamepadLine, RiUserLine } from "react-icons/ri";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GameTransitionProps {
  lobbyCode: string;
  currentUser: User;
  players: PlayerData[];
  onTransitionComplete: () => void;
}

type TransitionStep =
  | "welcome"
  | "generating_situation"
  | "distributing_cards"
  | "starting_round";

export function GameTransition({
  lobbyCode,
  currentUser,
  players,
  onTransitionComplete,
}: GameTransitionProps) {
  const [currentStep, setCurrentStep] = useState<TransitionStep>("welcome");
  const [situation, setSituation] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const generateSituation = useCallback(async () => {
    try {
      const response = await fetch("/api/situation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate situation");
      }

      const data = await response.json();
      setSituation(data.situation);

      // Move to next step after a short delay
      setTimeout(() => {
        setCurrentStep("distributing_cards");
      }, 1000);
    } catch (error) {
      console.error("Error generating situation:", error);
      Sentry.captureException(error);
      toast.error("Failed to generate situation. Using fallback...");

      // Use fallback situation
      setSituation(
        "When you're trying to be productive but your bed is calling your name",
      );
      setTimeout(() => {
        setCurrentStep("distributing_cards");
      }, 1000);
    }
  }, []);

  // Welcome step - show for 3 seconds
  useEffect(() => {
    if (currentStep === "welcome") {
      const timer = setTimeout(() => {
        setCurrentStep("generating_situation");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Generate situation step
  useEffect(() => {
    if (currentStep === "generating_situation") {
      generateSituation();
    }
  }, [currentStep, generateSituation]);

  // Distribute cards step
  useEffect(() => {
    if (currentStep === "distributing_cards") {
      const timer = setTimeout(() => {
        setCurrentStep("starting_round");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Start round step
  useEffect(() => {
    if (currentStep === "starting_round") {
      const timer = setTimeout(() => {
        // Add safety check before calling transition complete
        if (currentUser && lobbyCode) {
          console.log(
            "🎮 GameTransition: Completing transition with user:",
            currentUser.id,
          );
          onTransitionComplete();
        } else {
          console.error("❌ GameTransition: Missing user or lobby data", {
            currentUser,
            lobbyCode,
          });
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, onTransitionComplete, currentUser, lobbyCode]);

  // Progress animation
  useEffect(() => {
    if (currentStep === "generating_situation") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 100);
      return () => clearInterval(interval);
    } else if (currentStep === "distributing_cards") {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  const getStepContent = () => {
    switch (currentStep) {
      case "welcome":
        return {
          title: "Welcome to Meme Battles!",
          subtitle: "Get ready for some epic meme warfare",
          icon: "🎮",
          description: "Preparing your game experience...",
        };
      case "generating_situation":
        return {
          title: "Generating Situation",
          subtitle: "Creating the perfect meme scenario",
          icon: "🤔",
          description:
            "AI is crafting a hilarious situation for you to meme about...",
        };
      case "distributing_cards":
        return {
          title: "Distributing Cards",
          subtitle: "Dealing meme cards to players",
          icon: "🃏",
          description: "Shuffling and dealing your meme arsenal...",
        };
      case "starting_round":
        return {
          title: "Starting Round",
          subtitle: "Let the meme battle begin!",
          icon: "⚔️",
          description: "Preparing the arena for epic meme combat...",
        };
    }
  };

  const stepContent = getStepContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <motion.div
        className="w-full max-w-2xl p-6 sm:p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-3xl tracking-wide text-center">
              {stepContent.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Icon and Subtitle */}
            <div className="text-center">
              <motion.div
                className="text-6xl mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                {stepContent.icon}
              </motion.div>
              <motion.p
                className="text-purple-200/70 font-bangers text-xl tracking-wide"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {stepContent.subtitle}
              </motion.p>
            </div>

            {/* Progress Bar */}
            {(currentStep === "generating_situation" ||
              currentStep === "distributing_cards") && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="w-full bg-slate-700/50 rounded-full h-3">
                  <motion.div
                    className="bg-purple-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-purple-200/70 font-bangers text-lg tracking-wide text-center">
                  {progress}% Complete
                </p>
              </motion.div>
            )}

            {/* Description */}
            <motion.p
              className="text-purple-200/70 font-bangers text-lg tracking-wide text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {stepContent.description}
            </motion.p>

            {/* Generated Situation Display */}
            {situation && currentStep !== "welcome" && (
              <motion.div
                className="bg-purple-600/20 border border-purple-500/30 rounded-xl p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <p className="text-white font-bangers text-lg tracking-wide text-center">
                  &quot;{situation}&quot;
                </p>
              </motion.div>
            )}

            {/* Player Count */}
            <motion.div
              className="flex items-center justify-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex items-center gap-2">
                <RiUserLine className="w-5 h-5 text-purple-400" />
                <span className="text-white font-bangers tracking-wide">
                  {players.length} Players
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RiGamepadLine className="w-5 h-5 text-purple-400" />
                <Badge className="bg-purple-600 text-white font-bangers">
                  {lobbyCode}
                </Badge>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
