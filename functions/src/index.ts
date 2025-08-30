/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getDatabase, ServerValue } from "firebase-admin/database";
import { setGlobalOptions } from "firebase-functions";
import { onValueCreated, onValueWritten } from "firebase-functions/v2/database";
import { onSchedule } from "firebase-functions/v2/scheduler";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10, region: "europe-west1" });

if (!getApps().length) {
  initializeApp();
}
const rtdb = getDatabase();

interface GameState {
  phase: string;
  roundNumber?: number;
  scoredRound?: number;
  timeLeft?: number;
  phaseStartTime?: number;
  submissions?: Record<string, unknown>;
  votes?: Record<string, string>;
  winner?: string;
  roundResults?: {
    roundNumber: number;
    ranking: Array<{ pid: string; votes: number; delta: number }>;
  };
}

interface Player {
  score?: number;
  lastSeen?: string;
  joinedAt?: string;
}

interface Players {
  [playerId: string]: Player;
}

interface Lobby {
  createdAt?: string;
  updatedAt?: string;
  players?: Players;
  [key: string]: unknown;
}

async function readPath<T = unknown>(path: string): Promise<T | null> {
  const snap = await rtdb.ref(path).once("value");
  return snap.exists() ? (snap.val() as T) : null;
}

export const onSubmissionCreated = onValueCreated(
  {
    ref: "/lobbies/{lobbyCode}/gameState/submissions/{playerUid}",
    instance: "meme-battles-project-default-rtdb",
  },
  async (event) => {
    const lobbyCode = event.params.lobbyCode as string;
    const [gameState, players] = await Promise.all([
      readPath(`lobbies/${lobbyCode}/gameState`),
      readPath(`lobbies/${lobbyCode}/players`),
    ]);
    if (!gameState || !players) return;
    if ((gameState as GameState).phase !== "submission") return;
    const submissions =
      (await readPath(`lobbies/${lobbyCode}/gameState/submissions`)) || {};
    const totalPlayers = Object.keys(players as Players).length;
    const submittedCount = Object.keys(
      submissions as Record<string, unknown>,
    ).length;
    if (submittedCount >= totalPlayers) {
      const currentPhaseSnap = await rtdb
        .ref(`lobbies/${lobbyCode}/gameState/phase`)
        .once("value");
      if (currentPhaseSnap.val() !== "submission") return;
      const updates: Record<string, unknown> = {};
      updates[`lobbies/${lobbyCode}/gameState/phase`] = "results";
      updates[`lobbies/${lobbyCode}/gameState/timeLeft`] = 30;
      updates[`lobbies/${lobbyCode}/gameState/phaseStartTime`] =
        ServerValue.TIMESTAMP;
      updates[`lobbies/${lobbyCode}/updatedAt`] = ServerValue.TIMESTAMP;
      await rtdb.ref().update(updates);
    }
  },
);

export const onVoteCreated = onValueCreated(
  {
    ref: "/lobbies/{lobbyCode}/gameState/votes/{voterUid}",
    instance: "meme-battles-project-default-rtdb",
  },
  async (event) => {
    const lobbyCode = event.params.lobbyCode as string;
    const [gameState, players] = await Promise.all([
      readPath(`lobbies/${lobbyCode}/gameState`),
      readPath(`lobbies/${lobbyCode}/players`),
    ]);
    if (!gameState || !players) return;
    if ((gameState as GameState).phase !== "results") return;
    const [votes, abstentions] = await Promise.all([
      readPath(`lobbies/${lobbyCode}/gameState/votes`),
      readPath(`lobbies/${lobbyCode}/gameState/abstentions`),
    ]);
    const totalPlayers = Object.keys(players as Players).length;
    const votesCount = Object.keys(votes || {}).length;
    const abstainCount = Object.keys(abstentions || {}).length;
    if (votesCount + abstainCount >= totalPlayers) {
      const currentPhaseSnap = await rtdb
        .ref(`lobbies/${lobbyCode}/gameState/phase`)
        .once("value");
      if (currentPhaseSnap.val() !== "results") return;
      const updates: Record<string, unknown> = {};
      updates[`lobbies/${lobbyCode}/gameState/timeLeft`] = 10;
      updates[`lobbies/${lobbyCode}/gameState/phaseStartTime`] =
        ServerValue.TIMESTAMP;
      updates[`lobbies/${lobbyCode}/updatedAt`] = ServerValue.TIMESTAMP;
      await rtdb.ref().update(updates);
    }
  },
);

