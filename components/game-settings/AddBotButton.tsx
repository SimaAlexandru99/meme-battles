"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RiRobotLine } from "react-icons/ri";
import { AddBotDialog } from "./AddBotModal";
import { buttonVariants, microInteractionVariants } from "./animations";

interface AddBotButtonProps {
  onAddBot: (botConfig: {
    personalityId: string;
    difficulty: "easy" | "medium" | "hard";
  }) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  maxBots?: number;
  currentBotCount?: number;
  disabled?: boolean;
  className?: string;
}

export function AddBotButton({
  onAddBot,
  isLoading = false,
  error = null,
  maxBots = 6,
  currentBotCount = 0,
  disabled = false,
  className,
}: AddBotButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleOpenDialog = React.useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleCloseDialog = React.useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const remainingSlots = maxBots - currentBotCount;

  return (
    <>
      <motion.div
        variants={buttonVariants}
        initial="initial"
        whileHover={!disabled && !(remainingSlots <= 0) ? "hover" : "initial"}
        whileTap={!disabled && !(remainingSlots <= 0) ? "tap" : "initial"}
        animate={disabled || remainingSlots <= 0 ? "disabled" : "initial"}
      >
        <Button
          onClick={handleOpenDialog}
          disabled={disabled || remainingSlots <= 0}
          className={`bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bangers tracking-wide shadow-lg shadow-purple-500/30 disabled:opacity-50 w-full disabled:cursor-not-allowed ${className}`}
        >
          <RiRobotLine className="w-4 h-4 mr-2" />
          Add Bot
          {remainingSlots > 0 && (
            <motion.span
              className="ml-2 text-xs bg-purple-500/20 px-2 py-1 rounded"
              variants={microInteractionVariants}
              initial="initial"
              animate="animate"
            >
              {remainingSlots}
            </motion.span>
          )}
        </Button>
      </motion.div>

      <AddBotDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onAddBot={onAddBot}
        isLoading={isLoading}
        error={error}
        maxBots={maxBots}
        currentBotCount={currentBotCount}
      />
    </>
  );
}
