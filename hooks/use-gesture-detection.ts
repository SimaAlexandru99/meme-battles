import { useState, useRef, useCallback } from "react";

interface GestureState {
  isSwiping: boolean;
  isPinching: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startDistance: number;
  currentDistance: number;
}

interface GestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  onTap?: () => void;
  onLongPress?: () => void;
}

const SWIPE_THRESHOLD = 50;
const PINCH_THRESHOLD = 20;
const LONG_PRESS_DURATION = 500;

export function useGestureDetection(callbacks: GestureCallbacks = {}) {
  const [gestureState, setGestureState] = useState<GestureState>({
    isSwiping: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startDistance: 0,
    currentDistance: 0,
  });

  const longPressTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const touchStartTimeRef = useRef<number>(0);

  // Store callbacks in ref to avoid dependency issues
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const getDistance = useCallback((touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touches = e.touches;
      const touch = touches[0];

      setGestureState((prev) => ({
        ...prev,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startDistance:
          touches.length >= 2 ? getDistance(touches as React.TouchList) : 0,
        currentDistance:
          touches.length >= 2 ? getDistance(touches as React.TouchList) : 0,
      }));

      touchStartTimeRef.current = Date.now();

      // Start long press timer
      if (callbacksRef.current.onLongPress) {
        longPressTimeoutRef.current = setTimeout(() => {
          callbacksRef.current.onLongPress?.();
        }, LONG_PRESS_DURATION);
      }
    },
    [getDistance],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touches = e.touches;
      const touch = touches[0];

      // Clear long press timer if moving
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = undefined;
      }

      setGestureState((prev) => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY,
        currentDistance:
          touches.length >= 2
            ? getDistance(touches as React.TouchList)
            : prev.currentDistance,
        isSwiping: touches.length === 1,
        isPinching: touches.length === 2,
      }));
    },
    [getDistance],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      // Clear long press timer
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = undefined;
      }

      const touchDuration = Date.now() - touchStartTimeRef.current;
      const isQuickTap = touchDuration < 300;

      // Use functional update to get the latest state
      setGestureState((currentState) => {
        const {
          startX,
          startY,
          currentX,
          currentY,
          startDistance,
          currentDistance,
          isSwiping,
          isPinching,
        } = currentState;

        // Handle swipe gestures
        if (isSwiping) {
          const deltaX = currentX - startX;
          const deltaY = currentY - startY;
          const absDeltaX = Math.abs(deltaX);
          const absDeltaY = Math.abs(deltaY);

          if (absDeltaX > SWIPE_THRESHOLD || absDeltaY > SWIPE_THRESHOLD) {
            if (absDeltaX > absDeltaY) {
              // Horizontal swipe
              if (deltaX > 0) {
                callbacksRef.current.onSwipeRight?.();
              } else {
                callbacksRef.current.onSwipeLeft?.();
              }
            } else {
              // Vertical swipe
              if (deltaY > 0) {
                callbacksRef.current.onSwipeDown?.();
              } else {
                callbacksRef.current.onSwipeUp?.();
              }
            }
          } else if (isQuickTap) {
            // Quick tap
            callbacksRef.current.onTap?.();
          }
        }

        // Handle pinch gestures
        if (isPinching && startDistance > 0) {
          const deltaDistance = currentDistance - startDistance;
          if (Math.abs(deltaDistance) > PINCH_THRESHOLD) {
            if (deltaDistance > 0) {
              callbacksRef.current.onPinchOut?.();
            } else {
              callbacksRef.current.onPinchIn?.();
            }
          }
        }

        // Reset gesture state
        return {
          ...currentState,
          isSwiping: false,
          isPinching: false,
        };
      });
    },
    [], // No dependencies needed since we use refs and functional updates
  );

  return {
    gestureState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
