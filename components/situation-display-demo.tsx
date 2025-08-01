"use client";

import { useEffect } from "react";
import { SituationDisplay } from "@/components/situation-display";
import { useSituationGeneration } from "@/hooks/useSituationGeneration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SituationDisplayDemo() {
  const { situation, isLoading, error, generateSituation, retry, retryCount } =
    useSituationGeneration();

  // Generate initial situation on mount
  useEffect(() => {
    generateSituation();
  }, [generateSituation]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Situation Generation Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            This demonstrates the AI situation generation system for Meme
            Battles. The system generates humorous, relatable situations that
            players can respond to with memes.
          </p>

          <SituationDisplay
            situation={situation}
            isLoading={isLoading}
            error={error}
            retryCount={retryCount}
            onRetry={retry}
          />

          <div className="flex justify-center mt-6">
            <Button
              onClick={generateSituation}
              disabled={isLoading}
              variant="default"
            >
              Generate New Situation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Features Implemented</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✅ AI-powered situation generation using Vercel AI SDK</li>
            <li>
              ✅ Loading states with animated spinner and retry indicators
            </li>
            <li>
              ✅ Error handling with automatic retry mechanism (exponential
              backoff)
            </li>
            <li>✅ Request cancellation to prevent race conditions</li>
            <li>✅ Smooth transition animations between states</li>
            <li>✅ Responsive design for mobile and desktop</li>
            <li>✅ Accessibility features with proper ARIA labels</li>
            <li>✅ Manual refresh option for new situations</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
