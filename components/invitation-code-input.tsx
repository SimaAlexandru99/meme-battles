"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";
import {
  inputVariants,
  errorVariants,
  microInteractionVariants,
} from "@/lib/animations/private-lobby-variants";
import { normalizeInvitationCode } from "@/lib/services/lobby.service";

interface InvitationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function InvitationCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  className,
}: InvitationCodeInputProps) {
  // Focus management refs
  const inputRef = React.useRef<HTMLDivElement>(null);
  const [currentFocusIndex, setCurrentFocusIndex] = React.useState<number>(-1);

  const handleChange = React.useCallback(
    (newValue: string) => {
      // Use the service function for normalization
      const normalizedValue = normalizeInvitationCode(newValue);
      onChange(normalizedValue);

      // Auto-complete when 5 characters are entered
      if (normalizedValue.length === 5) {
        onComplete(normalizedValue);
      }
    },
    [onChange, onComplete]
  );

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const normalizedText = normalizeInvitationCode(pastedText).slice(0, 5);

      if (normalizedText.length > 0) {
        onChange(normalizedText);
        if (normalizedText.length === 5) {
          onComplete(normalizedText);
        }
      }
    },
    [onChange, onComplete]
  );

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          setCurrentFocusIndex((prev) => Math.max(0, prev - 1));
          break;
        case "ArrowRight":
          event.preventDefault();
          setCurrentFocusIndex((prev) => Math.min(4, prev + 1));
          break;
        case "Home":
          event.preventDefault();
          setCurrentFocusIndex(0);
          break;
        case "End":
          event.preventDefault();
          setCurrentFocusIndex(4);
          break;
        case "Tab":
          // Let default tab behavior work
          break;
        default:
          // For other keys, let the input handle them
          break;
      }
    },
    [disabled]
  );

  // Announce input changes to screen readers
  React.useEffect(() => {
    if (value.length > 0) {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "polite");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent = `Entered ${value.length} of 5 characters`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 100);
    }
  }, [value]);

  React.useEffect(() => {
    if (error) {
      const announcement = document.createElement("div");
      announcement.setAttribute("aria-live", "assertive");
      announcement.setAttribute("aria-atomic", "true");
      announcement.className = "sr-only";
      announcement.textContent =
        "Invalid invitation code. Please check the code and try again.";
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 100);
    }
  }, [error]);

  return (
    <motion.div
      className={cn("flex flex-col items-center gap-2", className)}
      variants={microInteractionVariants}
      role="group"
      aria-labelledby="otp-input-label"
      aria-describedby="otp-input-description"
      onKeyDown={handleKeyDown}
    >
      <div id="otp-input-label" className="sr-only">
        Invitation code input field
      </div>
      <div id="otp-input-description" className="sr-only">
        Enter a 5-character alphanumeric invitation code. Use arrow keys to
        navigate between fields.
      </div>

      <motion.div
        ref={inputRef}
        variants={inputVariants}
        initial="initial"
        animate={error ? "error" : "initial"}
        whileFocus="focus"
        className="w-full"
        role="group"
        aria-label="Invitation code input"
        aria-invalid={error}
        aria-describedby={error ? "otp-error-message" : undefined}
      >
        <InputOTP
          maxLength={5}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          onPaste={handlePaste}
          className={cn("gap-2 sm:gap-3", error && "aria-invalid:true")}
          containerClassName="flex items-center justify-center"
          aria-label="Enter 5-character invitation code"
        >
          <InputOTPGroup className="gap-2 sm:gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <motion.div
                key={index}
                variants={microInteractionVariants}
                whileHover="hover"
                whileTap="tap"
                className="relative"
              >
                <InputOTPSlot
                  index={index}
                  className={cn(
                    // Base styles
                    "w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl font-bangers font-bold",
                    "bg-slate-700/50 border-2 border-slate-600 text-white",
                    "rounded-lg transition-all duration-200",
                    "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500",
                    "hover:border-purple-400 hover:bg-slate-600/50",

                    // Active state (focused)
                    "data-[active=true]:border-purple-500 data-[active=true]:bg-slate-600/70",
                    "data-[active=true]:ring-2 data-[active=true]:ring-purple-500/50",
                    "data-[active=true]:shadow-lg data-[active=true]:shadow-purple-500/20",

                    // Error state
                    error && [
                      "border-red-500 bg-red-500/10",
                      "data-[active=true]:border-red-400 data-[active=true]:ring-red-400/50",
                      "hover:border-red-400",
                    ],

                    // Disabled state
                    disabled && [
                      "opacity-50 cursor-not-allowed",
                      "hover:border-slate-600 hover:bg-slate-700/50",
                    ],

                    // Animation for filled slots
                    value[index] &&
                      "scale-105 border-purple-400 bg-slate-600/70 shadow-md shadow-purple-500/10"
                  )}
                  aria-label={`Character ${index + 1} of invitation code`}
                  aria-describedby={`slot-${index}-description`}
                />
                <div id={`slot-${index}-description`} className="sr-only">
                  {value[index]
                    ? `Slot ${index + 1} contains: ${value[index]}`
                    : `Slot ${index + 1} is empty`}
                </div>

                {/* Success indicator for filled slots */}
                <AnimatePresence>
                  {value[index] && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
                      role="img"
                      aria-label="Character entered"
                      aria-hidden="true"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </InputOTPGroup>
        </InputOTP>
      </motion.div>

      {/* Helper text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={error ? "error" : "normal"}
          variants={errorVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            "text-xs sm:text-sm font-bangers tracking-wide transition-colors duration-200",
            error ? "text-red-400" : "text-purple-200/70",
            disabled && "opacity-50"
          )}
          id={error ? "otp-error-message" : undefined}
          role="status"
          aria-live="polite"
        >
          {error
            ? "Invalid invitation code"
            : "Enter 5-character invitation code"}
        </motion.p>
      </AnimatePresence>

      {/* Progress indicator for screen readers */}
      <div className="sr-only" aria-live="polite">
        {value.length === 0 && "No characters entered"}
        {value.length > 0 &&
          value.length < 5 &&
          `${value.length} of 5 characters entered`}
        {value.length === 5 && "All 5 characters entered"}
      </div>
    </motion.div>
  );
}
