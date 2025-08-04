"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiRobotLine, RiCloseLine, RiAddLine } from "react-icons/ri";
import { AVAILABLE_AI_PERSONALITIES } from "./types";
import { cn } from "@/lib/utils";

interface AddBotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBot: (botConfig: {
    personalityId: string;
    difficulty: "easy" | "medium" | "hard";
  }) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  maxBots?: number;
  currentBotCount?: number;
}

interface BotConfig {
  personalityId: string;
  difficulty: "easy" | "medium" | "hard";
}

// Dialog animation variants
const dialogVariants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2,
      ease: "easeInOut" as const,
    },
  },
};

export function AddBotDialog({
  isOpen,
  onClose,
  onAddBot,
  isLoading = false,
  error = null,
  maxBots = 6,
  currentBotCount = 0,
}: AddBotDialogProps) {
  const [botConfig, setBotConfig] = React.useState<BotConfig>({
    personalityId: "sarcastic-sam",
    difficulty: "medium",
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setBotConfig({
        personalityId: "sarcastic-sam",
        difficulty: "medium",
      });
      setErrors({});
    }
  }, [isOpen]);

  const handlePersonalityChange = React.useCallback((personalityId: string) => {
    setBotConfig((prev) => ({
      ...prev,
      personalityId,
    }));
    // Clear personality error when user makes a selection
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.personality;
      return newErrors;
    });
  }, []);

  const handleDifficultyChange = React.useCallback(
    (difficulty: "easy" | "medium" | "hard") => {
      setBotConfig((prev) => ({
        ...prev,
        difficulty,
      }));
    },
    [],
  );

  const handleAddBot = React.useCallback(async () => {
    // Validate
    if (!botConfig.personalityId) {
      setErrors({ personality: "Please select a personality" });
      return;
    }

    if (currentBotCount >= maxBots) {
      setErrors({ general: `Maximum ${maxBots} bots allowed` });
      return;
    }

    try {
      await onAddBot(botConfig);
      onClose();
    } catch {
      setErrors({ general: "Failed to add bot. Please try again." });
    }
  }, [botConfig, currentBotCount, maxBots, onAddBot, onClose]);

  const handleClose = React.useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  const selectedPersonality = AVAILABLE_AI_PERSONALITIES.find(
    (p) => p.id === botConfig.personalityId,
  );

  const remainingSlots = maxBots - currentBotCount;
  const canAddBot = remainingSlots > 0 && !isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="bg-slate-800/95 backdrop-blur-sm border-slate-700/50 max-w-2xl max-h-[90vh] p-0 overflow-hidden"
        showCloseButton={false}
      >
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              variants={dialogVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col h-full"
            >
              {/* Header */}
              <DialogHeader className="flex-shrink-0 pb-4 px-6 pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <RiRobotLine className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-white font-bangers text-2xl tracking-wide">
                        Add AI Player
                      </DialogTitle>
                      <DialogDescription className="text-purple-200/70 text-sm font-bangers tracking-wide">
                        Configure and add an AI player to your lobby
                      </DialogDescription>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                    aria-label="Close dialog"
                  >
                    <RiCloseLine className="w-5 h-5" />
                  </Button>
                </div>
              </DialogHeader>

              <Separator className="bg-slate-700/50" />

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Error Display */}
                {error && (
                  <div
                    className="rounded-lg border border-red-500/50 bg-red-500/10 p-4"
                    role="alert"
                    aria-live="polite"
                  >
                    <p className="text-sm text-red-200 font-bangers tracking-wide">
                      {error}
                    </p>
                  </div>
                )}

                {Object.keys(errors).length > 0 && (
                  <div
                    className="rounded-lg border border-red-500/50 bg-red-500/10 p-4"
                    role="alert"
                    aria-live="polite"
                  >
                    {Object.entries(errors).map(([key, message]) => (
                      <p
                        key={key}
                        className="text-sm text-red-200 font-bangers tracking-wide"
                      >
                        {message}
                      </p>
                    ))}
                  </div>
                )}

                {/* Bot Count Info */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/20 border border-slate-600/30">
                  <div>
                    <p className="text-sm text-slate-300 font-bangers tracking-wide">
                      Current Bots: {currentBotCount}
                    </p>
                    <p className="text-xs text-slate-400 font-bangers tracking-wide">
                      Remaining slots: {remainingSlots}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-300 font-bangers tracking-wide">
                      Max: {maxBots}
                    </p>
                  </div>
                </div>

                {/* Personality Selection */}
                <Card className="border-slate-700/50 bg-slate-800/30">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bangers tracking-wide text-white">
                      Choose AI Personality
                    </CardTitle>
                    <p className="text-sm text-slate-400 font-medium">
                      Select the personality for your AI player
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label
                        htmlFor="personality-select"
                        className="text-sm font-medium text-white"
                      >
                        AI Personality
                      </Label>
                      <Select
                        value={botConfig.personalityId}
                        onValueChange={handlePersonalityChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger
                          id="personality-select"
                          className="w-full"
                        >
                          <SelectValue placeholder="Select a personality" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_AI_PERSONALITIES.map((personality) => (
                            <SelectItem
                              key={personality.id}
                              value={personality.id}
                            >
                              <div className="flex flex-col items-start gap-1">
                                <span className="font-medium">
                                  {personality.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {personality.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Difficulty Selection */}
                <Card className="border-slate-700/50 bg-slate-800/30">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bangers tracking-wide text-white">
                      AI Difficulty
                    </CardTitle>
                    <p className="text-sm text-slate-400 font-medium">
                      Choose how challenging the AI should be
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Label
                        htmlFor="difficulty-select"
                        className="text-sm font-medium text-white"
                      >
                        Difficulty Level
                      </Label>
                      <Select
                        value={botConfig.difficulty}
                        onValueChange={handleDifficultyChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger
                          id="difficulty-select"
                          className="w-full"
                        >
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">
                            Easy - Relaxed and fun
                          </SelectItem>
                          <SelectItem value="medium">
                            Medium - Balanced challenge
                          </SelectItem>
                          <SelectItem value="hard">
                            Hard - Strategic and competitive
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        Affects AI decision quality and response timing
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Personality Preview */}
                {selectedPersonality && (
                  <Card className="border-purple-500/30 bg-purple-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bangers tracking-wide text-purple-200">
                        Selected AI Player
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                          <RiRobotLine className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {selectedPersonality.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {selectedPersonality.description}
                          </p>
                          <p className="text-xs text-purple-400 font-medium">
                            Difficulty: {botConfig.difficulty}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Separator className="bg-slate-700/50" />

              {/* Footer */}
              <div className="flex-shrink-0 pt-4 px-6 pb-6">
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700/50">
                  <div className="flex-1 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleAddBot}
                      disabled={!canAddBot}
                      className={cn(
                        "flex-1 px-6 py-3 rounded-lg font-bangers tracking-wide text-lg",
                        "bg-gradient-to-r from-purple-600 to-purple-700",
                        "hover:from-purple-500 hover:to-purple-600",
                        "disabled:from-slate-600 disabled:to-slate-700",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        "text-white shadow-lg transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                        "active:scale-95",
                      )}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Adding...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <RiAddLine className="w-4 h-4" />
                          Add AI Player
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isLoading}
                      className={cn(
                        "flex-1 px-6 py-3 rounded-lg font-bangers tracking-wide text-lg",
                        "bg-slate-700/50 hover:bg-slate-700/70",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        "text-white border border-slate-600/50",
                        "transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-slate-500/50",
                        "active:scale-95",
                      )}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
