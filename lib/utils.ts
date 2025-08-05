import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely converts a date value (Firestore Timestamp, Date, string, etc.) to a readable time string
 * @param dateValue - The date value to convert
 * @returns A formatted time string or "Unknown" if conversion fails
 */
export function formatJoinTime(dateValue: unknown): string {
  try {
    // Handle null/undefined
    if (!dateValue) {
      console.warn("formatJoinTime: No date value provided");
      return "Unknown";
    }

    // Handle Firestore Timestamp
    if (dateValue && typeof dateValue === "object" && "toDate" in dateValue) {
      const date = (dateValue as { toDate: () => Date }).toDate();
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    // Handle Date object
    if (dateValue instanceof Date) {
      return dateValue.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    // Handle string (ISO string or other date string)
    if (typeof dateValue === "string") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
      console.warn("formatJoinTime: Invalid date string:", dateValue);
      return "Unknown";
    }

    // Handle number (timestamp)
    if (typeof dateValue === "number") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
      console.warn("formatJoinTime: Invalid timestamp:", dateValue);
      return "Unknown";
    }

    console.warn(
      "formatJoinTime: Unsupported date type:",
      typeof dateValue,
      dateValue,
    );
    return "Unknown";
  } catch (error) {
    console.error("Error formatting date:", error, "Value:", dateValue);
    return "Unknown";
  }
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
