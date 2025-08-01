"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { RiCloseLine, RiSaveLine, RiSettings3Line } from "react-icons/ri";
import { AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGameSettingsForm } from "@/hooks/useGameSettingsForm";
import { GameSettingsFormData } from "./types";
import { RoundsSelector } from "./RoundsSelector";
import { TimeLimitSlider } from "./TimeLimitSlider";
import { CategoriesSelector } from "./CategoriesSelector";
import { FormErrorDisplay } from "./FormErrorDisplay";

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

// Unsaved changes confirmation dialog
interface UnsavedChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: () => void;
  isSaving: boolean;
}

function UnsavedChangesDialog({
  isOpen,
  onClose,
  onDiscard,
  onSave,
  isSaving,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800/95 backdrop-blur-sm border-slate-700/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white font-bangers text-xl tracking-wide">
            Unsaved Changes
          </DialogTitle>
          <DialogDescription className="text-purple-200/70 font-bangers tracking-wide">
            You have unsaved changes to your game settings. What would you like
            to do?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
            className="border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
          >
            Discard Changes
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              "bg-gradient-to-r from-purple-600 to-purple-700",
              "hover:from-purple-500 hover:to-purple-600",
              "text-white font-bangers tracking-wide",
              "shadow-lg shadow-purple-500/30"
            )}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              <>
                <RiSaveLine className="w-4 h-4 mr-2" />
                Save & Close
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GameSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSave,
  isLoading = false,
  error = null,
}: GameSettingsModalProps) {
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  const [isModalLoading, setIsModalLoading] = React.useState(false);

  // Initialize form with current settings
  const {
    settings,
    errors,
    isValid,
    isDirty,
    isSubmitting,
    updateSetting,
    resetForm,
    submitForm,
    clearErrors,
  } = useGameSettingsForm({
    initialSettings: currentSettings,
    onSubmit: async (formSettings) => {
      await onSave(formSettings);
      onClose();
    },
  });

  // Reset form when currentSettings change
  React.useEffect(() => {
    if (isOpen) {
      setIsModalLoading(true);
      resetForm();
      // Simulate loading time for better UX
      const timer = setTimeout(() => {
        setIsModalLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentSettings, resetForm]);

  // Handle modal close with unsaved changes check
  const handleClose = React.useCallback(() => {
    if (isDirty && !isSubmitting) {
      setShowUnsavedDialog(true);
    } else {
      resetForm();
      onClose();
    }
  }, [isDirty, isSubmitting, resetForm, onClose]);

  // Handle unsaved changes dialog actions
  const handleDiscardChanges = React.useCallback(() => {
    setShowUnsavedDialog(false);
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSaveAndClose = React.useCallback(async () => {
    setShowUnsavedDialog(false);
    await submitForm();
  }, [submitForm]);

  // Handle save button click
  const handleSave = React.useCallback(async () => {
    await submitForm();
  }, [submitForm]);

  // Handle cancel button click
  const handleCancel = React.useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Clear external errors when form changes
  React.useEffect(() => {
    if (error && isDirty) {
      clearErrors();
    }
  }, [error, isDirty, clearErrors]);

  // Keyboard shortcuts
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key - close modal
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }

      // Ctrl+S - save settings
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        if (isValid && isDirty) {
          handleSave();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose, handleSave, isValid, isDirty]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className={cn(
            "bg-slate-800/95 backdrop-blur-sm border-slate-700/50",
            // Mobile: full screen with proper padding
            "w-full h-full max-w-none max-h-none p-4",
            // Tablet: constrained width
            "sm:max-w-2xl sm:max-h-[90vh] sm:p-6",
            // Desktop: larger modal
            "lg:max-w-3xl lg:p-8"
          )}
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
                <DialogHeader className="flex-shrink-0 pb-4">
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
                          Customize your game experience
                        </DialogDescription>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClose}
                      className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg"
                    >
                      <RiCloseLine className="w-5 h-5" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </div>
                </DialogHeader>

                <Separator className="bg-slate-700/50" />

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-6 space-y-6">
                  {/* Error Display */}
                  {error && (
                    <div
                      className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 animate-in slide-in-from-top-2 duration-300"
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
                            <p>
                              • Ensure you have permission to modify settings
                            </p>
                            <p>• Try saving again in a few moments</p>
                          </div>
                        </div>
                        <button
                          onClick={clearErrors}
                          className="flex-shrink-0 p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                          aria-label="Dismiss error"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {Object.keys(errors).length > 0 && (
                    <FormErrorDisplay errors={errors} onDismiss={clearErrors} />
                  )}

                  {/* Form Fields with Skeleton Loading */}
                  <div className="space-y-8">
                    {/* Rounds Selector */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {isLoading || isModalLoading ? (
                        <div className="space-y-2">
                          <div className="h-4 bg-slate-700/50 rounded w-1/3 animate-pulse" />
                          <div className="h-12 bg-slate-700/50 rounded animate-pulse" />
                        </div>
                      ) : (
                        <RoundsSelector
                          value={settings.rounds}
                          onChange={(rounds) => updateSetting("rounds", rounds)}
                          disabled={isLoading || isSubmitting}
                          error={errors.rounds}
                        />
                      )}
                    </motion.div>

                    {/* Time Limit Slider */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      {isLoading || isModalLoading ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="h-4 bg-slate-700/50 rounded w-1/2 animate-pulse" />
                            <div className="h-6 bg-slate-700/50 rounded w-16 animate-pulse" />
                          </div>
                          <div className="h-8 bg-slate-700/50 rounded animate-pulse" />
                        </div>
                      ) : (
                        <TimeLimitSlider
                          value={settings.timeLimit}
                          onChange={(timeLimit) =>
                            updateSetting("timeLimit", timeLimit)
                          }
                          disabled={isLoading || isSubmitting}
                          error={errors.timeLimit}
                        />
                      )}
                    </motion.div>

                    {/* Categories Selector */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      {isLoading || isModalLoading ? (
                        <div className="space-y-4">
                          <div className="h-4 bg-slate-700/50 rounded w-1/3 animate-pulse" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="h-20 bg-slate-700/50 rounded animate-pulse"
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <CategoriesSelector
                          value={settings.categories}
                          onChange={(categories) =>
                            updateSetting("categories", categories)
                          }
                          disabled={isLoading || isSubmitting}
                          error={errors.categories}
                        />
                      )}
                    </motion.div>
                  </div>
                </div>

                <Separator className="bg-slate-700/50" />

                {/* Footer */}
                <DialogFooter className="flex-shrink-0 pt-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-4">
                    {/* Dirty state indicator */}
                    <div className="flex items-center justify-center sm:justify-start">
                      {isDirty && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 text-sm text-yellow-400 font-bangers tracking-wide"
                        >
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                          <span>Unsaved changes</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto border-slate-600/50 text-white hover:bg-slate-700/50 font-bangers tracking-wide"
                      >
                        Cancel
                      </Button>

                      <Button
                        onClick={handleSave}
                        disabled={!isValid || !isDirty || isSubmitting}
                        className={cn(
                          "w-full sm:w-auto h-12 sm:h-10",
                          "bg-gradient-to-r from-purple-600 to-purple-700",
                          "hover:from-purple-500 hover:to-purple-600",
                          "disabled:from-slate-600 disabled:to-slate-700",
                          "text-white font-bangers text-lg sm:text-base tracking-wide",
                          "shadow-lg shadow-purple-500/30",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          // Enhanced visual weight for critical action
                          "ring-2 ring-purple-500/20 hover:ring-purple-500/40",
                          "focus-visible:ring-2 focus-visible:ring-purple-500/50",
                          "focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800"
                        )}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <>
                            <RiSaveLine className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onClose={() => setShowUnsavedDialog(false)}
        onDiscard={handleDiscardChanges}
        onSave={handleSaveAndClose}
        isSaving={isSubmitting}
      />
    </>
  );
}
