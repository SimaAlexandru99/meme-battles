import { Arena } from "@/components/arena";
import { getCurrentUser } from "@/lib/actions/auth.action";

export default async function ArenaPage() {
  const currentUser = await getCurrentUser();

  // Demo lobby code for testing
  const demoLobbyCode = "DEMO1";

  return <Arena lobbyCode={demoLobbyCode} currentUser={currentUser as User} />;
}
