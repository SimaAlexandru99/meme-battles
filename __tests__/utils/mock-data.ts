import { User } from "firebase/auth";

// ============================================================================
// USER MOCK DATA FACTORIES
// ============================================================================

/**
 * Creates a mock user with default values
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const defaultUser: Partial<User> = {
    uid: `user-${Math.random().toString(36).substr(2, 9)}`,
    email: "test@example.com",
    displayName: "Test User",
    isAnonymous: false,
    emailVerified: true,
    phoneNumber: null,
    photoURL: null,
    providerId: "firebase",
    refreshToken: "mock-refresh-token",
    tenantId: null,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    getIdToken: jest.fn().mockResolvedValue("mock-id-token"),
    getIdTokenResult: jest.fn().mockResolvedValue({
      token: "mock-id-token",
      claims: {},
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: "password",
      signInSecondFactor: null,
    }),
    reload: jest.fn().mockResolvedValue(undefined),
    toJSON: jest.fn().mockReturnValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  return { ...defaultUser, ...overrides } as User;
}

/**
 * Creates a mock anonymous user
 */
export function createMockAnonymousUser(overrides: Partial<User> = {}): User {
  return createMockUser({
    uid: `anon-${Math.random().toString(36).substr(2, 9)}`,
    email: null,
    displayName: "Anonymous User",
    isAnonymous: true,
    emailVerified: false,
    ...overrides,
  });
}

/**
 * Creates a mock guest user with meme-themed display name
 */
export function createMockGuestUser(overrides: Partial<User> = {}): User {
  const guestNames = [
    "BigBrainChad420",
    "DankMemeKing",
    "PogChampMaster",
    "YeetLord69",
    "BasedSigmaGrindset",
    "CringeNormieHater",
    "WojakEnjoyer",
    "PepeTheFrog",
    "DogeToTheMoon",
    "StonksOnlyGoUp",
  ];

  const randomName = guestNames[Math.floor(Math.random() * guestNames.length)];

  return createMockAnonymousUser({
    displayName: randomName,
    ...overrides,
  });
}

// ============================================================================
// GAME DATA MOCK FACTORIES
// ============================================================================

/**
 * Interface for mock game data
 */
export interface MockGameData {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  status: "waiting" | "active" | "completed" | "cancelled";
  maxPlayers: number;
  currentPlayers: number;
  players: MockPlayer[];
  rounds: MockRound[];
  currentRound: number;
  settings: MockGameSettings;
}

/**
 * Interface for mock player data
 */
export interface MockPlayer {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  joinedAt: string;
}

/**
 * Interface for mock round data
 */
export interface MockRound {
  id: string;
  roundNumber: number;
  prompt: string;
  submissions: MockSubmission[];
  votes: MockVote[];
  status: "waiting" | "submitting" | "voting" | "completed";
  timeLimit: number;
  startedAt: string;
  endedAt?: string;
}

/**
 * Interface for mock submission data
 */
export interface MockSubmission {
  id: string;
  playerId: string;
  memeUrl: string;
  caption?: string;
  submittedAt: string;
  votes: number;
}

/**
 * Interface for mock vote data
 */
export interface MockVote {
  id: string;
  voterId: string;
  submissionId: string;
  votedAt: string;
}

/**
 * Interface for mock game settings
 */
export interface MockGameSettings {
  roundTimeLimit: number;
  votingTimeLimit: number;
  maxRounds: number;
  allowCustomMemes: boolean;
  isPrivate: boolean;
  requireApproval: boolean;
}

/**
 * Creates mock game settings
 */
export function createMockGameSettings(
  overrides: Partial<MockGameSettings> = {},
): MockGameSettings {
  return {
    roundTimeLimit: 120, // 2 minutes
    votingTimeLimit: 60, // 1 minute
    maxRounds: 5,
    allowCustomMemes: true,
    isPrivate: false,
    requireApproval: false,
    ...overrides,
  };
}

/**
 * Creates a mock player
 */
