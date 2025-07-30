import { NextRequest, NextResponse } from "next/server";
import { auth as adminAuth, db as adminDb } from "@/firebase/admin";
import * as Sentry from "@sentry/nextjs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/lobby/[code]",
    },
    async () => {
      try {
        const { code } = await params;

        // Validate invitation code
        if (!code || typeof code !== "string") {
          return NextResponse.json(
            { error: "Invalid invitation code" },
            { status: 400 }
          );
        }

        // Normalize invitation code (uppercase, alphanumeric only)
        const normalizedCode = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

        if (normalizedCode.length !== 5) {
          return NextResponse.json(
            { error: "Invitation code must be 5 characters long" },
            { status: 400 }
          );
        }

        // Get the Authorization header
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
          );
        }

        const idToken = authHeader.substring(7);

        // Verify the ID token
        let decodedToken;
        try {
          decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch (error) {
          console.error("Error verifying ID token:", error);
          return NextResponse.json(
            { error: "Invalid authentication token" },
            { status: 401 }
          );
        }

        // Check if lobby exists
        const lobbyRef = adminDb.collection("lobbies").doc(normalizedCode);
        const lobbyDoc = await lobbyRef.get();

        if (!lobbyDoc.exists) {
          return NextResponse.json(
            { error: "Lobby not found" },
            { status: 404 }
          );
        }

        const lobbyData = lobbyDoc.data();
        if (!lobbyData) {
          return NextResponse.json(
            { error: "Lobby data not found" },
            { status: 404 }
          );
        }

        // Check if user is in the lobby
        const isUserInLobby =
          lobbyData.players &&
          lobbyData.players.some(
            (player: { uid: string }) => player.uid === decodedToken.uid
          );

        if (!isUserInLobby) {
          return NextResponse.json(
            { error: "You are not a member of this lobby" },
            { status: 403 }
          );
        }

        // Convert Firestore Timestamps to serializable objects
        const serializedPlayers = lobbyData.players.map((player: any) => ({
          ...player,
          joinedAt:
            player.joinedAt &&
            typeof player.joinedAt === "object" &&
            "toDate" in player.joinedAt
              ? player.joinedAt.toDate().toISOString()
              : player.joinedAt instanceof Date
                ? player.joinedAt.toISOString()
                : player.joinedAt,
        }));

        const serializedLobby = {
          ...lobbyData,
          players: serializedPlayers,
        };

        return NextResponse.json({
          success: true,
          lobby: serializedLobby,
        });
      } catch (error) {
        Sentry.captureException(error);
        console.error("Error fetching lobby:", error);
        return NextResponse.json(
          { error: "Failed to fetch lobby" },
          { status: 500 }
        );
      }
    }
  );
}
