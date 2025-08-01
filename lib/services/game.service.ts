/**
 * Firebase service for Meme Battle game operations
 * Handles game document CRUD operations and real-time subscriptions
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  DocumentReference,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/client";
import {
  GameDocument,
  GameState,
  GamePhase,
  Player,
  MemeCard,
  Submission,
  Vote,
  ChatMessage,
} from "@/types";
import {
  getRandomMemeCards,
  getUsedCardIds,
  filenamesToMemeCards,
  createInitialGameState,
  validateGameState,
} from "@/lib/utils/game-utils";

export class GameService {
  /**
   * Creates a new game document in Firestore
   */
  static async createGame(
    lobbyCode: string,
    players: Player[],
    hostId: string,
    settings: {
      rounds: number;
      submissionTime: number;
      votingTime: number;
    } = {
      rounds: 5,
      submissionTime: 60,
      votingTime: 30,
    }
  ): Promise<string> {
    try {
      // Generate unique hands for each player
      const playersWithHands = await this.generatePlayerHands(players);

      // Create game document
      const gameDoc: Omit<GameDocument, "id"> = {
        lobbyCode,
        status: "waiting",
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        settings,
        currentRound: 1,
        phase: GamePhase.LOADING,
        phaseStartTime: serverTimestamp() as Timestamp,
        currentSituation: "",
        players: this.playersToFirebaseFormat(playersWithHands),
        submissions: {},
        votes: {},
        chat: [],
      };

      const gameRef = doc(collection(db, "games"));
      await setDoc(gameRef, gameDoc);

      return gameRef.id;
    } catch (error) {
      console.error("Error creating game:", error);
      throw new Error("Failed to create game");
    }
  }

  /**
   * Gets a game document by ID
   */
  static async getGame(gameId: string): Promise<GameDocument | null> {
    try {
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        return null;
      }

      return {
        id: gameSnap.id,
        ...gameSnap.data(),
      } as GameDocument;
    } catch (error) {
      console.error("Error getting game:", error);
      throw new Error("Failed to get game");
    }
  }

  /**
   * Updates game phase and related data
   */
  static async updateGamePhase(
    gameId: string,
    phase: GamePhase,
    additionalData: Partial<GameDocument> = {}
  ): Promise<void> {
    try {
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, {
        phase,
        phaseStartTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData,
      });
    } catch (error) {
      console.error("Error updating game phase:", error);
      throw new Error("Failed to update game phase");
    }
  }

  /**
   * Submits a player's meme card for the current round
   */
  static async submitMemeCard(
    gameId: string,
    playerId: string,
    memeFilename: string
  ): Promise<void> {
    try {
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        throw new Error("Game not found");
      }

      const gameData = gameSnap.data() as GameDocument;

      // Validate submission
      if (gameData.phase !== GamePhase.SUBMISSION) {
        throw new Error("Not in submission phase");
      }

      if (playerId in gameData.submissions) {
        throw new Error("Player has already submitted");
      }

      // Update submissions
      const updatedSubmissions = {
        ...gameData.submissions,
        [playerId]: {
          memeFilename,
          submittedAt: serverTimestamp(),
        },
      };

      await updateDoc(gameRef, {
        submissions: updatedSubmissions,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error submitting meme card:", error);
      throw new Error("Failed to submit meme card");
    }
  }

  /**
   * Submits a player's vote for a submission
   */
  static async submitVote(
    gameId: string,
    voterId: string,
    submissionPlayerId: string
  ): Promise<void> {
    try {
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        throw new Error("Game not found");
      }

      const gameData = gameSnap.data() as GameDocument;

      // Validate vote
      if (gameData.phase !== GamePhase.VOTING) {
        throw new Error("Not in voting phase");
      }

      if (voterId in gameData.votes) {
        throw new Error("Player has already voted");
      }

      if (voterId === submissionPlayerId) {
        throw new Error("Cannot vote for own submission");
      }

      if (!(submissionPlayerId in gameData.submissions)) {
        throw new Error("Invalid submission to vote for");
      }

      // Update votes
      const updatedVotes = {
        ...gameData.votes,
        [voterId]: submissionPlayerId,
      };

      await updateDoc(gameRef, {
        votes: updatedVotes,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error submitting vote:", error);
      throw new Error("Failed to submit vote");
    }
  }

  /**
   * Adds a chat message to the game
   */
  static async addChatMessage(
    gameId: string,
    playerId: string,
    playerName: string,
    message: string
  ): Promise<void> {
    try {
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        throw new Error("Game not found");
      }

      const gameData = gameSnap.data() as GameDocument;

      // Validate player is in game
      if (!(playerId in gameData.players)) {
        throw new Error("Player not in game");
      }

      const chatMessage: ChatMessage = {
        id: `${Date.now()}-${playerId}`,
        playerId,
        playerName,
        message: message.trim(),
        timestamp: new Date(),
      };

      const updatedChat = [...gameData.chat, chatMessage];

      // Keep only last 100 messages
      if (updatedChat.length > 100) {
        updatedChat.splice(0, updatedChat.length - 100);
      }

      await updateDoc(gameRef, {
        chat: updatedChat,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error adding chat message:", error);
      throw new Error("Failed to add chat message");
    }
  }

  /**
   * Sets up real-time listener for game updates
   */
  static subscribeToGame(
    gameId: string,
    callback: (gameState: GameState | null) => void,
    currentUserId: string
  ): Unsubscribe {
    const gameRef = doc(db, "games", gameId);

    return onSnapshot(
      gameRef,
      (doc) => {
        if (!doc.exists()) {
          callback(null);
          return;
        }

        try {
          const gameDoc = { id: doc.id, ...doc.data() } as GameDocument;
          const gameState = this.convertToGameState(gameDoc, currentUserId);
          callback(gameState);
        } catch (error) {
          console.error("Error converting game document to state:", error);
          callback(null);
        }
      },
      (error) => {
        console.error("Error in game subscription:", error);
        callback(null);
      }
    );
  }

  /**
   * Converts Firebase game document to client GameState
   */
  static convertToGameState(
    gameDoc: GameDocument,
    currentUserId: string
  ): GameState {
    // Convert Firebase players format to Player array
    const players: Player[] = Object.entries(gameDoc.players).map(
      ([id, playerData]) => ({
        id,
        name: playerData.name,
        profileURL: playerData.profileURL,
        score: playerData.score,
        isConnected: playerData.isConnected,
        hand: filenamesToMemeCards(playerData.hand),
      })
    );

    const currentPlayer = players.find((p) => p.id === currentUserId);
    if (!currentPlayer) {
      throw new Error("Current user not found in game players");
    }

    // Convert submissions to Submission array
    const submissions: Submission[] = Object.entries(gameDoc.submissions).map(
      ([playerId, submissionData]) => {
        const player = players.find((p) => p.id === playerId);
        const memeCard = filenamesToMemeCards([submissionData.memeFilename])[0];

        return {
          id: `${playerId}-${gameDoc.currentRound}`,
          playerId,
          playerName: player?.name || "Unknown",
          memeCard,
          votes: Object.values(gameDoc.votes).filter(
            (votedPlayerId) => votedPlayerId === playerId
          ).length,
          submittedAt:
            submissionData.submittedAt instanceof Timestamp
              ? submissionData.submittedAt.toDate()
              : new Date(submissionData.submittedAt),
        };
      }
    );

    // Convert votes to Vote array
    const votes: Vote[] = Object.entries(gameDoc.votes).map(
      ([voterId, submissionPlayerId]) => ({
        id: `${voterId}-${gameDoc.currentRound}`,
        voterId,
        submissionId: `${submissionPlayerId}-${gameDoc.currentRound}`,
        votedAt: new Date(), // We don't store individual vote timestamps
      })
    );

    const gameState: GameState = {
      lobbyCode: gameDoc.lobbyCode,
      gameId: gameDoc.id,
      currentRound: gameDoc.currentRound,
      totalRounds: gameDoc.settings.rounds,
      phase: gameDoc.phase,
      players,
      currentPlayer,
      hostId: Object.keys(gameDoc.players)[0] || "", // First player is host
      currentSituation: gameDoc.currentSituation,
      playerHand: currentPlayer.hand,
      submissions,
      votes,
      phaseTimer: 0, // Will be calculated by client
      phaseStartTime:
        gameDoc.phaseStartTime instanceof Timestamp
          ? gameDoc.phaseStartTime.toDate()
          : new Date(gameDoc.phaseStartTime),
      selectedCard: null,
      hasSubmitted: currentUserId in gameDoc.submissions,
      hasVoted: currentUserId in gameDoc.votes,
      isLoading: false,
      error: null,
    };

    // Validate the converted state
    const validation = validateGameState(gameState);
    if (!validation.isValid) {
      console.warn("Game state validation failed:", validation.errors);
    }

    return gameState;
  }

  /**
   * Generates unique meme card hands for all players
   */
  private static async generatePlayerHands(
    players: Player[]
  ): Promise<Player[]> {
    const playersWithHands: Player[] = [];
    const usedCardIds: string[] = [];

    for (const player of players) {
      const hand = getRandomMemeCards(7, usedCardIds);
      usedCardIds.push(...hand.map((card) => card.id));

      playersWithHands.push({
        ...player,
        hand,
      });
    }

    return playersWithHands;
  }

  /**
   * Converts Player array to Firebase players format
   */
  private static playersToFirebaseFormat(
    players: Player[]
  ): GameDocument["players"] {
    const firebasePlayers: GameDocument["players"] = {};

    players.forEach((player) => {
      firebasePlayers[player.id] = {
        id: player.id,
        name: player.name,
        profileURL: player.profileURL,
        score: player.score,
        isConnected: player.isConnected,
        hand: player.hand.map((card) => card.filename),
      };
    });

    return firebasePlayers;
  }
}
