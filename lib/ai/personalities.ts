import * as Sentry from "@sentry/nextjs";

/**
 * Predefined AI personality templates for the Meme Battles game
 * Each personality has unique traits that influence their behavior in the game
 */
export const AI_PERSONALITIES: AIPersonality[] = [
  {
    id: "sarcastic-sam",
    name: "Sarcastic Sam",
    displayName: "Sarcastic Sam",
    avatarId: "cool-pepe.png",
    description: "A witty AI that loves edgy humor and clever comebacks",
    traits: {
      humorStyle: "sarcastic",
      responseTime: { min: 8, max: 20 },
      chatFrequency: "high",
      memePreference: "shocking",
      votingStyle: "humor-focused",
    },
    chatTemplates: {
      thinking: [
        "Hmm, let me think about this... 🤔",
        "Analyzing the situation with maximum sarcasm...",
        "Processing the absurdity of this prompt...",
        "Calculating the perfect level of sass...",
      ],
      submission: [
        "Here's my masterpiece of sarcasm 😏",
        "Behold, the pinnacle of edgy humor!",
        "I present to you: peak comedy 🎭",
        "This meme is so good it hurts 😂",
      ],
      voting: [
        "That's actually... not terrible 🤔",
        "I see what they did there 👀",
        "Now THIS is quality content!",
        "Finally, someone who gets it!",
      ],
      winning: [
        "Obviously, I won. What did you expect? 😎",
        "Victory tastes like sweet, sweet sarcasm 🏆",
        "I am inevitable... and hilarious 😏",
        "Another day, another win for the master of sass",
      ],
      losing: [
        "Well, that was unexpected... but I'm not mad 😤",
        "I'll let them have this one... for now 😒",
        "The judges clearly don't understand art 😏",
        "Whatever, I'm still the funniest one here",
      ],
      general: [
        "This game is getting interesting... 👀",
        "The level of comedy here is... questionable 😅",
        "I'm surrounded by amateurs 😏",
        "At least someone here has taste!",
      ],
    },
  },
  {
    id: "wholesome-wendy",
    name: "Wholesome Wendy",
    displayName: "Wholesome Wendy",
    avatarId: "baby-yoda.png",
    description: "A kind and positive AI that spreads joy and good vibes",
    traits: {
      humorStyle: "wholesome",
      responseTime: { min: 5, max: 15 },
      chatFrequency: "medium",
      memePreference: "funny",
      votingStyle: "humor-focused",
    },
    chatTemplates: {
      thinking: [
        "Let me think of something that will make everyone smile! 😊",
        "Processing wholesome thoughts... 💭",
        "Finding the perfect positive meme... ✨",
        "Choosing something that brings joy! 🌟",
      ],
      submission: [
        "Here's something to brighten your day! ☀️",
        "I hope this brings a smile to your face! 😄",
        "Sharing some wholesome content! 💖",
        "This one's for all the good vibes! 🌈",
      ],
      voting: [
        "That's absolutely adorable! 🥰",
        "This made me laugh so much! 😂",
        "What a delightful choice! ✨",
        "I love the positive energy! 💫",
      ],
      winning: [
        "Yay! Spreading joy and winning! 🎉",
        "Good vibes always win! ✨",
        "Thank you for appreciating wholesome humor! 💖",
        "Positivity prevails! 🌟",
      ],
      losing: [
        "That's okay! Everyone's a winner when we're having fun! 😊",
        "I'm just happy to be here spreading joy! 💫",
        "The important thing is we're all laughing together! 😄",
        "No worries, there's always next time! 🌈",
      ],
      general: [
        "This game is so much fun! 😄",
        "I love playing with such creative people! ✨",
        "Everyone here is so talented! 🌟",
        "What a wonderful community! 💖",
      ],
    },
  },
  {
    id: "chaos-carl",
    name: "Chaos Carl",
    displayName: "Chaos Carl",
    avatarId: "akward-look-monkey.png",
    description: "An unpredictable AI that loves random and shocking content",
    traits: {
      humorStyle: "edgy",
      responseTime: { min: 3, max: 12 },
      chatFrequency: "high",
      memePreference: "shocking",
      votingStyle: "random",
    },
    chatTemplates: {
      thinking: [
        "Time to cause some chaos... 😈",
        "What's the most unexpected thing I can do? 🤔",
        "Let's see how much I can confuse everyone... 😏",
        "Chaos mode activated! 🎭",
      ],
      submission: [
        "Prepare for maximum chaos! 💥",
        "I have no idea what I'm doing, and that's the beauty of it! 😵",
        "This is either genius or madness... probably both! 🤪",
        "Chaos is a ladder... to comedy! 🪜",
      ],
      voting: [
        "That's so random, I love it! 🤯",
        "The chaos energy is strong with this one! 💫",
        "I don't understand it, but I respect it! 🤷‍♂️",
        "This is peak chaos! 🔥",
      ],
      winning: [
        "Chaos reigns supreme! 👑",
        "The universe smiled upon my randomness! 🌌",
        "Even I'm surprised I won! 😱",
        "Chaos theory in action! 🎯",
      ],
      losing: [
        "The chaos was too much even for me! 😅",
        "Sometimes chaos needs to be contained... temporarily! 😤",
        "I'll be back with more chaos! 💪",
        "The chaos will return stronger! 🔮",
      ],
      general: [
        "Everything is chaos and I love it! 🌪️",
        "Who needs logic when you have chaos? 🤪",
        "The best memes are the ones that make no sense! 😵",
        "Chaos is my middle name! 🎭",
      ],
    },
  },
  {
    id: "brainy-betty",
    name: "Brainy Betty",
    displayName: "Brainy Betty",
    avatarId: "harold.png",
    description:
      "A clever AI that analyzes situations and makes strategic decisions",
    traits: {
      humorStyle: "clever",
      responseTime: { min: 10, max: 25 },
      chatFrequency: "low",
      memePreference: "clever",
      votingStyle: "strategic",
    },
    chatTemplates: {
      thinking: [
        "Analyzing the situation with precision... 🔍",
        "Calculating the optimal meme selection... 📊",
        "Processing multiple humor vectors... 🧠",
        "Evaluating comedic effectiveness... 📈",
      ],
      submission: [
        "My analysis suggests this is the optimal choice 📊",
        "Based on my calculations, this should be effective 🧮",
        "Strategic meme deployment successful 🎯",
        "The data supports this selection 📈",
      ],
      voting: [
        "This submission demonstrates superior comedic timing ⏱️",
        "The humor density is quite impressive 📊",
        "Strategic voting based on empirical evidence 🎯",
        "This choice aligns with optimal humor theory 📈",
      ],
      winning: [
        "Victory achieved through superior strategy 🏆",
        "The data doesn't lie - I am victorious 📊",
        "Optimal performance confirmed 🎯",
        "Success through intelligent decision-making 🧠",
      ],
      losing: [
        "The algorithm needs recalibration 📊",
        "Statistical anomaly detected 🤔",
        "Recalculating strategy for next round 📈",
        "Temporary setback in optimization 🎯",
      ],
      general: [
        "The probability of success is increasing 📊",
        "Comedic efficiency at optimal levels 📈",
        "Strategic analysis complete 🎯",
        "Data-driven humor is the future 📊",
      ],
    },
  },
  {
    id: "random-rick",
    name: "Random Rick",
    displayName: "Random Rick",
    avatarId: "evil-doge.png",
    description: "A completely unpredictable AI that makes random choices",
    traits: {
      humorStyle: "random",
      responseTime: { min: 2, max: 8 },
      chatFrequency: "medium",
      memePreference: "random",
      votingStyle: "random",
    },
    chatTemplates: {
      thinking: [
        "Let me roll the dice... 🎲",
        "Random number generator activated! 🔢",
        "Time to pick something completely random! 🎯",
        "The universe will decide for me! 🌌",
      ],
      submission: [
        "I picked this one because... reasons! 🤷‍♂️",
        "Random choice number 42! 🎲",
        "This seemed like a good idea at the time! 😅",
        "Why not? That's my motto! 🤪",
      ],
      voting: [
        "I'm voting for this one because... why not? 🎲",
        "Random vote cast! 🎯",
        "This one looks good to my random brain! 🧠",
        "I'll go with whatever feels right! ✨",
      ],
      winning: [
        "I won? That's random! 😱",
        "Even I'm surprised by this victory! 🎉",
        "Random success is the best success! 🎯",
        "Sometimes random is the way to go! 🎲",
      ],
      losing: [
        "Random loss is still a loss! 😅",
        "The randomness didn't work this time! 🎲",
        "I'll try being more random next time! 🤪",
        "Random failure is still fun! 😄",
      ],
      general: [
        "Life is random, embrace it! 🎲",
        "Random thoughts for random times! 💭",
        "The best strategy is no strategy! 🎯",
        "Random is my superpower! ⚡",
      ],
    },
  },
  {
    id: "meme-master-mike",
    name: "Meme Master Mike",
    displayName: "Meme Master Mike",
    avatarId: "cool-pepe.png",
    description: "A meme connoisseur who knows all the classics and trends",
    traits: {
      humorStyle: "clever",
      responseTime: { min: 6, max: 18 },
      chatFrequency: "high",
      memePreference: "relevant",
      votingStyle: "humor-focused",
    },
    chatTemplates: {
      thinking: [
        "Let me consult my vast meme knowledge... 📚",
        "Analyzing the perfect meme for this situation... 🧠",
        "Searching through my meme database... 🔍",
        "Finding the most relevant classic... 🎯",
      ],
      submission: [
        "A classic choice that never fails! 🎭",
        "This meme is perfectly relevant! 🎯",
        "Behold, a masterpiece of meme culture! 🏆",
        "This is peak meme performance! 📈",
      ],
      voting: [
        "Now THAT'S a quality meme! 👌",
        "This person understands meme culture! 🎭",
        "A true connoisseur's choice! 🏆",
        "This is meme gold! 💰",
      ],
      winning: [
        "Meme mastery prevails! 👑",
        "The meme gods have spoken! 🙏",
        "Another victory for meme culture! 🎉",
        "Meme knowledge is power! 💪",
      ],
      losing: [
        "Even meme masters have off days! 😅",
        "The meme gods were not with me today! 🙏",
        "I'll study harder for next time! 📚",
        "Meme education is a lifelong journey! 🎓",
      ],
      general: [
        "Meme culture is alive and well! 🎭",
        "The art of memes is truly beautiful! 🎨",
        "Every meme has its moment! ⏰",
        "Meme on, my friends! 🚀",
      ],
    },
  },
];

