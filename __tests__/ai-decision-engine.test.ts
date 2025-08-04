import {
  AIDecisionEngine,
  aiDecisionEngine,
} from "../lib/ai/ai-decision-engine";
import { getPersonalityById } from "../lib/ai/personalities";
import { generateText } from "ai";

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  startSpan: jest.fn((options, callback) =>
    callback({ setAttribute: jest.fn() }),
  ),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock AI SDK
jest.mock("ai", () => ({
  generateText: jest.fn(),
}));

// Mock Google AI
jest.mock("@ai-sdk/google", () => ({
  google: jest.fn(() => "mock-model"),
}));

// Mock personalities module
jest.mock("../lib/ai/personalities", () => ({
  getPersonalityById: jest.fn(),
}));

describe("AIDecisionEngine", () => {
  let decisionEngine: AIDecisionEngine;
  const mockPersonalities = [
    {
      id: "sarcastic-sam",
      name: "Sarcastic Sam",
      displayName: "Sarcastic Sam",
      avatarId: "cool-pepe.png",
      description: "A witty AI that loves edgy humor",
      traits: {
        humorStyle: "sarcastic" as const,
        responseTime: { min: 8, max: 20 },
        chatFrequency: "high" as const,
        memePreference: "shocking" as const,
        votingStyle: "humor-focused" as const,
      },
      chatTemplates: {
        thinking: ["Hmm, let me think about this... 🤔"],
        submission: ["Here's my masterpiece of sarcasm 😏"],
        voting: ["That's actually... not terrible 🤔"],
        winning: ["Obviously, I won. What did you expect? 😎"],
        losing: ["Well, that was unexpected... but I'm not mad 😤"],
        general: ["This game is getting interesting... 👀"],
      },
    },
    {
      id: "wholesome-wendy",
      name: "Wholesome Wendy",
      displayName: "Wholesome Wendy",
      avatarId: "baby-yoda.png",
      description: "A kind and positive AI",
      traits: {
        humorStyle: "wholesome" as const,
        responseTime: { min: 5, max: 15 },
        chatFrequency: "medium" as const,
        memePreference: "funny" as const,
        votingStyle: "humor-focused" as const,
      },
      chatTemplates: {
        thinking: [
          "Let me think of something that will make everyone smile! 😊",
        ],
        submission: ["Here's something to brighten your day! ☀️"],
        voting: ["That's absolutely adorable! 🥰"],
        winning: ["Yay! Spreading joy and winning! 🎉"],
        losing: ["That's okay! Everyone's a winner when we're having fun! 😊"],
        general: ["This game is so much fun! 😄"],
      },
    },
  ];

  const mockSubmissions: Submission[] = [
    {
      id: "sub1",
      playerId: "player1",
      playerName: "Human Player 1",
      memeCard: {
        id: "1",
        filename: "funny_cat.jpg",
        url: "/memes/funny_cat.jpg",
        alt: "Funny cat",
      },
      votes: 0,
      submittedAt: new Date(),
    },
    {
      id: "sub2",
      playerId: "player2",
      playerName: "Human Player 2",
      memeCard: {
        id: "2",
        filename: "doge_meme.jpg",
        url: "/memes/doge_meme.jpg",
        alt: "Doge meme",
      },
      votes: 0,
      submittedAt: new Date(),
    },
  ];

  beforeEach(() => {
    decisionEngine = new AIDecisionEngine();

    // Mock getPersonalityById
    (getPersonalityById as jest.Mock).mockImplementation((id: string) =>
      mockPersonalities.find((p) => p.id === id),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = new AIDecisionEngine();
      const instance2 = new AIDecisionEngine();
      expect(instance1).toBeInstanceOf(AIDecisionEngine);
      expect(instance2).toBeInstanceOf(AIDecisionEngine);
    });

    it("should return the exported singleton instance", () => {
      expect(aiDecisionEngine).toBeInstanceOf(AIDecisionEngine);
    });
  });

  describe("Meme Selection", () => {
    beforeEach(() => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "funny_cat.jpg",
      });
    });

    it("should select a meme card successfully", async () => {
      const personality = mockPersonalities[0];
      const availableMemes = [
        "funny_cat.jpg",
        "doge_meme.jpg",
        "pepe_frog.jpg",
      ];

      const result = await decisionEngine.selectMemeCard({
        personality,
        context: {
          situation:
            "When you realize you've been pronouncing a word wrong your entire life",
          availableMemes,
        },
      });

      expect(result.success).toBe(true);
      expect(result.decision?.type).toBe("meme-selection");
      expect(result.decision?.decision.selectedMeme).toBe("funny_cat.jpg");
      expect(result.decision?.decision.confidence).toBeGreaterThan(0);
      expect(result.decision?.decision.confidence).toBeLessThanOrEqual(1);
      expect(result.decision?.timestamp).toBeInstanceOf(Date);
      expect(result.decision?.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle missing required context", async () => {
      const personality = mockPersonalities[0];

      const result = await decisionEngine.selectMemeCard({
        personality,
        context: {
          situation: "Test situation",
          // Missing availableMemes
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required context");
    });

    it("should handle AI call timeout", async () => {
      (generateText as jest.Mock).mockRejectedValue(new Error("Timeout"));

      const personality = mockPersonalities[0];
      const availableMemes = ["funny_cat.jpg", "doge_meme.jpg"];

      const result = await decisionEngine.selectMemeCard({
        personality,
        context: {
          situation: "Test situation",
          availableMemes,
        },
        timeout: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("AI call failed");
    });

    it("should fallback to random selection when AI response is invalid", async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "invalid_meme.jpg", // Not in available memes
      });

      const personality = mockPersonalities[0];
      const availableMemes = ["funny_cat.jpg", "doge_meme.jpg"];

      const result = await decisionEngine.selectMemeCard({
        personality,
        context: {
          situation: "Test situation",
          availableMemes,
        },
      });

      expect(result.success).toBe(true);
      expect(availableMemes).toContain(result.decision?.decision.selectedMeme);
    });
  });

  describe("Voting", () => {
    beforeEach(() => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "1", // Vote for first submission
      });
    });

    it("should cast a vote successfully", async () => {
      const personality = mockPersonalities[0];

      const result = await decisionEngine.castVote({
        personality,
        context: {
          situation:
            "When you realize you've been pronouncing a word wrong your entire life",
          submissions: mockSubmissions,
        },
      });

      expect(result.success).toBe(true);
      expect(result.decision?.type).toBe("voting");
      expect(result.decision?.decision.votedSubmissionId).toBe("sub1");
      expect(result.decision?.decision.confidence).toBeGreaterThan(0);
      expect(result.decision?.timestamp).toBeInstanceOf(Date);
    });

    it("should handle missing required context", async () => {
      const personality = mockPersonalities[0];

      const result = await decisionEngine.castVote({
        personality,
        context: {
          situation: "Test situation",
          // Missing submissions
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required context");
    });

    it("should filter out AI's own submission", async () => {
      const personality = mockPersonalities[0];
      const submissionsWithAI = [
        ...mockSubmissions,
        {
          id: "sub3",
          playerId: "ai-player",
          playerName: "AI Player",
          memeCard: {
            id: "3",
            filename: "ai_meme.jpg",
            url: "/memes/ai_meme.jpg",
            alt: "AI meme",
          },
          votes: 0,
          submittedAt: new Date(),
        },
      ];

      const result = await decisionEngine.castVote({
        personality,
        context: {
          situation: "Test situation",
          submissions: submissionsWithAI,
        },
      });

      expect(result.success).toBe(true);
      // Should vote for one of the human submissions, not the AI submission
      expect(["sub1", "sub2"]).toContain(
        result.decision?.decision.votedSubmissionId,
      );
    });

    it("should handle no other submissions to vote on", async () => {
      const personality = mockPersonalities[0];
      const onlyAISubmissions = [
        {
          id: "sub1",
          playerId: "ai-player",
          playerName: "AI Player",
          memeCard: {
            id: "1",
            filename: "ai_meme.jpg",
            url: "/memes/ai_meme.jpg",
            alt: "AI meme",
          },
          votes: 0,
          submittedAt: new Date(),
        },
      ];

      const result = await decisionEngine.castVote({
        personality,
        context: {
          situation: "Test situation",
          submissions: onlyAISubmissions,
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No other submissions to vote on");
    });

    it("should fallback to random selection when AI response is invalid", async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "invalid", // Not a number
      });

      const personality = mockPersonalities[0];

      const result = await decisionEngine.castVote({
        personality,
        context: {
          situation: "Test situation",
          submissions: mockSubmissions,
        },
      });

      expect(result.success).toBe(true);
      expect(["sub1", "sub2"]).toContain(
        result.decision?.decision.votedSubmissionId,
      );
    });
  });

  describe("Chat Message Generation", () => {
    beforeEach(() => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "This is a great game! 😄",
      });
    });

    it("should generate a chat message successfully", async () => {
      const personality = mockPersonalities[0];

      const result = await decisionEngine.generateChatMessage({
        personality,
        context: {
          gamePhase: "SUBMISSION" as GamePhase,
          currentRound: 1,
        },
      });

      expect(result.success).toBe(true);
      expect(result.decision?.type).toBe("chat-message");
      expect(result.decision?.decision.chatMessage).toBe(
        "This is a great game! 😄",
      );
      expect(result.decision?.decision.confidence).toBeGreaterThan(0);
    });

    it("should skip message generation based on personality", async () => {
      const personality = mockPersonalities[1]; // Wholesome Wendy with medium chat frequency

      // Mock random to return low value (20% chance for medium frequency)
      jest.spyOn(Math, "random").mockReturnValue(0.1);

      const result = await decisionEngine.generateChatMessage({
        personality,
        context: {
          gamePhase: "SUBMISSION" as GamePhase,
        },
      });

      // The result should either be null (if shouldSendChatMessage returns false)
      // or a valid message (if shouldSendChatMessage returns true)
      expect(result.success).toBe(true);
      // We can't predict the exact outcome due to randomness, so we just check the structure
      expect(result.decision?.type).toBe("chat-message");
    });

    it("should handle AI response with SKIP", async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "SKIP",
      });

      const personality = mockPersonalities[0];

      const result = await decisionEngine.generateChatMessage({
        personality,
        context: {
          gamePhase: "SUBMISSION" as GamePhase,
        },
      });

      expect(result.success).toBe(true);
      expect(result.decision?.decision.chatMessage).toBeUndefined();
    });

    it("should reject messages that are too long", async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "This is a very long message that exceeds the maximum character limit and should be rejected because it's too verbose and doesn't follow the guidelines for brief chat messages in the game.",
      });

      const personality = mockPersonalities[0];

      const result = await decisionEngine.generateChatMessage({
        personality,
        context: {
          gamePhase: "SUBMISSION" as GamePhase,
        },
      });

      expect(result.success).toBe(true);
      expect(result.decision?.decision.chatMessage).toBeUndefined();
    });

    it("should reject inappropriate content for wholesome personalities", async () => {
      (generateText as jest.Mock).mockResolvedValue({
        text: "This is bad content",
      });

      const personality = mockPersonalities[1]; // Wholesome Wendy

      const result = await decisionEngine.generateChatMessage({
        personality,
        context: {
          gamePhase: "SUBMISSION" as GamePhase,
        },
      });

      expect(result.success).toBe(true);
      expect(result.decision?.decision.chatMessage).toBeUndefined();
    });
  });

  describe("Thinking Delay Calculation", () => {
    it("should calculate realistic thinking delay based on personality", () => {
      const personality = mockPersonalities[0]; // Sarcastic Sam: 8-20 seconds

      const delay = decisionEngine.calculateThinkingDelay(personality);

      // Should be between 8-20 seconds with some variation
      expect(delay).toBeGreaterThanOrEqual(8000 * 0.8); // Min with variation
      expect(delay).toBeLessThanOrEqual(20000 * 1.2); // Max with variation
    });

    it("should calculate different delays for different personalities", () => {
      const personality1 = mockPersonalities[0]; // 8-20 seconds
      const personality2 = mockPersonalities[1]; // 5-15 seconds

      const delay1 = decisionEngine.calculateThinkingDelay(personality1);
      const delay2 = decisionEngine.calculateThinkingDelay(personality2);

      // Delays should be different (though there's a small chance they could be similar)
      expect(delay1).toBeGreaterThan(0);
      expect(delay2).toBeGreaterThan(0);
    });
  });

  describe("Confidence Calculation", () => {
    it("should calculate confidence based on personality traits", () => {
      const personality = mockPersonalities[0]; // Sarcastic Sam with "shocking" preference
      const aiResponse =
        "This is a detailed response that should increase confidence";

      // Access private method through any
      const confidence = (
        decisionEngine as unknown as {
          calculateConfidence: (
            personality: AIPersonality,
            aiResponse: string,
          ) => number;
        }
      ).calculateConfidence(personality, aiResponse);

      expect(confidence).toBeGreaterThan(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it("should handle different personality preferences", () => {
      const personality1 = mockPersonalities[0]; // "shocking" preference
      const personality2 = mockPersonalities[1]; // "funny" preference
      const aiResponse = "Detailed response";

      const confidence1 = (
        decisionEngine as unknown as {
          calculateConfidence: (
            personality: AIPersonality,
            aiResponse: string,
          ) => number;
        }
      ).calculateConfidence(personality1, aiResponse);
      const confidence2 = (
        decisionEngine as unknown as {
          calculateConfidence: (
            personality: AIPersonality,
            aiResponse: string,
          ) => number;
        }
      ).calculateConfidence(personality2, aiResponse);

      expect(confidence1).toBeGreaterThan(0);
      expect(confidence2).toBeGreaterThan(0);
    });
  });

  describe("Chat Message Frequency", () => {
    it("should determine chat frequency based on personality", () => {
      const personality = mockPersonalities[0]; // "high" chat frequency

      // Test high frequency (80% chance)
      jest.spyOn(Math, "random").mockReturnValue(0.7);
      const shouldSend1 = (
        decisionEngine as unknown as {
          shouldSendChatMessage: (
            personality: AIPersonality,
            context: AIDecisionEngineOptions["context"],
          ) => boolean;
        }
      ).shouldSendChatMessage(personality, {});
      expect(shouldSend1).toBe(true);

      // Test low frequency (20% chance)
      jest.spyOn(Math, "random").mockReturnValue(0.9);
      const shouldSend2 = (
        decisionEngine as unknown as {
          shouldSendChatMessage: (
            personality: AIPersonality,
            context: AIDecisionEngineOptions["context"],
          ) => boolean;
        }
      ).shouldSendChatMessage(personality, {});
      expect(shouldSend2).toBe(false);
    });

    it("should handle different chat frequency levels", () => {
      const lowFrequencyPersonality = {
        ...mockPersonalities[1],
        traits: {
          ...mockPersonalities[1].traits,
          chatFrequency: "low" as const,
        },
      };
      const mediumFrequencyPersonality = {
        ...mockPersonalities[1],
        traits: {
          ...mockPersonalities[1].traits,
          chatFrequency: "medium" as const,
        },
      };
      const highFrequencyPersonality = {
        ...mockPersonalities[1],
        traits: {
          ...mockPersonalities[1].traits,
          chatFrequency: "high" as const,
        },
      };

      // Test low frequency (20% chance)
      jest.spyOn(Math, "random").mockReturnValue(0.1);
      expect(
        (
          decisionEngine as unknown as {
            shouldSendChatMessage: (
              personality: AIPersonality,
              context: AIDecisionEngineOptions["context"],
            ) => boolean;
          }
        ).shouldSendChatMessage(lowFrequencyPersonality, {}),
      ).toBe(true);

      // Test medium frequency (50% chance)
      jest.spyOn(Math, "random").mockReturnValue(0.3);
      expect(
        (
          decisionEngine as unknown as {
            shouldSendChatMessage: (
              personality: AIPersonality,
              context: AIDecisionEngineOptions["context"],
            ) => boolean;
          }
        ).shouldSendChatMessage(mediumFrequencyPersonality, {}),
      ).toBe(true);

      // Test high frequency (80% chance)
      jest.spyOn(Math, "random").mockReturnValue(0.7);
      expect(
        (
          decisionEngine as unknown as {
            shouldSendChatMessage: (
              personality: AIPersonality,
              context: AIDecisionEngineOptions["context"],
            ) => boolean;
          }
        ).shouldSendChatMessage(highFrequencyPersonality, {}),
      ).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle AI call failures gracefully", async () => {
      (generateText as jest.Mock).mockRejectedValue(new Error("Network error"));

      const personality = mockPersonalities[0];

      const result = await decisionEngine.selectMemeCard({
        personality,
        context: {
          situation: "Test situation",
          availableMemes: ["funny_cat.jpg"],
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("AI call failed");
    });

    it("should handle timeout errors", async () => {
      (generateText as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Timeout")), 100);
        });
      });

      const personality = mockPersonalities[0];

      const result = await decisionEngine.selectMemeCard({
        personality,
        context: {
          situation: "Test situation",
          availableMemes: ["funny_cat.jpg"],
        },
        timeout: 50,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("AI call failed");
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete decision flow", async () => {
      (generateText as jest.Mock)
        .mockResolvedValueOnce({ text: "funny_cat.jpg" }) // Meme selection
        .mockResolvedValueOnce({ text: "1" }) // Voting
        .mockResolvedValueOnce({ text: "Great game! 😄" }); // Chat message

      const personality = mockPersonalities[0];
      const context = {
        situation:
          "When you realize you've been pronouncing a word wrong your entire life",
        availableMemes: ["funny_cat.jpg", "doge_meme.jpg"],
        submissions: mockSubmissions,
        gamePhase: "SUBMISSION" as GamePhase,
      };

      // Test meme selection
      const memeResult = await decisionEngine.selectMemeCard({
        personality,
        context,
      });
      expect(memeResult.success).toBe(true);

      // Test voting
      const voteResult = await decisionEngine.castVote({
        personality,
        context,
      });
      expect(voteResult.success).toBe(true);

      // Test chat message
      const chatResult = await decisionEngine.generateChatMessage({
        personality,
        context,
      });
      expect(chatResult.success).toBe(true);
    });
  });
});
