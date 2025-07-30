import { ReactNode } from "react";
import AnonymousAuthProvider from "@/components/anonymous-auth-provider";
import FirstTimeSetupProvider from "@/components/first-time-setup-provider";
import AdBannerContainer from "@/components/ad-banner-container";
import { ActiveGameCheck } from "@/components/active-game-check";
import {
  isAuthenticated,
  getCurrentUser,
  getUserActiveLobby,
} from "@/lib/actions/auth.action";

const Frontlayout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  const currentUser = await getCurrentUser();

  // Check if user needs anonymous authentication
  const needsAnonymousAuth = !isUserAuthenticated;

  // Check if user is in an active game
  let activeLobby = null;
  if (currentUser) {
    activeLobby = await getUserActiveLobby(currentUser.id);
  }

  return (
    <>
      <AdBannerContainer />
      <AnonymousAuthProvider
        needsAuth={needsAnonymousAuth}
        currentUser={currentUser}
        initialUserData={currentUser}
      >
        <FirstTimeSetupProvider initialUserData={currentUser}>
          {children}

          {/* Show active game prompt if user is in a game */}
          {activeLobby && currentUser && (
            <ActiveGameCheck
              activeLobby={activeLobby}
              currentUserId={currentUser.id}
            />
          )}
        </FirstTimeSetupProvider>
      </AnonymousAuthProvider>
    </>
  );
};

export default Frontlayout;
