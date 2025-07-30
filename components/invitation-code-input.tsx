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
  const handleChange = React.useCallback(
    (newValue: string) => {
      // Only allow alphanumeric characters
      const sanitizedValue = newValue
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
      onChange(sanitizedValue);

      // Auto-complete when 5 characters are entered
      if (sanitizedValue.length === 5) {
        onComplete(sanitizedValue);
      }
    },
    [onChange, onComplete]
  );

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const sanitizedText = pastedText
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 5);

      if (sanitizedText.length > 0) {
        onChange(sanitizedText);
        if (sanitizedText.length === 5) {
          onComplete(sanitizedText);
        }
      }
    },
    [onChange, onComplete]
  );

  return (
    <motion.div
      className={cn("flex flex-col items-center gap-2", className)}
      variants={microInteractionVariants}
    >
      <motion.div
        variants={inputVariants}
        initial="initial"
        animate={error ? "error" : "initial"}
        whileFocus="focus"
        className="w-full"
      >
        <InputOTP
          maxLength={5}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          onPaste={handlePaste}
          className={cn("gap-2 sm:gap-3", error && "aria-invalid:true")}
          containerClassName="flex items-center justify-center"
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
                />
                {/* Success indicator for filled slots */}
                <AnimatePresence>
                  {value[index] && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
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
        >
          {error
            ? "Invalid invitation code"
            : "Enter 5-character invitation code"}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}
