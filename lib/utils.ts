import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateFunnyName(): string {
  const prefixes = [
    "Big",
    "Smol",
    "Chonky",
    "Bruh",
    "Epic",
    "Mega",
    "Ultra",
    "Super",
    "Turbo",
    "Hyper",
    "Dank",
    "Based",
    "Cringe",
    "Woke",
    "Yeet",
    "Boomer",
    "Zoomer",
    "Sigma",
    "Alpha",
    "Beta",
    "Giga",
    "Chad",
    "Virgin",
    "Stonks",
    "Not Stonks",
    "Poggers",
    "PogChamp",
    "Kek",
    "Pepe",
    "Doge",
    "Wojak",
    "Anon",
    "Normie",
    "Coomer",
    "Doomer",
    "Boomer",
    "Zoomer",
    "Millennial",
  ];

  const nouns = [
    "Brain",
    "Chad",
    "Virgin",
    "Gamer",
    "Weeb",
    "Furry",
    "Normie",
    "Boomer",
    "Zoomer",
    "Stonks",
    "Loss",
    "Gain",
    "Cringe",
    "Based",
    "Woke",
    "Yeet",
    "Bruh",
    "Moment",
    "Dank",
    "Meme",
    "Template",
    "Format",
    "Vibe",
    "Energy",
    "Aura",
    "Essence",
    "Spirit",
    "Soul",
    "Mind",
    "Consciousness",
    "Existence",
    "Reality",
    "Dimension",
    "Universe",
    "Galaxy",
    "Planet",
    "World",
    "Realm",
    "Domain",
    "Territory",
    "Zone",
    "Area",
    "Space",
  ];

  const suffixes = [
    "Enjoyer",
    "Hater",
    "Lover",
    "Fan",
    "Stan",
    "Simp",
    "Chad",
    "Virgin",
    "Gamer",
    "Weeb",
    "Furry",
    "Normie",
    "Boomer",
    "Zoomer",
    "Millennial",
    "Gen Z",
    "Gen X",
    "Boomer",
    "Zoomer",
    "Doomer",
    "Boomer",
    "Zoomer",
    "Millennial",
    "Gen Z",
    "Gen X",
    "Enjoyer",
    "Hater",
    "Lover",
    "Fan",
    "Stan",
    "Simp",
    "Chad",
    "Virgin",
    "Gamer",
  ];

  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  // Sometimes add a number for extra meme energy
  const shouldAddNumber = Math.random() > 0.7;
  const randomNumber = shouldAddNumber
    ? Math.floor(Math.random() * 999) + 1
    : null;

  let name = `${randomPrefix}${randomNoun}${randomSuffix}`;

  if (randomNumber) {
    name += `${randomNumber}`;
  }

  return name;
}

// Alternative function that generates shorter, punchier names
export function generateShortFunnyName(): string {
  const shortNames = [
    "Bruh Moment",
    "Stonks",
    "Not Stonks",
    "Poggers",
    "Cringe",
    "Based",
    "Woke",
    "Yeet",
    "Boomer",
    "Zoomer",
    "Chad",
    "Virgin",
    "Gamer",
    "Weeb",
    "Furry",
    "Normie",
    "Dank",
    "Epic",
    "Mega",
    "Ultra",
    "Hyper",
    "Giga",
    "Sigma",
    "Alpha",
    "Beta",
    "Kek",
    "Pepe",
    "Doge",
    "Wojak",
    "Anon",
    "Coomer",
    "Doomer",
    "Boomer",
    "Zoomer",
    "Millennial",
    "Gen Z",
    "Gen X",
  ];

  return shortNames[Math.floor(Math.random() * shortNames.length)];
}

// Function to generate a name with a specific theme
export function generateThemedName(
  theme: "gaming" | "anime" | "finance" | "social" | "random" = "random"
): string {
  const themes = {
    gaming: [
      "Gamer",
      "Pro Gamer",
      "Noob",
      "Tryhard",
      "Sweat",
      "Bot",
      "Hacker",
      "Cheater",
      "Streamer",
      "YouTuber",
    ],
    anime: [
      "Weeb",
      "Otaku",
      "Senpai",
      "Kawaii",
      "Tsundere",
      "Yandere",
      "Waifu",
      "Husbando",
      "Anime Fan",
      "Manga Reader",
    ],
    finance: [
      "Stonks",
      "Not Stonks",
      "Diamond Hands",
      "Paper Hands",
      "HODL",
      "Moon",
      "Lambo",
      "Tendies",
      "Gains",
      "Losses",
    ],
    social: [
      "Chad",
      "Virgin",
      "Sigma",
      "Alpha",
      "Beta",
      "Cringe",
      "Based",
      "Woke",
      "Boomer",
      "Zoomer",
    ],
    random: [
      "Bruh",
      "Moment",
      "Epic",
      "Mega",
      "Ultra",
      "Hyper",
      "Giga",
      "Dank",
      "Yeet",
      "Poggers",
    ],
  };

  const selectedTheme = themes[theme];
  return selectedTheme[Math.floor(Math.random() * selectedTheme.length)];
}
