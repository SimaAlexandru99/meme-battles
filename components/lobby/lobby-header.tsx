"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { RiArrowLeftLine, RiFileCopyLine, RiShareLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

interface LobbyHeaderProps {
  lobbyCode: string;
  playerCount: number;
  maxPlayers: number;
  connectionStatus:
    | "connected"
    | "connecting"
    | "disconnected"
    | "reconnecting";
  className?: string;
}

/**
 * Lobby header component with navigation, lobby code display, and connection status
 */
export function LobbyHeader({
  lobbyCode,
  playerCount,
  maxPlayers,
  connectionStatus,
  className,
}: LobbyHeaderProps) {
  const router = useRouter();

  /**
   * Handle back navigation
   */
  const handleBackToMain = React.useCallback(() => {
    router.push("/");
  }, [router]);

  /**
   * Copy lobby code to clipboard
   */
  const handleCopyCode = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(lobbyCode);
      toast.success("Lobby code copied to clipboard!");

      Sentry.addBreadcrumb({
        message: "Lobby code copied",
        data: { lobbyCode },
        level: "info",
      });
    } catch (error) {
      console.error("Failed to copy lobby code:", error);
      toast.error("Failed to copy lobby code");
      Sentry.captureException(error);
    }
  }, [lobbyCode]);

  /**
   * Share lobby link
   */
  const handleShareLink = React.useCallback(async () => {
    const shareUrl = `${window.location.origin}/game/${lobbyCode}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join my Meme Battle lobby!",
          text: `Join my private meme battle lobby! Code: ${lobbyCode}`,
          url: shareUrl,
        });

        Sentry.addBreadcrumb({
          message: "Lobby link shared via native share",
          data: { lobbyCode },
          level: "info",
        });
      } else {
        // Fallback to copying link
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Lobby link copied to clipboard!");

        Sentry.addBreadcrumb({
          message: "Lobby link copied as fallback",
          data: { lobbyCode },
          level: "info",
        });
      }
    } catch (error) {
      console.error("Failed to share lobby link:", error);
      toast.error("Failed to share lobby link");
      Sentry.captureException(error);
    }
  }, [lobbyCode]);

  /**
   * Get connection status display properties
   */
  const getConnectionStatusProps = React.useCallback(() => {
    switch (connectionStatus) {
      case "connected":
        return {
          className: "bg-green-500/20 text-green-400 border-green-500/30",
          text: "Online",
          indicator: "bg-green-400",
          animate: { scale: [1, 1.2, 1] },
        };
      case "connecting":
        return {
          className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
          text: "Connecting",
          indicator: "bg-yellow-400",
          animate: { opacity: [1, 0.5, 1] },
        };
      case "reconnecting":
        return {
          className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
          text: "Reconnecting",
          indicator: "bg-orange-400",
          animate: { opacity: [1, 0.5, 1] },
        };
      case "disconnected":
        return {
          className: "bg-red-500/20 text-red-400 border-red-500/30",
          text: "Offline",
          indicator: "bg-red-400",
          animate: {},
        };
      default:
        return {
          className: "bg-gray-500/20 text-gray-400 border-gray-500/30",
          text: "Unknown",
          indicator: "bg-gray-400",
          animate: {},
        };
    }
  }, [connectionStatus]);

  const statusProps = getConnectionStatusProps();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "sticky top-0 z-20 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50",
        className
      )}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              onClick={handleBackToMain}
              variant="ghost"
              className="text-white hover:bg-slate-800/50 font-bangers tracking-wide h-10 sm:h-11"
              aria-label="Go back to main menu"
            >
              <RiArrowLeftLine className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </motion.div>

          {/* Center - Lobby Info */}
          <motion.div
            className="flex-1 text-center min-w-0"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bangers text-white tracking-wide">
              Game Lobby
            </h1>

            {/* Lobby Code Display */}
            <div className="flex items-center justify-center gap-2 mt-1">
              <motion.button
                onClick={handleCopyCode}
                className="group flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Copy lobby code ${lobbyCode}`}
              >
                <code className="text-sm sm:text-base font-mono text-purple-200 tracking-widest">
                  {lobbyCode}
                </code>
                <RiFileCopyLine className="w-3 h-3 sm:w-4 sm:h-4 text-purple-300 group-hover:text-purple-200 transition-colors" />
              </motion.button>

              <motion.button
                onClick={handleShareLink}
                className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700/70 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Share lobby link"
              >
                <RiShareLine className="w-3 h-3 sm:w-4 sm:h-4 text-purple-300 hover:text-purple-200 transition-colors" />
              </motion.button>
            </div>
          </motion.div>

          {/* Right - Status Indicators */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Player Count */}
            <Badge
              variant="secondary"
              className="bg-purple-500/20 text-purple-400 border-purple-500/30 font-bangers tracking-wide text-xs sm:text-sm"
              aria-label={`${playerCount} of ${maxPlayers} players`}
            >
              <span className="hidden sm:inline">Players: </span>
              {playerCount}/{maxPlayers}
            </Badge>

            {/* Connection Status */}
            <Badge
              variant="secondary"
              className={cn(
                "flex items-center gap-1.5 font-bangers tracking-wide text-xs sm:text-sm",
                statusProps.className
              )}
              aria-label={`Connection status: ${statusProps.text}`}
            >
              <motion.div
                className={cn(
                  "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                  statusProps.indicator
                )}
                animate={statusProps.animate}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="hidden sm:inline">{statusProps.text}</span>
            </Badge>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
}