export const onResultsPhase = onValueWritten(
  {
    ref: "/lobbies/{lobbyCode}/gameState/phase",
    instance: "meme-battles-project-default-rtdb",
  },
  async (event) => {
    const lobbyCode = event.params.lobbyCode as string;
    const before = event.data?.before?.val();
    const after = event.data?.after?.val();
    if (after !== "results" || before === "results") return;
    const gameStatePath = `lobbies/${lobbyCode}/gameState`;
    const playersPath = `lobbies/${lobbyCode}/players`;
    const [gameState, players, submissions, votes] = await Promise.all([
      readPath(gameStatePath),
      readPath(playersPath),
      readPath(`${gameStatePath}/submissions`),
      readPath(`${gameStatePath}/votes`),
    ]);
    if (!gameState || !players) return;
    const roundNumber = Number((gameState as GameState).roundNumber || 1);
    const scoredRound = Number((gameState as GameState).scoredRound || 0);
    if (scoredRound === roundNumber) return;
    const voteCounts: Record<string, number> = {};
    Object.values(votes || {}).forEach((v: unknown) => {
      const pid = String(v);
      voteCounts[pid] = (voteCounts[pid] || 0) + 1;
    });
    let winnerId: string | null = null;
    let bestVotes = -1;
    for (const pid of Object.keys(players as Players)) {
      const v = voteCounts[pid] || 0;
      if (v > bestVotes) {
        bestVotes = v;
        winnerId = pid;
      } else if (v === bestVotes && winnerId !== null && pid < winnerId) {
        winnerId = pid;
      }
    }
    const submissionMap = submissions || {};
    const updates: Record<string, unknown> = {};
    const ranking: Array<{ pid: string; votes: number; delta: number }> = [];
    for (const pid of Object.keys(players as Players)) {
      const currentScore = Number((players as Players)[pid]?.score || 0);
      const receivedVotes = voteCounts[pid] || 0;
      const participation = (submissionMap as Record<string, unknown>)[pid]
        ? 1
        : 0;
      const winnerBonus = pid === winnerId ? 3 : 0;
      const delta = receivedVotes + participation + winnerBonus;
      updates[`lobbies/${lobbyCode}/players/${pid}/score`] =
        currentScore + delta;
      ranking.push({ pid, votes: receivedVotes, delta });
    }
    ranking.sort((a, b) =>
      b.votes !== a.votes ? b.votes - a.votes : a.pid.localeCompare(b.pid),
    );
    updates[`${gameStatePath}/winner`] = winnerId;
    updates[`${gameStatePath}/roundResults`] = { roundNumber, ranking };
    updates[`${gameStatePath}/scoredRound`] = roundNumber;
    updates[`lobbies/${lobbyCode}/updatedAt`] = ServerValue.TIMESTAMP;
    await rtdb.ref().update(updates);
  },
);

export const cleanupLobbiesV2 = onSchedule("every 5 minutes", async () => {
  const now = Date.now();
  const emptyLobbyTimeout = 5 * 60 * 1000;
  const abandonedLobbyTimeout = 30 * 60 * 1000;
  const lobbiesSnapshot = await rtdb.ref("lobbies").once("value");
  if (!lobbiesSnapshot.exists()) return;
  const lobbies = (lobbiesSnapshot.val() || {}) as Record<string, Lobby>;
  const updates: Record<string, unknown> = {};
  for (const [code, lobby] of Object.entries(lobbies)) {
    const createdAt = lobby?.createdAt
      ? new Date(lobby.createdAt).getTime()
      : now;
    const hasPlayers = lobby?.players && Object.keys(lobby.players).length > 0;
    if (!hasPlayers) {
      if (now - createdAt > emptyLobbyTimeout) {
        updates[`lobbies/${code}`] = null;
      }
    } else {
      const playerLastSeenTimes = Object.values(lobby.players || {}).map(
        (p: unknown) => {
          const player = p as Player;
          const ts = player?.lastSeen || player?.joinedAt;
          return ts ? new Date(ts).getTime() : 0;
        },
      );
      const mostRecentActivity = playerLastSeenTimes.length
        ? Math.max(...playerLastSeenTimes)
        : createdAt;
      if (now - mostRecentActivity > abandonedLobbyTimeout) {
        updates[`lobbies/${code}`] = null;
      }
    }
  }
  if (Object.keys(updates).length > 0) {
    await rtdb.ref().update(updates);
  }
});
