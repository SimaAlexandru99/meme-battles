import { useState, useCallback, useRef } from "react";

export type ViewState =
  | "main"
  | "transitioning-out"
  | "private-lobby"
  | "transitioning-in";

export interface ViewTransitionState {
  currentView: ViewState;
  isAnimating: boolean;
  animationPhase: "idle" | "exit" | "enter" | "complete";
}

const initialState: ViewTransitionState = {
  currentView: "main",
  isAnimating: false,
  animationPhase: "idle",
};

export function useViewTransition() {
  const [state, setState] = useState<ViewTransitionState>(initialState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const transitionToPrivateLobby = useCallback(() => {
    if (state.isAnimating) return;

    setState((prev) => ({
      ...prev,
      currentView: "transitioning-out",
      isAnimating: true,
      animationPhase: "exit",
    }));

    // After exit animation completes, show private lobby
    timeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        currentView: "private-lobby",
        animationPhase: "enter",
      }));

      // After enter animation completes, mark as complete
      timeoutRef.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isAnimating: false,
          animationPhase: "complete",
        }));
      }, 800); // Duration of enter animation
    }, 600); // Duration of exit animation
  }, [state.isAnimating]);

  const transitionToMain = useCallback(() => {
    if (state.isAnimating) return;

    setState((prev) => ({
      ...prev,
      currentView: "transitioning-in",
      isAnimating: true,
      animationPhase: "exit",
    }));

    // After exit animation completes, show main view
    timeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        currentView: "main",
        animationPhase: "enter",
      }));

      // After enter animation completes, mark as complete
      timeoutRef.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isAnimating: false,
          animationPhase: "complete",
        }));
      }, 600); // Duration of enter animation
    }, 400); // Duration of exit animation
  }, [state.isAnimating]);

  const resetTransition = useCallback(() => {
    clearTimeoutRef();
    setState(initialState);
  }, [clearTimeoutRef]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    clearTimeoutRef();
  }, [clearTimeoutRef]);

  return {
    ...state,
    transitionToPrivateLobby,
    transitionToMain,
    resetTransition,
    cleanup,
  };
}
