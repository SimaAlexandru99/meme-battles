import * as Sentry from "@sentry/nextjs";
import { auth } from "@/firebase/client";

export interface LobbyPlayer {
  uid: string;
  displayName: string;
  joinedAt: Date; // Date object
  isHost: boolean;
}

export interface LobbySettings {
  rounds: number;
  timeLimit: number;
  categories: string[];
}

export interface Lobby {
  code: string;
  hostUid: string;
  hostDisplayName: string;
  status: "waiting" | "started" | "finished";
  maxPlayers: number;
  players: LobbyPlayer[];
  createdAt: Date | FirebaseFirestore.Timestamp; // Can be either Date or Firestore timestamp
  updatedAt: Date | FirebaseFirestore.Timestamp; // Can be either Date or Firestore timestamp
  settings: LobbySettings;
}

export interface JoinLobbyResponse {
  success: boolean;
  lobby: Lobby;
}

export interface CreateLobbyResponse {
  success: boolean;
  lobby: Lobby;
}

export interface ApiError {
  error: string;
}

/**
 * Joins a lobby with the given invitation code
 * @param invitationCode - The 5-character invitation code
 * @returns Promise with lobby data or error
 */
export async function joinLobby(
  invitationCode: string
): Promise<JoinLobbyResponse> {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `POST /api/lobby/join`,
    },
    async () => {
      try {
        // Get the current user's ID token
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("Authentication required");
        }

        const idToken = await currentUser.getIdToken();

        const response = await fetch("/api/lobby/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ invitationCode }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to join lobby");
        }

        return data as JoinLobbyResponse;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Creates a new lobby and returns the invitation code
 * @returns Promise with lobby data or error
 */
export async function createLobby(): Promise<CreateLobbyResponse> {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `POST /api/lobby/create`,
    },
    async () => {
      try {
        // Get the current user's ID token
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error("Authentication required");
        }

        const idToken = await currentUser.getIdToken();

        const response = await fetch("/api/lobby/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create lobby");
        }

        return data as CreateLobbyResponse;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Validates an invitation code format
 * @param code - The invitation code to validate
 * @returns Boolean indicating if the code is valid
 */
export function validateInvitationCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }

  // Check if code is exactly 5 characters and alphanumeric
  const normalizedCode = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return normalizedCode.length === 5;
}

/**
 * Normalizes an invitation code (uppercase, alphanumeric only)
 * @param code - The invitation code to normalize
 * @returns Normalized invitation code
 */
export function normalizeInvitationCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}
