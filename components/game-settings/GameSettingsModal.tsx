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
import { AlertCircle, X } from "lucide-react";
import { RiSettings3Line, RiCloseLine } from "react-icons/ri";

import { GameSettingsFormData } from "./types";
import { GameSettingsForm } from "./GameSettingsForm";

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: GameSettingsFormData;
  onSave: (settings: GameSettingsFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

// Modal animation variants
const modalVariants = {
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

export function GameSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  isLoading = false,
  error = null,
}: GameSettingsModalProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Clear errors when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setErrors({});
    }
  }, [isOpen]);

  const clearErrors = React.useCallback(() => {
    setErrors({});
  }, []);

  // Handle modal close with unsaved changes warning
  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle form submission
  const handleFormSubmit = React.useCallback(
    async (settings: GameSettingsFormData) => {
      try {
        await onSave(settings);
        onClose();
      } catch (error) {
        // Error handling is done in the form component
        console.error("Failed to save settings:", error);
      }
    },
    [onSave, onClose]
  );

  // Handle form cancel
  const handleFormCancel = React.useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="bg-slate-800/95 backdrop-blur-sm border-slate-700/50 max-w-4xl max-h-[90vh] p-0 overflow-hidden"
        showCloseButton={false}
      >
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              variants={modalVariants}
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
                      <RiSettings3Line className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-white font-bangers text-2xl tracking-wide">
                        Game Settings
                      </DialogTitle>
                      <DialogDescription className="text-purple-200/70 text-sm font-bangers tracking-wide">
                        Customize your game experience and AI players
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
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Error Display */}
                {error && (
                  <div
                    className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 animate-in slide-in-from-top-2 duration-300 mb-6"
                    role="alert"
                    aria-live="polite"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-red-200 font-bangers tracking-wide mb-2">
                          {error}
                        </p>
                        <div className="text-xs text-red-200/70 font-bangers tracking-wide space-y-1">
                          <p>• Check your internet connection</p>
                          <p>• Ensure you have permission to modify settings</p>
                          <p>• Try saving again in a few moments</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearErrors}
                        className="flex-shrink-0 p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors duration-200"
                        aria-label="Dismiss error"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Settings Form */}
                <GameSettingsForm
                  initialSettings={currentSettings}
                  onSubmit={handleFormSubmit}
                  onCancel={handleFormCancel}
                  disabled={isLoading}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
