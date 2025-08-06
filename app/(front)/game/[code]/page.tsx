import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { GameLobby } from "@/components/game-lobby";
import { GameRedirect } from "@/components/game-redirect";

interface GameLobbyPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function GameLobbyPage({ params }: GameLobbyPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  // Await the params to get the code
  const { code } = await params;

  // Validate lobby code format (5 characters, alphanumeric)
  if (!code || code.length !== 5 || !/^[A-Z0-9]+$/.test(code)) {
    redirect("/");
  }

  return (
    <GameRedirect lobbyCode={code}>
      <GameLobby lobbyCode={code} currentUser={currentUser} />
    </GameRedirect>
  );
}
