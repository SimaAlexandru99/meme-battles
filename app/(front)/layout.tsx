import { isAuthenticated, getCurrentUser } from "@/lib/actions/auth.action";
import { ReactNode } from "react";
import AnonymousAuthProvider from "@/components/anonymous-auth-provider";
import FirstTimeSetupProvider from "@/components/first-time-setup-provider";

const Frontlayout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  const currentUser = await getCurrentUser();

  // Check if user needs anonymous authentication
  const needsAnonymousAuth = !isUserAuthenticated;

  // Debug: currentUser state for development
  // console.log("currentUser", currentUser);

  return (
    <AnonymousAuthProvider
      needsAuth={needsAnonymousAuth}
      currentUser={currentUser}
    >
      <FirstTimeSetupProvider>{children}</FirstTimeSetupProvider>
    </AnonymousAuthProvider>
  );
};

export default Frontlayout;
