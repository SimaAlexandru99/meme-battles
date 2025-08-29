"use client";

import * as Sentry from "@sentry/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLobbyManagement } from "@/hooks/use-lobby-management";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface InvitationLinkProps {
  children: React.ReactNode;
}

export function InvitationLink({ children }: InvitationLinkProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);

  // Check for invitation code in URL parameters
  useEffect(() => {
    const code = searchParams.get("join");
    if (code && code.length === 5 && /^[A-Z0-9]+$/.test(code)) {
      setInvitationCode(code);
    }
  }, [searchParams]);

  // Get lobby management hook
  const { joinLobby } = useLobbyManagement(invitationCode || "");

  // Handle joining via invitation link
  const handleJoinInvitation = async () => {
    if (!invitationCode || !user) {
      toast.error("Invalid invitation or user not signed in");
      return;
    }

    try {
      setIsProcessing(true);

      await joinLobby(invitationCode);

      toast.success("Successfully joined the lobby!");

      // Navigate to the lobby
      router.push(`/game/${invitationCode}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to join lobby";
      toast.error(errorMessage);
      Sentry.captureException(error);
    } finally {
      setIsProcessing(false);
      setInvitationCode(null);
    }
  };

  // Handle declining invitation
  const handleDeclineInvitation = () => {
    setInvitationCode(null);
    // Remove the invitation parameter from URL
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("join");
    const newUrl = newSearchParams.toString()
      ? `?${newSearchParams.toString()}`
      : "";
    router.replace(newUrl as any);
  };

  // Show invitation dialog if invitation code is present
  if (invitationCode) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl shadow-purple-500/10 max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-white font-bangers text-2xl tracking-wide text-center">
              Game Invitation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-purple-200/70 font-bangers text-lg tracking-wide mb-4">
                You&apos;ve been invited to join a game!
              </p>

              <div className="mb-6">
                <Badge className="bg-purple-600 text-white font-bangers text-lg px-4 py-2">
                  {invitationCode}
                </Badge>
              </div>

              <p className="text-purple-200/50 font-bangers text-sm tracking-wide mb-6">
                Click &quot;Join Game&quot; to enter the lobby
              </p>

              <div className="space-y-3">
                <Button
                  onClick={handleJoinInvitation}
                  disabled={isProcessing}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bangers text-lg"
                >
                  {isProcessing ? "Joining..." : "Join Game"}
                </Button>

                <Button
                  onClick={handleDeclineInvitation}
                  variant="outline"
                  className="w-full border-purple-600 text-purple-400 hover:bg-purple-600/10 font-bangers text-lg"
                >
                  Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children normally if no invitation
  return <>{children}</>;
}
