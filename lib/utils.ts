import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Avatar options for new users
export const AVATAR_OPTIONS = [
  {
    id: "akward-look-monkey",
    name: "Awkward Look Monkey",
    src: "/icons/akward-look-monkey.png",
    fallback: "AM",
  },
  {
    id: "baby-yoda",
    name: "Baby Yoda",
    src: "/icons/baby-yoda.png",
    fallback: "BY",
  },
  {
    id: "cool-pepe",
    name: "Cool Pepe",
    src: "/icons/cool-pepe.png",
    fallback: "CP",
  },
  {
    id: "evil-doge",
    name: "Evil Doge",
    src: "/icons/evil-doge.png",
    fallback: "ED",
  },
  {
    id: "harold",
    name: "Harold",
    src: "/icons/harold.png",
    fallback: "HR",
  },
] as const;

/**
 * Gets a random avatar from the available options
 * @returns Random avatar object with id, name, src, and fallback
 */
export function getRandomAvatar() {
  const randomIndex = Math.floor(Math.random() * AVATAR_OPTIONS.length);
  return AVATAR_OPTIONS[randomIndex];
}

/**
 * Gets a specific avatar by ID
 * @param avatarId - The ID of the avatar to get
 * @returns Avatar object or undefined if not found
 */
export function getAvatarById(avatarId: string) {
  return AVATAR_OPTIONS.find((avatar) => avatar.id === avatarId);
}
