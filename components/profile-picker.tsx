"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RiEditLine, RiCheckLine } from "react-icons/ri";
import { AVATAR_OPTIONS } from "@/lib/utils";

// Use the shared avatar options
const ICON_AVATARS = AVATAR_OPTIONS;

interface ProfilePickerProps {
  currentAvatar?: string;
  profileURL?: string;
  onAvatarChange?: (avatarId: string, avatarSrc: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  isUpdating?: boolean;
}

export default function ProfilePicker({
  currentAvatar = "evil-doge",
  profileURL,
  onAvatarChange,
  size = "md",
  className = "",
  isUpdating = false,
}: ProfilePickerProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [isOpen, setIsOpen] = useState(false);

  // Sync local state with prop changes
  useEffect(() => {
    if (currentAvatar && currentAvatar !== selectedAvatar) {
      setSelectedAvatar(currentAvatar);
    }
  }, [currentAvatar, selectedAvatar]);

  // Also sync when profileURL changes (in case user has a custom profile picture)
  useEffect(() => {
    // If profileURL is provided and it's different from our current avatar source,
    // we should update our local state to reflect this
    if (profileURL) {
      const currentAvatarData = ICON_AVATARS.find(
        (avatar) => avatar.id === selectedAvatar
      );
      if (currentAvatarData && profileURL !== currentAvatarData.src) {
        // Profile URL is different from our current avatar, so we should use the profile URL
        // This handles cases where the user has a custom profile picture
      }
    }
  }, [profileURL, selectedAvatar]);

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14 sm:w-16 sm:h-16",
    lg: "w-20 h-20",
  };

  const editButtonSizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5 sm:w-6 sm:h-6",
    lg: "w-6 h-6",
  };

  const editIconSizeClasses = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5 sm:w-3 sm:h-3",
    lg: "w-3 h-3",
  };

  const currentAvatarData =
    ICON_AVATARS.find((avatar) => avatar.id === selectedAvatar) ||
    ICON_AVATARS[3]; // Default to evil doge

  const handleAvatarSelect = useCallback(
    async (avatarId: string) => {
      const avatar = ICON_AVATARS.find((a) => a.id === avatarId);
      if (avatar && !isUpdating) {
        // Update local state immediately for responsive UI
        setSelectedAvatar(avatarId);

        // Call the parent's onAvatarChange which will update Firebase
        try {
          await onAvatarChange?.(avatarId, avatar.src);
          // Close dialog only after successful update
          setIsOpen(false);
        } catch (error) {
          // Revert local state if Firebase update fails
          setSelectedAvatar(currentAvatar);
          console.error("Failed to update avatar:", error);
        }
      }
    },
    [onAvatarChange, isUpdating, currentAvatar]
  );

  // If we have a Firebase profile URL, use it as the primary avatar
  const avatarSrc = profileURL || currentAvatarData.src;
  const avatarAlt = profileURL ? "Profile Picture" : currentAvatarData.name;
  const avatarFallback = profileURL ? "U" : currentAvatarData.fallback;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className={`relative cursor-pointer ${className}`}>
          <Avatar
            className={`${sizeClasses[size]} border-4 border-purple-400/50 shadow-lg hover:border-purple-400/70 transition-colors`}
          >
            <AvatarImage src={avatarSrc} alt={avatarAlt} />
            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <Button
            size="sm"
            disabled={isUpdating}
            className={`absolute -bottom-1 -right-1 ${
              editButtonSizeClasses[size]
            } rounded-full bg-purple-600 hover:bg-purple-700 p-0 ${
              isUpdating ? "opacity-50" : ""
            }`}
            aria-label="Change avatar"
          >
            <RiEditLine className={editIconSizeClasses[size]} />
          </Button>
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white font-bangers text-xl tracking-wide">
            Choose Your Icon Avatar
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 p-4">
          {ICON_AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              onClick={() => handleAvatarSelect(avatar.id)}
              disabled={isUpdating}
              className={`relative group transition-all duration-200 hover:scale-105 ${
                selectedAvatar === avatar.id
                  ? "ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-800"
                  : ""
              } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
              title={avatar.name}
            >
              <Avatar className="w-20 h-20 border-2 border-slate-600 group-hover:border-purple-400/50">
                <AvatarImage src={avatar.src} alt={avatar.name} />
                <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-white font-bold text-sm">
                  {avatar.fallback}
                </AvatarFallback>
              </Avatar>

              {selectedAvatar === avatar.id && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <RiCheckLine className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            </button>
          ))}
        </div>

        <div className="flex justify-center p-4">
          <p className="text-slate-400 text-sm text-center">
            Select your icon identity to represent you in battles
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
