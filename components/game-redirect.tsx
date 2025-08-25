"use client";

import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLobbyManagement } from "@/hooks/use-lobby-management";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface GameRedirectProps {
  lobbyCode: string;
  children: React.ReactNode;
}

type RedirectReason = "not_found" | "not_member" | "loading" | null;

export function GameRedirect({ lobbyCode, children }: GameRedirectProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [redirectReason, setRedirectReason] =
    useState<RedirectReason>("loading");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { lobby, isLoading, error, joinLobby } = useLobbyManagement(lobbyCode);

  // Check lobby access and permissions
  useEffect(() => {
    if (isLoading) {
      setRedirectReason("loading");
      return;
    }

    if (error) {
      setRedirectReason("not_found");
      return;
    }

    if (!lobby) {
      setRedirectReason("not_found");
      return;
    }

    // Check if user is a member of the lobby
    const isMember = user?.id ? lobby?.players?.[user.id] !== undefined : false;
    if (!isMember) {
      setRedirectReason("not_member");
      return;
    }

    // Check if game has already started - allow access to started games
    if (lobby.status === "started") {
      // Game is started, allow access to the game
      setRedirectReason(null);
      return;
    }

    // All checks passed
    setRedirectReason(null);
  }, [lobby, isLoading, error, user?.id]);

  // Handle joining lobby
  const handleJoinLobby = async () => {
    if (!user) {
      toast.error("Please sign in to join the lobby");
      router.push("/");
      return;
    }

    try {
      setIsRedirecting(true);
      await joinLobby(lobbyCode);
      toast.success("Successfully joined the lobby!");
      setRedirectReason(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to join lobby";
      toast.error(errorMessage);
      Sentry.captureException(error);
    } finally {
      setIsRedirecting(false);
    }
  };

  // Loading state
  if (redirectReason === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
              Loading Lobby...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bangers text-purple-400 mb-4">
                Connecting
              </div>
              <p className="text-purple-200/70 font-bangers text-lg tracking-wide">
                Checking lobby access
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Lobby not found
  if (redirectReason === "not_found") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
              Lobby Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-purple-200/70 font-bangers text-lg tracking-wide mb-4">
                The lobby with code{" "}
                <span className="text-purple-400 font-bold">{lobbyCode}</span>{" "}
                doesn&apos;t exist or has been deleted.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not a member of the lobby
  if (redirectReason === "not_member") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
              Join Lobby
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-purple-200/70 font-bangers text-lg tracking-wide mb-4">
                You&apos;re not a member of this lobby. Would you like to join?
              </p>
              <div className="space-y-3">
                <Button
                  onClick={handleJoinLobby}
                  disabled={isRedirecting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg"
                >
                  {isRedirecting ? "Joining..." : "Join Lobby"}
                </Button>
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="w-full border-purple-600 text-purple-400 hover:bg-purple-600/10 font-bangers text-lg"
                >
                  Go Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}
