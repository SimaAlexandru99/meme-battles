"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RiDiceLine, RiCheckLine } from "react-icons/ri";
import { generateGuestDisplayName } from "@/firebase/client";
import { useUpdateDisplayName } from "@/hooks/useUpdateDisplayName";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { markUserSetupComplete } from "@/lib/actions/auth.action";
import ProfilePicker from "./profile-picker";
import * as Sentry from "@sentry/nextjs";

interface FirstTimeSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export default function FirstTimeSetupDialog({
  isOpen,
  onClose,
  currentUser,
}: FirstTimeSetupDialogProps) {
  const [username, setUsername] = useState("");
  const [currentAvatar, setCurrentAvatar] = useState("evil-doge");
  const [profileURL, setProfileURL] = useState<string | undefined>();
  const [isLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateDisplayName, isUpdating } = useUpdateDisplayName(0);
  const { updateAvatar, isUpdatingAvatar } = useUpdateProfile();

  // Initialize with current user data or generate random name
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.name || generateGuestDisplayName());
      setCurrentAvatar(currentUser.avatarId || "evil-doge");
      setProfileURL(currentUser.profileURL);
    } else {
      setUsername(generateGuestDisplayName());
    }
  }, [currentUser]);

  const generateRandomName = () => {
    const newName = generateGuestDisplayName();
    setUsername(newName);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
  };

  const handleAvatarChange = async (avatarId: string, avatarSrc: string) => {
    try {
      setCurrentAvatar(avatarId);
      setProfileURL(avatarSrc);
    } catch (error) {
      console.error("Error updating avatar:", error);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await Sentry.startSpan(
        {
          op: "ui.dialog.submit",
          name: "First Time Setup Submit",
        },
        async (span) => {
          // Update display name
          await updateDisplayName(username.trim());

          // Update avatar if changed
          if (currentAvatar && profileURL) {
            await updateAvatar(currentAvatar, profileURL);
          }

          // Mark setup as complete
          await markUserSetupComplete();

          span.setAttribute("user.username", username.trim());
          span.setAttribute("user.avatar", currentAvatar);
          span.setAttribute("setup.completed", true);
        },
      );

      // Close dialog after successful update
      onClose();
    } catch (error) {
      console.error("Error saving user preferences:", error);
      Sentry.captureException(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      {/* Prevent closing by clicking outside - user must complete setup or skip */}
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bangers">
            Welcome to Meme Battles! 🎮
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Welcome Message */}
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              Let&apos;s set up your meme warrior identity!
            </p>
            <p className="text-sm text-muted-foreground">
              You can change these anytime from your profile.
            </p>
          </div>

          {/* Avatar Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Choose Your Avatar</Label>
            <div className="flex justify-center">
              <ProfilePicker
                currentAvatar={currentAvatar}
                profileURL={profileURL}
                onAvatarChange={handleAvatarChange}
                size="lg"
                className={isUpdatingAvatar ? "opacity-75" : ""}
                isUpdating={isUpdatingAvatar}
              />
            </div>
          </div>

          {/* Username Section */}
          <div className="space-y-4">
            <Label htmlFor="username" className="text-sm font-medium">
              Your Meme Name
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="username"
                  placeholder="Enter your meme name"
                  value={username}
                  onChange={handleUsernameChange}
                  className="pr-8"
                  maxLength={20}
                  disabled={isLoading}
                />
                {isUpdating && (
                  <div
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                    title="Saving..."
                  />
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={generateRandomName}
                disabled={isLoading}
                title="Generate random name"
                className="px-2"
              >
                <RiDiceLine className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose a name that represents your meme battle style!
            </p>
          </div>

          {/* Preview Card */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={profileURL} alt={username} />
                  <AvatarFallback className="bg-purple-500 text-white">
                    {username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{username}</p>
                  <p className="text-xs text-muted-foreground">Meme Warrior</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
              disabled={isSubmitting}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={!username.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RiCheckLine className="w-4 h-4" />
                  Save & Continue
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
