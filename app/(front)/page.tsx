import HeroSection from "@/components/hero-section";
import HowToPlay from "@/components/how-to-play";
import { getCurrentUser } from "@/lib/actions/auth.action";
import AnonymousAuthProvider from "@/components/anonymous-auth-provider";

export default async function Home() {
  const currentUser = await getCurrentUser();

  return (
    <main>
      <AnonymousAuthProvider
        needsAuth={!currentUser}
        currentUser={currentUser}
        initialUserData={currentUser}
      >
        <HeroSection initialUserData={currentUser} />
        <HowToPlay />
      </AnonymousAuthProvider>
    </main>
  );
}
