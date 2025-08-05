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
