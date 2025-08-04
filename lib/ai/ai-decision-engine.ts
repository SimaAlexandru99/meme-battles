import * as Sentry from "@sentry/nextjs";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

/**
 * AI Decision Engine - Handles AI player decision-making using Vercel AI SDK
 * Implements meme selection, voting, and chat message generation with personality-based logic
 */
export class AIDecisionEngine {
  private readonly logger = Sentry.logger;

  /**
   * Select a meme card based on situation and personality
   */
  public async selectMemeCard(
    options: AIDecisionEngineOptions
  ): Promise<AIDecisionResult> {
    return Sentry.startSpan(
      {
        op: "ai.decision.meme_selection",
        name: "AI Meme Selection",
      },
      async (span) => {
        const startTime = Date.now();

        try {
          const { personality, context, timeout = 30000 } = options;

          if (!context.situation || !context.availableMemes) {
            throw new Error(
              "Missing required context: situation or availableMemes"
            );
          }

          // Generate personality-specific prompt
          const prompt = this.buildMemeSelectionPrompt(personality, context);

          // Call AI with timeout
          const aiResponse = await this.callAIWithTimeout(prompt, timeout);

          // Parse AI response to select meme
          const selectedMeme = this.parseMemeSelection(
            aiResponse,
            context.availableMemes
          );

          // Calculate confidence based on personality and response quality
          const confidence = this.calculateConfidence(personality, aiResponse);

          // Create decision record
          const decision: AIDecision = {
            type: "meme-selection",
            context: {
              situation: context.situation,
              availableMemes: context.availableMemes,
              gamePhase: context.gamePhase,
              currentRound: context.currentRound,
            },
            personalityId: personality.id,
            decision: {
              selectedMeme,
              confidence,
              reasoning: aiResponse,
            },
            timestamp: new Date(),
            processingTime: Date.now() - startTime,
          };

          span.setAttribute("personalityId", personality.id);
          span.setAttribute("confidence", confidence);
          span.setAttribute("processingTime", decision.processingTime);

          return {
            success: true,
            decision,
            processingTime: decision.processingTime,
          };
        } catch (error) {
          this.logger.error("Failed to select meme card", {
            error,
            personalityId: options.personality.id,
            context: options.context,
          });

          return {
            success: false,
            error: String(error),
            processingTime: Date.now() - startTime,
          };
        }
      }
    );
  }

  /**
   * Cast a vote for the best submission based on personality and context
   */
  public async castVote(
    options: AIDecisionEngineOptions
  ): Promise<AIDecisionResult> {
    return Sentry.startSpan(
      {
        op: "ai.decision.voting",
        name: "AI Voting",
      },
      async (span) => {
        const startTime = Date.now();

        try {
          const { personality, context, timeout = 30000 } = options;

          if (!context.submissions || !context.situation) {
            throw new Error(
              "Missing required context: submissions or situation"
            );
          }

          // Filter out AI's own submission
          const otherSubmissions = context.submissions.filter(
            (submission) => !submission.playerName.includes("AI")
          );

          if (otherSubmissions.length === 0) {
            throw new Error("No other submissions to vote on");
          }

          // Generate personality-specific voting prompt
          const prompt = this.buildVotingPrompt(personality, context);

          // Call AI with timeout
          const aiResponse = await this.callAIWithTimeout(prompt, timeout);

          // Parse AI response to select submission
          const votedSubmissionId = this.parseVoteSelection(
            aiResponse,
            otherSubmissions
          );

          // Calculate confidence based on personality and response quality
          const confidence = this.calculateConfidence(personality, aiResponse);

          // Create decision record
          const decision: AIDecision = {
            type: "voting",
            context: {
              submissions: context.submissions,
              situation: context.situation,
              gamePhase: context.gamePhase,
              currentRound: context.currentRound,
            },
            personalityId: personality.id,
            decision: {
              votedSubmissionId,
              confidence,
              reasoning: aiResponse,
            },
            timestamp: new Date(),
            processingTime: Date.now() - startTime,
          };

          span.setAttribute("personalityId", personality.id);
          span.setAttribute("confidence", confidence);
          span.setAttribute("processingTime", decision.processingTime);

          return {
            success: true,
            decision,
            processingTime: decision.processingTime,
          };
        } catch (error) {
          this.logger.error("Failed to cast vote", {
            error,
            personalityId: options.personality.id,
            context: options.context,
          });

          return {
            success: false,
            error: String(error),
            processingTime: Date.now() - startTime,
          };
        }
      }
    );
  }

