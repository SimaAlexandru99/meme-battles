/**
 * Firebase Cloud Functions for Server-Side Lobby Cleanup
 *
 * This file contains Firebase Cloud Functions that handle server-side
 * cleanup of lobbies and player sessions. These functions run on Firebase
 * servers and provide more reliable cleanup than client-side only.
 *
 * To deploy these functions:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Initialize functions: firebase init functions
 * 3. Deploy: firebase deploy --only functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const rtdb = admin.database();

/**
 * Scheduled function to clean up empty and abandoned lobbies
 * Runs every 5 minutes
 */
export const cleanupLobbies = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {
    console.log("Starting scheduled lobby cleanup");

    try {
      const now = Date.now();
      const emptyLobbyTimeout = 5 * 60 * 1000; // 5 minutes
      const abandonedLobbyTimeout = 30 * 60 * 1000; // 30 minutes

      // Get all lobbies
      const lobbiesSnapshot = await rtdb.ref("lobbies").once("value");

      if (!lobbiesSnapshot.exists()) {
        console.log("No lobbies found");
        return null;
      }

      const lobbies = lobbiesSnapshot.val();
      const updates = {};
      let emptyCount = 0;
      let abandonedCount = 0;

      // Process each lobby
      Object.entries(lobbies).forEach(([code, lobby]) => {
        const createdAt = new Date(lobby.createdAt).getTime();
        const hasPlayers =
          lobby.players && Object.keys(lobby.players).length > 0;

        // Clean up empty lobbies
        if (!hasPlayers) {
          if (now - createdAt > emptyLobbyTimeout) {
            updates[`lobbies/${code}`] = null;
            emptyCount++;
            console.log(`Marking empty lobby ${code} for removal`);
          }
        } else {
          // Check for abandoned lobbies
          const playerLastSeenTimes = Object.values(lobby.players).map(
            (player) => {
              return new Date(player.lastSeen || player.joinedAt).getTime();
            }
          );

          const mostRecentActivity = Math.max(...playerLastSeenTimes);

          if (now - mostRecentActivity > abandonedLobbyTimeout) {
            updates[`lobbies/${code}`] = null;
            abandonedCount++;
            console.log(`Marking abandoned lobby ${code} for removal`);
          }
        }
      });

      // Apply updates
      if (Object.keys(updates).length > 0) {
        await rtdb.ref().update(updates);
        console.log(
          `Cleanup completed: ${emptyCount} empty, ${abandonedCount} abandoned lobbies removed`
        );
      } else {
        console.log("No lobbies needed cleanup");
      }

      // Log cleanup stats
      await rtdb.ref("cleanupStats").push({
        timestamp: now,
        emptyLobbiesRemoved: emptyCount,
        abandonedLobbiesRemoved: abandonedCount,
        totalLobbiesProcessed: Object.keys(lobbies).length,
      });

      return null;
    } catch (error) {
      console.error("Lobby cleanup failed:", error);
      throw error;
    }
  });

/**
 * Scheduled function to clean up stale player sessions
 * Runs every 10 minutes
 */
export const cleanupPlayerSessions = functions.pubsub
  .schedule("every 10 minutes")
  .onRun(async () => {
    console.log("Starting scheduled player session cleanup");

    try {
      const now = Date.now();
      const staleSessionTimeout = 10 * 60 * 1000; // 10 minutes

      // Get all player sessions
      const sessionsSnapshot = await rtdb.ref("playerSessions").once("value");

      if (!sessionsSnapshot.exists()) {
        console.log("No player sessions found");
        return null;
      }

      const sessions = sessionsSnapshot.val();
      const updates = {};
      let removedCount = 0;

      // Process each session
      Object.entries(sessions).forEach(([playerId, session]) => {
        const lastActivity = new Date(session.lastActivity).getTime();

        if (now - lastActivity > staleSessionTimeout) {
          updates[`playerSessions/${playerId}`] = null;
          removedCount++;
          console.log(`Marking stale session ${playerId} for removal`);
        }
      });

      // Apply updates
      if (Object.keys(updates).length > 0) {
        await rtdb.ref().update(updates);
        console.log(`Removed ${removedCount} stale player sessions`);
      } else {
        console.log("No stale sessions found");
      }

      return null;
    } catch (error) {
      console.error("Player session cleanup failed:", error);
      throw error;
    }
  });

/**
 * Database trigger to clean up related data when a lobby is deleted
 */
