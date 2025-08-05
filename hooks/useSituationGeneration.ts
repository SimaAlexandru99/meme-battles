import { useState, useCallback } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

interface UseSituationGenerationReturn {
  generateSituation: () => Promise<string | null>;
  isGenerating: boolean;
  lastSituation: string | null;
}

export function useSituationGeneration(): UseSituationGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSituation, setLastSituation] = useState<string | null>(null);

  const generateSituation = useCallback(async (): Promise<string | null> => {
    setIsGenerating(true);

    return Sentry.startSpan(
      {
        op: "http.client",
        name: "POST /api/situation",
      },
      async (span) => {
        try {
          const response = await fetch("/api/situation", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.error) {
            throw new Error(data.error);
          }

          const situation = data.situation;
          setLastSituation(situation);

          span.setAttribute("situation_length", situation.length);
          span.setAttribute("success", true);

          return situation;
        } catch (error) {
          console.error("Error generating situation:", error);
          Sentry.captureException(error);
          toast.error(
            "Failed to generate new situation. Using fallback prompt.",
          );

          // Fallback to a default prompt if API fails
          const fallbackPrompts = [
            "When you realize it's Monday tomorrow",
            "Trying to explain cryptocurrency to your parents",
            "When the wifi goes down during an important meeting",
            "Your reaction when someone spoils a movie",
            "When you find out pineapple pizza is actually good",
          ];

          const fallback =
            fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
          setLastSituation(fallback);

          span.setAttribute("fallback_used", true);
          span.setAttribute("success", false);

          return fallback;
        } finally {
          setIsGenerating(false);
        }
      },
    );
  }, []);

  return {
    generateSituation,
    isGenerating,
    lastSituation,
  };
}
