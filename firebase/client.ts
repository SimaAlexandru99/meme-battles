// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  // Add Realtime Database URL
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); // Realtime Database
export const storage = getStorage(app);

// ============================================================================
// ANONYMOUS AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Generates a random display name for guest users using meme-themed names
 * @returns A random guest display name
 */
export function generateGuestDisplayName(): string {
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
    "Poggers",
    "PogChamp",
    "Kek",
    "Pepe",
    "Doge",
    "Wojak",
    "Anon",
    "Normie",
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
    "GenZ",
    "GenX",
    "Master",
    "Lord",
    "King",
    "Queen",
    "Boss",
    "Pro",
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

/**
 * Signs in a user anonymously and generates a random display name
 * @returns Promise with the anonymous user and generated display name
 */
export async function signInAsGuest(): Promise<{
  user: User;
  displayName: string;
}> {
  try {
    const result = await signInAnonymously(auth);
    const displayName = generateGuestDisplayName();

    return {
      user: result.user,
      displayName,
    };
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw new Error("Failed to sign in as guest. Please try again.");
  }
}

/**
 * Checks if the current user is anonymous
 * @param user - Firebase user object
 * @returns Boolean indicating if user is anonymous
 */
export function isAnonymousUser(user: User | null): boolean {
  return user?.isAnonymous ?? false;
}
