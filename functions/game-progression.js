/**
 * Firebase Cloud Functions for Server-Side Game Phase Progression and Sync
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK if not initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const rtdb = admin.database();

/**
 * Helper to safely read a path once
 */
async function readPath(path) {
  const snap = await rtdb.ref(path).once("value");
  return snap.exists() ? snap.val() : null;
}

/**
 * When a submission is created, if everyone has submitted, transition to voting
 */
export const onSubmissionCreated = functions.database
  .ref("/lobbies/{lobbyCode}/gameState/submissions/{playerUid}")
  .onCreate(async (_snapshot, context) => {
    const lobbyCode = context.params.lobbyCode;
    try {
      const [gameState, players] = await Promise.all([
        readPath(`lobbies/${lobbyCode}/gameState`),
        readPath(`lobbies/${lobbyCode}/players`),
      ]);

      if (!gameState || !players) return null;
      if (gameState.phase !== "submission") return null;

      const submissions =
        (await readPath(`lobbies/${lobbyCode}/gameState/submissions`)) || {};
      const totalPlayers = Object.keys(players).length;
      const submittedCount = Object.keys(submissions).length;

      if (submittedCount >= totalPlayers) {
        // Idempotency: check phase again before updating
        const currentPhaseSnap = await rtdb
          .ref(`lobbies/${lobbyCode}/gameState/phase`)
          .once("value");
        if (currentPhaseSnap.val() !== "submission") return null;

        const updates = {};
        updates[`lobbies/${lobbyCode}/gameState/phase`] = "voting";
        updates[`lobbies/${lobbyCode}/gameState/timeLeft`] = 30;
        updates[`lobbies/${lobbyCode}/gameState/phaseStartTime`] =
          admin.database.ServerValue.TIMESTAMP;
        updates[`lobbies/${lobbyCode}/updatedAt`] =
          admin.database.ServerValue.TIMESTAMP;
        await rtdb.ref().update(updates);
      }
      return null;
    } catch (error) {
      console.error("onSubmissionCreated error:", error);
      return null;
    }
  });

/**
 * When a vote is created, if everyone has voted, transition to results
 */
export const onVoteCreated = functions.database
  .ref("/lobbies/{lobbyCode}/gameState/votes/{voterUid}")
  .onCreate(async (_snapshot, context) => {
    const lobbyCode = context.params.lobbyCode;
    try {
      const [gameState, players] = await Promise.all([
        readPath(`lobbies/${lobbyCode}/gameState`),
        readPath(`lobbies/${lobbyCode}/players`),
      ]);

      if (!gameState || !players) return null;
      if (gameState.phase !== "voting") return null;

      const votes =
        (await readPath(`lobbies/${lobbyCode}/gameState/votes`)) || {};
      const totalPlayers = Object.keys(players).length;
      const votesCount = Object.keys(votes).length;

      if (votesCount >= totalPlayers) {
        // Idempotency: check phase again before updating
        const currentPhaseSnap = await rtdb
          .ref(`lobbies/${lobbyCode}/gameState/phase`)
          .once("value");
        if (currentPhaseSnap.val() !== "voting") return null;

        const updates = {};
        updates[`lobbies/${lobbyCode}/gameState/phase`] = "results";
        updates[`lobbies/${lobbyCode}/gameState/timeLeft`] = 10;
        updates[`lobbies/${lobbyCode}/gameState/phaseStartTime`] =
          admin.database.ServerValue.TIMESTAMP;
        updates[`lobbies/${lobbyCode}/updatedAt`] =
          admin.database.ServerValue.TIMESTAMP;
        await rtdb.ref().update(updates);
      }
      return null;
    } catch (error) {
      console.error("onVoteCreated error:", error);
      return null;
    }
  });

/**
 * Callable to sync canonical game state and player cards for a reconnecting client
 */
export const syncGameState = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication required"
    );
  }
  const lobbyCode = (data && data.lobbyCode) || "";
  const uid = context.auth.uid;
  if (!lobbyCode) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "lobbyCode is required"
    );
  }

  try {
    // Verify membership
    const playerSnap = await rtdb
      .ref(`lobbies/${lobbyCode}/players/${uid}`)
      .once("value");
    if (!playerSnap.exists()) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You are not a member of this lobby"
      );
    }

    const [gameState, cards] = await Promise.all([
      readPath(`lobbies/${lobbyCode}/gameState`),
      readPath(`lobbies/${lobbyCode}/players/${uid}/cards`),
    ]);

    return {
      success: true,
      gameState: gameState || null,
      playerCards: cards || [],
    };
  } catch (error) {
    console.error("syncGameState error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to sync game state",
      error?.message || String(error)
    );
  }
});