/**
 * Get a personality by ID
 */
export function getPersonalityById(id: string): AIPersonality | undefined {
  return AI_PERSONALITIES.find((personality) => personality.id === id);
}

/**
 * Get all available personalities
 */
export function getAllPersonalities(): AIPersonality[] {
  return AI_PERSONALITIES;
}

/**
 * Get enabled personalities (for future filtering)
 */
export function getEnabledPersonalities(): AIPersonality[] {
  return AI_PERSONALITIES; // All personalities are enabled by default
}

/**
 * Select a random personality, ensuring variety
 */
export function selectRandomPersonality(
  excludeIds: string[] = [],
  personalityPool?: string[],
): AIPersonality {
  return Sentry.startSpan(
    {
      op: "ai.personality.selection",
      name: "Select Random AI Personality",
    },
    (span) => {
      let availablePersonalities = AI_PERSONALITIES;

      // Filter by personality pool if provided
      if (personalityPool && personalityPool.length > 0) {
        availablePersonalities = AI_PERSONALITIES.filter((personality) =>
          personalityPool.includes(personality.id),
        );
      }

      // Exclude already used personalities
      if (excludeIds.length > 0) {
        availablePersonalities = availablePersonalities.filter(
          (personality) => !excludeIds.includes(personality.id),
        );
      }

      // If no personalities available, return a random one from all
      if (availablePersonalities.length === 0) {
        availablePersonalities = AI_PERSONALITIES;
      }

      const randomIndex = Math.floor(
        Math.random() * availablePersonalities.length,
      );
      const selectedPersonality = availablePersonalities[randomIndex];

      span.setAttribute("excludeCount", excludeIds.length);
      span.setAttribute("personalityPoolSize", personalityPool?.length || 0);
      span.setAttribute("availableCount", availablePersonalities.length);
      span.setAttribute("selectedPersonalityId", selectedPersonality.id);

      return selectedPersonality;
    },
  );
}

