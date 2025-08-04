"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SituationDisplayProps {
  situation: string;
  isLoading: boolean;
  error?: string | null;
  retryCount?: number;
  onRetry: () => void;
}

export function SituationDisplay({
  situation,
  isLoading,
  error,
  retryCount = 0,
  onRetry,
}: SituationDisplayProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto mb-6">
      <CardContent className="p-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
            Current Situation
          </h2>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>
                    Generating situation...
                    {retryCount > 0 && ` (Attempt ${retryCount + 1})`}
                  </span>
                </div>
                <div className="h-16 bg-muted/50 rounded-lg animate-pulse w-full" />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>Failed to generate situation</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="situation"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="text-2xl font-bold leading-relaxed text-foreground min-h-[4rem] flex items-center justify-center">
                  {situation}
                </div>
                <Button
                  onClick={onRetry}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                  aria-label="Generate new situation"
                >
                  <RefreshCw className="h-4 w-4" />
                  New Situation
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
