import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, X } from "lucide-react";
import { RiSettings3Line, RiCloseLine } from "react-icons/ri";

import { GameSettingsFormData } from "./types";
import { GameSettingsForm } from "./GameSettingsForm";
import { useEventListener } from "react-haiku";
import { cn } from "@/lib/utils";

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
}: GameSettingsModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Clear errors when modal opens/closes
  React.useEffect(() => {
    // Reset any form state when modal opens
  }, [isOpen]);

  const handleClose = React.useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  const handleSave = React.useCallback(
    async (settings: GameSettingsFormData) => {
      setIsSubmitting(true);
      setFormError(null);

      try {
        await onSave(settings);
        handleClose();
      } catch (error) {
        console.error("Error saving game settings:", error);
        setFormError(
          error instanceof Error
            ? error.message
            : "Failed to save game settings. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSave, handleClose],
  );

  // Handle form cancel
  const handleFormCancel = React.useCallback(() => {
    onClose();
  }, [onClose]);

  // Use Haiku's useEventListener for keyboard shortcuts
  useEventListener("keydown", (event: Event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === "Escape" && isOpen) {
      handleClose();
    }
  });

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
              className="flex flex-col h-full max-h-[90vh]"
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

                  <DialogClose asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                      aria-label="Close dialog"
                    >
                      <RiCloseLine className="w-5 h-5" />
                    </Button>
                  </DialogClose>
                </div>
              </DialogHeader>

              <Separator className="bg-slate-700/50" />

              {/* Content */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-6 py-6 space-y-6">
                  {/* Error Display */}
                  {formError && (
                    <div
                      className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 animate-in slide-in-from-top-2 duration-300 mb-6"
                      role="alert"
                      aria-live="polite"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-red-200 font-bangers tracking-wide mb-2">
                            {formError}
                          </p>
                          <div className="text-xs text-red-200/70 font-bangers tracking-wide space-y-1">
                            <p>• Check your internet connection</p>
                            <p>
                              • Ensure you have permission to modify settings
                            </p>
                            <p>• Try saving again in a few moments</p>
                          </div>
                        </div>
                        <DialogClose asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0 p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors duration-200"
                            aria-label="Dismiss error"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </DialogClose>
                      </div>
                    </div>
                  )}

                  {/* Settings Form */}
                  <GameSettingsForm
                    initialSettings={currentSettings}
                    onSubmit={handleSave}
                    onCancel={handleFormCancel}
                    disabled={isSubmitting}
                    hideActions={true}
                    ref={formRef}
                  />
                </div>
              </ScrollArea>

              <Separator className="bg-slate-700/50" />

              {/* Footer */}
              <DialogFooter className="flex-shrink-0 px-6 py-6">
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      disabled={isSubmitting}
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
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    form="game-settings-form"
                    disabled={isSubmitting}
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
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
