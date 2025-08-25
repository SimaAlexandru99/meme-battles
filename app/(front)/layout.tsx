import type { ReactNode } from "react";
import AnonymousAuthProvider from "@/components/anonymous-auth-provider";
import FirstTimeSetupProvider from "@/components/first-time-setup-provider";
import { getCurrentUser, isAuthenticated } from "@/lib/actions/auth.action";

const Frontlayout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  const currentUser = await getCurrentUser();

  // Check if user needs anonymous authentication
  const needsAnonymousAuth = !isUserAuthenticated;

  return (
    <AnonymousAuthProvider
      needsAuth={needsAnonymousAuth}
      currentUser={currentUser}
      initialUserData={currentUser}
    >
      <FirstTimeSetupProvider initialUserData={currentUser}>
        {children}
      </FirstTimeSetupProvider>
    </AnonymousAuthProvider>
  );
};

export default Frontlayout;
