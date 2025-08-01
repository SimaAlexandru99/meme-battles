"use client";

import { useEffect, useCallback } from "react";

interface UseUnsavedChangesProps {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChanges({
  hasUnsavedChanges,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UseUnsavedChangesProps) {
  // Warn user about unsaved changes when they try to leave the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

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