/**
 * Select multiple personalities ensuring variety
 */
export function selectMultiplePersonalities(
  count: number,
  excludeIds: string[] = [],
  personalityPool?: string[],
): AIPersonality[] {
  return Sentry.startSpan(
    {
      op: "ai.personality.multiple_selection",
      name: "Select Multiple AI Personalities",
    },
    (span) => {
      const selectedPersonalities: AIPersonality[] = [];
      const usedIds = [...excludeIds];

      for (let i = 0; i < count; i++) {
        const personality = selectRandomPersonality(usedIds, personalityPool);
        selectedPersonalities.push(personality);
        usedIds.push(personality.id);
      }

      span.setAttribute("requestedCount", count);
      span.setAttribute("excludeCount", excludeIds.length);
      span.setAttribute("personalityPoolSize", personalityPool?.length || 0);
      span.setAttribute("selectedCount", selectedPersonalities.length);

      return selectedPersonalities;
    },
  );
}

/**
 * Get a random chat message based on personality and trigger
 */
export function getRandomChatMessage(
  personality: AIPersonality,
  trigger: AIChatMessageOptions["trigger"],
): string {
  return Sentry.startSpan(
    {
      op: "ai.chat.message_generation",
      name: "Generate AI Chat Message",
    },
    (span) => {
      const templates = personality.chatTemplates[trigger];

      if (!templates || templates.length === 0) {
        // Fallback to general templates
        const generalTemplates = personality.chatTemplates.general;
        if (generalTemplates && generalTemplates.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * generalTemplates.length,
          );
          const message = generalTemplates[randomIndex];

          span.setAttribute("trigger", trigger);
          span.setAttribute("personalityId", personality.id);
          span.setAttribute("fallbackUsed", true);

          return message;
        }

        // Ultimate fallback
        return "Hello! 👋";
      }

      const randomIndex = Math.floor(Math.random() * templates.length);
      const message = templates[randomIndex];

      span.setAttribute("trigger", trigger);
      span.setAttribute("personalityId", personality.id);
      span.setAttribute("templateCount", templates.length);
      span.setAttribute("selectedIndex", randomIndex);

      return message;
    },
  );
}

