"use client";

import { useState, useEffect } from "react";
import {
  isFirstTimeUser,
  getCurrentUser,
  isAnonymousUser,
} from "@/lib/actions/auth.action";
import FirstTimeSetupDialog from "./first-time-setup-dialog";
import * as Sentry from "@sentry/nextjs";

interface FirstTimeSetupProviderProps {
  children: React.ReactNode;
}

export default function FirstTimeSetupProvider({
  children,
}: FirstTimeSetupProviderProps) {
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        Sentry.startSpan(
          {
            op: "ui.provider.check_first_time",
            name: "Check First Time User Provider",
          },
          async (span) => {
            const user = await getCurrentUser();
            const needsSetup = await isFirstTimeUser();
            const isAnonymous = await isAnonymousUser();

            setCurrentUser(user);

            // Only show dialog for authenticated users (not anonymous)
            if (needsSetup && user && !isAnonymous) {
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
  }, []);

  const handleCloseDialog = () => {
    setShowSetupDialog(false);

    // Dispatch custom event to notify other components that user setup is complete
    // This allows hero section to refresh user data without full page reload
    window.dispatchEvent(new CustomEvent("userSetupComplete"));
  };

  // Don't render children until we've checked the user status
  if (isChecking) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <FirstTimeSetupDialog
        isOpen={showSetupDialog}
        onClose={handleCloseDialog}
        currentUser={currentUser}
      />
    </>
  );
}
