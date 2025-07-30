import { NextRequest, NextResponse } from "next/server";
import { auth as adminAuth, db as adminDb } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import * as Sentry from "@sentry/nextjs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/lobby/[code]/start",
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

        // Check if user is the host
        if (lobbyData.hostUid !== decodedToken.uid) {
          return NextResponse.json(
            { error: "Only the host can start the game" },
            { status: 403 }
          );
        }

        // Check if lobby has enough players (minimum 2)
        if (!lobbyData.players || lobbyData.players.length < 2) {
          return NextResponse.json(
            { error: "Need at least 2 players to start the game" },
            { status: 400 }
          );
        }

        // Check if game has already started
        if (lobbyData.status === "started") {
          return NextResponse.json(
            { error: "Game has already started" },
            { status: 409 }
          );
        }

        // Update lobby status to started
        await lobbyRef.update({
          status: "started",
          updatedAt: FieldValue.serverTimestamp(),
          gameStartedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
          success: true,
          message: "Game started successfully",
        });
      } catch (error) {
        Sentry.captureException(error);
        console.error("Error starting game:", error);
        return NextResponse.json(
          { error: "Failed to start game" },
          { status: 500 }
        );
      }
    }
  );
}
