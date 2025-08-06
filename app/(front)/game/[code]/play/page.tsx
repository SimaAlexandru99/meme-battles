import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { GamePlay } from "@/components/game-play";

interface GamePlayPageProps {
  params: {
    code: string;
  };
}

export default async function GamePlayPage({ params }: GamePlayPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  // Validate lobby code format (5 characters, alphanumeric)
  const { code } = params;
  if (!code || code.length !== 5 || !/^[A-Z0-9]+$/.test(code)) {
    redirect("/");
  }

  return <GamePlay lobbyCode={code} currentUser={currentUser} />;
}
