"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Copy,
  Share2,
  Settings,
  Users,
  LogOut,
  Crown,
  UserX,
  MoreHorizontal,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

interface LobbyActionsProps {
  lobbyCode: string;
  lobbyData: LobbyData;
  isHost: boolean;
  canStartGame: boolean;
  playerCount: number;
  disabled?: boolean;
}

export function LobbyActions({
  lobbyCode,
  lobbyData,
  isHost,
  canStartGame,
  playerCount,
  disabled = false,
}: LobbyActionsProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobbyCode);
      toast.success("Lobby code copied to clipboard!");
    } catch (error) {
      Sentry.captureException(error); // TODO: Implement Sentry error capture
      toast.error("Failed to copy lobby code");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: "Join my Meme Battles game!",
      text: `Join my Meme Battles lobby with code: ${lobbyCode}`,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(
          `Join my Meme Battles game! Use code: ${lobbyCode} or visit: ${window.location.href}`
        );
        toast.success("Invite link copied to clipboard!");
      }
    } catch (error) {
      Sentry.captureException(error);
      toast.error("Failed to share lobby");
    }
  };

  const handleStartGame = async () => {
    if (!canStartGame || disabled) return;

    setIsStarting(true);
    try {
      toast.success("Starting game...");
      // Redirect to game page or update lobby status
    } catch (error) {
      Sentry.captureException(error);
      toast.error("Failed to start game");
    } finally {
      setIsStarting(false);
    }
  };

  const handleLeaveLobby = async () => {
    try {
      toast.success("Left lobby");
      // Redirect to home page
    } catch (error) {
      Sentry.captureException(error);
      toast.error("Failed to leave lobby");
    }
  };

  const handleDeleteLobby = async () => {
    try {
      toast.success("Lobby deleted");
      // Redirect to home page
    } catch (error) {
      Sentry.captureException(error);
      toast.error("Failed to delete lobby");
    }
  };

  const minPlayersRequired = 3;
  const maxPlayers = lobbyData.maxPlayers;
  const playersNeeded = Math.max(0, minPlayersRequired - playerCount);

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Lobby Actions
          {isHost && (
            <Badge variant="default" className="ml-auto text-xs">
              <Crown className="h-3 w-3 mr-1" />
              Host
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Game Start Section */}
        {isHost && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Start Game</h3>
                <p className="text-xs text-muted-foreground">
                  {playersNeeded > 0
                    ? `Need ${playersNeeded} more player${playersNeeded !== 1 ? "s" : ""} to start`
                    : `Ready to start with ${playerCount} player${playerCount !== 1 ? "s" : ""}`}
                </p>
              </div>
              <Badge
                variant={canStartGame ? "default" : "secondary"}
                className="text-xs"
              >
                {playerCount}/{maxPlayers}
              </Badge>
            </div>

            <Button
              onClick={handleStartGame}
              disabled={!canStartGame || disabled || isStarting}
              className="w-full"
              size="lg"
            >
              {isStarting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"
                />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isStarting ? "Starting..." : "Start Game"}
            </Button>

            {!canStartGame && playersNeeded > 0 && (
              <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded-lg">
                Minimum {minPlayersRequired} players required to start the game
              </div>
            )}
          </div>
        )}

        {isHost && <Separator />}

        {/* Invite Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Invite Players</h3>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopyCode}
              disabled={disabled}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>

            <Button
              variant="outline"
              onClick={handleShare}
              disabled={disabled}
              className="flex-1"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Lobby Code</div>
            <div className="font-mono text-lg font-bold tracking-wider bg-muted/50 rounded-lg py-2 px-4">
              {lobbyCode}
            </div>
          </div>
        </div>

        <Separator />

        {/* Lobby Management */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Lobby Management</h3>

          <div className="flex gap-2">
            {!isHost ? (
              <Button
                variant="outline"
                onClick={() => setShowLeaveDialog(true)}
                disabled={disabled}
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Lobby
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={disabled}
                  className="flex-1"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" disabled={disabled}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowLeaveDialog(true)}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave Lobby
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Delete Lobby
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {/* Lobby Status */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Status:</span>
            <Badge variant="outline" className="text-xs">
              {lobbyData.status === "waiting"
                ? "Waiting for players"
                : lobbyData.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>Created:</span>
            <span>{new Date(lobbyData.createdAt).toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>

      {/* Leave Lobby Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Lobby?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this lobby?
              {isHost &&
                " As the host, leaving will delete the lobby for all players."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveLobby}>
              {isHost ? "Delete Lobby" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Lobby Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lobby?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the lobby and remove all players.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLobby}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Lobby
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