export const onLobbyDeleted = functions.database
  .ref("/lobbies/{lobbyCode}")
  .onDelete(async (snapshot, context) => {
    const lobbyCode = context.params.lobbyCode;
    console.log(`Lobby ${lobbyCode} deleted, cleaning up related data`);

    try {
      const updates = {};

      // Clean up player sessions that reference this lobby
      const sessionsSnapshot = await rtdb.ref("playerSessions").once("value");

      if (sessionsSnapshot.exists()) {
        const sessions = sessionsSnapshot.val();

        Object.entries(sessions).forEach(([playerId, session]) => {
          if (session.currentLobby === lobbyCode) {
            updates[`playerSessions/${playerId}`] = null;
            console.log(`Cleaning up session for player ${playerId}`);
          }
        });
      }

      // Clean up any rate limiting data for this lobby
      updates[`rateLimits/lobby/${lobbyCode}`] = null;

      // Apply cleanup updates
      if (Object.keys(updates).length > 0) {
        await rtdb.ref().update(updates);
        console.log(
          `Cleaned up ${Object.keys(updates).length} related records for lobby ${lobbyCode}`
        );
      }

      return null;
    } catch (error) {
      console.error(
        `Failed to cleanup related data for lobby ${lobbyCode}:`,
        error
      );
      throw error;
    }
  });

/**
 * HTTP function to manually trigger lobby cleanup (for admin use)
 */
export const manualCleanup = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can trigger manual cleanup"
    );
  }

  console.log("Manual cleanup triggered by admin");

  try {
    // Run both cleanup functions
    await Promise.all([cleanupLobbies.run(), cleanupPlayerSessions.run()]);

    return { success: true, message: "Manual cleanup completed" };
  } catch (error) {
    console.error("Manual cleanup failed:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Manual cleanup failed",
      error.message
    );
  }
});

/**
 * HTTP function to get cleanup statistics
 */
export const getCleanupStats = functions.https.onCall(async () => {
  try {
    const statsSnapshot = await rtdb
      .ref("cleanupStats")
      .orderByChild("timestamp")
      .limitToLast(100)
      .once("value");

    if (!statsSnapshot.exists()) {
      return { stats: [], summary: null };
    }

    const stats = Object.values(statsSnapshot.val());

    // Calculate summary statistics
    const summary = {
      totalRuns: stats.length,
      totalEmptyLobbiesRemoved: stats.reduce(
        (sum, stat) => sum + (stat.emptyLobbiesRemoved || 0),
        0
      ),
      totalAbandonedLobbiesRemoved: stats.reduce(
        (sum, stat) => sum + (stat.abandonedLobbiesRemoved || 0),
        0
      ),
      lastRunTime: Math.max(...stats.map((stat) => stat.timestamp)),
      averageLobbiesProcessed:
        stats.reduce(
          (sum, stat) => sum + (stat.totalLobbiesProcessed || 0),
          0
        ) / stats.length,
    };

    return { stats, summary };
  } catch (error) {
    console.error("Failed to get cleanup stats:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get cleanup stats",
      error.message
    );
  }
});

/**
 * Database trigger to monitor lobby creation rate for abuse prevention
 */
export const monitorLobbyCreation = functions.database
  .ref("/lobbies/{lobbyCode}")
  .onCreate(async (snapshot, context) => {
    const lobbyCode = context.params.lobbyCode;
    const lobbyData = snapshot.val();
    const hostUid = lobbyData.hostUid;

    console.log(`New lobby ${lobbyCode} created by ${hostUid}`);

    try {
      const now = Date.now();
      const windowMs = 60 * 60 * 1000; // 1 hour window
      const maxLobbiesPerHour = 10;

      // Check recent lobby creation by this user
      const userLobbiesSnapshot = await rtdb
        .ref("lobbies")
        .orderByChild("hostUid")
        .equalTo(hostUid)
        .once("value");

      if (userLobbiesSnapshot.exists()) {
        const userLobbies = Object.values(userLobbiesSnapshot.val());
        const recentLobbies = userLobbies.filter((lobby) => {
          const createdAt = new Date(lobby.createdAt).getTime();
          return now - createdAt < windowMs;
        });

        if (recentLobbies.length > maxLobbiesPerHour) {
          console.warn(
            `User ${hostUid} exceeded lobby creation limit: ${recentLobbies.length} lobbies in last hour`
          );

          // Log the abuse attempt
          await rtdb.ref("abuseReports").push({
            type: "excessive_lobby_creation",
            userId: hostUid,
            timestamp: now,
            lobbyCount: recentLobbies.length,
            windowMs,
          });

          // Optionally, remove the lobby or flag the user
          // await snapshot.ref.remove();
        }
      }

      return null;
    } catch (error) {
      console.error("Failed to monitor lobby creation:", error);
      // Don't throw error to avoid blocking lobby creation
      return null;
    }
  });
