/**
 * Scoring system for Meme Battles
 *
 * Scoring Rules:
 * - 1 point per vote received
 * - 3-point bonus for winning the round
 * - 1 participation point for submitting
 * - +2 streak bonus for consecutive wins
 */

export interface RoundScoring {
  playerId: string;
  playerName: string;
  votes: number;
  isWinner: boolean;
  participated: boolean;
  streakBonus: number;
  roundScore: number;
  totalScore: number;
}

export interface PlayerStreak {
  playerId: string;
  currentStreak: number;
  lastWonRound: number;
}

/**
 * Calculate scores for a round based on votes and submissions
 */
export function calculateRoundScoring(
  players: Player[],
  submissions: Record<
    string,
    { cardId: string; cardName: string; submittedAt: string }
  >,
  votes: Record<string, string>,
  currentRoundNumber: number,
  existingScores: Record<string, number> = {},
  playerStreaks: Record<string, PlayerStreak> = {}
): {
  roundScoring: RoundScoring[];
  updatedScores: Record<string, number>;
  updatedStreaks: Record<string, PlayerStreak>;
  winner: string | null;
} {
  // Count votes for each submission
  const voteCounts: Record<string, number> = {};
  Object.values(votes).forEach((votedFor) => {
    if (votedFor) {
      voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    }
  });

  // Find the winner (player with most votes)
  let winner: string | null = null;
  if (Object.keys(voteCounts).length > 0) {
    winner = Object.entries(voteCounts).reduce((prev, current) =>
      current[1] > prev[1] ? current : prev
    )[0];
  }

  // Calculate scores for each player
  const roundScoring: RoundScoring[] = [];
  const updatedScores: Record<string, number> = { ...existingScores };
  const updatedStreaks: Record<string, PlayerStreak> = { ...playerStreaks };

  players.forEach((player) => {
    const playerId = player.id;
    const playerName = player.name;

    // Initialize if first time
    if (!(playerId in updatedScores)) {
      updatedScores[playerId] = 0;
    }
    if (!(playerId in updatedStreaks)) {
      updatedStreaks[playerId] = {
        playerId,
        currentStreak: 0,
        lastWonRound: 0,
      };
    }

    const votes = voteCounts[playerId] || 0;
    const isWinner = winner === playerId;
    const participated = playerId in submissions;

    // Calculate streak bonus
    let streakBonus = 0;
    if (isWinner) {
      const streak = updatedStreaks[playerId];
      // If they won the previous round, increment streak
      if (streak.lastWonRound === currentRoundNumber - 1) {
        streak.currentStreak += 1;
      } else {
        // First win or broken streak
        streak.currentStreak = 1;
      }
      streak.lastWonRound = currentRoundNumber;

      // Streak bonus: +2 points for each consecutive win after the first
      if (streak.currentStreak > 1) {
        streakBonus = 2;
      }
    } else {
      // Reset streak if they didn't win
      if (updatedStreaks[playerId].lastWonRound !== currentRoundNumber) {
        updatedStreaks[playerId].currentStreak = 0;
      }
    }

    // Calculate round score
    let roundScore = 0;

    // Points per vote received
    roundScore += votes;

    // Winner bonus
    if (isWinner) {
      roundScore += 3;
    }

    // Participation bonus
    if (participated) {
      roundScore += 1;
    }

    // Streak bonus
    roundScore += streakBonus;

    // Update total score
    updatedScores[playerId] += roundScore;

    roundScoring.push({
      playerId,
      playerName,
      votes,
      isWinner,
      participated,
      streakBonus,
      roundScore,
      totalScore: updatedScores[playerId],
    });
  });

  // Sort by round score (highest first)
  roundScoring.sort((a, b) => b.roundScore - a.roundScore);

  return {
    roundScoring,
    updatedScores,
    updatedStreaks,
    winner,
  };
}

/**
 * Get leaderboard sorted by total scores
 */
export function getLeaderboard(
  players: Player[],
  scores: Record<string, number>
): Array<{
  playerId: string;
  playerName: string;
  totalScore: number;
  rank: number;
}> {
  const leaderboard = players
    .map((player) => ({
      playerId: player.id,
      playerName: player.name,
      totalScore: scores[player.id] || 0,
      rank: 0, // Will be set below
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  // Set ranks (handle ties)
  leaderboard.forEach((entry, index) => {
    if (index === 0) {
      entry.rank = 1;
    } else {
      const prevEntry = leaderboard[index - 1];
      entry.rank =
        entry.totalScore === prevEntry.totalScore ? prevEntry.rank : index + 1;
    }
  });

  return leaderboard;
}

/**
 * Format score breakdown for display
 */
export function formatScoreBreakdown(scoring: RoundScoring): string {
  const parts: string[] = [];

  if (scoring.votes > 0) {
    parts.push(`${scoring.votes} vote${scoring.votes !== 1 ? "s" : ""}`);
  }

  if (scoring.isWinner) {
    parts.push("Winner (+3)");
  }

  if (scoring.participated) {
    parts.push("Participated (+1)");
  }

  if (scoring.streakBonus > 0) {
    parts.push(`Streak (+${scoring.streakBonus})`);
  }

  return parts.length > 0 ? parts.join(" • ") : "No points";
}
