import { useCallback, useState } from "react";
import { updateUserProfile } from "@/lib/actions/auth.action";

/**
 * Custom hook to handle profile updates (avatar, display name, etc.)
 * @returns Object with update functions and loading states
 */
export function useUpdateProfile() {
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  const updateAvatar = useCallback(
    async (avatarId: string, avatarSrc: string) => {
      setIsUpdatingAvatar(true);
      try {
        const result = await updateUserProfile({
          profileURL: avatarSrc,
          avatarId,
        });

        if (result.success) {
          console.log("Avatar updated:", avatarId);
          return { success: true };
        } else {
          console.error("Failed to update avatar:", result.message);
          return { success: false, error: result.message };
        }
      } catch (error) {
        console.error("Error updating avatar:", error);
        return { success: false, error: "Failed to update avatar" };
      } finally {
        setIsUpdatingAvatar(false);
      }
    },
    [],
  );

  const updateDisplayName = useCallback(async (displayName: string) => {
    setIsUpdatingName(true);
    try {
      const result = await updateUserProfile({ name: displayName });

      if (result.success) {
        console.log("Display name updated:", displayName);
        return { success: true };
      } else {
        console.error("Failed to update display name:", result.message);
        return { success: false, error: result.message };
      }
    } catch (error) {
      console.error("Error updating display name:", error);
      return { success: false, error: "Failed to update display name" };
    } finally {
      setIsUpdatingName(false);
    }
  }, []);

  const updateFullProfile = useCallback(
    async (updates: {
      name?: string;
      profileURL?: string;
      avatarId?: string;
    }) => {
      const isUpdating = Object.keys(updates).length > 0;
      if (!isUpdating) return { success: false, error: "No updates provided" };

      if (updates.profileURL || updates.avatarId) setIsUpdatingAvatar(true);
      if (updates.name) setIsUpdatingName(true);

      try {
        const result = await updateUserProfile(updates);

        if (result.success) {
          console.log("Profile updated:", updates);
          return { success: true };
        } else {
          console.error("Failed to update profile:", result.message);
          return { success: false, error: result.message };
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: "Failed to update profile" };
      } finally {
        setIsUpdatingAvatar(false);
        setIsUpdatingName(false);
      }
    },
    [],
  );

  return {
    updateAvatar,
    updateDisplayName,
    updateFullProfile,
    isUpdatingAvatar,
    isUpdatingName,
    isUpdating: isUpdatingAvatar || isUpdatingName,
  };
}
