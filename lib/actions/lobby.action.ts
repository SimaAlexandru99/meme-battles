"use server";

import { auth, db } from "@/firebase/admin";
import * as Sentry from "@sentry/nextjs";
import { Timestamp } from "firebase/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { cookies } from "next/headers";
import { aiPlayerManager } from "@/lib/ai/ai-player-manager";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Lobby settings
const DEFAULT_MAX_PLAYERS = 8;
const DEFAULT_ROUNDS = 5;
const DEFAULT_TIME_LIMIT = 60; // seconds
const DEFAULT_CATEGORIES = ["funny", "wholesome", "random"];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a random 5-character invitation code
 * @returns 5-character alphanumeric code
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
 * Validates an invitation code format
 * @param code - The invitation code to validate
 * @returns Boolean indicating if the code is valid
 */
function validateInvitationCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }
  const normalizedCode = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return normalizedCode.length === 5;
}

/**
 * Normalizes an invitation code (uppercase, alphanumeric only)
 * @param code - The invitation code to normalize
 * @returns Normalized invitation code
 */
function normalizeInvitationCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/**
 * Gets user display name from Firestore
 * @param uid - User ID
 * @returns User display name or "Anonymous Player"
 */
async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.name || "Anonymous Player";
    }
    return "Anonymous Player";
  } catch (error) {
    console.error("Error fetching user display name:", error);
    return "Anonymous Player";
  }
}

/**
 * Gets user profile URL from Firestore
 * @param uid - User ID
 * @returns User profile URL or null
 */
async function getUserProfileURL(uid: string): Promise<string | null> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.profileURL || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile URL:", error);
    return null;
  }
}

/**
 * Serializes a Firestore Timestamp to ISO string
 * @param timestamp - Firestore Timestamp, Date, or string
 * @returns ISO string representation
 */
function serializeTimestamp(timestamp: Timestamp | Date | string): string {
  if (
    timestamp &&
    typeof timestamp === "object" &&
    "toDate" in timestamp &&
    timestamp.toDate
  ) {
    return timestamp.toDate().toISOString();
  }
  if (typeof timestamp === "string") {
    return timestamp;
  }
  return new Date().toISOString();
}

// ============================================================================
// LOBBY CREATION FUNCTIONS
// ============================================================================

/**
 * Creates a new lobby with the current user as host
 * @param settings - Optional lobby settings
 * @returns Created lobby data or error
 */
