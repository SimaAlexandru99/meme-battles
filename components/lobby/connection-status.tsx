"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ConnectionStatusType =
  | "connected"
  | "connecting"
  | "disconnected"
  | "reconnecting";

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  onReconnect: () => void;
  isOnline: boolean;
  className?: string;
}

const statusConfig = {
  connected: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    label: "Connected",
    description: "Real-time connection active",
    badgeVariant: "default" as const,
  },
  connecting: {
    icon: Loader2,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    label: "Connecting",
    description: "Establishing connection...",
    badgeVariant: "secondary" as const,
  },
  reconnecting: {
    icon: RefreshCw,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    label: "Reconnecting",
    description: "Attempting to reconnect...",
    badgeVariant: "secondary" as const,
  },
  disconnected: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    label: "Disconnected",
    description: "Connection lost",
    badgeVariant: "destructive" as const,
  },
};

export function ConnectionStatus({
  status,
  onReconnect,
  isOnline,
  className = "",
}: ConnectionStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const isAnimating = status === "connecting" || status === "reconnecting";

  // Don't show the main status card if connected, but we might show connection quality
  if (status === "connected") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
        >
          <Card className="bg-green-500/10 border-green-500/20 border backdrop-blur-sm shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      Connected
                    </span>
                    <Badge variant="default" className="text-xs">
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Real-time connection active
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {/* Connection Quality Indicator */}
              <div className="mt-3 flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Signal:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1 h-3 rounded-full ${
                        bar <= 3 ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.3 }}
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
      >
        <Card
          className={`${config.bgColor} ${config.borderColor} border backdrop-blur-sm shadow-lg`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Status Icon */}
              <div className={`flex-shrink-0 ${config.color}`}>
                <Icon
                  className={`h-5 w-5 ${isAnimating ? "animate-spin" : ""}`}
                />
              </div>

              {/* Status Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {config.label}
                  </span>
                  <Badge variant={config.badgeVariant} className="text-xs">
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {!isOnline
                    ? "Check your internet connection"
                    : config.description}
                </p>
              </div>

              {/* Network Status Indicator */}
              <div className="flex-shrink-0">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </div>

              {/* Reconnect Button */}
              {(status === "disconnected" || !isOnline) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReconnect}
                  className="flex-shrink-0 h-8 px-3"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
