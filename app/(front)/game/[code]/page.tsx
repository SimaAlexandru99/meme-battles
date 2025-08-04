import { Suspense } from "react";
import { GameLobby } from "@/components/game-lobby";
import { getCurrentUser } from "@/lib/actions/auth.action";

import { GameLobbyLoading } from "@/components/game-lobby-loading";

async function GameLobbyPageContent({ code }: { code: string }) {
  const currentUser = await getCurrentUser();

  return <GameLobby lobbyCode={code} currentUser={currentUser as User} />;
}

export default async function GameLobbyPage({ params }: GameLobbyPageProps) {
  const { code } = await params;

  return (
    <Suspense fallback={<GameLobbyLoading />}>
      <GameLobbyPageContent code={code} />
    </Suspense>
  );
}
