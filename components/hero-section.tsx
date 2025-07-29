"use client";

import { Button } from "@/components/ui/button";
import {
  RiGlobalLine,
  RiFireLine,
  RiGroupLine,
  RiDiceLine,
  RiLoginBoxLine,
  RiUserLine,
  RiLogoutBoxLine,
  RiDiscordLine,
  RiNotificationLine,
  RiArrowDownLine,
} from "react-icons/ri";
import Particles from "@/components/ui/particles-background";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useEffect } from "react";
import { generateGuestDisplayName } from "@/firebase/client";
import { useUpdateDisplayName } from "@/hooks/useUpdateDisplayName";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import {
  getCurrentUser,
  isAnonymousUser,
  signOut,
} from "@/lib/actions/auth.action";
import ProfilePicker from "./profile-picker";
import GameCard from "./game-card";

interface AvatarSetupCardProps {
  onNicknameChange?: (nickname: string) => void;
  onAvatarChange?: (avatarId: string, avatarSrc: string) => void;
}

function AvatarSetupCard({
  onNicknameChange,
  onAvatarChange,
}: AvatarSetupCardProps) {
  const [nickname, setNickname] = useState("MemeLord");
  const [currentAvatar, setCurrentAvatar] = useState("evil-doge");
  const [profileURL, setProfileURL] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const { updateDisplayName, isUpdating } = useUpdateDisplayName(1500); // 1.5 second debounce
  const { updateAvatar, isUpdatingAvatar } = useUpdateProfile();

  // Add a function to refresh profile data
  const refreshProfileData = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        if (user.name) {
          setNickname(user.name);
          onNicknameChange?.(user.name);
        }
        if (user.avatarId) {
          setCurrentAvatar(user.avatarId);
        }
        if (user.profileURL) {
          setProfileURL(user.profileURL);
        }
      }
    } catch (error) {
      console.error("Failed to refresh profile data:", error);
    }
  }, [onNicknameChange]);

  // Load current user's profile on mount and refresh periodically
  useEffect(() => {
    const loadCurrentUserProfile = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          if (user.name) {
            setNickname(user.name);
            onNicknameChange?.(user.name);
          }
          if (user.avatarId) {
            setCurrentAvatar(user.avatarId);
          }
          if (user.profileURL) {
            setProfileURL(user.profileURL);
          }
        }
      } catch (error) {
        console.error("Failed to load current user profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentUserProfile();

    // Listen for user setup completion event
    const handleUserSetupComplete = () => {
      console.log("User setup completed, refreshing avatar setup data...");
      refreshProfileData();
    };

    window.addEventListener("userSetupComplete", handleUserSetupComplete);

    // Set up periodic refresh every 30 seconds to keep UI in sync
    const refreshInterval = setInterval(refreshProfileData, 30000);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener("userSetupComplete", handleUserSetupComplete);
    };
  }, [onNicknameChange, refreshProfileData]);

  const generateRandomName = useCallback(() => {
    const newName = generateGuestDisplayName();
    setNickname(newName);
    onNicknameChange?.(newName);
    // Update in Firebase
    updateDisplayName(newName);
  }, [onNicknameChange, updateDisplayName]);

  const handleNicknameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNickname(value);
      onNicknameChange?.(value);
      // Update in Firebase with debouncing
      if (value.trim()) {
        updateDisplayName(value.trim());
      }
    },
    [onNicknameChange, updateDisplayName]
  );

  const handleAvatarChange = useCallback(
    async (avatarId: string, avatarSrc: string) => {
      try {
        // Update in Firebase first
        const result = await updateAvatar(avatarId, avatarSrc);

        if (result.success) {
          // Immediately update local state for responsive UI
          setCurrentAvatar(avatarId);
          setProfileURL(avatarSrc);

          // Also call the parent callback
          onAvatarChange?.(avatarId, avatarSrc);

          // Optionally reload from Firebase after a short delay to ensure consistency
          setTimeout(async () => {
            try {
              const updatedUser = await getCurrentUser();
              if (updatedUser) {
                // Only update if the data is different to avoid unnecessary re-renders
                if (updatedUser.avatarId && updatedUser.avatarId !== avatarId) {
                  setCurrentAvatar(updatedUser.avatarId);
                }
                if (
                  updatedUser.profileURL &&
                  updatedUser.profileURL !== avatarSrc
                ) {
                  setProfileURL(updatedUser.profileURL);
                }
              }
            } catch (error) {
              console.error("Failed to refresh profile after update:", error);
            }
          }, 1000); // 1 second delay
        } else {
          // If Firebase update fails, revert the local state
          console.error("Failed to update avatar:", result.error);
          // The ProfilePicker will handle reverting its own state
          throw new Error(result.error || "Failed to update avatar");
        }
      } catch (error) {
        console.error("Error updating avatar:", error);
        throw error; // Re-throw so ProfilePicker can handle it
      }
    },
    [onAvatarChange, updateAvatar]
  );

  return (
    <Card className="relative w-full max-w-[280px] sm:max-w-sm h-[240px] sm:h-[260px] md:w-56 md:h-[280px] bg-transparent md:bg-gradient-to-br md:from-slate-800 md:to-slate-700 border-0 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105">
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-lg opacity-0 md:opacity-100 shadow-none md:shadow-lg"
        aria-hidden="true"
      />
      <CardContent className="relative h-full flex flex-col items-center justify-center p-4 sm:p-4 gap-3 sm:gap-4">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <ProfilePicker
            currentAvatar={currentAvatar}
            profileURL={profileURL}
            onAvatarChange={handleAvatarChange}
            size="md"
            className={isUpdatingAvatar ? "opacity-75" : ""}
            isUpdating={isUpdatingAvatar}
          />

          {/* Nickname Input */}
          <div className="flex flex-col items-center gap-1 sm:gap-2">
            <p className="text-purple-200 text-center text-xs sm:text-sm md:text-xs font-bangers font-medium tracking-wide">
              Choose your meme identity
            </p>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="relative">
                <Input
                  placeholder={isLoading ? "Loading..." : "Meme name"}
                  value={nickname}
                  onChange={handleNicknameChange}
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 w-20 sm:w-28 md:w-24 text-xs sm:text-sm md:text-xs h-6 sm:h-8 md:h-7 disabled:opacity-50"
                  maxLength={20}
                  aria-label="Enter your meme nickname"
                />
                {isUpdating && (
                  <div
                    className="absolute -right-1 -top-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                    title="Updating name..."
                  />
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-600 w-5 h-5 sm:w-6 sm:h-6 md:w-5 md:h-5 p-0 disabled:opacity-50"
                onClick={generateRandomName}
                disabled={isLoading}
                title="Generate random funny name"
                aria-label="Generate random funny name"
              >
                <RiDiceLine className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-2.5 md:h-2.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Header() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = await getCurrentUser();
        const anonymous = await isAnonymousUser();

        setCurrentUser(user);
        setIsAnonymous(anonymous);
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Load user data on mount
    loadUserData();

    // Listen for user setup completion event
    const handleUserSetupComplete = () => {
      console.log("User setup completed, refreshing header data...");
      loadUserData();
    };

    window.addEventListener("userSetupComplete", handleUserSetupComplete);

    // Cleanup event listener
    return () => {
      window.removeEventListener("userSetupComplete", handleUserSetupComplete);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isAuthenticatedUser = currentUser && !isAnonymous;

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/logo.png"
            alt="MEME BATTLES"
            width={100}
            height={40}
            className="drop-shadow-lg w-16 h-auto sm:w-20 md:w-auto md:h-auto"
            priority
          />
        </div>

        {/* Dynamic Auth Buttons */}
        {!isLoading && (
          <>
            {isAuthenticatedUser ? (
              // Authenticated user - show profile and sign out
              <div className="flex items-center gap-2">
                <Link href="/profile">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-200 font-bangers tracking-wide backdrop-blur-sm text-xs px-3 py-1.5 sm:text-sm sm:px-4 sm:py-2"
                    aria-label="View your profile"
                  >
                    <RiUserLine className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Profile
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-400/50 transition-all duration-200 font-bangers tracking-wide backdrop-blur-sm text-xs px-3 py-1.5 sm:text-sm sm:px-4 sm:py-2"
                  onClick={handleSignOut}
                  aria-label="Sign out of your account"
                >
                  <RiLogoutBoxLine className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            ) : (
              // Anonymous or not authenticated - show sign in
              <Link href="/sign-in">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all duration-200 font-bangers tracking-wide backdrop-blur-sm text-xs px-3 py-1.5 sm:text-sm sm:px-4 sm:py-2 md:text-base md:px-6 md:py-2.5"
                  aria-label="Sign in to your account"
                >
                  <RiLoginBoxLine className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Sign In
                </Button>
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
}

function BottomNavigation() {
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-50"
      aria-label="Bottom navigation"
    >
      <div className="flex justify-between items-end w-full px-4 sm:px-6 pb-4 sm:pb-6 gap-3 sm:gap-4">
        {/* Left side - Social links */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Discord Button */}
          <a
            href="https://discord.gg/t3GZmuQndv"
            target="_blank"
            rel="noreferrer noopener"
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[#5865F2] hover:bg-[#4752C4] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
            aria-label="Join our Discord server"
          >
            <RiDiscordLine className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </a>

          {/* News Icon */}
          <Link
            href="/news"
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 backdrop-blur-sm border border-white/20"
            aria-label="View latest news"
          >
            <RiNotificationLine className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </Link>
        </div>

        {/* Center - How to Play Button */}
        <button
          className="flex flex-col items-center gap-1 text-white font-bangers text-base sm:text-lg md:text-xl hover:scale-110 transition-all duration-200"
          aria-label="Learn how to play"
        >
          <span className="text-shadow-lg">How to Play</span>
          <RiArrowDownLine className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 -mt-1" />
        </button>

        {/* Right side - Spacer */}
        <div className="w-16 sm:w-20 md:w-24" aria-hidden="true" />
      </div>
    </nav>
  );
}

function GameCardsSection() {
  const [currentNickname, setCurrentNickname] = useState("MemeLord");
  const [currentAvatar, setCurrentAvatar] = useState("evil-doge");

  const handleMemeBattleClick = useCallback(() => {
    // User is already authenticated as guest via layout
    console.log("Entering meme battle royale with:", {
      nickname: currentNickname,
      avatar: currentAvatar,
    });
    // TODO: Navigate to battle royale game
  }, [currentNickname, currentAvatar]);

  const handlePrivateWarClick = useCallback(() => {
    // User is already authenticated as guest via layout
    console.log("Starting private meme war with:", {
      nickname: currentNickname,
      avatar: currentAvatar,
    });
    // TODO: Navigate to private game creation
  }, [currentNickname, currentAvatar]);

  const handleNicknameChange = useCallback((newNickname: string) => {
    setCurrentNickname(newNickname);
  }, []);

  const handleAvatarChange = useCallback(
    (avatarId: string, avatarSrc: string) => {
      console.log("Avatar changed:", { avatarId, avatarSrc });
      setCurrentAvatar(avatarId);
    },
    []
  );

  return (
    <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 w-full max-w-sm sm:max-w-2xl md:max-w-none">
      {/* Meme Lord Setup Card */}
      <AvatarSetupCard
        onNicknameChange={handleNicknameChange}
        onAvatarChange={handleAvatarChange}
      />

      {/* Meme Battle Royale Card */}
      <GameCard
        title="Meme Battle Royale"
        description="Join the chaos! Fight for meme supremacy"
        backgroundImage="https://makeitmeme.com/assets/static/quick-play.ClEdP5yD.png"
        gradientFrom="from-orange-600/80"
        gradientTo="to-red-600/80"
        hoverShadowColor="hover:shadow-orange-500/20"
        buttonText="Enter the arena"
        buttonIcon={<RiFireLine className="w-3 h-3 sm:w-4 sm:h-4" />}
        badgeText="HOT"
        badgeColor="bg-red-500"
        className="w-full max-w-[280px] sm:max-w-sm h-[260px] sm:h-[280px] md:w-72 md:h-[400px]"
        onClick={handleMemeBattleClick}
      />

      {/* Private Meme War Card */}
      <GameCard
        title="Private Meme War"
        description="Battle with friends only"
        backgroundImage="https://makeitmeme.com/assets/static/private-game.c_DPCftE.png"
        gradientFrom="from-green-600"
        gradientTo="to-emerald-600"
        hoverShadowColor="hover:shadow-green-500/20"
        buttonText="Start war"
        buttonIcon={<RiGroupLine className="w-3 h-3 sm:w-4 sm:h-4" />}
        badgeText="FRIENDS"
        badgeColor="bg-green-500"
        className="w-full max-w-[280px] sm:max-w-sm h-[220px] sm:h-[240px] md:w-56 md:h-[280px]"
        onClick={handlePrivateWarClick}
      />
    </div>
  );
}

export default function HeroSection() {
  const handleBrowseLobbies = useCallback(() => {
    // Handle browse lobbies click
    console.log("Browsing lobbies");
  }, []);

  return (
    <section
      className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden"
      role="banner"
    >
      {/* Header */}
      <Header />

      {/* Particles Background */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <Particles
          particleCount={150}
          particleSpread={8}
          speed={0.08}
          particleColors={[
            "#ffffff",
            "#e2e8f0",
            "#cbd5e1",
            "#a855f7",
            "#ec4899",
          ]}
          moveParticlesOnHover={true}
          particleHoverFactor={2}
          alphaParticles={true}
          particleBaseSize={60}
          sizeRandomness={0.8}
          cameraDistance={15}
          disableRotation={false}
          className="w-full h-full"
        />
      </div>

      {/* Content Container */}
      <div className="h-full flex flex-col items-center justify-center gap-3 sm:gap-4 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 relative z-10">
        {/* Logo */}
        <div className="transition-transform duration-300 hover:scale-110 cursor-pointer hidden sm:flex">
          <Image
            src="/logo.png"
            alt="MEME BATTLES"
            width={200}
            height={80}
            className="drop-shadow-2xl w-28 h-auto sm:w-32 md:w-auto md:h-auto"
            priority
          />
        </div>

        {/* Game Cards Container */}
        <GameCardsSection />

        {/* Browse Lobbies Button */}
        <Button
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bangers font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-full shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 tracking-wide text-sm sm:text-base"
          onClick={handleBrowseLobbies}
          aria-label="Browse available game lobbies"
        >
          <RiGlobalLine className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Browse lobbies
        </Button>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </section>
  );
}
