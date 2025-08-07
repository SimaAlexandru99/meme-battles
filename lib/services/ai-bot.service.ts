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
    difficulty: "easy" | "medium" | "hard"
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
            (p) => p.id === personalityId
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
      }
    );
  }

  /**
   * Submit a card for an AI bot
   */
  async submitCardForBot(
    botId: string,
    cardId: string,
    reasoning: string,
    confidence: number
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
      }
    );
  }

  /**
   * Process AI bot submissions for all AI players in a game
   */
  async processAIBotSubmissions(
    lobbyCode: string,
    players: Record<string, PlayerData>,
    situation: string
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.bot.process_submissions",
        name: "Process AI Bot Submissions",
      },
      async () => {
        const aiPlayers = Object.entries(players).filter(
          ([, player]) => player.isAI
        );

        // Process each AI player
        for (const [botId, botPlayer] of aiPlayers) {
          try {
            // Get the bot's cards
            const botCards = botPlayer.cards || [];
            if (botCards.length === 0) {
              console.warn(`AI bot ${botId} has no cards`);
              continue;
            }

            // Make decision
            const decision = await this.makeDecision(
              botId,
              situation,
              botCards,
              botPlayer.aiPersonalityId!,
              botPlayer.aiDifficulty!
            );

            // Submit the card
            const submission = await this.submitCardForBot(
              botId,
              decision.selectedCardId,
              decision.reasoning,
              decision.confidence
            );

            // Save the submission to Firebase
            await this.saveBotSubmission(lobbyCode, botId, submission);

            console.log(`AI bot ${botId} submitted card:`, submission);
          } catch (error) {
            console.error(`Error processing AI bot ${botId}:`, error);
            Sentry.captureException(error, {
              tags: { operation: "ai_bot_submission", botId },
              extra: { botId, lobbyCode },
            });
          }
        }
      }
    );
  }

  /**
   * Save bot submission to Firebase
   */
  private async saveBotSubmission(
    lobbyCode: string,
    botId: string,
    submission: AIBotSubmission
  ): Promise<void> {
    return Sentry.startSpan(
      {
        op: "ai.bot.save_submission",
        name: "Save AI Bot Submission",
      },
      async () => {
        try {
          const { ref, set } = await import("firebase/database");
          const { rtdb } = await import("@/firebase/client");

          // Save the submission to the game state
          const submissionPath = `lobbies/${lobbyCode}/gameState/submissions/${botId}`;
          await set(ref(rtdb, submissionPath), {
            cardId: submission.cardId,
            cardName: `AI Bot Submission`,
            submittedAt: submission.submittedAt,
            reasoning: submission.reasoning,
            confidence: submission.confidence,
          });

          // Update bot player status
          const playerStatusPath = `lobbies/${lobbyCode}/players/${botId}/status`;
          await set(ref(rtdb, playerStatusPath), "submitted");
        } catch (error) {
          console.error(`Error saving bot submission for ${botId}:`, error);
          throw error;
        }
      }
    );
  }
}