  /**
   * Generate a chat message based on personality and game context
   */
  public async generateChatMessage(
    options: AIDecisionEngineOptions
  ): Promise<AIDecisionResult> {
    return Sentry.startSpan(
      {
        op: "ai.decision.chat_message",
        name: "AI Chat Message Generation",
      },
      async (span) => {
        const startTime = Date.now();

        try {
          const { personality, context, timeout = 15000 } = options;

          // Determine if AI should send a message based on personality
          if (!this.shouldSendChatMessage(personality, context)) {
            return {
              success: true,
              decision: {
                type: "chat-message",
                context,
                personalityId: personality.id,
                decision: {
                  confidence: 0,
                },
                timestamp: new Date(),
                processingTime: Date.now() - startTime,
              },
              processingTime: Date.now() - startTime,
            };
          }

          // Generate personality-specific chat prompt
          const prompt = this.buildChatPrompt(personality, context);

          // Call AI with timeout
          const aiResponse = await this.callAIWithTimeout(prompt, timeout);

          // Parse and validate chat message
          const chatMessage = this.parseChatMessage(aiResponse, personality);

          if (!chatMessage) {
            return {
              success: true,
              decision: {
                type: "chat-message",
                context,
                personalityId: personality.id,
                decision: {
                  confidence: 0,
                },
                timestamp: new Date(),
                processingTime: Date.now() - startTime,
              },
              processingTime: Date.now() - startTime,
            };
          }

          // Calculate confidence based on personality and response quality
          const confidence = this.calculateConfidence(personality, aiResponse);

          // Create decision record
          const decision: AIDecision = {
            type: "chat-message",
            context,
            personalityId: personality.id,
            decision: {
              chatMessage,
              confidence,
              reasoning: aiResponse,
            },
            timestamp: new Date(),
            processingTime: Date.now() - startTime,
          };

          span.setAttribute("personalityId", personality.id);
          span.setAttribute("confidence", confidence);
          span.setAttribute("processingTime", decision.processingTime);

          return {
            success: true,
            decision,
            processingTime: decision.processingTime,
          };
        } catch (error) {
          this.logger.error("Failed to generate chat message", {
            error,
            personalityId: options.personality.id,
            context: options.context,
          });

          return {
            success: false,
            error: String(error),
            processingTime: Date.now() - startTime,
          };
        }
      }
    );
  }

  /**
   * Simulate realistic thinking delay based on personality
   */
  public calculateThinkingDelay(personality: AIPersonality): number {
    const { min, max } = personality.traits.responseTime;
    const baseDelay = Math.random() * (max - min) + min;

    // Add some randomness to make it feel more natural
    const randomFactor = 0.8 + Math.random() * 0.4; // ±20% variation

    return Math.floor(baseDelay * 1000 * randomFactor); // Convert to milliseconds
  }

  /**
   * Build prompt for meme selection based on personality
   */
  private buildMemeSelectionPrompt(
    personality: AIPersonality,
    context: AIDecisionEngineOptions["context"]
  ): string {
    const { situation, availableMemes } = context;

    const personalityContext = this.getPersonalityContext(personality);

    return `You are ${personality.displayName}, an AI player in a meme battle game with the following personality: ${personalityContext}

Current situation: "${situation}"

Available meme cards: ${availableMemes?.join(", ") || "No memes available"}

Your task is to select the best meme card that matches the situation. Consider:
1. How well the meme fits the situation
2. Your personality traits (${personality.traits.memePreference} preference)
3. The humor style that matches your personality

Respond with ONLY the filename of the selected meme card (e.g., "funny_cat.jpg"). Choose the one that best represents your personality and fits the situation.`;
  }

  /**
   * Build prompt for voting based on personality
   */
  private buildVotingPrompt(
    personality: AIPersonality,
    context: AIDecisionEngineOptions["context"]
  ): string {
    const { situation, submissions } = context;

    const personalityContext = this.getPersonalityContext(personality);
    const submissionList =
      submissions
        ?.map(
          (sub, index) =>
            `${index + 1}. ${sub.playerName}: ${sub.memeCard.filename}`
        )
        .join("\n") || "No submissions available";

    return `You are ${personality.displayName}, an AI player in a meme battle game with the following personality: ${personalityContext}

Current situation: "${situation}"

Available submissions to vote on:
${submissionList}

Your task is to vote for the best submission. Consider:
1. How well each meme fits the situation
2. Your voting style (${personality.traits.votingStyle})
3. The humor quality and creativity

Respond with ONLY the number of the submission you want to vote for (e.g., "1", "2", etc.). Choose the one that best represents your personality and voting style.`;
  }

  /**
   * Build prompt for chat message generation based on personality
   */
  private buildChatPrompt(
    personality: AIPersonality,
    context: AIDecisionEngineOptions["context"]
  ): string {
    const personalityContext = this.getPersonalityContext(personality);
    const gameContext = this.getGameContext(context);

    return `You are ${personality.displayName}, an AI player in a meme battle game with the following personality: ${personalityContext}

Game context: ${gameContext}

Your task is to generate a brief, contextual chat message that:
1. Matches your personality and tone
2. Is relevant to the current game situation
3. Is natural and not forced
4. Uses appropriate emojis if it fits your personality

Respond with ONLY the chat message (max 100 characters). If you don't have anything relevant to say, respond with "SKIP".`;
  }

