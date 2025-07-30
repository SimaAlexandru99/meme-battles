import { NextRequest, NextResponse } from "next/server";
import { auth as adminAuth, db as adminDb } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import * as Sentry from "@sentry/nextjs";

/**
 * Generates a random 5-character alphanumeric invitation code
 * @returns A random invitation code
 */
function generateInvitationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generates a unique invitation code that doesn't already exist
 * @returns A unique invitation code
 */
async function generateUniqueInvitationCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateInvitationCode();
    const lobbyRef = adminDb.collection("lobbies").doc(code);
    const lobbyDoc = await lobbyRef.get();

    if (!lobbyDoc.exists) {
      return code;
    }

    attempts++;
  }

  throw new Error("Failed to generate unique invitation code");
}

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/lobby/create",
    },
    async () => {
      try {
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

        // Generate unique invitation code
        const invitationCode = await generateUniqueInvitationCode();

        // Create lobby data
        const lobbyData = {
          code: invitationCode,
          hostUid: decodedToken.uid,
          hostDisplayName: decodedToken.name || "Anonymous Host",
          status: "waiting", // waiting, started, finished
          maxPlayers: 8,
          players: [
            {
              uid: decodedToken.uid,
              displayName: decodedToken.name || "Anonymous Host",
              joinedAt: new Date(),
              isHost: true,
            },
          ],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          settings: {
            rounds: 3,
            timeLimit: 60, // seconds per round
            categories: ["funny", "reaction", "anime", "gaming"],
          },
        };

        // Save lobby to Firestore
        const lobbyRef = adminDb.collection("lobbies").doc(invitationCode);
        await lobbyRef.set(lobbyData);

        return NextResponse.json({
          success: true,
          lobby: lobbyData,
        });
      } catch (error) {
        Sentry.captureException(error);
        console.error("Error creating lobby:", error);
        return NextResponse.json(
          { error: "Failed to create lobby" },
          { status: 500 }
        );
      }
    }
  );
}
