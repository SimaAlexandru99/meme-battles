import { useCallback, useState, useEffect } from "react";
import { useDebounce } from "react-haiku";
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [displayName, setDisplayName] = useState("");

  // Use Haiku's useDebounce for automatic debouncing
  const debouncedDisplayName = useDebounce(displayName, delay);

  // Handle the actual API call when debounced value changes
  const handleDebouncedUpdate = useCallback(
    async (debouncedValue: string) => {
      if (!debouncedValue.trim()) return;

      setIsUpdating(true);
      try {
        const result = await updateUserDisplayName(debouncedValue);
        if (result.success) {
          console.log("Display name updated:", debouncedValue);
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
    },
    [refreshUser],
  );

  // Effect to trigger update when debounced value changes
  useEffect(() => {
    if (debouncedDisplayName && debouncedDisplayName.trim()) {
      handleDebouncedUpdate(debouncedDisplayName);
    }
  }, [debouncedDisplayName, handleDebouncedUpdate]);

  const updateDisplayName = useCallback((newDisplayName: string) => {
    setDisplayName(newDisplayName);
  }, []);

  return { updateDisplayName, isUpdating };
}
