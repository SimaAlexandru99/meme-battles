/**
 * Rate Limiting Service for Firebase Realtime Database
 *
 * This service provides client-side rate limiting utilities and interfaces
 * for Firebase Cloud Functions-based rate limiting if database rules are insufficient.
 */

import { ref, get, set } from "firebase/database";
import { rtdb } from "@/firebase/client";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  blocked?: boolean;
  blockExpiresAt?: number;
}

export interface RateLimitData {
  count: number;
  windowStart: number;
  lastRequest: number;
  blocked?: boolean;
  blockExpiresAt?: number;
}

/**
 * Rate limiting configurations for different operations
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  LOBBY_CREATION: {
    maxRequests: 5, // 5 lobbies per hour
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 10 * 60 * 1000, // 10 minutes block
  },
  CHAT_MESSAGES: {
    maxRequests: 30, // 30 messages per minute
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 2 * 60 * 1000, // 2 minutes block
  },
  SETTINGS_UPDATES: {
    maxRequests: 20, // 20 settings updates per minute
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes block
  },
  PLAYER_ACTIONS: {
    maxRequests: 100, // 100 actions per minute (join, leave, etc.)
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 1 * 60 * 1000, // 1 minute block
  },
};

/**
 * Client-side rate limiting service
 */
export class RateLimitingService {
  /**
   * Check if a user can perform an action based on rate limits
   */
  static async checkRateLimit(
    userId: string,
    action: keyof typeof RATE_LIMITS
  ): Promise<RateLimitResult> {
    const config = RATE_LIMITS[action];
    const now = Date.now();

    try {
      const rateLimitRef = ref(rtdb, `rateLimits/${userId}/${action}`);
      const snapshot = await get(rateLimitRef);

      let data: RateLimitData = snapshot.exists()
        ? snapshot.val()
        : {
            count: 0,
            windowStart: now,
            lastRequest: now,
          };

      // Check if currently blocked
      if (data.blocked && data.blockExpiresAt && now < data.blockExpiresAt) {
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: data.blockExpiresAt,
          blocked: true,
          blockExpiresAt: data.blockExpiresAt,
        };
      }

      // Reset window if expired
      if (now - data.windowStart > config.windowMs) {
        data = {
          count: 0,
          windowStart: now,
          lastRequest: now,
        };
      }

      // Check if limit exceeded
      if (data.count >= config.maxRequests) {
        const blockExpiresAt =
          now + (config.blockDurationMs || config.windowMs);

        // Update with block information
        await set(rateLimitRef, {
          ...data,
          blocked: true,
          blockExpiresAt,
          lastRequest: now,
        });

        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: data.windowStart + config.windowMs,
          blocked: true,
          blockExpiresAt,
        };
      }

      // Allow the request and increment counter
      const newData: RateLimitData = {
        count: data.count + 1,
        windowStart: data.windowStart,
        lastRequest: now,
      };

      await set(rateLimitRef, newData);

      return {
        allowed: true,
        remainingRequests: config.maxRequests - newData.count,
        resetTime: data.windowStart + config.windowMs,
      };
    } catch (error) {
      console.error("Rate limit check failed:", error);
      // Fail open - allow the request if rate limiting fails
      return {
        allowed: true,
        remainingRequests: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }
  }

  /**
   * Reset rate limit for a user and action (admin function)
   */
  static async resetRateLimit(
    userId: string,
    action: keyof typeof RATE_LIMITS
  ): Promise<void> {
    try {
      const rateLimitRef = ref(rtdb, `rateLimits/${userId}/${action}`);
      await set(rateLimitRef, null);
    } catch (error) {
      console.error("Failed to reset rate limit:", error);
      throw new Error("Failed to reset rate limit");
    }
  }

  /**
   * Get current rate limit status for a user and action
   */
  static async getRateLimitStatus(
    userId: string,
    action: keyof typeof RATE_LIMITS
  ): Promise<RateLimitResult> {
    const config = RATE_LIMITS[action];
    const now = Date.now();

    try {
      const rateLimitRef = ref(rtdb, `rateLimits/${userId}/${action}`);
      const snapshot = await get(rateLimitRef);

      if (!snapshot.exists()) {
        return {
          allowed: true,
          remainingRequests: config.maxRequests,
          resetTime: now + config.windowMs,
        };
      }

      const data: RateLimitData = snapshot.val();

      // Check if currently blocked
      if (data.blocked && data.blockExpiresAt && now < data.blockExpiresAt) {
        return {
          allowed: false,
          remainingRequests: 0,
          resetTime: data.blockExpiresAt,
          blocked: true,
          blockExpiresAt: data.blockExpiresAt,
        };
      }

      // Check if window has expired
      if (now - data.windowStart > config.windowMs) {
        return {
          allowed: true,
          remainingRequests: config.maxRequests,
          resetTime: now + config.windowMs,
        };
      }

      return {
        allowed: data.count < config.maxRequests,
        remainingRequests: Math.max(0, config.maxRequests - data.count),
        resetTime: data.windowStart + config.windowMs,
      };
    } catch (error) {
      console.error("Failed to get rate limit status:", error);
      return {
        allowed: true,
        remainingRequests: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }
  }
}

/**
 * Utility function to format rate limit error messages
 */
export function formatRateLimitError(
  result: RateLimitResult,
  action: string
): string {
  if (result.blocked && result.blockExpiresAt) {
    const timeRemaining = Math.ceil(
      (result.blockExpiresAt - Date.now()) / 1000
    );
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    if (minutes > 0) {
      return `Too many ${action} attempts. Please wait ${minutes}m ${seconds}s before trying again.`;
    } else {
      return `Too many ${action} attempts. Please wait ${seconds}s before trying again.`;
    }
  }

  const timeRemaining = Math.ceil((result.resetTime - Date.now()) / 1000);
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  if (minutes > 0) {
    return `Rate limit exceeded for ${action}. Limit resets in ${minutes}m ${seconds}s.`;
  } else {
    return `Rate limit exceeded for ${action}. Limit resets in ${seconds}s.`;
  }
}

/**
 * Higher-order function to wrap service methods with rate limiting
 */
export function withRateLimit<T extends unknown[], R>(
  action: keyof typeof RATE_LIMITS,
  fn: (...args: T) => Promise<R>
) {
  return async function rateLimitedFunction(
    userId: string,
    ...args: T
  ): Promise<R> {
    const rateLimitResult = await RateLimitingService.checkRateLimit(
      userId,
      action
    );

    if (!rateLimitResult.allowed) {
      const errorMessage = formatRateLimitError(rateLimitResult, action);
      throw new Error(errorMessage);
    }

    return fn(...args);
  };
}
