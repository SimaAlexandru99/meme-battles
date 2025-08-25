import * as Sentry from "@sentry/nextjs";
import { AVAILABLE_AI_PERSONALITIES } from "@/components/game-settings/types";

interface AIBotDecision {
  selectedCardId: string;
  reasoning: string;
  confidence: number;
}

interface AIBotSubmission {
  botId: string;
  cardId: string;
  reasoning: string;
  confidence: number;
  submittedAt: string;
}

export class AIBotService {
  private static instance: AIBotService;

  static getInstance(): AIBotService {
    if (!AIBotService.instance) {
      AIBotService.instance = new AIBotService();
    }
    return AIBotService.instance;
  }

  /**
   * Make a decision for an AI bot
   */
  async makeDecision(
    botId: string,
    situation: string,
    cards: MemeCard[],
    personalityId: string,
    difficulty: "easy" | "medium" | "hard",
  ): Promise<AIBotDecision> {
    return Sentry.startSpan(
      {
        op: "ai.bot.decision",
        name: "AI Bot Decision",
      },
      async () => {
        try {
          // Get the bot's personality
          const personality = AVAILABLE_AI_PERSONALITIES.find(
            (p) => p.id === personalityId,
          );

          if (!personality) {
            throw new Error(`Unknown personality ID: ${personalityId}`);
          }

          // Prepare the request payload
          const requestPayload = {
            situation,
            cards: cards.map((card) => ({
              id: card.id,
              filename: card.filename,
              url: card.url,
              alt: card.alt,
            })),
            botPersonality: {
              id: personality.id,
              name: personality.name,
              description: personality.description,
              //   style: personality.style,
            },
            difficulty,
          };

          // Call the AI bot API
          const response = await fetch("/api/ai-bot", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestPayload),
          });

          if (!response.ok) {
            throw new Error(`AI bot API error: ${response.statusText}`);
          }

          const result = await response.json();

          if (result.error) {
            throw new Error(`AI bot decision failed: ${result.error}`);
          }

          return {
            selectedCardId: result.selectedCardId,
            reasoning: result.reasoning,
            confidence: result.confidence,
          };
        } catch (error) {
          Sentry.captureException(error, {
            tags: { operation: "ai_bot_decision", botId },
            extra: { botId, situation, cardCount: cards.length },
          });

          // Fallback: select a random card
          const randomCard = cards[Math.floor(Math.random() * cards.length)];
          return {
            selectedCardId: randomCard.id,
            reasoning: `Fallback selection due to error: ${randomCard.filename}`,
            confidence: 25,
          };
        }
      },
    );
  }

  /**
   * Submit a card for an AI bot
   */
  async submitCardForBot(
    botId: string,
    cardId: string,
    reasoning: string,
    confidence: number,
  ): Promise<AIBotSubmission> {
    return Sentry.startSpan(
      {
        op: "ai.bot.submission",
        name: "AI Bot Submission",
      },
      async () => {
        const submission: AIBotSubmission = {
          botId,
          cardId,
          reasoning,
          confidence,
          submittedAt: new Date().toISOString(),
        };

        return submission;
      },
    );
  }

  /**
   * Process AI bot submissions for all AI players in a game
   */
  async processAIBotSubmissions(
    lobbyCode: string,
    players: Record<string, PlayerData>,
    situation: string,
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.bot.process_submissions",
        name: "Process AI Bot Submissions",
      },
      async () => {
        const aiPlayers = Object.entries(players).filter(
          ([, player]) => player.isAI,
        );

        // Process each AI player with realistic delays
        for (let i = 0; i < aiPlayers.length; i++) {
          const [botId, botPlayer] = aiPlayers[i];

          // Add realistic delay based on difficulty and bot index
          const baseDelay = 3000; // 3 seconds base delay
          const difficultyMultiplier =
            botPlayer.aiDifficulty === "easy"
              ? 0.5
              : botPlayer.aiDifficulty === "medium"
                ? 1.0
                : 1.5;
          const randomDelay = Math.random() * 5000; // 0-5 seconds random
          const indexDelay = i * 2000; // Stagger bots by 2 seconds

          const totalDelay =
            baseDelay * difficultyMultiplier + randomDelay + indexDelay;

          console.log(
            `🤖 AI bot ${botId} will submit in ${Math.round(totalDelay / 1000)}s`,
          );

          // Use setTimeout to add realistic delay
          setTimeout(async () => {
            try {
              // Get the bot's cards
              const botCards = botPlayer.cards || [];
              if (botCards.length === 0) {
                console.warn(`AI bot ${botId} has no cards`);
                return;
              }

              // Make decision
              const decision = await this.makeDecision(
                botId,
                situation,
                botCards,
                botPlayer.aiPersonalityId!,
                botPlayer.aiDifficulty!,
              );

              // Submit the card
              const submission = await this.submitCardForBot(
                botId,
                decision.selectedCardId,
                decision.reasoning,
                decision.confidence,
              );

              // Save the submission to Firebase
              await this.saveBotSubmission(lobbyCode, botId, submission);

              console.log(`🤖 AI bot ${botId} submitted card:`, submission);
            } catch (error) {
              console.error(`Error processing AI bot ${botId}:`, error);
              Sentry.captureException(error, {
                tags: { operation: "ai_bot_submission", botId },
                extra: { botId, lobbyCode },
              });
            }
          }, totalDelay);
        }
      },
    );
  }

  /**
   * Make a vote decision for an AI bot among submitted cards
   */
  async makeVoteDecision(
    botId: string,
    situation: string,
    submissions: { id: string; filename: string; url: string; alt: string }[],
    personalityId: string,
    difficulty: "easy" | "medium" | "hard",
  ): Promise<{
    targetPlayerId: string;
    reasoning: string;
    confidence: number;
  }> {
    return Sentry.startSpan(
      {
        op: "ai.bot.vote_decision",
        name: "AI Bot Vote Decision",
      },
      async () => {
        try {
          const personality = AVAILABLE_AI_PERSONALITIES.find(
            (p) => p.id === personalityId,
          );
          if (!personality) {
            throw new Error(`Unknown personality ID: ${personalityId}`);
          }

          const requestPayload = {
            situation,
            cards: submissions,
            botPersonality: {
              id: personality.id,
              name: personality.name,
              description: personality.description,
            },
            difficulty,
            mode: "vote",
          };

          const response = await fetch("/api/ai-bot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload),
          });

          if (!response.ok) {
            throw new Error(`AI bot API error: ${response.statusText}`);
          }

          const result = await response.json();
          if (result.error) {
            throw new Error(`AI bot vote failed: ${result.error}`);
          }

          // Expect API to return selectedCardId; map back to target player via submissions list
          const selectedCardId: string = result.selectedCardId;
          const selected = submissions.find((c) => c.id === selectedCardId);
          if (!selected) {
            // Fallback: pick first
            return {
              targetPlayerId: submissions[0]?.id || "",
              reasoning: "Fallback vote selection",
              confidence: 25,
            };
          }

          return {
            targetPlayerId: selected.id,
            reasoning: result.reasoning,
            confidence: result.confidence,
          };
        } catch (error) {
          Sentry.captureException(error, {
            tags: { operation: "ai_bot_vote_decision", botId },
            extra: { botId, situation, submissionsCount: submissions.length },
          });
          // Fallback: random
          const random =
            submissions[Math.floor(Math.random() * submissions.length)];
          return {
            targetPlayerId: random?.id || "",
            reasoning: "Fallback random vote due to error",
            confidence: 20,
          };
        }
      },
    );
  }

  /**
   * Save bot vote to Firebase
   */
  private async saveBotVote(
    lobbyCode: string,
    botId: string,
    targetPlayerId: string,
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.bot.save_vote",
        name: "Save AI Bot Vote",
      },
      async () => {
        const { ref, set } = await import("firebase/database");
        const { rtdb } = await import("@/firebase/client");
        await set(
          ref(rtdb, `lobbies/${lobbyCode}/gameState/votes/${botId}`),
          targetPlayerId,
        );
      },
    );
  }

  /**
   * Process AI bot votes for all AI players in a game
   */
  async processAIBotVotes(
    lobbyCode: string,
    players: Record<string, PlayerData>,
    submissions: Record<string, { cardId: string; cardName: string }>,
    situation: string,
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.bot.process_votes",
        name: "Process AI Bot Votes",
      },
      async () => {
        const aiPlayers = Object.entries(players).filter(([, p]) => p.isAI);
        if (aiPlayers.length === 0) return;

        // Build vote options: list of submitted cards keyed by player id
        const options = Object.entries(submissions).map(([playerId, sub]) => ({
          id: playerId,
          filename: sub.cardName,
          url: `/memes/${encodeURIComponent(sub.cardName)}`,
          alt: `Meme: ${sub.cardId}`,
        }));
        if (options.length === 0) return;

        for (const [botId, bot] of aiPlayers) {
          try {
            // AI cannot vote for itself; filter options
            const filtered = options.filter((o) => o.id !== botId);
            if (filtered.length === 0) continue;

            const decision = await this.makeVoteDecision(
              botId,
              situation,
              filtered,
              bot.aiPersonalityId!,
              bot.aiDifficulty!,
            );

            // decision.targetPlayerId corresponds to playerId of submission
            await this.saveBotVote(lobbyCode, botId, decision.targetPlayerId);
          } catch (error) {
            Sentry.captureException(error, {
              tags: { operation: "ai_bot_process_vote", botId },
              extra: { lobbyCode },
            });
          }
        }
      },
    );
  }
  /**
   * Save bot submission to Firebase
   */
  private async saveBotSubmission(
    lobbyCode: string,
    botId: string,
    submission: AIBotSubmission,
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.bot.save_submission",
        name: "Save AI Bot Submission",
      },
      async () => {
        try {
          const { ref, set, serverTimestamp } = await import(
            "firebase/database"
          );
          const { rtdb } = await import("@/firebase/client");

          // Save the submission to the game state
          const submissionPath = `lobbies/${lobbyCode}/gameState/submissions/${botId}`;
          await set(ref(rtdb, submissionPath), {
            cardId: submission.cardId,
            cardName: `AI Bot Submission`,
            submittedAt: serverTimestamp(),
            reasoning: submission.reasoning,
            confidence: submission.confidence,
          });

          // Update bot player status to "submitted"
          const { update } = await import("firebase/database");
          const botStatusPath = `lobbies/${lobbyCode}/players/${botId}`;
          await update(ref(rtdb, botStatusPath), {
            status: "submitted",
            lastSeen: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Error saving bot submission for ${botId}:`, error);
          throw error;
        }
      },
    );
  }
}
