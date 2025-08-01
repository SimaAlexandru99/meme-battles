"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { RiRefreshLine, RiHomeLine, RiUserLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AuthErrorProps {
  error: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export function AuthError({
  error,
  onRetry,
  showHomeButton = true,
}: AuthErrorProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = React.useCallback(async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        // Default retry: reload the page
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error("Retry failed. Please try refreshing the page.");
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry]);

  const handleGoHome = React.useCallback(() => {
    router.push("/");
  }, [router]);

  const isAuthError =
    error.toLowerCase().includes("authentication") ||
    error.toLowerCase().includes("auth");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-xl tracking-wide text-center">
              {isAuthError ? "Authentication Issue" : "Connection Error"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <RiUserLine className="w-8 h-8 text-red-400" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-purple-200/70">
                {isAuthError
                  ? "There was an issue with your authentication. This can happen when you're logged in anonymously."
                  : "There was an issue connecting to the lobby."}
              </p>
              <p className="text-red-400 text-sm font-mono">{error}</p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <RiRefreshLine className="w-4 h-4 mr-2" />
                {isRetrying ? "Retrying..." : "Try Again"}
              </Button>

              {showHomeButton && (
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full border-slate-600/50 text-white hover:bg-slate-700/50"
                >
                  <RiHomeLine className="w-4 h-4 mr-2" />
                  Back to Main Menu
                </Button>
              )}
            </div>

            {isAuthError && (
              <div className="text-center">
                <p className="text-xs text-purple-200/50">
                  💡 Tip: If this keeps happening, try refreshing the page or
                  going back to the main menu.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
