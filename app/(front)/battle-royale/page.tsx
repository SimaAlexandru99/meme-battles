"use client";

import { useRouter } from "next/navigation";
import { BattleRoyaleInterface } from "@/components/battle-royale-interface";

export default function BattleRoyalePage() {
  const router = useRouter();

  const handleBackToMain = () => {
    router.push("/");
  };

  return <BattleRoyaleInterface onBackToMain={handleBackToMain} />;
}