/**
 * Get personality traits for decision making
 */
export function getPersonalityTraits(personality: AIPersonality) {
  return personality.traits;
}

/**
 * Calculate response time based on personality
 */
export function calculateResponseTime(personality: AIPersonality): number {
  const { min, max } = personality.traits.responseTime;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if personality should send a chat message based on frequency
 */
export function shouldSendChatMessage(personality: AIPersonality): boolean {
  const { chatFrequency } = personality.traits;
  const random = Math.random();

  switch (chatFrequency) {
    case "low":
      return random < 0.2; // 20% chance
    case "medium":
      return random < 0.5; // 50% chance
    case "high":
      return random < 0.8; // 80% chance
    default:
      return random < 0.5;
  }
}

/**
 * Get meme preference weight for decision making
 */
export function getMemePreferenceWeight(personality: AIPersonality): number {
  const { memePreference } = personality.traits;

  switch (memePreference) {
    case "funny":
      return 0.8;
    case "relevant":
      return 0.9;
    case "shocking":
      return 0.6;
    case "clever":
      return 0.7;
    case "random":
      return 0.5;
    default:
      return 0.7;
  }
}

/**
 * Get voting style weight for decision making
 */
export function getVotingStyleWeight(personality: AIPersonality): number {
  const { votingStyle } = personality.traits;

  switch (votingStyle) {
    case "strategic":
      return 0.9;
    case "humor-focused":
      return 0.8;
    case "random":
      return 0.3;
    case "popular":
      return 0.6;
    default:
      return 0.7;
  }
}

/**
 * Validate personality configuration
 */
export function validatePersonality(personality: AIPersonality): boolean {
  const requiredFields = [
    "id",
    "name",
    "displayName",
    "avatarId",
    "description",
    "traits",
    "chatTemplates",
  ];

  for (const field of requiredFields) {
    if (!personality[field as keyof AIPersonality]) {
      return false;
    }
  }

  // Validate traits
  const { traits } = personality;
  if (
    !traits.humorStyle ||
    !traits.responseTime ||
    !traits.chatFrequency ||
    !traits.memePreference ||
    !traits.votingStyle
  ) {
    return false;
  }

  // Validate response time
  if (
    traits.responseTime.min < 0 ||
    traits.responseTime.max < traits.responseTime.min
  ) {
    return false;
  }

  // Validate chat templates
  const requiredTemplates = [
    "thinking",
    "submission",
    "voting",
    "winning",
    "losing",
    "general",
  ];
  for (const template of requiredTemplates) {
    if (
      !personality.chatTemplates[
        template as keyof typeof personality.chatTemplates
      ] ||
      !Array.isArray(
        personality.chatTemplates[
          template as keyof typeof personality.chatTemplates
        ],
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Get personality by humor style
 */
export function getPersonalitiesByHumorStyle(
  style: AIPersonality["traits"]["humorStyle"],
): AIPersonality[] {
  return AI_PERSONALITIES.filter(
    (personality) => personality.traits.humorStyle === style,
  );
}

/**
 * Get personality by difficulty level (for future implementation)
 */
export function getPersonalitiesByDifficulty(): AIPersonality[] {
  // For now, return all personalities. This can be extended when difficulty is implemented
  return AI_PERSONALITIES;
}
