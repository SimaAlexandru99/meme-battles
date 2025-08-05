"use client";

import React, { memo, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHover, useKeyPress, useIdle, useTitle } from "react-haiku";
import { Button } from "@/components/ui/button";
import {
  RiGlobalLine,
  RiFireLine,
  RiGroupLine,
  RiDiceLine,
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
import ProfilePicker from "./profile-picker";
import GameCard from "./game-card";
import { PrivateLobbySection } from "@/components/private-lobby-section";
import {
  cardExitVariants,
  buttonVariants,
  microInteractionVariants,
  lobbyEnterVariants,
} from "@/lib/animations/private-lobby-variants";
import { toast } from "sonner";
import { signOut } from "@/lib/actions/auth.action";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { generateGuestDisplayName } from "@/firebase/client";

interface AvatarSetupCardProps {
  initialUserData?: User | null;
}

const AvatarSetupCard = memo(function AvatarSetupCard({
  initialUserData,
}: AvatarSetupCardProps) {
  const { user, refresh } = useCurrentUser(initialUserData);
  const { updateDisplayName, updateAvatar, isUpdatingName, isUpdatingAvatar } =
    useUpdateProfile();

  // Use current user data or fallback to initial data
  const currentUser = user || initialUserData;
  const [nickname, setNickname] = useState(currentUser?.name || "MemeLord");
  const [currentAvatar, setCurrentAvatar] = useState(
    currentUser?.avatarId || "evil-doge",
  );
  const [profileURL] = useState(currentUser?.profileURL || "");

  // Update local state when user data changes
  React.useEffect(() => {
    if (currentUser) {
      setNickname(currentUser.name || "MemeLord");
      setCurrentAvatar(currentUser.avatarId || "evil-doge");
    }
  }, [currentUser]);

  // Enhanced hover effects for avatar card
  const { hovered: isCardHovered, ref: cardRef } = useHover();

  const generateRandomName = useCallback(async () => {
    const randomName = generateGuestDisplayName();
    setNickname(randomName);

    // Update in Firebase
    const result = await updateDisplayName(randomName);
    if (result.success) {
      toast.success("Generated new name!");
      // Refresh user data to get the latest from server
      refresh();
    } else {
      toast.error("Failed to update name");
      // Revert local state on failure
      setNickname(currentUser?.name || "MemeLord");
    }
  }, [updateDisplayName, currentUser?.name, refresh]);

  const handleNicknameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNickname(e.target.value);
    },
    [],
  );

  const handleNicknameBlur = useCallback(async () => {
    if (nickname !== currentUser?.name && nickname.trim().length > 0) {
      const result = await updateDisplayName(nickname.trim());
      if (result.success) {
        toast.success("Name updated!");
        // Refresh user data to get the latest from server
        refresh();
      } else {
        toast.error("Failed to update name");
        // Revert local state on failure
        setNickname(currentUser?.name || "MemeLord");
      }
    }
  }, [nickname, currentUser?.name, updateDisplayName, refresh]);

  const handleAvatarChange = useCallback(
    async (avatarId: string, avatarSrc: string) => {
      setCurrentAvatar(avatarId);

      // Update in Firebase
      const result = await updateAvatar(avatarId, avatarSrc);
      if (result.success) {
        toast.success("Avatar updated!");
        // Refresh user data to get the latest from server
        refresh();
      } else {
        toast.error("Failed to update avatar");
        // Revert local state on failure
        setCurrentAvatar(currentUser?.avatarId || "evil-doge");
      }
    },
    [updateAvatar, currentUser?.avatarId, refresh],
  );

  return (
    <motion.div
      ref={cardRef as React.Ref<HTMLDivElement>}
      variants={cardExitVariants}
      custom={0} // Avatar card slides left
      className="relative w-full max-w-[280px] sm:max-w-sm h-[240px] sm:h-[260px] md:w-56 md:h-[280px]"
    >
      <Card
        className={`relative w-full h-full bg-transparent md:bg-gradient-to-br md:from-slate-800 md:to-slate-700 border-0 shadow-2xl transition-all duration-300 ${
          isCardHovered
            ? "shadow-purple-500/30 scale-105 md:shadow-2xl"
            : "hover:shadow-purple-500/20 hover:scale-105"
        }`}
      >
        <div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-lg opacity-0 md:opacity-100 shadow-none md:shadow-lg"
          aria-hidden="true"
        />
        <CardContent className="relative h-full flex flex-col items-center justify-center p-4 sm:p-4 gap-3 sm:gap-4">
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <ProfilePicker
              currentAvatar={currentAvatar}
              profileURL={profileURL}
              onAvatarChange={handleAvatarChange}
              size="md"
              className=""
              isUpdating={isUpdatingAvatar}
            />
            <div className="flex flex-col items-center gap-1 sm:gap-2">
              <p className="text-purple-200 text-center text-xs sm:text-sm md:text-xs font-bangers font-medium tracking-wide">
                Choose your meme identity
              </p>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="relative">
                  <Input
                    placeholder="Meme name"
                    value={nickname}
                    onChange={handleNicknameChange}
                    onBlur={handleNicknameBlur}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    disabled={isUpdatingName}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 w-20 sm:w-28 md:w-24 text-xs sm:text-sm md:text-xs h-6 sm:h-8 md:h-7 disabled:opacity-50"
                    maxLength={20}
                    aria-label="Enter your meme nickname"
                  />
                  {isUpdatingName && (
                    <div
                      className="absolute -right-1 -top-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                      title="Updating name..."
                    />
                  )}
                </div>
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-600 w-5 h-5 sm:w-6 sm:h-6 md:w-5 md:h-5 p-0 disabled:opacity-50"
                    onClick={generateRandomName}
                    disabled={isUpdatingName}
                    title="Generate random funny name"
                    aria-label="Generate random funny name"
                  >
                    <RiDiceLine className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-2.5 md:h-2.5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

const Header = memo(function Header({
  initialUserData,
}: {
  initialUserData?: User | null;
}) {
  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully!");
      // Redirect to home or refresh the page
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  const handleSignIn = () => {
    // Navigate to sign in page or show sign in modal
    window.location.href = "/auth/signin";
  };

  const isAnonymous = initialUserData?.isAnonymous ?? false;

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
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
        <div className="flex items-center gap-2">
          {isAnonymous ? (
            <Button
              variant="outline"
              size="sm"
              className="border-green-500/30 text-green-300 hover:bg-green-500/10 hover:border-green-400/50 transition-all duration-200 font-bangers tracking-wide backdrop-blur-sm text-xs px-3 py-1.5 sm:text-sm sm:px-4 sm:py-2"
              onClick={handleSignIn}
              aria-label="Sign in to your account"
            >
              <RiUserLine className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Sign In
            </Button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  );
});

const BottomNavigation = memo(function BottomNavigation() {
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-20"
      aria-label="Bottom navigation"
    >
      <div className="flex justify-between items-end w-full px-4 sm:px-6 pb-4 sm:pb-6 gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="https://discord.gg/t3GZmuQndv"
            target="_blank"
            rel="noreferrer noopener"
            className="w-8 h-8 sm:w-10 sm:h-10 bg-[#5865F2] hover:bg-[#4752C4] rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
            aria-label="Join our Discord server"
          >
            <RiDiscordLine className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </a>
          <Link
            href="/news"
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 backdrop-blur-sm border border-white/20"
            aria-label="View latest news"
          >
            <RiNotificationLine className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </Link>
        </div>
        <button
          className="flex flex-col items-center gap-1 text-white font-bangers text-base sm:text-lg md:text-xl hover:scale-110 transition-all duration-200"
          aria-label="Learn how to play"
          onClick={() => toast.info("How to play guide coming soon!")}
        >
          <span className="text-shadow-lg">How to Play</span>
          <RiArrowDownLine className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 -mt-1" />
        </button>
        <div className="w-16 sm:w-20 md:w-24" aria-hidden="true" />
      </div>
    </nav>
  );
});

const GameCardsSection = memo(function GameCardsSection({
  initialUserData,
  onPrivateWarClick,
}: {
  initialUserData?: User | null;
  onPrivateWarClick: () => void;
}) {
  const handleMemeBattleClick = useCallback(() => {
    toast.success("Starting meme battle!");
  }, []);

  return (
    <motion.div
      className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 w-full max-w-sm sm:max-w-2xl md:max-w-none"
      variants={microInteractionVariants}
    >
      <AvatarSetupCard initialUserData={initialUserData} />
      <motion.div
        variants={cardExitVariants}
        custom={1} // Game card slides right
        className="w-full max-w-[280px] sm:max-w-sm h-[260px] sm:h-[280px] md:w-72 md:h-[400px]"
      >
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
          className="w-full h-full"
          onClick={handleMemeBattleClick}
        />
      </motion.div>
      <motion.div
        variants={cardExitVariants}
        custom={2} // Game card slides right
        className="w-full max-w-[280px] sm:max-w-sm h-[220px] sm:h-[240px] md:w-56 md:h-[280px]"
      >
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
          className="w-full h-full"
          onClick={onPrivateWarClick}
        />
      </motion.div>
    </motion.div>
  );
});

interface HeroSectionProps {
  initialUserData?: User | null;
}

export default function HeroSection({ initialUserData }: HeroSectionProps) {
  // State management for view transitions
  const [currentView, setCurrentView] = useState<"main" | "private-lobby">(
    "main",
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  // React Haiku hooks for enhanced UX
  const isIdle = useIdle(300000); // 5 minutes idle detection

  // Set dynamic page title
  useTitle("Meme Battles - Join the Ultimate Meme War!");

  // Handle idle state
  React.useEffect(() => {
    if (isIdle && currentView === "private-lobby") {
      toast.info("You've been idle for a while. Your lobby might expire soon!");
    }
  }, [isIdle, currentView]);

  // Handle private war click with animation transition
  const handlePrivateWarClick = useCallback(() => {
    setIsTransitioning(true);
    // Small delay to allow exit animations to complete
    setTimeout(() => {
      setCurrentView("private-lobby");
      setIsTransitioning(false);
    }, 600); // Match the duration of cardExitVariants
  }, []);

  // Handle back to main view
  const handleBackToMain = useCallback(() => {
    setCurrentView("main");
  }, []);

  const handleBrowseLobbies = useCallback(() => {
    toast.info("Browse lobbies feature coming soon!");
  }, []);

  // Keyboard shortcuts for power users
  useKeyPress(["ctrl", "b"], () => {
    if (currentView === "main") {
      handleBrowseLobbies();
    }
  });

  useKeyPress(["ctrl", "p"], () => {
    if (currentView === "main") {
      handlePrivateWarClick();
    }
  });

  useKeyPress(["escape"], () => {
    if (currentView === "private-lobby") {
      handleBackToMain();
    }
  });

  return (
    <section
      className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden"
      role="banner"
    >
      <Header initialUserData={initialUserData} />
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

      <div className="h-full flex flex-col items-center justify-center gap-3 sm:gap-4 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-20 sm:pb-24 relative">
        <AnimatePresence mode="wait">
          {currentView === "main" && !isTransitioning && (
            <motion.div
              key="main-view"
              className="flex flex-col items-center gap-3 sm:gap-4 w-full"
              variants={microInteractionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <motion.div
                className="transition-transform duration-300 hover:scale-110 cursor-pointer hidden sm:flex"
                variants={microInteractionVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Image
                  src="/logo.png"
                  alt="MEME BATTLES"
                  width={200}
                  height={80}
                  className="drop-shadow-2xl w-28 h-auto sm:w-32 md:w-auto md:h-auto"
                  priority
                />
              </motion.div>
              <GameCardsSection
                initialUserData={initialUserData}
                onPrivateWarClick={handlePrivateWarClick}
              />
              <motion.div
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <Button
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bangers font-semibold px-5 py-2.5 sm:px-6 sm:py-3 rounded-full shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 tracking-wide text-sm sm:text-base"
                  onClick={handleBrowseLobbies}
                  aria-label="Browse available game lobbies"
                >
                  <RiGlobalLine className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Browse lobbies
                </Button>
              </motion.div>
            </motion.div>
          )}

          {currentView === "private-lobby" && (
            <motion.div
              key="private-lobby-view"
              className="w-full h-full flex flex-col items-center justify-start pt-8 sm:pt-12"
              variants={lobbyEnterVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <PrivateLobbySection
                onBackToMain={handleBackToMain}
                onJoinLobby={async () => {
                  toast.success("Joining lobby...");
                  return Promise.resolve();
                }}
                onCreateLobby={async () => {
                  toast.success("Creating lobby...");
                  return Promise.resolve("");
                }}
                isLoading={false}
                error={null}
                createdLobbyCode=""
                joinSuccess={false}
                className="w-full h-full flex flex-col items-center justify-start"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNavigation />
    </section>
  );
}
