"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, X } from "lucide-react";
import { GameSettingsValidationErrors } from "./types";

interface FormErrorDisplayProps {
  errors: GameSettingsValidationErrors;
  onDismiss?: () => void;
  className?: string;
}

export function FormErrorDisplay({
  errors,
  onDismiss,
  className,
}: FormErrorDisplayProps) {
  const errorMessages = Object.values(errors).filter(Boolean);

  if (errorMessages.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-red-500/50 bg-red-500/10 p-4",
        "animate-in slide-in-from-top-2 duration-300",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-300 font-bangers tracking-wide mb-2">
            Please fix the following errors:
          </h3>

          <ul className="space-y-1">
            {errorMessages.map((error, index) => (
              <li
                key={index}
                className="text-sm text-red-200 font-bangers tracking-wide flex items-start gap-2"
              >
                <span className="text-red-400 mt-1">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              "flex-shrink-0 p-1 rounded-md text-red-400 hover:text-red-300",
              "hover:bg-red-500/20 transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-red-500/50"
            )}
            aria-label="Dismiss errors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) {
    return null;
  }

  return (
    <p
      className={cn(
        "text-sm text-red-400 font-bangers tracking-wide",
        "animate-in slide-in-from-top-1 duration-200",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {error}
    </p>
  );
}

interface FormSuccessDisplayProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function FormSuccessDisplay({
  message,
  onDismiss,
  className,
}: FormSuccessDisplayProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-green-500/50 bg-green-500/10 p-4",
        "animate-in slide-in-from-top-2 duration-300",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5">✓</div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-green-200 font-bangers tracking-wide">
            {message}
          </p>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              "flex-shrink-0 p-1 rounded-md text-green-400 hover:text-green-300",
              "hover:bg-green-500/20 transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-green-500/50"
            )}
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