export function createMockPlayer(
  overrides: Partial<MockPlayer> = {},
): MockPlayer {
  return {
    uid: `player-${Math.random().toString(36).substr(2, 9)}`,
    displayName: `Player${Math.floor(Math.random() * 1000)}`,
    isHost: false,
    isReady: false,
    score: 0,
    joinedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock submission
 */
export function createMockSubmission(
  overrides: Partial<MockSubmission> = {},
): MockSubmission {
  return {
    id: `submission-${Math.random().toString(36).substr(2, 9)}`,
    playerId: `player-${Math.random().toString(36).substr(2, 9)}`,
    memeUrl: "https://example.com/meme.jpg",
    caption: "Funny meme caption",
    submittedAt: new Date().toISOString(),
    votes: 0,
    ...overrides,
  };
}

/**
 * Creates a mock vote
 */
export function createMockVote(overrides: Partial<MockVote> = {}): MockVote {
  return {
    id: `vote-${Math.random().toString(36).substr(2, 9)}`,
    voterId: `voter-${Math.random().toString(36).substr(2, 9)}`,
    submissionId: `submission-${Math.random().toString(36).substr(2, 9)}`,
    votedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock round
 */
export function createMockRound(overrides: Partial<MockRound> = {}): MockRound {
  return {
    id: `round-${Math.random().toString(36).substr(2, 9)}`,
    roundNumber: 1,
    prompt: "Create a meme about programming",
    submissions: [],
    votes: [],
    status: "waiting",
    timeLimit: 120,
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates mock game data
 */
export function createMockGameData(
  overrides: Partial<MockGameData> = {},
): MockGameData {
  const gameId = `game-${Math.random().toString(36).substr(2, 9)}`;
  const hostPlayer = createMockPlayer({ isHost: true, isReady: true });

  return {
    id: gameId,
    title: "Epic Meme Battle",
    description: "Battle of the funniest memes!",
    createdBy: hostPlayer.uid,
    createdAt: new Date().toISOString(),
    status: "waiting",
    maxPlayers: 8,
    currentPlayers: 1,
    players: [hostPlayer],
    rounds: [],
    currentRound: 0,
    settings: createMockGameSettings(),
    ...overrides,
  };
}

/**
 * Creates a complete mock game with multiple players and rounds
 */
export function createMockCompleteGame(): MockGameData {
  const players = [
    createMockPlayer({ isHost: true, isReady: true, score: 15 }),
    createMockPlayer({ isReady: true, score: 12 }),
    createMockPlayer({ isReady: true, score: 8 }),
    createMockPlayer({ isReady: true, score: 5 }),
  ];

  const rounds = [
    createMockRound({
      roundNumber: 1,
      status: "completed",
      submissions: [
        createMockSubmission({ playerId: players[0].uid, votes: 3 }),
        createMockSubmission({ playerId: players[1].uid, votes: 2 }),
        createMockSubmission({ playerId: players[2].uid, votes: 1 }),
        createMockSubmission({ playerId: players[3].uid, votes: 0 }),
      ],
      endedAt: new Date().toISOString(),
    }),
    createMockRound({
      roundNumber: 2,
      status: "waiting",
      submissions: [
        createMockSubmission({ playerId: players[0].uid }),
        createMockSubmission({ playerId: players[1].uid }),
      ],
    }),
  ];

  return createMockGameData({
    status: "active",
    currentPlayers: players.length,
    players,
    rounds,
    currentRound: 2,
  });
}

// ============================================================================
// MEME DATA MOCK FACTORIES
// ============================================================================

/**
 * Interface for mock meme data
 */
export interface MockMeme {
  id: string;
  name: string;
  url: string;
  tags: string[];
  category: string;
  popularity: number;
  createdAt: string;
}

/**
 * Creates mock meme data
 */
export function createMockMeme(overrides: Partial<MockMeme> = {}): MockMeme {
  const memeNames = [
    "Distracted Boyfriend",
    "Drake Pointing",
    "Woman Yelling at Cat",
    "This is Fine",
    "Expanding Brain",
    "Surprised Pikachu",
    "Change My Mind",
    "Two Buttons",
    "Stonks",
    "Doge",
  ];

  const categories = [
    "reaction",
    "advice",
    "comparison",
    "situation",
    "character",
  ];
  const tags = ["funny", "relatable", "popular", "classic", "viral"];

  return {
    id: `meme-${Math.random().toString(36).substr(2, 9)}`,
    name: memeNames[Math.floor(Math.random() * memeNames.length)],
    url: `https://example.com/memes/${Math.random()
      .toString(36)
      .substr(2, 9)}.jpg`,
    tags: tags.slice(0, Math.floor(Math.random() * 3) + 1),
    category: categories[Math.floor(Math.random() * categories.length)],
    popularity: Math.floor(Math.random() * 100),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates an array of mock memes
 */
export function createMockMemes(count: number = 10): MockMeme[] {
  return Array.from({ length: count }, () => createMockMeme());
}

// ============================================================================
// API RESPONSE MOCK FACTORIES
// ============================================================================

/**
 * Interface for mock API responses
 */
export interface MockApiResponse<T = any> {
  data: T;
  status: number;
  message?: string;
  error?: string;
}

/**
 * Creates a successful API response
 */
export function createMockApiSuccess<T>(
  data: T,
  status: number = 200,
  message?: string,
): MockApiResponse<T> {
  return {
    data,
    status,
    message,
  };
}

/**
 * Creates an error API response
 */
export function createMockApiError(
  error: string,
  status: number = 400,
): MockApiResponse<null> {
  return {
    data: null,
    status,
    error,
  };
}

/**
 * Creates mock pagination data
 */
export interface MockPaginationData<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Creates mock paginated response
 */
export function createMockPaginatedResponse<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 10,
  totalCount?: number,
): MockPaginationData<T> {
  const total = totalCount || items.length;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    totalCount: total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
