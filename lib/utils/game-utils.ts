/**
 * Game utility functions for Meme Battle gameplay
 * Handles meme card management, game state validation, and game logic
 */

import { MemeCard, GameState, GamePhase, Player, Submission } from "@/types";

// Constants
export const TOTAL_MEME_COUNT = 800;
export const CARDS_PER_HAND = 7;
export const MEME_BASE_PATH = "/memes";

/**
 * Generates a list of all available meme cards from the public/memes directory
 * Assumes memes are numbered from 1 to 800 with .jpg extension
 */
export function generateMemeCardPool(): MemeCard[] {
  const cards: MemeCard[] = [];

  for (let i = 1; i <= TOTAL_MEME_COUNT; i++) {
    const filename = `${i}.jpg`;
    cards.push({
      id: `meme-${i}`,
      filename,
      url: `${MEME_BASE_PATH}/${filename}`,
      alt: `Meme ${i}`,
    });
  }

  return cards;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Gets random meme cards for a player's hand, ensuring no duplicates across all players
 */
export function getRandomMemeCards(
  count: number = CARDS_PER_HAND,
  excludeIds: string[] = []
): MemeCard[] {
  const allCards = generateMemeCardPool();
  const availableCards = allCards.filter(
    (card) => !excludeIds.includes(card.id)
  );

  if (availableCards.length < count) {
    throw new Error(
      `Not enough available meme cards. Requested: ${count}, Available: ${availableCards.length}`
    );
  }

  const shuffled = shuffleArray(availableCards);
  return shuffled.slice(0, count);
}

/**
 * Validates if a meme card filename exists in the valid range
 */
export function validateMemeCard(filename: string): boolean {
  const match = filename.match(/^(\d+)\.jpg$/);
  if (!match) return false;

  const number = parseInt(match[1], 10);
  return number >= 1 && number <= TOTAL_MEME_COUNT;
}

/**
 * Converts meme filenames to MemeCard objects
 */
export function filenamesToMemeCards(filenames: string[]): MemeCard[] {
  return filenames.filter(validateMemeCard).map((filename) => {
    const number = filename.replace(".jpg", "");
    return {
      id: `meme-${number}`,
      filename,
      url: `${MEME_BASE_PATH}/${filename}`,
      alt: `Meme ${number}`,
    };
  });
}

/**
 * Gets all used card IDs from all players to prevent duplicates
 */
export function getUsedCardIds(players: Player[]): string[] {
  const usedIds: string[] = [];

  players.forEach((player) => {
    player.hand.forEach((card) => {
      usedIds.push(card.id);
    });
  });

  return usedIds;
}

/**
 * Validates the current game state for consistency
 */
export function validateGameState(gameState: GameState): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate basic structure
  if (!gameState.lobbyCode || gameState.lobbyCode.length !== 5) {
    errors.push("Invalid lobby code");
  }

  if (!gameState.gameId) {
    errors.push("Missing game ID");
  }

  if (
    gameState.currentRound < 1 ||
    gameState.currentRound > gameState.totalRounds
  ) {
    errors.push("Invalid current round number");
  }

  if (!Object.values(GamePhase).includes(gameState.phase)) {
    errors.push("Invalid game phase");
  }

  // Validate players
  if (!gameState.players || gameState.players.length === 0) {
    errors.push("No players in game");
  }

  if (!gameState.currentPlayer) {
    errors.push("Missing current player");
  }

  // Validate player hands
  gameState.players.forEach((player, index) => {
    if (!player.hand || player.hand.length !== CARDS_PER_HAND) {
      errors.push(`Player ${index + 1} has invalid hand size`);
    }

    player.hand.forEach((card) => {
      if (!validateMemeCard(card.filename)) {
        errors.push(
          `Player ${index + 1} has invalid meme card: ${card.filename}`
        );
      }
    });
  });

  // Validate no duplicate cards across players
  const allCardIds = getUsedCardIds(gameState.players);
  const uniqueCardIds = new Set(allCardIds);
  if (allCardIds.length !== uniqueCardIds.size) {
    errors.push("Duplicate cards found across players");
  }

  // Phase-specific validations
  if (gameState.phase === GamePhase.VOTING) {
    if (!gameState.submissions || gameState.submissions.length === 0) {
      errors.push("No submissions available for voting phase");
    }
  }

  if (gameState.phase === GamePhase.RESULTS) {
    if (!gameState.votes || gameState.votes.length === 0) {
      errors.push("No votes available for results phase");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates the winner of a round based on votes
 */
export function calculateRoundWinner(
  submissions: Submission[]
): Submission | null {
  if (!submissions || submissions.length === 0) {
    return null;
  }

  // Find submission with most votes
  const winner = submissions.reduce((prev, current) => {
    return current.votes > prev.votes ? current : prev;
  });

  // Check for ties
  const maxVotes = winner.votes;
  const winnersWithSameVotes = submissions.filter((s) => s.votes === maxVotes);

  if (winnersWithSameVotes.length > 1) {
    // In case of tie, return the first one submitted
    return winnersWithSameVotes.reduce((prev, current) => {
      return new Date(current.submittedAt) < new Date(prev.submittedAt)
        ? current
        : prev;
    });
  }

  return winner;
}

/**
 * Checks if all players have submitted their cards
 */
export function allPlayersSubmitted(
  players: Player[],
  submissions: Submission[]
): boolean {
  const submittedPlayerIds = new Set(submissions.map((s) => s.playerId));
  return players.every((player) => submittedPlayerIds.has(player.id));
}

/**
 * Checks if all eligible players have voted
 */
export function allPlayersVoted(
  players: Player[],
  votes: Vote[],
  submissions: Submission[]
): boolean {
  const submittedPlayerIds = new Set(submissions.map((s) => s.playerId));
  const eligibleVoters = players.filter(
    (p) => !submittedPlayerIds.has(p.id) || submissions.length > 1
  );
  const votedPlayerIds = new Set(votes.map((v) => v.voterId));

  return eligibleVoters.every((player) => votedPlayerIds.has(player.id));
}

/**
 * Gets the next game phase based on current state
 */
export function getNextGamePhase(
  currentPhase: GamePhase,
  currentRound: number,
  totalRounds: number,
  allSubmitted: boolean,
  allVoted: boolean
): GamePhase {
  switch (currentPhase) {
    case GamePhase.LOADING:
      return GamePhase.SUBMISSION;

    case GamePhase.SUBMISSION:
      return allSubmitted ? GamePhase.VOTING : GamePhase.SUBMISSION;

    case GamePhase.VOTING:
      return allVoted ? GamePhase.RESULTS : GamePhase.VOTING;

    case GamePhase.RESULTS:
      return currentRound >= totalRounds
        ? GamePhase.GAME_OVER
        : GamePhase.SUBMISSION;

    case GamePhase.GAME_OVER:
      return GamePhase.GAME_OVER;

    default:
      return GamePhase.LOADING;
  }
}

/**
 * Creates initial game state for a new game
 */
export function createInitialGameState(
  lobbyCode: string,
  gameId: string,
  players: Player[],
  currentUserId: string,
  totalRounds: number = 5
): GameState {
  const currentPlayer = players.find((p) => p.id === currentUserId);

  if (!currentPlayer) {
    throw new Error("Current user not found in players list");
  }

  return {
    lobbyCode,
    gameId,
    currentRound: 1,
    totalRounds,
    phase: GamePhase.LOADING,
    players,
    currentPlayer,
    hostId: players[0]?.id || "",
    currentSituation: "",
    playerHand: currentPlayer.hand,
    submissions: [],
    votes: [],
    phaseTimer: 0,
    phaseStartTime: new Date(),
    selectedCard: null,
    hasSubmitted: false,
    hasVoted: false,
    isLoading: true,
    error: null,
  };
}