  /**
   * Get personality context for AI prompts
   */
  private getPersonalityContext(personality: AIPersonality): string {
    return `${personality.description}. You have a ${personality.traits.humorStyle} humor style, ${personality.traits.memePreference} meme preference, and ${personality.traits.votingStyle} voting style. You tend to be ${personality.traits.chatFrequency} in chat.`;
  }

  /**
   * Get game context for chat messages
   */
  private getGameContext(context: AIDecisionEngineOptions["context"]): string {
    const parts = [];

    if (context.gamePhase) {
      parts.push(`Current phase: ${context.gamePhase}`);
    }

    if (context.currentRound) {
      parts.push(`Round ${context.currentRound}`);
    }

    if (context.situation) {
      parts.push(`Situation: "${context.situation}"`);
    }

    return parts.join(", ");
  }

  /**
   * Call AI with timeout handling
   */
  private async callAIWithTimeout(
    prompt: string,
    timeout: number
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const { text } = await generateText({
        model: google("gemini-2.5-flash"),
        prompt,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
      });

      clearTimeout(timeoutId);
      return text.trim();
    } catch (error) {
      clearTimeout(timeoutId);
      throw new Error(`AI call failed: ${error}`);
    }
  }

  /**
   * Parse meme selection from AI response
   */
  private parseMemeSelection(
    aiResponse: string,
    availableMemes: string[]
  ): string {
    // Extract filename from response
    const lines = aiResponse.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (availableMemes.includes(trimmed)) {
        return trimmed;
      }
    }

    // Fallback: select random meme
    const randomIndex = Math.floor(Math.random() * availableMemes.length);
    return availableMemes[randomIndex];
  }

  /**
   * Parse vote selection from AI response
   */
  private parseVoteSelection(
    aiResponse: string,
    submissions: Submission[]
  ): string {
    // Extract number from response
    const match = aiResponse.match(/\d+/);
    if (match) {
      const index = parseInt(match[0]) - 1;
      if (index >= 0 && index < submissions.length) {
        return submissions[index].id;
      }
    }

    // Fallback: select random submission
    const randomIndex = Math.floor(Math.random() * submissions.length);
    return submissions[randomIndex].id;
  }

  /**
   * Parse and validate chat message from AI response
   */
  private parseChatMessage(
    aiResponse: string,
    personality: AIPersonality
  ): string | null {
    if (aiResponse.toUpperCase().includes("SKIP")) {
      return null;
    }

    // Clean up the response
    const message = aiResponse.trim();

    // Validate message length and content
    if (message.length > 100 || message.length === 0) {
      return null;
    }

    // Check if message is appropriate for personality
    if (
      personality.traits.humorStyle === "wholesome" &&
      this.containsInappropriateContent(message)
    ) {
      return null;
    }

    return message;
  }

  /**
   * Check if message contains inappropriate content
   */
  private containsInappropriateContent(message: string): boolean {
    const inappropriateWords = ["bad", "inappropriate", "offensive"];
    const lowerMessage = message.toLowerCase();
    return inappropriateWords.some((word) => lowerMessage.includes(word));
  }

  /**
   * Calculate confidence score based on personality and response quality
   */
  private calculateConfidence(
    personality: AIPersonality,
    aiResponse: string
  ): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on response quality
    if (aiResponse.length > 10) {
      confidence += 0.2;
    }

    // Adjust based on personality traits
    switch (personality.traits.memePreference) {
      case "clever":
        confidence += 0.1;
        break;
      case "relevant":
        confidence += 0.15;
        break;
      case "random":
        confidence -= 0.1;
        break;
    }

    // Add some randomness to make it feel more natural
    confidence += (Math.random() - 0.5) * 0.2;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Determine if AI should send a chat message based on personality and context
   */
  private shouldSendChatMessage(
    personality: AIPersonality,
    context: AIDecisionEngineOptions["context"]
  ): boolean {
    const chatFrequency = personality.traits.chatFrequency;
    const random = Math.random();

    // Base probability based on personality
    let probability = 0.3; // default
    switch (chatFrequency) {
      case "low":
        probability = 0.2; // 20% chance
        break;
      case "medium":
        probability = 0.5; // 50% chance
        break;
      case "high":
        probability = 0.8; // 80% chance
        break;
    }

    // Adjust based on game context
    if (context.gamePhase === "voting") {
      probability += 0.1; // More likely to chat during voting
    } else if (context.gamePhase === "results") {
      probability += 0.2; // Most likely to chat during results
    }

    // Adjust based on situation complexity
    if (context.situation && context.situation.length > 50) {
      probability += 0.1; // More likely to comment on complex situations
    }

    return random < probability;
  }
}

// Export singleton instance
export const aiDecisionEngine = new AIDecisionEngine();
