/**
 * Rate Limiting Service for Firebase Realtime Database
 *
 * This service provides client-side rate-limiting utilities and interfaces
 * for Firebase Cloud Functions-based rate limiting if database rules are not enough.
 */

import { get, ref, set } from "firebase/database";
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
    blockDurationMs: 10 * 60 * 1000, // 10-minute block
  },
  CHAT_MESSAGES: {
    maxRequests: 30, // 30 messages per minute
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 2 * 60 * 1000, // 2-minute block
  },
  SETTINGS_UPDATES: {
    maxRequests: 20, // 20 settings updates per minute
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5-minute block
  },
  PLAYER_ACTIONS: {
    maxRequests: 100, // 100 actions per minute (join, leave, etc.)
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 60 * 1000, // 1-minute block
  },
};

/**
 * Client-side rate limiting service
 */

/**
 * Check if a user can perform an action based on rate limits
 */
export async function checkRateLimit(
  userId: string,
  action: keyof typeof RATE_LIMITS,
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
      const blockExpiresAt = now + (config.blockDurationMs || config.windowMs);

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
