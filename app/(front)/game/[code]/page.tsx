import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { GameLobby } from "@/components/game-lobby";

interface GameLobbyPageProps {
  params: {
    code: string;
  };
}

export default async function GameLobbyPage({ params }: GameLobbyPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  // Validate lobby code format (5 characters, alphanumeric)
  const { code } = params;
  if (!code || code.length !== 5 || !/^[A-Z0-9]+$/.test(code)) {
    redirect("/");
  }

  return <GameLobby lobbyCode={code} currentUser={currentUser} />;
}
