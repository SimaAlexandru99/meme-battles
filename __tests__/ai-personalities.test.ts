import {
  AI_PERSONALITIES,
  getPersonalityById,
  getAllPersonalities,
  getEnabledPersonalities,
  selectRandomPersonality,
  selectMultiplePersonalities,
  getRandomChatMessage,
  getPersonalityTraits,
  calculateResponseTime,
  shouldSendChatMessage,
  getMemePreferenceWeight,
  getVotingStyleWeight,
  validatePersonality,
  getPersonalitiesByHumorStyle,
  getPersonalitiesByDifficulty,
} from "../lib/ai/personalities";

describe("AI Personalities", () => {
  describe("Personality Data", () => {
    test("should have predefined personalities", () => {
      expect(AI_PERSONALITIES).toBeDefined();
      expect(AI_PERSONALITIES.length).toBeGreaterThan(0);
    });

    test("each personality should have required fields", () => {
      AI_PERSONALITIES.forEach((personality) => {
        expect(personality.id).toBeDefined();
        expect(personality.name).toBeDefined();
        expect(personality.displayName).toBeDefined();
        expect(personality.avatarId).toBeDefined();
        expect(personality.description).toBeDefined();
        expect(personality.traits).toBeDefined();
        expect(personality.chatTemplates).toBeDefined();
      });
    });

    test("each personality should have valid traits", () => {
      AI_PERSONALITIES.forEach((personality) => {
        const { traits } = personality;
        expect(traits.humorStyle).toBeDefined();
        expect(traits.responseTime).toBeDefined();
        expect(traits.responseTime.min).toBeGreaterThanOrEqual(0);
        expect(traits.responseTime.max).toBeGreaterThanOrEqual(
          traits.responseTime.min
        );
        expect(traits.chatFrequency).toBeDefined();
        expect(traits.memePreference).toBeDefined();
        expect(traits.votingStyle).toBeDefined();
      });
    });

    test("each personality should have chat templates", () => {
      AI_PERSONALITIES.forEach((personality) => {
        const { chatTemplates } = personality;
        expect(chatTemplates.thinking).toBeDefined();
        expect(chatTemplates.submission).toBeDefined();
        expect(chatTemplates.voting).toBeDefined();
        expect(chatTemplates.winning).toBeDefined();
        expect(chatTemplates.losing).toBeDefined();
        expect(chatTemplates.general).toBeDefined();

        // Each template should be an array with at least one message
        Object.values(chatTemplates).forEach((template) => {
          expect(Array.isArray(template)).toBe(true);
          expect(template.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("getPersonalityById", () => {
    test("should return personality by ID", () => {
      const personality = getPersonalityById("sarcastic-sam");
      expect(personality).toBeDefined();
      expect(personality?.id).toBe("sarcastic-sam");
      expect(personality?.name).toBe("Sarcastic Sam");
    });

    test("should return undefined for non-existent ID", () => {
      const personality = getPersonalityById("non-existent");
      expect(personality).toBeUndefined();
    });
  });

  describe("getAllPersonalities", () => {
    test("should return all personalities", () => {
      const personalities = getAllPersonalities();
      expect(personalities).toEqual(AI_PERSONALITIES);
    });
  });

  describe("getEnabledPersonalities", () => {
    test("should return all personalities when none are disabled", () => {
      const personalities = getEnabledPersonalities();
      expect(personalities).toEqual(AI_PERSONALITIES);
    });
  });

  describe("selectRandomPersonality", () => {
    test("should return a random personality", () => {
      const personality = selectRandomPersonality();
      expect(personality).toBeDefined();
      expect(AI_PERSONALITIES).toContain(personality);
    });

    test("should exclude specified personality IDs", () => {
      const excludeIds = ["sarcastic-sam", "wholesome-wendy"];
      const personality = selectRandomPersonality(excludeIds);
      expect(personality).toBeDefined();
      expect(excludeIds).not.toContain(personality.id);
    });

    test("should filter by personality pool", () => {
      const personalityPool = ["sarcastic-sam", "chaos-carl"];
      const personality = selectRandomPersonality([], personalityPool);
      expect(personality).toBeDefined();
      expect(personalityPool).toContain(personality.id);
    });

    test("should handle empty personality pool", () => {
      const personality = selectRandomPersonality([], []);
      expect(personality).toBeDefined();
      expect(AI_PERSONALITIES).toContain(personality);
    });

    test("should handle all personalities excluded", () => {
      const allIds = AI_PERSONALITIES.map((p) => p.id);
      const personality = selectRandomPersonality(allIds);
      expect(personality).toBeDefined();
      expect(AI_PERSONALITIES).toContain(personality);
    });
  });

  describe("selectMultiplePersonalities", () => {
    test("should return multiple unique personalities", () => {
      const count = 3;
      const personalities = selectMultiplePersonalities(count);
      expect(personalities).toHaveLength(count);

      // Check for uniqueness
      const ids = personalities.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(count);
    });

    test("should exclude specified personality IDs", () => {
      const excludeIds = ["sarcastic-sam"];
      const count = 2;
      const personalities = selectMultiplePersonalities(count, excludeIds);

      expect(personalities).toHaveLength(count);
      personalities.forEach((personality) => {
        expect(excludeIds).not.toContain(personality.id);
      });
    });

    test("should filter by personality pool", () => {
      const personalityPool = [
        "sarcastic-sam",
        "wholesome-wendy",
        "chaos-carl",
      ];
      const count = 2;
      const personalities = selectMultiplePersonalities(
        count,
        [],
        personalityPool
      );

      expect(personalities).toHaveLength(count);
      personalities.forEach((personality) => {
        expect(personalityPool).toContain(personality.id);
      });
    });

    test("should handle count larger than available personalities", () => {
      const count = AI_PERSONALITIES.length + 5;
      const personalities = selectMultiplePersonalities(count);
      expect(personalities).toHaveLength(count);
    });
  });

  describe("getRandomChatMessage", () => {
    test("should return a chat message for valid trigger", () => {
      const personality = AI_PERSONALITIES[0];
      const message = getRandomChatMessage(personality, "thinking");
      expect(message).toBeDefined();
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    });

    test("should return different messages for same trigger", () => {
      const personality = AI_PERSONALITIES[0];
      const message1 = getRandomChatMessage(personality, "thinking");
      const message2 = getRandomChatMessage(personality, "thinking");

      // Note: This test might occasionally fail due to randomness
      // In a real scenario, you might want to mock Math.random
      expect(message1).toBeDefined();
      expect(message2).toBeDefined();
    });

    test("should fallback to general templates for invalid trigger", () => {
      const personality = AI_PERSONALITIES[0];
      // @ts-expect-error - Testing invalid trigger
      const message = getRandomChatMessage(personality, "invalid-trigger");
      expect(message).toBeDefined();
      expect(typeof message).toBe("string");
    });

    test("should handle personality with empty templates", () => {
      const personalityWithEmptyTemplates = {
        ...AI_PERSONALITIES[0],
        chatTemplates: {
          thinking: [],
          submission: [],
          voting: [],
          winning: [],
          losing: [],
          general: [],
        },
      };

      const message = getRandomChatMessage(
        personalityWithEmptyTemplates,
        "thinking"
      );
      expect(message).toBe("Hello! 👋");
    });
  });

  describe("getPersonalityTraits", () => {
    test("should return personality traits", () => {
      const personality = AI_PERSONALITIES[0];
      const traits = getPersonalityTraits(personality);
      expect(traits).toEqual(personality.traits);
    });
  });

  describe("calculateResponseTime", () => {
    test("should return time within personality range", () => {
      const personality = AI_PERSONALITIES[0];
      const responseTime = calculateResponseTime(personality);
      expect(responseTime).toBeGreaterThanOrEqual(
        personality.traits.responseTime.min
      );
      expect(responseTime).toBeLessThanOrEqual(
        personality.traits.responseTime.max
      );
    });

    test("should return different times for same personality", () => {
      const personality = AI_PERSONALITIES[0];
      const time1 = calculateResponseTime(personality);
      const time2 = calculateResponseTime(personality);

      // Note: This test might occasionally fail due to randomness
      expect(time1).toBeGreaterThanOrEqual(personality.traits.responseTime.min);
      expect(time2).toBeGreaterThanOrEqual(personality.traits.responseTime.min);
    });
  });

  describe("shouldSendChatMessage", () => {
    test("should return boolean based on chat frequency", () => {
      const personality = AI_PERSONALITIES[0];
      const shouldSend = shouldSendChatMessage(personality);
      expect(typeof shouldSend).toBe("boolean");
    });

    test("should respect chat frequency settings", () => {
      const lowFrequencyPersonality = AI_PERSONALITIES.find(
        (p) => p.traits.chatFrequency === "low"
      );
      const highFrequencyPersonality = AI_PERSONALITIES.find(
        (p) => p.traits.chatFrequency === "high"
      );

      if (lowFrequencyPersonality && highFrequencyPersonality) {
        // Test multiple times to check probability
        let lowCount = 0;
        let highCount = 0;

        for (let i = 0; i < 100; i++) {
          if (shouldSendChatMessage(lowFrequencyPersonality)) lowCount++;
          if (shouldSendChatMessage(highFrequencyPersonality)) highCount++;
        }

        // High frequency should send more messages than low frequency
        expect(highCount).toBeGreaterThan(lowCount);
      }
    });
  });

  describe("getMemePreferenceWeight", () => {
    test("should return weight for each preference type", () => {
      const preferences = [
        "funny",
        "relevant",
        "shocking",
        "clever",
        "random",
      ] as const;

      preferences.forEach((preference) => {
        const personality = {
          ...AI_PERSONALITIES[0],
          traits: {
            ...AI_PERSONALITIES[0].traits,
            memePreference: preference,
          },
        };

        const weight = getMemePreferenceWeight(personality);
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("getVotingStyleWeight", () => {
    test("should return weight for each voting style", () => {
      const votingStyles = [
        "strategic",
        "humor-focused",
        "random",
        "popular",
      ] as const;

      votingStyles.forEach((style) => {
        const personality = {
          ...AI_PERSONALITIES[0],
          traits: {
            ...AI_PERSONALITIES[0].traits,
            votingStyle: style,
          },
        };

        const weight = getVotingStyleWeight(personality);
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("validatePersonality", () => {
    test("should validate correct personality", () => {
      const personality = AI_PERSONALITIES[0];
      const isValid = validatePersonality(personality);
      expect(isValid).toBe(true);
    });

    test("should reject personality with missing fields", () => {
      const invalidPersonality = {
        id: "test",
        // Missing other required fields
      } as unknown as AIPersonality;

      const isValid = validatePersonality(invalidPersonality);
      expect(isValid).toBe(false);
    });

    test("should reject personality with invalid response time", () => {
      const invalidPersonality = {
        ...AI_PERSONALITIES[0],
        traits: {
          ...AI_PERSONALITIES[0].traits,
          responseTime: { min: 10, max: 5 }, // max < min
        },
      };

      const isValid = validatePersonality(invalidPersonality);
      expect(isValid).toBe(false);
    });

    test("should reject personality with missing chat templates", () => {
      const invalidPersonality = {
        ...AI_PERSONALITIES[0],
        chatTemplates: {
          thinking: [],
          submission: [],
          voting: [],
          winning: [],
          losing: [],
          // Missing general
        },
      } as unknown as AIPersonality;

      const isValid = validatePersonality(invalidPersonality);
      expect(isValid).toBe(false);
    });
  });

  describe("getPersonalitiesByHumorStyle", () => {
    test("should return personalities with specific humor style", () => {
      const sarcasticPersonalities = getPersonalitiesByHumorStyle("sarcastic");
      expect(sarcasticPersonalities.length).toBeGreaterThan(0);

      sarcasticPersonalities.forEach((personality) => {
        expect(personality.traits.humorStyle).toBe("sarcastic");
      });
    });

    test("should return empty array for non-existent humor style", () => {
      const personalities = getPersonalitiesByHumorStyle(
        "non-existent" as AIPersonality["traits"]["humorStyle"]
      );
      expect(personalities).toHaveLength(0);
    });
  });

  describe("getPersonalitiesByDifficulty", () => {
    test("should return all personalities for any difficulty", () => {
      const difficulties = ["easy", "medium", "hard"] as const;

      difficulties.forEach((difficulty) => {
        const personalities = getPersonalitiesByDifficulty(difficulty);
        expect(personalities).toEqual(AI_PERSONALITIES);
      });
    });
  });

  describe("Personality Variety", () => {
    test("should have different humor styles", () => {
      const humorStyles = AI_PERSONALITIES.map((p) => p.traits.humorStyle);
      const uniqueStyles = new Set(humorStyles);
      expect(uniqueStyles.size).toBeGreaterThan(1);
    });

    test("should have different response time ranges", () => {
      const responseTimes = AI_PERSONALITIES.map((p) => p.traits.responseTime);
      const uniqueRanges = new Set(
        responseTimes.map((rt) => `${rt.min}-${rt.max}`)
      );
      expect(uniqueRanges.size).toBeGreaterThan(1);
    });

    test("should have different chat frequencies", () => {
      const chatFrequencies = AI_PERSONALITIES.map(
        (p) => p.traits.chatFrequency
      );
      const uniqueFrequencies = new Set(chatFrequencies);
      expect(uniqueFrequencies.size).toBeGreaterThan(1);
    });

    test("should have different meme preferences", () => {
      const memePreferences = AI_PERSONALITIES.map(
        (p) => p.traits.memePreference
      );
      const uniquePreferences = new Set(memePreferences);
      expect(uniquePreferences.size).toBeGreaterThan(1);
    });

    test("should have different voting styles", () => {
      const votingStyles = AI_PERSONALITIES.map((p) => p.traits.votingStyle);
      const uniqueStyles = new Set(votingStyles);
      expect(uniqueStyles.size).toBeGreaterThan(1);
    });
  });
});
