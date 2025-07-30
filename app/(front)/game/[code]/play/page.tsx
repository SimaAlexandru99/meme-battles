import { Suspense } from "react";
import { GamePlay } from "@/components/game-play";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { notFound } from "next/navigation";

// Import types from global definitions

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
    <Suspense fallback={<div>Loading game...</div>}>
      <GamePlayPageContent code={code} />
    </Suspense>
  );
}
