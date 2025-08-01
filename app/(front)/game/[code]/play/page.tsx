import { Suspense } from "react";
import { GamePlay } from "@/components/game-play";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { notFound } from "next/navigation";
import { GamePlayLoading } from "@/components/game-play-loading";

async function GamePlayPageContent({ code }: { code: string }) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    notFound();
  }

  return <GamePlay lobbyCode={code} currentUser={currentUser} />;
}

export default async function GamePlayPage({ params }: GamePlayPageProps) {
  const { code } = await params;

  return (
    <Suspense fallback={<GamePlayLoading />}>
      <GamePlayPageContent code={code} />
    </Suspense>
  );
}
