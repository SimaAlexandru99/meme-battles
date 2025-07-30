import { useReducer, useCallback, useEffect, useRef } from "react";
import { generateGuestDisplayName } from "@/firebase/client";
import { useUpdateDisplayName } from "@/hooks/useUpdateDisplayName";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const initialState: AvatarState = {
  nickname: "MemeLord",
  currentAvatar: "evil-doge",
  profileURL: undefined,
  isLoading: true,
};

function avatarReducer(state: AvatarState, action: AvatarAction): AvatarState {
  switch (action.type) {
    case "SET_NICKNAME":
      return { ...state, nickname: action.payload };
    case "SET_CURRENT_AVATAR":
      return { ...state, currentAvatar: action.payload };
    case "SET_PROFILE_URL":
      return { ...state, profileURL: action.payload };
    case "SET_IS_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function useAvatarSetup(initialUserData?: User | null) {
  const [state, dispatch] = useReducer(avatarReducer, initialState);
  const prevUserRef = useRef<{
    name?: string;
    avatarId?: string;
    profileURL?: string;
  } | null>(null);
  const refreshUserRef = useRef<(() => void) | null>(null);

  const {
    user,
    refresh: refreshUser,
    isError,
    error,
  } = useCurrentUser(initialUserData);
  const { updateDisplayName, isUpdating } = useUpdateDisplayName(
    1500,
    refreshUser,
  );
  const { updateAvatar, isUpdatingAvatar } = useUpdateProfile();

  // Store refreshUser in ref to avoid dependency issues
  refreshUserRef.current = refreshUser;

  useEffect(() => {
    if (isError) {
      console.error("Error loading user data:", error);
    }
  }, [isError, error]);

  // Handle user data updates
  useEffect(() => {
    if (user) {
      const prevUser = prevUserRef.current;

      if (user.name && user.name !== prevUser?.name) {
        dispatch({ type: "SET_NICKNAME", payload: user.name });
      }
      if (user.avatarId && user.avatarId !== prevUser?.avatarId) {
        dispatch({ type: "SET_CURRENT_AVATAR", payload: user.avatarId });
      }
      if (user.profileURL !== prevUser?.profileURL) {
        dispatch({ type: "SET_PROFILE_URL", payload: user.profileURL });
      }

      // Update the ref with current user data
      prevUserRef.current = {
        name: user.name,
        avatarId: user.avatarId,
        profileURL: user.profileURL,
      };
    }
    dispatch({ type: "SET_IS_LOADING", payload: false });
  }, [user]);

  // Handle event listeners and intervals separately
  useEffect(() => {
    const handleUserSetupComplete = () => {
      console.log("User setup completed, refreshing avatar setup data...");
      if (refreshUserRef.current) {
        refreshUserRef.current();
      }
    };

    window.addEventListener("userSetupComplete", handleUserSetupComplete);

    const refreshInterval = setInterval(() => {
      if (refreshUserRef.current) {
        refreshUserRef.current();
      }
    }, 300000);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener("userSetupComplete", handleUserSetupComplete);
    };
  }, []); // Empty dependency array since we use refs

  const generateRandomName = useCallback(() => {
    const newName = generateGuestDisplayName();
    dispatch({ type: "SET_NICKNAME", payload: newName });
    updateDisplayName(newName);
  }, [updateDisplayName]);

  const handleNicknameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      dispatch({ type: "SET_NICKNAME", payload: value });
      if (value.trim()) {
        updateDisplayName(value.trim());
      }
    },
    [updateDisplayName],
  );

  const handleAvatarChange = useCallback(
    async (avatarId: string, avatarSrc: string) => {
      try {
        const result = await updateAvatar(avatarId, avatarSrc);
        if (result.success) {
          dispatch({ type: "SET_CURRENT_AVATAR", payload: avatarId });
          dispatch({ type: "SET_PROFILE_URL", payload: avatarSrc });
          refreshUser();
        } else {
          throw new Error(result.error || "Failed to update avatar");
        }
      } catch (error) {
        console.error("Error updating avatar:", error);
        throw error;
      }
    },
    [refreshUser, updateAvatar],
  );

  return {
    ...state,
    isUpdating,
    isUpdatingAvatar,
    generateRandomName,
    handleNicknameChange,
    handleAvatarChange,
  };
}
