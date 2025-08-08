"use client";

import { Arena } from "@/components/arena";
import type { User } from "@/types/index";

interface GamePlayProps {
  lobbyCode: string;
  currentUser: User;
}

export function GamePlay({ lobbyCode, currentUser }: GamePlayProps) {
  return <Arena lobbyCode={lobbyCode} currentUser={currentUser} />;
}
