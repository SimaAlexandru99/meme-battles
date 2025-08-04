"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_AI_PERSONALITIES } from "./types";
import {
  componentVariants,
  microInteractionVariants,
  messageVariants,
} from "./animations";

interface AISettingsSelectorProps {
  value: {
    enabled: boolean;
    maxAIPlayers: number;
    minHumanPlayers: number;
    personalityPool: string[];
    autoBalance: boolean;
    difficulty: "easy" | "medium" | "hard";
  };
  onChange: (value: AISettingsSelectorProps["value"]) => void;
  disabled?: boolean;
  error?: string;
}

export function AISettingsSelector({
  value,
  onChange,
  disabled = false,
  error,
}: AISettingsSelectorProps) {
  const handleToggleAI = React.useCallback(
    (enabled: boolean) => {
      onChange({
        ...value,
        enabled,
      });
    },
    [value, onChange]
  );

  const handleMaxAIPlayersChange = React.useCallback(
    (maxAIPlayers: number[]) => {
      onChange({
        ...value,
        maxAIPlayers: maxAIPlayers[0],
      });
    },
    [value, onChange]
  );

  const handleMinHumanPlayersChange = React.useCallback(
    (minHumanPlayers: number[]) => {
      onChange({
        ...value,
        minHumanPlayers: minHumanPlayers[0],
      });
    },
    [value, onChange]
  );

  const handlePersonalityToggle = React.useCallback(
    (personalityId: string, checked: boolean) => {
      const newPersonalityPool = checked
        ? [...value.personalityPool, personalityId]
        : value.personalityPool.filter((id) => id !== personalityId);

      onChange({
        ...value,
        personalityPool: newPersonalityPool,
      });
    },
    [value, onChange]
  );

  const handleAutoBalanceToggle = React.useCallback(
    (autoBalance: boolean) => {
      onChange({
        ...value,
        autoBalance,
      });
    },
    [value, onChange]
  );

  const handleDifficultyChange = React.useCallback(
    (difficulty: "easy" | "medium" | "hard") => {
      onChange({
        ...value,
        difficulty,
      });
    },
    [value, onChange]
  );

  return (
    <motion.div
      variants={componentVariants}
      initial="initial"
      animate="animate"
    >
      <Card className="border-slate-700/50 bg-slate-800/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-lg font-bangers tracking-wide text-white">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">AI</span>
              </div>
              AI Players
            </div>
            <Switch
              checked={value.enabled}
              onCheckedChange={handleToggleAI}
              disabled={disabled}
              className="ml-auto"
            />
          </CardTitle>
          <p className="text-sm text-slate-400 font-medium">
            Configure AI players to fill empty slots and enhance gameplay
          </p>
        </CardHeader>

        <AnimatePresence>
          {value.enabled && (
            <motion.div
              variants={microInteractionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <CardContent className="space-y-6">
                {/* Error Display */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                      variants={messageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <p className="text-sm text-red-400 font-medium">
                        {error}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Max AI Players */}
                <motion.div
                  className="space-y-3"
                  variants={microInteractionVariants}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-white">
                      Max AI Players
                    </Label>
                    <span className="text-sm text-slate-400 font-mono">
                      {value.maxAIPlayers}
                    </span>
                  </div>
                  <Slider
                    value={[value.maxAIPlayers]}
                    onValueChange={handleMaxAIPlayersChange}
                    min={1}
                    max={6}
                    step={1}
                    disabled={disabled}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">
                    Maximum number of AI players that can join the lobby
                  </p>
                </motion.div>

                {/* Min Human Players */}
                <motion.div
                  className="space-y-3"
                  variants={microInteractionVariants}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-white">
                      Min Human Players
                    </Label>
                    <span className="text-sm text-slate-400 font-mono">
                      {value.minHumanPlayers}
                    </span>
                  </div>
                  <Slider
                    value={[value.minHumanPlayers]}
                    onValueChange={handleMinHumanPlayersChange}
                    min={1}
                    max={6}
                    step={1}
                    disabled={disabled}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500">
                    Minimum human players before AI players are added
                  </p>
                </motion.div>

                {/* AI Personalities */}
                <motion.div
                  className="space-y-3"
                  variants={microInteractionVariants}
                >
                  <Label className="text-sm font-medium text-white">
                    AI Personalities
                  </Label>
                  <div className="grid grid-cols-1 gap-2">
                    {AVAILABLE_AI_PERSONALITIES.map((personality, index) => (
                      <motion.div
                        key={personality.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-slate-700/50 bg-slate-800/20 hover:bg-slate-800/40 transition-colors"
                        variants={microInteractionVariants}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Checkbox
                          id={personality.id}
                          checked={value.personalityPool.includes(
                            personality.id
                          )}
                          onCheckedChange={(checked) =>
                            handlePersonalityToggle(
                              personality.id,
                              checked as boolean
                            )
                          }
                          disabled={disabled}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={personality.id}
                            className="text-sm font-medium text-white cursor-pointer"
                          >
                            {personality.name}
                          </Label>
                          <p className="text-xs text-slate-400">
                            {personality.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Select which AI personalities can join the game
                  </p>
                </motion.div>

                {/* Auto Balance */}
                <motion.div
                  className="flex items-center justify-between"
                  variants={microInteractionVariants}
                >
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-white">
                      Auto Balance
                    </Label>
                    <p className="text-xs text-slate-500">
                      Automatically remove AI players when humans join
                    </p>
                  </div>
                  <Switch
                    checked={value.autoBalance}
                    onCheckedChange={handleAutoBalanceToggle}
                    disabled={disabled}
                  />
                </motion.div>

                {/* Difficulty */}
                <motion.div
                  className="space-y-3"
                  variants={microInteractionVariants}
                >
                  <Label
                    htmlFor="ai-difficulty-select"
                    className="text-sm font-medium text-white"
                  >
                    AI Difficulty
                  </Label>
                  <Select
                    value={value.difficulty}
                    onValueChange={handleDifficultyChange}
                    disabled={disabled}
                  >
                    <SelectTrigger id="ai-difficulty-select" className="w-full">
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
                </motion.div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
