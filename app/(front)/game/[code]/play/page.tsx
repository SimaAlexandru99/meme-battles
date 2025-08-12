import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { GamePlay } from "@/components/game-play";
import { GameRedirect } from "@/components/game-redirect";

interface GamePlayPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function GamePlayPage({ params }: GamePlayPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  const { code } = await params;

  // Validate lobby code format (5 characters, alphanumeric)
  if (!code || code.length !== 5 || !/^[A-Z0-9]+$/.test(code)) {
    redirect("/");
  }

  return (
    <GameRedirect lobbyCode={code}>
      <GamePlay lobbyCode={code} currentUser={currentUser} />
    </GameRedirect>
  );
}
