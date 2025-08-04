/**
 * Game prompts and situations for Meme Battles
 * These are the funny situations that players need to match with their meme cards
 */

export const GAME_PROMPTS = [
  // Relatable everyday situations
  "When you realize it's Monday tomorrow",
  "Trying to explain cryptocurrency to your parents",
  "When the wifi goes down during an important meeting",
  "Your reaction when someone spoils a movie",
  "When you find out pineapple pizza is actually good",
  "Trying to act normal when your crush texts you",
  "When you're the only one who didn't understand the joke",
  "Your face when you check your bank account",
  "When someone says 'we need to talk'",
  "Trying to look busy at work when the boss walks by",

  // Gaming situations
  "When you finally beat that boss after 50 tries",
  "Your teammate in a multiplayer game",
  "When the game crashes right before you save",
  "Trying to explain why you need 'just one more game'",
  "When you accidentally delete your save file",
  "Your reaction to microtransactions",
  "When lag costs you the match",
  "Trying to carry your team",

  // Social media and internet
  "When you accidentally like someone's old photo",
  "Your reaction to your own old posts",
  "When someone doesn't reply to your message",
  "Trying to think of a clever comment",
  "When your meme gets 3 likes",
  "Reading the comments section",
  "When someone steals your meme without credit",

  // School/Work situations
  "When the teacher says 'this will be on the test'",
  "Trying to reach the word count on an essay",
  "When you realize you've been muted the whole meeting",
  "Your group project partner",
  "When someone eats your lunch from the office fridge",
  "Pretending to understand what your boss just said",
  "When you're asked to work overtime... again",

  // Food and cooking
  "When you burn water somehow",
  "Trying to cook without a recipe",
  "When the food delivery is late",
  "Your diet vs. your cravings",
  "When someone asks if you can cook",
  "Trying to eat healthy",
  "When you order food and immediately regret it",

  // Technology struggles
  "When you can't find the TV remote",
  "Trying to fix the printer",
  "When your phone battery dies at 1%",
  "Explaining technology to older relatives",
  "When the update breaks everything",
  "Your reaction to 'have you tried turning it off and on again?'",
  "When autocorrect changes your message",

  // Random funny situations
  "When you wave back at someone who wasn't waving at you",
  "Trying to be an adult",
  "When you realize you've been singing the wrong lyrics",
  "Your sleep schedule",
  "When someone asks what you do for fun",
  "Trying to remember where you put your keys",
  "When you're home alone and hear a noise",
  "Your motivation on Monday vs Friday",

  // Meme culture references
  "When someone doesn't get your meme reference",
  "Trying to explain why something is funny",
  "When your favorite meme dies",
  "Creating the perfect meme",
  "When someone uses your meme format wrong",
  "The evolution of internet humor",
];

/**
 * Gets a random game prompt
 */
export function getRandomPrompt(): string {
  const randomIndex = Math.floor(Math.random() * GAME_PROMPTS.length);
  return GAME_PROMPTS[randomIndex];
}

/**
 * Gets multiple random prompts without duplicates
 */
export function getRandomPrompts(count: number): string[] {
  if (count > GAME_PROMPTS.length) {
    throw new Error(
      `Cannot get ${count} unique prompts. Only ${GAME_PROMPTS.length} available.`,
    );
  }

  const shuffled = [...GAME_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Gets prompts by category (basic categorization)
 */
export function getPromptsByCategory(
  category: "gaming" | "social" | "work" | "food" | "tech" | "random",
): string[] {
  const categories = {
    gaming: GAME_PROMPTS.slice(10, 18),
    social: GAME_PROMPTS.slice(18, 25),
    work: GAME_PROMPTS.slice(25, 32),
    food: GAME_PROMPTS.slice(32, 39),
    tech: GAME_PROMPTS.slice(39, 46),
    random: GAME_PROMPTS.slice(46, 54),
  };

  return categories[category] || [];
}

/**
 * Validates if a prompt exists in the list
 */
export function isValidPrompt(prompt: string): boolean {
  return GAME_PROMPTS.includes(prompt);
}
