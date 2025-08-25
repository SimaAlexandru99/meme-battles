import type { Variants } from "framer-motion";

// Animation variants for existing game cards exiting
export const cardExitVariants: Variants = {
  initial: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
  },
  exit: (custom: number) => ({
    opacity: 0,
    scale: 0.8,
    x: custom === 0 ? -1000 : 1000, // Avatar card (index 0) slides left, game cards (index 1, 2) slide right
    y: -50,
    transition: {
      duration: 0.6,
      ease: [0.4, 0.0, 0.2, 1], // Custom easing curve
      staggerChildren: 0.1,
    },
  }),
};

// Animation variants for private lobby interface entering
export const lobbyEnterVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.8,
      type: "spring",
      stiffness: 100,
      damping: 15,
      staggerChildren: 0.2,
      delayChildren: 0.3, // Wait for cards to exit
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: {
      duration: 0.4,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
};

// Animation variants for individual lobby sections
export const lobbySectionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      type: "spring",
      stiffness: 120,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: [0.4, 0.0, 0.2, 1],
    },
  },
};

// Animation variants for buttons and interactive elements
export const buttonVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: 0.1,
      ease: "easeOut",
    },
  },
};

// Animation variants for input fields
export const inputVariants: Variants = {
  initial: {
    scale: 1,
    borderColor: "rgba(148, 163, 184, 0.3)", // slate-400/30
  },
  focus: {
    scale: 1.02,
    borderColor: "rgba(168, 85, 247, 0.8)", // purple-500/80
    boxShadow: "0 0 0 3px rgba(168, 85, 247, 0.2)",
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  error: {
    scale: 1.02,
    borderColor: "rgba(239, 68, 68, 0.8)", // red-500/80
    // Remove outer box-shadow ring that visually misaligns OTP squares in error state
    boxShadow: "none",
    x: [0, -5, 5, -5, 5, 0], // Shake animation
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

// Animation variants for success states
export const successVariants: Variants = {
  initial: {
    scale: 1,
    rotate: 0,
  },
  animate: {
    scale: [1, 1.1, 1],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 0.6,
      ease: "easeOut",
      times: [0, 0.3, 0.7, 1],
    },
  },
};

// Animation variants for loading states
export const loadingVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Animation variants for error states
export const errorVariants: Variants = {
  initial: {
    opacity: 0,
    y: -10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
};

// Animation variants for stagger effects
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

// Animation variants for micro-interactions
export const microInteractionVariants: Variants = {
  initial: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.15,
      ease: "easeOut",
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: "easeOut",
    },
  },
};

// Animation variants for notification badges
export const badgeVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn",
    },
  },
  pulse: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};