export async function createLobby(settings?: {
  maxPlayers?: number;
  rounds?: number;
  timeLimit?: number;
  categories?: string[];
}) {
  return Sentry.startSpan(
    {
      op: "lobby.create",
      name: "Create Lobby",
    },
    async (span) => {
      try {
        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session cookie
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        span.setAttribute("user.uid", uid);

        // Get user display name and profile URL
        const [displayName, profileURL] = await Promise.all([
          getUserDisplayName(uid),
          getUserProfileURL(uid),
        ]);

        // Generate unique invitation code
        let invitationCode: string;
        let attempts = 0;
        const maxAttempts = 10;

        do {
          invitationCode = generateInvitationCode();
          const existingLobby = await db
            .collection("lobbies")
            .doc(invitationCode)
            .get();
          if (!existingLobby.exists) break;
          attempts++;
        } while (attempts < maxAttempts);

        if (attempts >= maxAttempts) {
          throw new Error("Failed to generate unique invitation code");
        }

        // Prepare lobby data
        const lobbyData = {
          code: invitationCode,
          hostUid: uid,
          hostDisplayName: displayName,
          status: "waiting" as const,
          maxPlayers: settings?.maxPlayers || DEFAULT_MAX_PLAYERS,
          players: [
            {
              uid,
              displayName,
              profileURL,
              joinedAt: new Date().toISOString(),
              isHost: true,
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          settings: {
            rounds: settings?.rounds || DEFAULT_ROUNDS,
            timeLimit: settings?.timeLimit || DEFAULT_TIME_LIMIT,
            categories: settings?.categories || DEFAULT_CATEGORIES,
          },
        };

        // Save lobby to Firestore
        await db.collection("lobbies").doc(invitationCode).set(lobbyData);

        span.setAttribute("lobby.code", invitationCode);
        span.setAttribute("lobby.max_players", lobbyData.maxPlayers);

        return {
          success: true,
          lobby: lobbyData,
        };
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

// ============================================================================
// LOBBY JOINING FUNCTIONS
// ============================================================================

/**
 * Joins a lobby with the given invitation code
 * @param invitationCode - The 5-character invitation code
 * @returns Updated lobby data or error
 */
export async function joinLobby(invitationCode: string) {
  return Sentry.startSpan(
    {
      op: "lobby.join",
      name: "Join Lobby",
    },
    async (span) => {
      try {
        // Validate invitation code
        if (!validateInvitationCode(invitationCode)) {
          throw new Error("Invalid invitation code format");
        }

        const normalizedCode = normalizeInvitationCode(invitationCode);
        span.setAttribute("lobby.code", normalizedCode);

        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session cookie
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        span.setAttribute("user.uid", uid);

        // Check if lobby exists
        const lobbyRef = db.collection("lobbies").doc(normalizedCode);
        const lobbyDoc = await lobbyRef.get();

        if (!lobbyDoc.exists) {
          throw new Error("Lobby not found");
        }

        const lobbyData = lobbyDoc.data();
        if (!lobbyData) {
          throw new Error("Lobby data not found");
        }

        // Check if lobby is full
        if (lobbyData.players.length >= lobbyData.maxPlayers) {
          throw new Error("Lobby is full");
        }

        // Check if user is already in the lobby
        const isUserInLobby = lobbyData.players.some(
          (player: { uid: string }) => player.uid === uid,
        );

        if (isUserInLobby) {
          throw new Error("You are already in this lobby");
        }

        // Get user display name and profile URL
        const [displayName, profileURL] = await Promise.all([
          getUserDisplayName(uid),
          getUserProfileURL(uid),
        ]);

        // Add player to lobby
        const newPlayer = {
          uid,
          displayName,
          profileURL,
          joinedAt: new Date().toISOString(),
          isHost: false,
        };

        await lobbyRef.update({
          players: FieldValue.arrayUnion(newPlayer),
          updatedAt: new Date().toISOString(),
        });

        // Get updated lobby data
        const updatedLobbyDoc = await lobbyRef.get();
        const updatedLobbyData = updatedLobbyDoc.data();

        // Initialize AI Player Manager if not already done
        if (!aiPlayerManager.getState().isInitialized) {
          await aiPlayerManager.initialize();
        }

        // Balance AI players after human joins
        if (updatedLobbyData?.settings?.aiSettings?.enabled) {
          const humanPlayerCount = updatedLobbyData.players.filter(
            (player: LobbyPlayer) => !player.isAI,
          ).length;

          await aiPlayerManager.balanceAIPlayers(
            normalizedCode,
            humanPlayerCount,
            updatedLobbyData.settings.aiSettings,
          );

          span.setAttribute("lobby.ai_balanced", true);
          span.setAttribute("lobby.human_count", humanPlayerCount);
        }

        span.setAttribute(
          "lobby.player_count",
          updatedLobbyData?.players.length,
        );

        return {
          success: true,
          lobby: updatedLobbyData,
        };
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

// ============================================================================
// LOBBY MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Gets lobby data by invitation code
 * @param invitationCode - The 5-character invitation code
 * @returns Lobby data or error
 */
export async function getLobbyData(invitationCode: string) {
  return Sentry.startSpan(
    {
      op: "lobby.get",
      name: "Get Lobby Data",
    },
    async (span) => {
      try {
        // Validate invitation code
        if (!validateInvitationCode(invitationCode)) {
          throw new Error("Invalid invitation code format");
        }

        const normalizedCode = normalizeInvitationCode(invitationCode);
        span.setAttribute("lobby.code", normalizedCode);

        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session cookie
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        span.setAttribute("user.uid", uid);

        // Get lobby data
        const lobbyRef = db.collection("lobbies").doc(normalizedCode);
        const lobbyDoc = await lobbyRef.get();

        if (!lobbyDoc.exists) {
          throw new Error("Lobby not found");
        }

        const lobbyData = lobbyDoc.data();
        if (!lobbyData) {
          throw new Error("Lobby data not found");
        }

        // Check if user is in the lobby
        const isUserInLobby = lobbyData.players.some(
          (player: { uid: string }) => player.uid === uid,
        );

        if (!isUserInLobby) {
          throw new Error("You are not a member of this lobby");
        }

        // Initialize AI Player Manager if not already done
        if (!aiPlayerManager.getState().isInitialized) {
          await aiPlayerManager.initialize();
        }

        // Use players directly from Firebase since AI players are now stored there
        const allPlayers = lobbyData.players;

        // Migrate categories if needed
        const allowedCategories = [
          "funny",
          "wholesome",
          "dark",
          "random",
          "trending",
        ];

        const currentCategories =
          lobbyData.settings?.categories || DEFAULT_CATEGORIES;
        const validCategories = currentCategories.filter((category: string) =>
          allowedCategories.includes(category),
        );

        // If categories need migration, update the lobby
        if (validCategories.length !== currentCategories.length) {
          const finalCategories =
            validCategories.length > 0
              ? validCategories
              : ["funny", "wholesome"];

          const removedCategories = currentCategories.filter(
            (category: string) => !allowedCategories.includes(category),
          );

          console.warn(
            `Migrating lobby ${normalizedCode} categories: removed ${removedCategories.join(", ")} and replaced with ${finalCategories.join(", ")}`,
          );

          // Update the lobby with migrated categories
          await lobbyRef.update({
            "settings.categories": finalCategories,
            updatedAt: new Date().toISOString(),
          });

          // Update the lobby data for serialization
          lobbyData.settings = {
            ...lobbyData.settings,
            categories: finalCategories,
          };
        }

        // Serialize Firestore Timestamps
        const serializedPlayers = allPlayers.map((player: LobbyPlayer) => ({
          ...player,
          joinedAt: serializeTimestamp(player.joinedAt as Date),
        })) as LobbyPlayer[];

        const serializedLobby = {
          ...lobbyData,
          players: serializedPlayers,
          createdAt: serializeTimestamp(lobbyData.createdAt),
          updatedAt: serializeTimestamp(lobbyData.updatedAt),
        } as LobbyData;

        span.setAttribute("lobby.player_count", serializedLobby.players.length);
        span.setAttribute("lobby.status", serializedLobby.status);
        span.setAttribute(
          "lobby.ai_player_count",
          allPlayers.filter((p: LobbyPlayer) => p.isAI).length,
        );

        return {
          success: true,
          lobby: serializedLobby,
        };
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

/**
 * Starts a game in the lobby (host only)
 * @param invitationCode - The 5-character invitation code
 * @returns Updated lobby data or error
 */
export async function startGame(invitationCode: string) {
  return Sentry.startSpan(
    {
      op: "lobby.start_game",
      name: "Start Game",
    },
    async (span) => {
      try {
        // Validate invitation code
        if (!validateInvitationCode(invitationCode)) {
          throw new Error("Invalid invitation code format");
        }

        const normalizedCode = normalizeInvitationCode(invitationCode);
        span.setAttribute("lobby.code", normalizedCode);

        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session cookie
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        span.setAttribute("user.uid", uid);

        // Get lobby data
        const lobbyRef = db.collection("lobbies").doc(normalizedCode);
        const lobbyDoc = await lobbyRef.get();

        if (!lobbyDoc.exists) {
          throw new Error("Lobby not found");
        }

        const lobbyData = lobbyDoc.data();
        if (!lobbyData) {
          throw new Error("Lobby data not found");
        }

        // Check if user is the host
        if (lobbyData.hostUid !== uid) {
          throw new Error("Only the host can start the game");
        }

        // Check if lobby has enough players
        if (lobbyData.players.length < 2) {
          throw new Error("Need at least 2 players to start the game");
        }

        // Check if game is already started
        if (lobbyData.status !== "waiting") {
          throw new Error("Game is already in progress or finished");
        }

        // Update lobby status to started
        await lobbyRef.update({
          status: "started",
          updatedAt: new Date().toISOString(),
        });

        // Get updated lobby data
        const updatedLobbyDoc = await lobbyRef.get();
        const updatedLobbyData = updatedLobbyDoc.data();

        span.setAttribute("lobby.status", "started");
        span.setAttribute(
          "lobby.player_count",
          updatedLobbyData?.players.length,
        );

        return {
          success: true,
          lobby: updatedLobbyData,
        };
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

/**
 * Leaves a lobby
 * @param invitationCode - The 5-character invitation code
 * @returns Success response or error
 */
export async function leaveLobby(invitationCode: string) {
  return Sentry.startSpan(
    {
      op: "lobby.leave",
      name: "Leave Lobby",
    },
    async (span) => {
      try {
        // Validate invitation code
        if (!validateInvitationCode(invitationCode)) {
          throw new Error("Invalid invitation code format");
        }

        const normalizedCode = normalizeInvitationCode(invitationCode);
        span.setAttribute("lobby.code", normalizedCode);

        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session cookie
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        span.setAttribute("user.uid", uid);

        // Get lobby data
        const lobbyRef = db.collection("lobbies").doc(normalizedCode);
        const lobbyDoc = await lobbyRef.get();

        if (!lobbyDoc.exists) {
          throw new Error("Lobby not found");
        }

        const lobbyData = lobbyDoc.data();
        if (!lobbyData) {
          throw new Error("Lobby data not found");
        }

        // Find the player to remove
        const playerIndex = lobbyData.players.findIndex(
          (player: { uid: string }) => player.uid === uid,
        );

        if (playerIndex === -1) {
          throw new Error("You are not a member of this lobby");
        }

        const playerToRemove = lobbyData.players[playerIndex];

        // Remove player from lobby
        const updatedPlayers = lobbyData.players.filter(
          (player: { uid: string }) => player.uid !== uid,
        );

        // If host is leaving, assign new host or delete lobby
        if (playerToRemove.isHost) {
          if (updatedPlayers.length === 0) {
            // Delete lobby if no players left
            await lobbyRef.delete();

            // Clean up AI players for this lobby
            await aiPlayerManager.removeAllAIPlayersFromLobby(normalizedCode);

            span.setAttribute("lobby.deleted", true);
          } else {
            // Assign new host (first remaining player)
            updatedPlayers[0].isHost = true;
            await lobbyRef.update({
              players: updatedPlayers,
              hostUid: updatedPlayers[0].uid,
              hostDisplayName: updatedPlayers[0].displayName,
              updatedAt: new Date().toISOString(),
            });
            span.setAttribute("lobby.new_host", updatedPlayers[0].uid);
          }
        } else {
          // Regular player leaving
          await lobbyRef.update({
            players: updatedPlayers,
            updatedAt: new Date().toISOString(),
          });
        }

        // Initialize AI Player Manager if not already done
        if (!aiPlayerManager.getState().isInitialized) {
          await aiPlayerManager.initialize();
        }

        // Balance AI players after human leaves
        if (lobbyData?.settings?.aiSettings?.enabled) {
          const humanPlayerCount = updatedPlayers.filter(
            (player: LobbyPlayer) => !player.isAI,
          ).length;

          await aiPlayerManager.balanceAIPlayers(
            normalizedCode,
            humanPlayerCount,
            lobbyData.settings.aiSettings,
          );

          span.setAttribute("lobby.ai_balanced", true);
          span.setAttribute("lobby.human_count", humanPlayerCount);
        }

        span.setAttribute("lobby.player_count", updatedPlayers.length);

        return {
          success: true,
          message: "Successfully left the lobby",
        };
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

// ============================================================================
// LOBBY SETTINGS FUNCTIONS
// ============================================================================

/**
 * Updates lobby settings (host only)
 * @param invitationCode - The 5-character invitation code
 * @param settings - The new lobby settings
 * @returns Updated lobby data or error
 */
export async function updateLobbySettings(
  invitationCode: string,
  settings: {
    rounds: number;
    timeLimit: number;
    categories: string[];
    aiSettings?: {
      enabled: boolean;
      maxAIPlayers: number;
      minHumanPlayers: number;
      personalityPool: string[];
      autoBalance: boolean;
      difficulty: "easy" | "medium" | "hard";
    };
  },
) {
  return Sentry.startSpan(
    {
      op: "lobby.update_settings",
      name: "Update Lobby Settings",
    },
    async (span) => {
      try {
        // Validate invitation code
        if (!validateInvitationCode(invitationCode)) {
          throw new Error("Invalid invitation code format");
        }

        const normalizedCode = normalizeInvitationCode(invitationCode);
        span.setAttribute("lobby.code", normalizedCode);

        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session cookie
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        span.setAttribute("user.uid", uid);

        // Validate settings
        if (!settings.rounds || settings.rounds < 1 || settings.rounds > 10) {
          throw new Error("Rounds must be between 1 and 10");
        }

        if (
          !settings.timeLimit ||
          settings.timeLimit < 30 ||
          settings.timeLimit > 300
        ) {
          throw new Error("Time limit must be between 30 and 300 seconds");
        }

        if (!settings.categories || settings.categories.length === 0) {
          throw new Error("At least one category must be selected");
        }

        const allowedCategories = [
          "funny",
          "wholesome",
          "dark",
          "random",
          "trending",
        ];

        // Filter out invalid categories and replace with valid defaults
        const validCategories = settings.categories.filter((category) =>
          allowedCategories.includes(category),
        );

        // If no valid categories remain, use default categories
        const finalCategories =
          validCategories.length > 0 ? validCategories : ["funny", "wholesome"];

        // Log migration if categories were changed
        if (validCategories.length !== settings.categories.length) {
          const removedCategories = settings.categories.filter(
            (category) => !allowedCategories.includes(category),
          );
          console.warn(
            `Migrated lobby categories: removed ${removedCategories.join(", ")} and replaced with ${finalCategories.join(", ")}`,
          );
        }

        // Get lobby data
        const lobbyRef = db.collection("lobbies").doc(normalizedCode);
        const lobbyDoc = await lobbyRef.get();

        if (!lobbyDoc.exists) {
          throw new Error("Lobby not found");
        }

        const lobbyData = lobbyDoc.data();
        if (!lobbyData) {
          throw new Error("Lobby data not found");
        }

        // Check if user is the host
        if (lobbyData.hostUid !== uid) {
          throw new Error("Only the host can modify lobby settings");
        }

        // Check if game is already started
        if (lobbyData.status !== "waiting") {
          throw new Error("Cannot modify settings after game has started");
        }

        // Initialize AI Player Manager if not already done
        if (!aiPlayerManager.getState().isInitialized) {
          await aiPlayerManager.initialize();
        }

        // Validate AI settings if provided
        if (settings.aiSettings) {
          const aiValidationError = aiPlayerManager.validateAISettings(
            settings.aiSettings,
          );
          if (aiValidationError) {
            throw new Error(aiValidationError.message);
          }
        }

        // Update lobby settings
        const updatedSettings = {
          rounds: settings.rounds,
          timeLimit: settings.timeLimit,
          categories: finalCategories,
          ...(settings.aiSettings && { aiSettings: settings.aiSettings }),
        };

        await lobbyRef.update({
          settings: updatedSettings,
          updatedAt: new Date().toISOString(),
        });

        // Balance AI players if AI settings changed
        if (settings.aiSettings) {
          const humanPlayerCount = lobbyData.players.filter(
            (player: LobbyPlayer) => !player.isAI,
          ).length;

          await aiPlayerManager.balanceAIPlayers(
            normalizedCode,
            humanPlayerCount,
            settings.aiSettings,
          );

          span.setAttribute("lobby.ai_balanced", true);
          span.setAttribute("lobby.human_count", humanPlayerCount);
        }

        // Get updated lobby data
        const updatedLobbyDoc = await lobbyRef.get();
        const updatedLobbyData = updatedLobbyDoc.data();

        // Get AI players for this lobby
        const aiPlayersAsLobbyPlayers =
          aiPlayerManager.getAIPlayersAsLobbyPlayers(normalizedCode);

        // Merge AI players with human players
        const allPlayers = [
          ...(updatedLobbyData?.players || []),
          ...aiPlayersAsLobbyPlayers,
        ];

        // Serialize Firestore Timestamps
        const serializedPlayers = allPlayers.map((player: LobbyPlayer) => ({
          ...player,
          joinedAt: serializeTimestamp(player.joinedAt as Date),
        }));

        const serializedLobby = {
          ...updatedLobbyData,
          players: serializedPlayers,
          createdAt: serializeTimestamp(updatedLobbyData?.createdAt),
          updatedAt: serializeTimestamp(updatedLobbyData?.updatedAt),
        } as LobbyData;

        span.setAttribute("lobby.rounds", settings.rounds);
        span.setAttribute("lobby.time_limit", settings.timeLimit);
        span.setAttribute("lobby.categories", finalCategories.join(","));
        span.setAttribute(
          "lobby.ai_player_count",
          aiPlayersAsLobbyPlayers.length,
        );

        return {
          success: true,
          lobby: serializedLobby,
          message: "Settings updated successfully",
        };
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

// ============================================================================
// LOBBY QUERY FUNCTIONS
// ============================================================================

/**
 * Gets all active lobbies for a user
 * @returns Array of active lobbies
 */
export async function getUserActiveLobbies() {
  return Sentry.startSpan(
    {
      op: "lobby.get_user_active",
      name: "Get User Active Lobbies",
    },
    async (span) => {
      try {
        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session cookie
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        span.setAttribute("user.uid", uid);

        // Query for lobbies where user is a player
        // Note: Firebase Admin SDK doesn't support array-contains with objects
        // We'll need to fetch all lobbies and filter client-side
        const lobbiesSnapshot = await db.collection("lobbies").get();

        const activeLobbies = [];

        for (const doc of lobbiesSnapshot.docs) {
          const lobbyData = doc.data();

          // Check if user is in this lobby
          const isUserInLobby = lobbyData.players.some(
            (player: LobbyPlayer) => player.uid === uid,
          );

          if (!isUserInLobby) {
            continue;
          }

          // Serialize Firestore Timestamps
          const serializedPlayers = lobbyData.players.map(
            (player: LobbyPlayer) => ({
              ...player,
              joinedAt: serializeTimestamp(player.joinedAt as Date),
            }),
          ) as LobbyPlayer[];

          const serializedLobby = {
            ...lobbyData,
            players: serializedPlayers,
            createdAt: serializeTimestamp(lobbyData.createdAt),
            updatedAt: serializeTimestamp(lobbyData.updatedAt),
          } as LobbyData;

          activeLobbies.push(serializedLobby);
        }

        span.setAttribute("lobby.count", activeLobbies.length);

        return {
          success: true,
          lobbies: activeLobbies,
        };
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

export async function addAIPlayerToLobby(
  invitationCode: string,
  botConfig: {
    personalityId: string;
    difficulty: "easy" | "medium" | "hard";
  },
) {
  return Sentry.startSpan(
    {
      op: "lobby.ai.add",
      name: "Add AI Player to Lobby",
    },
    async (span) => {
      try {
        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        // Get lobby reference
        const lobbyRef = db.collection("lobbies").doc(invitationCode);
        const lobbyDoc = await lobbyRef.get();

        if (!lobbyDoc.exists) {
          throw new Error("Lobby not found");
        }

        const lobbyData = lobbyDoc.data() as Lobby;

        // Check if user is host
        if (lobbyData.hostUid !== uid) {
          throw new Error("Only the host can add AI players");
        }

        // Check if lobby is full
        if (lobbyData.players.length >= lobbyData.maxPlayers) {
          throw new Error("Lobby is full");
        }

        // Initialize AI Player Manager if not already done
        if (!aiPlayerManager.getState().isInitialized) {
          await aiPlayerManager.initialize();
        }

        // Create the AI player
        const aiPlayer = await aiPlayerManager.createAIPlayer({
          lobbyCode: invitationCode,
          personalityId: botConfig.personalityId,
          forcePersonality: true,
          maxPlayers: lobbyData.maxPlayers,
        });

        // Convert AI player to lobby player format
        const aiPlayerAsLobbyPlayer =
          aiPlayerManager.convertToLobbyPlayer(aiPlayer);

        // Add AI player to Firebase document
        await lobbyRef.update({
          players: FieldValue.arrayUnion(aiPlayerAsLobbyPlayer),
          updatedAt: new Date().toISOString(),
        });

        // Get updated lobby data from Firebase (which now includes the new AI player)
        const updatedLobbyDoc = await lobbyRef.get();
        const updatedLobbyData = updatedLobbyDoc.data();

        // Serialize the response to avoid passing complex objects to client
        const serializedPlayers =
          updatedLobbyData?.players.map((player: LobbyPlayer) => ({
            ...player,
            joinedAt:
              typeof player.joinedAt === "string"
                ? player.joinedAt
                : typeof player.joinedAt === "object" &&
                    "toDate" in player.joinedAt
                  ? player.joinedAt.toDate().toISOString()
                  : new Date(player.joinedAt as Date).toISOString(),
          })) || [];

        // Set Sentry attributes
        span.setAttribute("lobby.code", invitationCode);
        span.setAttribute("lobby.ai_personality", botConfig.personalityId);
        span.setAttribute("lobby.ai_difficulty", botConfig.difficulty);
        span.setAttribute(
          "lobby.ai_count",
          serializedPlayers.filter((p: LobbyPlayer) => p.isAI).length,
        );
        span.setAttribute("lobby.ai_player_id", aiPlayer.id);

        return {
          success: true,
          lobby: {
            ...updatedLobbyData,
            players: serializedPlayers,
          },
          message: "AI player added successfully",
        };
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

export async function removeAIPlayerFromLobby(
  invitationCode: string,
  aiPlayerId: string,
) {
  return Sentry.startSpan(
    {
      op: "lobby.ai.remove",
      name: "Remove AI Player from Lobby",
    },
    async (span) => {
      try {
        console.log("removeAIPlayerFromLobby called with:", {
          invitationCode,
          aiPlayerId,
        });

        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        // Get lobby reference
        const lobbyRef = db.collection("lobbies").doc(invitationCode);
        const lobbyDoc = await lobbyRef.get();

        if (!lobbyDoc.exists) {
          throw new Error("Lobby not found");
        }

        const lobbyData = lobbyDoc.data() as Lobby;

        // Check if user is host
        if (lobbyData.hostUid !== uid) {
          throw new Error("Only the host can remove AI players");
        }

        // Find the AI player in the Firebase document
        const aiPlayerInFirebase = lobbyData.players.find(
          (player: { uid: string; isAI?: boolean }) =>
            player.uid === aiPlayerId && player.isAI,
        );

        if (!aiPlayerInFirebase) {
          throw new Error("AI player not found in lobby");
        }

        console.log("Found AI player in Firebase:", aiPlayerInFirebase);

        // Remove AI player from Firebase document
        const updatedPlayers = lobbyData.players.filter(
          (player: { uid: string }) => player.uid !== aiPlayerId,
        );

        console.log("Updated players count:", updatedPlayers.length);

        // Update Firebase document
        await lobbyRef.update({
          players: updatedPlayers,
          updatedAt: new Date().toISOString(),
        });

        console.log("AI player removed from Firebase");

        // Initialize AI Player Manager if not already done
        if (!aiPlayerManager.getState().isInitialized) {
          await aiPlayerManager.initialize();
        }

        // Remove AI player from AI Player Manager
        await aiPlayerManager.removeAIPlayer({
          lobbyCode: invitationCode,
          playerId: aiPlayerId,
          reason: "manual",
        });

        console.log("AI player removed from AI Player Manager");

        // Get updated lobby data with AI players merged
        const aiPlayersAsLobbyPlayers =
          aiPlayerManager.getAIPlayersAsLobbyPlayers(invitationCode);
        const allPlayers = [...updatedPlayers, ...aiPlayersAsLobbyPlayers];

        // Set Sentry attributes
        span.setAttribute("lobby.code", invitationCode);
        span.setAttribute("lobby.ai_player_id", aiPlayerId);
        span.setAttribute("lobby.ai_count", aiPlayersAsLobbyPlayers.length);

        return {
          success: true,
          lobby: {
            ...lobbyData,
            players: allPlayers,
          },
          message: "AI player removed successfully",
        };
      } catch (error) {
        console.error("removeAIPlayerFromLobby error:", error);
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}

export async function kickPlayer(invitationCode: string, playerId: string) {
  return Sentry.startSpan(
    {
      op: "lobby.kick_player",
      name: "Kick Player from Lobby",
    },
    async (span) => {
      try {
        // Validate invitation code
        if (!validateInvitationCode(invitationCode)) {
          throw new Error("Invalid invitation code format");
        }

        const normalizedCode = normalizeInvitationCode(invitationCode);
        span.setAttribute("lobby.code", normalizedCode);
        span.setAttribute("player.kicked_id", playerId);

        // Get session cookie
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;

        if (!sessionCookie) {
          throw new Error("Authentication required");
        }

        // Verify session cookie
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        const uid = decodedClaims.uid;

        span.setAttribute("user.uid", uid);

        // Get lobby data
        const lobbyRef = db.collection("lobbies").doc(normalizedCode);
        const lobbyDoc = await lobbyRef.get();

        if (!lobbyDoc.exists) {
          throw new Error("Lobby not found");
        }

        const lobbyData = lobbyDoc.data();
        if (!lobbyData) {
          throw new Error("Lobby data not found");
        }

        // Check if user is the host
        if (lobbyData.hostUid !== uid) {
          throw new Error("Only the host can kick players");
        }

        // Check if game is already started
        if (lobbyData.status !== "waiting") {
          throw new Error("Cannot kick players after game has started");
        }

        // Find the player to kick
        const playerToKick = lobbyData.players.find(
          (player: { uid: string }) => player.uid === playerId,
        );

        if (!playerToKick) {
          throw new Error("Player not found in lobby");
        }

        // Prevent host from kicking themselves
        if (playerToKick.isHost) {
          throw new Error("Host cannot kick themselves");
        }

        // Remove player from lobby
        const updatedPlayers = lobbyData.players.filter(
          (player: { uid: string }) => player.uid !== playerId,
        );

        await lobbyRef.update({
          players: updatedPlayers,
          updatedAt: new Date().toISOString(),
        });

        // Initialize AI Player Manager if not already done
        if (!aiPlayerManager.getState().isInitialized) {
          await aiPlayerManager.initialize();
        }

        // Balance AI players after human is kicked
        if (lobbyData?.settings?.aiSettings?.enabled) {
          const humanPlayerCount = updatedPlayers.filter(
            (player: LobbyPlayer) => !player.isAI,
          ).length;

          await aiPlayerManager.balanceAIPlayers(
            normalizedCode,
            humanPlayerCount,
            lobbyData.settings.aiSettings,
          );

          span.setAttribute("lobby.ai_balanced", true);
          span.setAttribute("lobby.human_count", humanPlayerCount);
        }

        span.setAttribute("lobby.player_count", updatedPlayers.length);
        span.setAttribute("player.kicked_name", playerToKick.displayName);

        return {
          success: true,
          message: `Successfully kicked ${playerToKick.displayName} from the lobby`,
        };
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
  );
}
