import { NextRequest, NextResponse } from "next/server";
import { auth as adminAuth, db as adminDb } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/lobby/join",
    },
    async () => {
      try {
        const { invitationCode } = await request.json();

        // Validate invitation code
        if (!invitationCode || typeof invitationCode !== "string") {
          return NextResponse.json(
            { error: "Invalid invitation code" },
            { status: 400 }
          );
        }

        // Normalize invitation code (uppercase, alphanumeric only)
        const normalizedCode = invitationCode
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();

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

        // Check if lobby is full (max 8 players)
        if (lobbyData.players && lobbyData.players.length >= 8) {
          return NextResponse.json({ error: "Lobby is full" }, { status: 409 });
        }

        // Check if user is already in the lobby
        if (
          lobbyData.players &&
          lobbyData.players.some(
            (player: { uid: string }) => player.uid === decodedToken.uid
          )
        ) {
          return NextResponse.json(
            { error: "You are already in this lobby" },
            { status: 409 }
          );
        }

        // Check if lobby has started
        if (lobbyData.status === "started") {
          return NextResponse.json(
            { error: "Game has already started" },
            { status: 409 }
          );
        }

        // Add user to lobby
        const playerData = {
          uid: decodedToken.uid,
          displayName: decodedToken.name || "Anonymous Player",
          joinedAt: new Date(),
          isHost: false,
        };

        await lobbyRef.update({
          players: FieldValue.arrayUnion(playerData),
          updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
          success: true,
          lobby: {
            code: normalizedCode,
            ...lobbyData,
            players: [...(lobbyData.players || []), playerData],
          },
        });
      } catch (error) {
        Sentry.captureException(error);
        console.error("Error joining lobby:", error);
        return NextResponse.json(
          { error: "Failed to join lobby" },
          { status: 500 }
        );
      }
    }
  );
}
