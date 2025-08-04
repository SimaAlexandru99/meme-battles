import { useReducer, useCallback, useEffect, useRef } from "react";
import { generateGuestDisplayName } from "@/firebase/client";
import { useUpdateDisplayName } from "@/hooks/useUpdateDisplayName";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEventListener, useInterval } from "react-haiku";
import * as Sentry from "@sentry/nextjs";

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
    case "UPDATE_USER_DATA":
      return {
        ...state,
        nickname: action.payload.name || state.nickname,
        currentAvatar: action.payload.avatarId || state.currentAvatar,
        profileURL: action.payload.profileURL,
        isLoading: false,
      };
    case "RESET_STATE":
      return { ...initialState, isLoading: false };
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

  // Consolidated effect for user data updates and error handling
  useEffect(() => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Avatar Setup User Data Update",
      },
      () => {
        // Handle errors
        if (isError) {
          console.error("Error loading user data:", error);
          Sentry.captureException(error);
        }

        // Handle user data updates
        if (user) {
          const prevUser = prevUserRef.current;
          const hasChanges =
            user.name !== prevUser?.name ||
            user.avatarId !== prevUser?.avatarId ||
            user.profileURL !== prevUser?.profileURL;

          if (hasChanges) {
            dispatch({
              type: "UPDATE_USER_DATA",
              payload: {
                name: user.name,
                avatarId: user.avatarId,
                profileURL: user.profileURL,
              },
            });

            // Update the ref with current user data
            prevUserRef.current = {
              name: user.name,
              avatarId: user.avatarId,
              profileURL: user.profileURL,
            };
          }
        } else {
          // Reset state when no user
          dispatch({ type: "RESET_STATE" });
        }
      },
    );
  }, [user, isError, error]);

  // Use Haiku's useEventListener for user setup complete event
  useEventListener("userSetupComplete", () => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "User Setup Complete Handler",
      },
      () => {
        console.log("User setup completed, refreshing avatar setup data...");
        if (refreshUserRef.current) {
          refreshUserRef.current();
        }
      },
    );
  });

  // Use Haiku's useInterval for refresh interval
  useInterval(() => {
    if (refreshUserRef.current) {
      refreshUserRef.current();
    }
  }, 300000); // 5 minutes

  const generateRandomName = useCallback(() => {
    return Sentry.startSpan(
      {
        op: "ui.action",
        name: "Generate Random Name",
      },
      () => {
        const newName = generateGuestDisplayName();
        dispatch({ type: "SET_NICKNAME", payload: newName });
        updateDisplayName(newName);
      },
    );
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
      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Handle Avatar Change",
        },
        async (span) => {
          span.setAttribute("avatar.id", avatarId);
          span.setAttribute("avatar.src", avatarSrc);

          try {
            const result = await updateAvatar(avatarId, avatarSrc);
            if (result.success) {
              dispatch({ type: "SET_CURRENT_AVATAR", payload: avatarId });
              dispatch({ type: "SET_PROFILE_URL", payload: avatarSrc });
              refreshUser();
              span.setAttribute("avatar.update.success", true);
            } else {
              throw new Error(result.error || "Failed to update avatar");
            }
          } catch (error) {
            span.setAttribute("avatar.update.success", false);
            Sentry.captureException(error);
            console.error("Error updating avatar:", error);
            throw error;
          }
        },
      );
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
