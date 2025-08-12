"use client";

import { useState, useEffect } from "react";

// Import types from global definitions
import { isFirstTimeUser } from "@/lib/actions/auth.action";
import { useCurrentUser, useIsAnonymous } from "@/hooks/useCurrentUser";
import FirstTimeSetupDialog from "./first-time-setup-dialog";
import * as Sentry from "@sentry/nextjs";

interface FirstTimeSetupProviderProps {
  children: React.ReactNode;
  initialUserData?: User | null;
}

export default function FirstTimeSetupProvider({
  children,
  initialUserData,
}: FirstTimeSetupProviderProps) {
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { user: currentUser, isLoading } = useCurrentUser(initialUserData);
  const { isAnonymous } = useIsAnonymous();

  useEffect(() => {
    const checkFirstTimeUser = async () => {
      // Don't check if still loading user data
      if (isLoading) return;

      try {
        await Sentry.startSpan(
          {
            op: "ui.provider.check_first_time",
            name: "Check First Time User Provider",
          },
          async (span) => {
            const needsSetup = await isFirstTimeUser();

            // Only show dialog for authenticated users (not anonymous)
            if (needsSetup && currentUser && !isAnonymous) {
              setShowSetupDialog(true);
              span.setAttribute("dialog.shown", true);
            } else {
              span.setAttribute("dialog.shown", false);
            }
          }
        );
      } catch (error) {
        console.error("Error checking first-time user status:", error);
        Sentry.captureException(error);
      } finally {
        setIsChecking(false);
      }
    };

    // Small delay to ensure authentication is complete (reduced from 1000ms)
    const timer = setTimeout(checkFirstTimeUser, 500);
    return () => clearTimeout(timer);
  }, [currentUser, isAnonymous, isLoading]);

  const handleCloseDialog = () => {
    setShowSetupDialog(false);

    // Dispatch custom event to notify other components that user setup is complete
    // This allows hero section to refresh user data without full page reload
    window.dispatchEvent(new CustomEvent("userSetupComplete"));
  };

  // Don't render children until we've checked the user status
  if (isChecking || isLoading) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <FirstTimeSetupDialog
        isOpen={showSetupDialog}
        onClose={handleCloseDialog}
        currentUser={currentUser || null}
      />
    </>
  );
}
