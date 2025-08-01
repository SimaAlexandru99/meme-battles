"use client";

import { useState, useCallback, useRef } from "react";
import { SituationService } from "@/lib/services/situation-service";

interface UseSituationGenerationReturn {
  situation: string;
  isLoading: boolean;
  error: string | null;
  generateSituation: () => Promise<void>;
  retry: () => void;
  retryCount: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

export function useSituationGeneration(): UseSituationGenerationReturn {
  const [situation, setSituation] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateSituation = useCallback(async (attemptNumber = 0) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const newSituation = await SituationService.generateSituation(
        abortControllerRef.current.signal
      );

      // Validate the generated situation
      if (!SituationService.validateSituation(newSituation)) {
        throw new Error("Generated situation failed quality validation");
      }

      setSituation(newSituation);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      // Don't handle aborted requests as errors
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";

      // Auto-retry with exponential backoff
      if (attemptNumber < MAX_RETRIES) {
        const delay =
          RETRY_DELAYS[attemptNumber] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        setRetryCount(attemptNumber + 1);

        setTimeout(() => {
          generateSituation(attemptNumber + 1);
        }, delay);

        return;
      }

      // Max retries reached
      setError(`${errorMessage} (Failed after ${MAX_RETRIES + 1} attempts)`);
      setRetryCount(attemptNumber);
      console.error("Failed to generate situation after retries:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    setRetryCount(0);
    generateSituation();
  }, [generateSituation]);

  return {
    situation,
    isLoading,
    error,
    generateSituation,
    retry,
    retryCount,
  };
}
