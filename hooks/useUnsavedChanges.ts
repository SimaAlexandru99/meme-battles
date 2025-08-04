"use client";

import { useCallback } from "react";
import { useEventListener } from "react-haiku";

interface UseUnsavedChangesProps {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChanges({
  hasUnsavedChanges,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UseUnsavedChangesProps) {
  // Warn user about unsaved changes when they try to leave the page
  useEventListener("beforeunload", (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = message;
      return message;
    }
  });

  // Function to show confirmation dialog for programmatic navigation
  const confirmNavigation = useCallback(
    (callback?: () => void): boolean => {
      if (!hasUnsavedChanges) {
        callback?.();
        return true;
      }

      const confirmed = window.confirm(message);
      if (confirmed) {
        callback?.();
      }
      return confirmed;
    },
    [hasUnsavedChanges, message],
  );

  return {
    confirmNavigation,
    hasUnsavedChanges,
  };
}
