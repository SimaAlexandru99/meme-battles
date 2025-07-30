import HeroSection from "@/components/hero-section";
import HowToPlay from "@/components/how-to-play";
import { getCurrentUser } from "@/lib/actions/auth.action";

export default async function Home() {
  const currentUser = await getCurrentUser();

  return (
    <main>
      <HeroSection initialUserData={currentUser} />
      <HowToPlay />
    </main>
  );
}
