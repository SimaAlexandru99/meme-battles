import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",

  // Setup files to run before each test
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Module name mapping for TypeScript path aliases
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  // Test file patterns - only include files with .test. or .spec. in the name
  testMatch: [
    "**/__tests__/**/*.(test|spec).(ts|tsx|js)",
    "**/*.(test|spec).(ts|tsx|js)",
  ],

  // Files to ignore during testing
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/coverage/",
    "/dist/",
    "/build/",
  ],

  // Transform configuration
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },

  // Files to ignore during transformation
  transformIgnorePatterns: [
    "/node_modules/",
    "^.+\\.module\\.(css|sass|scss)$",
  ],

  // Coverage configuration
  collectCoverageFrom: [
    "**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
    "!jest.config.ts",
    "!jest.setup.ts",
    "!next.config.ts",
    "!tailwind.config.ts",
    "!postcss.config.mjs",
    "!**/*.stories.{ts,tsx}",
    "!**/__tests__/**",
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Module file extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Test timeout
  testTimeout: 10000,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
