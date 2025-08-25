"use client";

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  errorVariants,
  inputVariants,
  microInteractionVariants,
} from "@/lib/animations/private-lobby-variants";
import { cn } from "@/lib/utils";

interface InvitationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

// Enhanced normalization function with better validation
const normalizeInvitationCode = (value: string): string => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
};

// Validate invitation code format
const validateInvitationCodeFormat = (
  value: string,
): { isValid: boolean; error?: string } => {
  if (value.length === 0) {
    return { isValid: true }; // Empty is valid (not complete)
  }

  if (value.length < 5) {
    return { isValid: true }; // Partial input is valid
  }

  if (value.length === 5) {
    if (!/^[A-Z0-9]{5}$/.test(value)) {
      return {
        isValid: false,
        error: "Code must contain only letters and numbers",
      };
    }
    return { isValid: true };
  }

  return { isValid: false, error: "Code must be exactly 5 characters" };
};

export function InvitationCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  className,
}: InvitationCodeInputProps) {
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);

  const handleChange = React.useCallback(
    (newValue: string) => {
      const normalizedValue = normalizeInvitationCode(newValue);
      const validation = validateInvitationCodeFormat(normalizedValue);

      // Update local error state
      setLocalError(validation.error || null);

      onChange(normalizedValue);

      // Auto-complete when 5 characters are entered and valid
      if (normalizedValue.length === 5 && validation.isValid) {
        onComplete(normalizedValue);
      }
    },
    [onChange, onComplete],
  );

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const normalizedText = normalizeInvitationCode(pastedText).slice(0, 5);
      const validation = validateInvitationCodeFormat(normalizedText);

      if (normalizedText.length > 0) {
        setLocalError(validation.error || null);
        onChange(normalizedText);
        if (normalizedText.length === 5 && validation.isValid) {
          onComplete(normalizedText);
        }
      }
    },
    [onChange, onComplete],
  );

  const handleFocus = React.useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = React.useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <motion.fieldset
      className={cn("flex flex-col items-center gap-2", className)}
      variants={microInteractionVariants}
      aria-labelledby="otp-input-label"
      aria-describedby="otp-input-description"
    >
      <div id="otp-input-label" className="sr-only">
        Invitation code input field
      </div>
      <div id="otp-input-description" className="sr-only">
        Enter a 5-character alphanumeric invitation code. Use arrow keys to
        navigate between fields.
      </div>

      <motion.fieldset
        variants={inputVariants}
        initial="initial"
        animate={error ? "error" : "initial"}
        whileFocus="focus"
        className="w-full box-shado"
        aria-label="Invitation code input"
        aria-describedby={error ? "otp-error-message" : undefined}
      >
        <InputOTP
          maxLength={5}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          onPaste={handlePaste}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "gap-2 sm:gap-3",
            // aria-invalid attribute is applied via props on slots when needed.
          )}
          containerClassName="flex items-center justify-center"
          aria-label="Enter 5-character invitation code"
          aria-describedby={
            error || localError ? "otp-error-message" : "otp-input-description"
          }
        >
          <InputOTPGroup className="gap-2 sm:gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <motion.div
                key={`otp-slot-${index}-${value[index]}`}
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
                    (error || localError) && [
                      "border-red-500 bg-red-500/10",
                      "data-[active=true]:border-red-400 data-[active=true]:ring-red-400/50",
                      "hover:border-red-400",
                    ],

                    // Focus state enhancement
                    isFocused && [
                      "ring-2 ring-purple-500/30",
                      "shadow-lg shadow-purple-500/20",
                    ],

                    // Disabled state
                    disabled && [
                      "opacity-50 cursor-not-allowed",
                      "hover:border-slate-600 hover:bg-slate-700/50",
                    ],

                    // Animation for filled slots
                    value[index] &&
                      "scale-105 border-purple-400 bg-slate-600/70 shadow-md shadow-purple-500/10",
                  )}
                  aria-label={`Character ${index + 1} of invitation code`}
                  aria-describedby={`slot-${index}-description`}
                />
                <div id={`slot-${index}-description`} className="sr-only">
                  {value[index]
                    ? `Slot ${index + 1} contains: ${value[index]}`
                    : `Slot ${index + 1} is empty`}
                </div>

                {/* Success indicator for filled slots (hidden during error) */}
                <AnimatePresence>
                  {value[index] && !error && !localError && (
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
      </motion.fieldset>

      {/* Helper text */}
      <AnimatePresence mode="wait">
        <motion.output
          key={error || localError ? "error" : "normal"}
          variants={errorVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            "text-xs sm:text-sm font-bangers tracking-wide transition-colors duration-200",
            error || localError ? "text-red-400" : "text-purple-200/70",
            disabled && "opacity-50",
          )}
          id={error || localError ? "otp-error-message" : undefined}
          aria-live="polite"
        >
          {error
            ? "Invalid invitation code"
            : localError
              ? localError
              : value.length === 5
                ? "Code complete - ready to join!"
                : "Enter 5-character invitation code"}
        </motion.output>
      </AnimatePresence>

      {/* Progress indicator for screen readers */}
      <div className="sr-only" aria-live="polite">
        {value.length === 0 && "No characters entered"}
        {value.length > 0 &&
          value.length < 5 &&
          `${value.length} of 5 characters entered`}
        {value.length === 5 && "All 5 characters entered"}
      </div>
    </motion.fieldset>
  );
}
