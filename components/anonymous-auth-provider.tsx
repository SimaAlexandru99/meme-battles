"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { signInAsGuest } from "@/firebase/client";
import { signInAsGuest as signInAsGuestAction } from "@/lib/actions/auth.action";

interface AnonymousAuthProviderProps {
  children: ReactNode;
  needsAuth: boolean;
  currentUser: User | null;
  initialUserData?: User | null;
}

export default function AnonymousAuthProvider({
  children,
  needsAuth,
  currentUser,
}: AnonymousAuthProviderProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const hasAttemptedAuth = useRef(false);

  useEffect(() => {
    const handleAnonymousAuth = async () => {
      // Only authenticate if:
      // 1. User needs auth
      // 2. We're not already authenticating
      // 3. No current user exists
      // 4. We haven't already attempted authentication
      if (
        !needsAuth ||
        isAuthenticating ||
        currentUser ||
        hasAttemptedAuth.current
      ) {
        console.log("Anonymous auth skipped:", {
          needsAuth,
          isAuthenticating,
          hasCurrentUser: !!currentUser,
          hasAttemptedAuth: hasAttemptedAuth.current,
        });
        return;
      }

      // Mark that we've attempted authentication to prevent loops
      hasAttemptedAuth.current = true;
      setIsAuthenticating(true);
      setAuthError(null);

      try {
        console.log("Automatically signing in as guest...");

        // Sign in anonymously with Firebase
        const { user, displayName } = await signInAsGuest();
        console.log("Anonymous sign-in successful:", {
          user: !!user,
          displayName,
        });

        // Get ID token and create server session
        const idToken = await user.getIdToken();
        console.log("Got ID token:", !!idToken);

        const result = await signInAsGuestAction({
          idToken,
          displayName,
        });

        if (result.success) {
          console.log("Anonymous authentication successful:", result.message);
          // Dispatch event to notify components of authentication change
          window.dispatchEvent(new CustomEvent("userAuthenticated"));
          // Reload the page to get fresh server-side data
          window.location.reload();
        } else {
          throw new Error(result.message);
        }
      } catch (error) {
        console.error("Failed to authenticate as guest:", error);
        setAuthError(
          error instanceof Error ? error.message : "Authentication failed",
        );
        // Reset the attempt flag on error so user can retry
        hasAttemptedAuth.current = false;
      } finally {
        setIsAuthenticating(false);
      }
    };

    handleAnonymousAuth();
  }, [needsAuth, isAuthenticating, currentUser]);

  // Reset attempt flag when a user changes (for logout scenarios)
  useEffect(() => {
    if (currentUser) {
      hasAttemptedAuth.current = false;
    }
  }, [currentUser]);

  // Show loading state while authenticating
  if (needsAuth && isAuthenticating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white text-lg font-bangers">
            Setting up your meme battle experience...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (needsAuth && authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-white text-2xl font-bangers mb-4">
            Authentication Failed
          </h2>
          <p className="text-gray-300 mb-6">{authError}</p>
          <button
            onClick={() => {
              hasAttemptedAuth.current = false;
              setAuthError(null);
              window.location.reload();
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bangers transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
