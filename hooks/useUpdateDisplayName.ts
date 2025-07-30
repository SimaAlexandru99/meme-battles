import { useCallback, useRef, useState } from "react";
import { updateUserDisplayName } from "@/lib/actions/auth.action";

/**
 * Custom hook to handle display name updates with debouncing
 * @param delay - Debounce delay in milliseconds (default: 1000ms)
 * @param refreshUser - Optional function to refresh user data after update
 * @returns Object with update function and loading state
 */
export function useUpdateDisplayName(
  delay: number = 1000,
  refreshUser?: () => void,
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateDisplayName = useCallback(
    async (newDisplayName: string) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setIsUpdating(true);

      // Set new timeout for debounced update
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await updateUserDisplayName(newDisplayName);
          if (result.success) {
            console.log("Display name updated:", newDisplayName);
            // Refresh user data to update SWR cache
            refreshUser?.();
          } else {
            console.error("Failed to update display name:", result.message);
          }
        } catch (error) {
          console.error("Error updating display name:", error);
        } finally {
          setIsUpdating(false);
        }
      }, delay);
    },
    [delay, refreshUser],
  );

  return { updateDisplayName, isUpdating };
}
