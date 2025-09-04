type FormType =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password"
  | "verify-email"
  | "resend-verification";

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

interface User {
  name: string;
  email: string | null;
  id: string;
  provider: string;
  role: string;
  profileURL?: string;
  avatarId?: string;
  isAnonymous?: boolean;
  setupCompleted?: boolean;
  createdAt: string;
  lastLoginAt: string;
  xp: number;
  plan: UserPlan;
}

// User Plan 2 types Free and Pro
type UserPlan = "free" | "pro";

// Form option types
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioOption {
  value: string;
  label: string;
  id?: string;
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  description?: string;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
}

interface FormSliderProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
  min: number;
  max: number;
  step: number;
  className?: string;
  formatValue?: (value: number) => string;
}

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "textarea" | "number" | "url";
  description?: string;
  className?: string;
  textareaClassName?: string;
  rows?: number;
}

interface FormSwitchProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
  className?: string;
}

interface FormRadioGroupProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
  options: RadioOption[];
  className?: string;
}

// Advertisement types
interface AdSlotData {
  slotId: string;
  containerId: string;
  googleAdId?: string;
  pokiAdId?: string;
}

type AdNetwork = "google" | "poki";

type AdLoadingState = "idle" | "loading" | "loaded" | "error";

interface AdNetworkConfig {
  network: AdNetwork;
  slotId?: string;
  publisherId?: string;
  enabled: boolean;
}

// Advertisement localization types
interface AdLocalization {
  removeAdsText: string;
  locale: string;
}

interface AdLocalizationConfig {
  [locale: string]: AdLocalization;
}

// Google Ads types
interface GoogleAdSlot {
  addService: (pubads: GooglePubAds) => GoogleAdSlot;
}

interface GooglePubAds {
  enableSingleRequest: () => void;
}

// Window interface extensions for ad networks
interface GoogleAdsWindow extends Window {
  googletag?: {
    cmd: Array<() => void>;
    defineSlot: (
      adUnitPath: string,
      size: [number, number],
      div: string,
    ) => GoogleAdSlot | null;
    pubads: () => GooglePubAds;
    enableServices: () => void;
    display: (div: string) => void;
  };
}

interface PokiWindow extends Window {
  PokiSDK?: {
    displayAd: (containerId: string) => Promise<void>;
  };
}
// Avatar-related interfaces
interface AvatarState {
  nickname: string;
  currentAvatar: string;
  profileURL?: string;
  isLoading: boolean;
}

type AvatarAction =
  | { type: "SET_NICKNAME"; payload: string }
  | { type: "SET_CURRENT_AVATAR"; payload: string }
  | { type: "SET_PROFILE_URL"; payload: string | undefined }
  | { type: "SET_IS_LOADING"; payload: boolean }
  | {
      type: "UPDATE_USER_DATA";
      payload: { name?: string; avatarId?: string; profileURL?: string };
    }
  | { type: "RESET_STATE" };

// Ad localization interface
interface UseAdLocalizationOptions {
  locale?: string;
  removeAdsText?: string;
  customLocalizations?: AdLocalizationConfig;
}
// Provider interfaces
interface SWRProviderProps {
  children: React.ReactNode;
}
// Component prop interfaces (non-UI components)
interface GameLobbyProps {
  lobbyCode: string;
  currentUser: User;
}

// SWR Hook interfaces
interface ProfilePickerProps {
  currentAvatar?: string;
  profileURL?: string;
  onAvatarChange?: (avatarId: string, avatarSrc: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  isUpdating?: boolean;
}
interface AdBannerProps {
  position: "left" | "right";
  adId: string;
  upgradeUrl?: string;
  removeAdsText?: string;
  locale?: string;
  customLocalizations?: AdLocalizationConfig;
  adNetworks?: AdNetworkConfig[];
}

interface AdBannerContainerProps {
  upgradeUrl?: string;
  removeAdsText?: string;
  locale?: string;
  customLocalizations?: AdLocalizationConfig;
  adNetworks?: AdNetworkConfig[];
}
// Page prop interfaces
interface GamePlayPageProps {
  params: Promise<{
    code: string;
  }>;
}

interface GameLobbyPageProps {
  params: Promise<{
    code: string;
  }>;
}

interface MemeCard {
  id: string;
  filename: string;
  url: string;
  alt: string;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  status: "waiting" | "playing" | "submitted" | "winner";
  cards: MemeCard[];
  selectedCard?: MemeCard;
  isCurrentPlayer?: boolean;
  // AI-specific properties
  isAI?: boolean;
  aiPersonalityId?: string;
  aiDifficulty?: "easy" | "medium" | "hard";
  // Presence and metadata
  isOnline?: boolean;
  lastSeen?: string;
  // Host flag (optional for UI)
  isHost?: boolean;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
  type: "chat" | "system" | "action";
}

interface GameState {
  phase:
    | "waiting"
    | "transition"
    | "countdown"
    | "submission"
    | "voting"
    | "results"
    | "leaderboard"
    | "game_over";
  timeLeft: number;
  currentSituation: string;
  submissions: Record<
    string,
    { cardId: string; cardName: string; submittedAt: string }
  >;
  votes: Record<string, string>;
  abstentions?: Record<string, boolean>;
  roundNumber: number;
  totalRounds: number;
  winner?: string;
  scores: Record<string, number>;
  playerStreaks?: Record<
    string,
    { playerId: string; currentStreak: number; lastWonRound: number }
  >;
  phaseStartTime?: number;
}

// Lobby Management Types - Core Data Interfaces
type LobbyStatus = "waiting" | "starting" | "started" | "ended";
type PlayerStatus = "waiting" | "ready" | "disconnected";
type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "reconnecting";

// Core lobby data interface matching Firebase Realtime Database schema
interface LobbyData {
  code: string;
  hostUid: string;
  hostDisplayName: string;
  maxPlayers: number;
  status: LobbyStatus;
  settings: GameSettings;
  players: Record<string, PlayerData>;
  createdAt: string;
  updatedAt: string;
  gameState?: GameState;
  chat?: Record<string, ChatMessage>;
  // Battle Royale specific fields
  type?: "battle_royale";
  competitiveSettings?: CompetitiveSettings;
  matchmakingInfo?: {
    matchId: string;
    averageSkillRating?: number;
    skillRatingRange?: number;
    createdBy: string;
  };
  autoCountdown?: {
    active: boolean;
    duration: number;
    endTime: number;
    startedAt: string;
  };
}

// Game settings interface with validation constraints
interface GameSettings {
  rounds: number; // 3-15 rounds constraint
  timeLimit: number; // 30-120 seconds constraint
  categories: string[]; // enabled meme categories array
}

// Game settings validation constraints
interface GameSettingsConstraints {
  rounds: {
    min: 3;
    max: 15;
  };
  timeLimit: {
    min: 30;
    max: 120;
  };
  categories: {
    available: string[];
    minSelected: number;
  };
}

// Service Layer Interfaces and Response Types

// Generic service result interface for consistent API responses
interface ServiceResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
  timestamp?: string;
  retryable?: boolean;
}

// Validation result interface for settings validation
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  field?: string;
}

// Event types for real-time updates
interface LobbyEvent {
  type:
    | "player_joined"
    | "player_left"
    | "settings_updated"
    | "game_started"
    | "host_changed"
    | "lobby_deleted"
    | "player_kicked";
  timestamp: string;
  data: unknown;
  playerId?: string;
  lobbyCode?: string;
}

// Lobby creation parameters interface
interface CreateLobbyParams {
  hostUid: string;
  hostDisplayName: string;
  hostAvatarId: string;
  hostProfileURL?: string;
  maxPlayers?: number;
  settings?: Partial<GameSettings>;
}

// Join lobby parameters interface
interface JoinLobbyParams {
  uid: string;
  displayName: string;
  avatarId: string;
  profileURL?: string;
}

// Additional service method parameters
interface UpdateLobbySettingsParams {
  code: string;
  settings: Partial<GameSettings>;
  hostUid: string;
}

interface KickPlayerParams {
  code: string;
  targetUid: string;
  hostUid: string;
}

interface TransferHostParams {
  code: string;
  newHostUid: string;
  currentHostUid: string;
}

interface UpdatePlayerStatusParams {
  code: string;
  playerUid: string;
  status: PlayerStatus;
}

// Error types for classification
type LobbyErrorType =
  | "NETWORK_ERROR"
  | "LOBBY_NOT_FOUND"
  | "LOBBY_FULL"
  | "LOBBY_ALREADY_STARTED"
  | "PERMISSION_DENIED"
  | "VALIDATION_ERROR"
  | "CODE_GENERATION_FAILED"
  | "UNKNOWN_ERROR";

// Battle Royale specific error types
type BattleRoyaleErrorType =
  | "QUEUE_FULL"
  | "ALREADY_IN_QUEUE"
  | "MATCHMAKING_TIMEOUT"
  | "INSUFFICIENT_PLAYERS"
  | "SKILL_RATING_UNAVAILABLE"
  | "REGION_UNAVAILABLE"
  | "MATCH_CREATION_FAILED"
  | "STATS_UPDATE_FAILED";

interface LobbyError extends Error {
  type: LobbyErrorType;
  retryable: boolean;
  userMessage: string;
}

interface BattleRoyaleError extends Error {
  type: BattleRoyaleErrorType | LobbyErrorType;
  retryable: boolean;
  userMessage: string;
  queuePosition?: number;
  estimatedWaitTime?: number;
  alternativeOptions?: string[];
}

// Unsubscribe function type
type UnsubscribeFunction = () => void;

// Validation schemas for lobby settings and player data
interface LobbyValidationSchema {
  code: {
    pattern: RegExp;
    length: number;
  };
  displayName: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  maxPlayers: {
    min: number;
    max: number;
  };
}

// Player session data for connection tracking
interface PlayerSession {
  currentLobby: string | null;
  lastActivity: string;
  connectionStatus: ConnectionStatus;
}

// Lobby statistics for monitoring
interface LobbyStats {
  totalLobbies: number;
  activeLobbies: number;
  totalPlayers: number;
  averagePlayersPerLobby: number;
}

// Player data interface with all properties and status fields
interface PlayerData {
  id: string;
  displayName: string;
  avatarId: string;
  profileURL?: string;
  joinedAt: string;
  isHost: boolean;
  score: number;
  status: PlayerStatus;
  lastSeen: string;
  isCurrentPlayer?: boolean;
  // Game-specific properties
  cards?: MemeCard[];
  // AI-specific properties
  isAI?: boolean;
  aiPersonalityId?: string;
  aiDifficulty?: "easy" | "medium" | "hard";
}

// Battle Royale Queue and Matchmaking Types
interface QueueEntry {
  playerUid: string;
  displayName: string;
  avatarId: string;
  profileURL?: string;
  skillRating: number;
  xpLevel: number;
  queuedAt: string;
  estimatedWaitTime: number;
  preferences: QueuePreferences;
  connectionInfo: ConnectionInfo;
}

interface QueuePreferences {
  maxWaitTime: number; // seconds
  skillRangeFlexibility: "strict" | "medium" | "flexible";
  regionPreference?: string;
}

interface ConnectionInfo {
  region: string;
  latency: number;
  connectionQuality: "poor" | "fair" | "good" | "excellent";
}

interface MatchmakingResult {
  matchId: string;
  players: QueueEntry[];
  averageSkillRating: number;
  skillRatingRange: number;
  matchQuality: number; // 0-1 score
  estimatedGameDuration: number;
}

interface BattleRoyaleStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  skillRating: number;
  highestRating: number;
  currentStreak: number;
  longestWinStreak: number;
  averagePosition: number;
  totalXpEarned: number;
  achievements: string[];
  lastPlayed: string;
  seasonStats: Record<string, SeasonStats>;
}

interface SeasonStats {
  gamesPlayed: number;
  wins: number;
  skillRatingChange: number;
  rank?: string;
  percentile?: number;
}

interface GameResult {
  lobbyCode: string;
  matchId: string;
  playerUid: string;
  position: number; // 1st, 2nd, 3rd, etc.
  totalPlayers: number;
  score: number;
  roundsWon: number;
  totalRounds: number;
  gameMode: "battle_royale";
  duration: number; // seconds
  xpEarned: number;
  skillRatingChange: number;
  achievements?: string[];
}

// Battle Royale Lobby Extensions
interface BattleRoyaleLobbyParams extends CreateLobbyParams {
  type: "battle_royale";
  matchId: string;
  competitiveSettings: CompetitiveSettings;
  autoStart: boolean;
  autoStartCountdown: number;
}

interface CompetitiveSettings extends GameSettings {
  autoStart: boolean;
  autoStartCountdown: number;
  xpMultiplier: number;
  rankingEnabled: boolean;
}

// Skill Rating System Types
interface SkillRatingCalculation {
  baseRating: number;
  kFactor: number; // Volatility factor based on games played
  positionMultiplier: number; // Bonus/penalty based on final position
  opponentRatingAverage: number;
  expectedScore: number;
  actualScore: number;
  ratingChange: number;
}

interface RankingTier {
  name: string;
  minRating: number;
  maxRating: number;
  color: string;
  icon: string;
  percentile: number;
}

// Player Progression UI Types

// Achievement System Types
type AchievementRarity = "common" | "rare" | "epic";
type AchievementCategory = "win_streaks" | "skill_milestones" | "games_played";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  criteria: AchievementCriteria;
  unlockedAt?: string;
  progress?: AchievementProgress;
}

interface AchievementCriteria {
  type: "win_streak" | "games_played" | "skill_rating" | "total_wins" | "perfect_rounds";
  target: number;
  trackable: boolean;
}

interface AchievementProgress {
  current: number;
  target: number;
  percentage: number;
}

interface AchievementUnlock {
  achievementId: string;
  unlockedAt: string;
  gameId?: string;
}

interface AchievementNotification {
  id: string;
  achievement: Achievement;
  timestamp: string;
  dismissed: boolean;
  autoHide: boolean;
  duration: number;
}

// XP System Types
interface XPCalculation {
  baseXP: number;
  positionBonus: number;
  roundsBonus: number;
  totalXP: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
}

interface XPBreakdown {
  baseXP: number;
  positionBonus: number;
  roundsBonus: number;
  totalXP: number;
}

interface LevelDefinition {
  level: number;
  xpRequired: number;
  totalXPRequired: number;
  rewards?: LevelReward[];
}

interface LevelReward {
  type: "achievement" | "cosmetic" | "title";
  id: string;
  name: string;
  description: string;
}

interface XPHistoryEntry {
  gameId: string;
  timestamp: string;
  xpGained: number;
  source: "battle_royale" | "daily_bonus" | "achievement";
  details: XPBreakdown;
}

// Progression Display Types
interface ProgressionSummary {
  skillRating: SkillRatingData;
  xp: XPData;
  achievements: AchievementData;
  performance: PerformanceData;
}

interface SkillRatingData {
  current: number;
  change: number;
  tier: RankingTier;
  nextTier?: RankingTier;
  progressToNext: number;
}

interface XPData {
  currentXP: number;
  currentLevel: number;
  xpForNextLevel: number;
  totalXPForNextLevel: number;
  totalXPEarned: number;
  recentGains: XPHistoryEntry[];
}

interface AchievementData {
  unlocked: Achievement[];
  locked: Achievement[];
  recentUnlocks: AchievementUnlock[];
  progress: Record<string, AchievementProgress>;
  totalUnlocked: number;
  totalAvailable: number;
}

interface PerformanceData {
  trend: "improving" | "declining" | "stable";
  recentGames: number;
  winRate: number;
  averagePosition: number;
  skillRatingChange: number;
}

// Component Props Types
interface AchievementGalleryProps {
  achievements: Achievement[];
  unlockedAchievements: string[];
  achievementProgress: Record<string, AchievementProgress>;
  className?: string;
  onAchievementSelect?: (achievement: Achievement) => void;
}

interface AchievementCardProps {
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: AchievementProgress;
  size?: "small" | "medium" | "large";
  showProgress?: boolean;
  onClick?: () => void;
}

interface AchievementNotificationProps {
  achievement: Achievement;
  onDismiss: () => void;
  autoHide?: boolean;
  duration?: number;
  rarity?: AchievementRarity;
}

interface XPProgressBarProps {
  currentXP: number;
  currentLevel: number;
  xpForNextLevel: number;
  totalXPForNextLevel: number;
  showLabel?: boolean;
  size?: "small" | "medium" | "large";
  animated?: boolean;
  className?: string;
}

interface XPBreakdownProps {
  baseXP: number;
  positionBonus: number;
  roundsBonus: number;
  totalXP: number;
  animated?: boolean;
  className?: string;
}

interface LevelUpCelebrationProps {
  newLevel: number;
  onComplete: () => void;
  rewards?: LevelReward[];
  className?: string;
}

interface SkillRatingChangeProps {
  before: number;
  after: number;
  change: number;
  tierChange?: {
    from: RankingTier;
    to: RankingTier;
  };
  animated?: boolean;
  className?: string;
}

interface PlayerSkillBadgeProps {
  player: {
    uid: string;
    displayName: string;
    skillRating: number;
    level: number;
    tier: string;
  };
  showDetails?: boolean;
  size?: "small" | "medium";
  className?: string;
}

interface MatchmakingInfoProps {
  estimatedSkillRange: {
    min: number;
    max: number;
  };
  queueTime: number;
  matchQuality: number;
  competitiveBalance: number;
  className?: string;
}

interface GlobalLeaderboardProps {
  timeframe: "daily" | "weekly" | "monthly" | "all-time";
  currentPlayerRank?: number;
  onPlayerSelect?: (playerId: string) => void;
  className?: string;
}

interface LeaderboardEntryProps {
  rank: number;
  player: {
    uid: string;
    displayName: string;
    skillRating: number;
    tier: string;
    winRate: number;
    gamesPlayed: number;
  };
  isCurrentPlayer?: boolean;
  onClick?: () => void;
  className?: string;
}

// Progression Constants and Enums
const ACHIEVEMENT_RARITIES: Record<AchievementRarity, { color: string; weight: number }> = {
  common: { color: "#9CA3AF", weight: 1 },
  rare: { color: "#3B82F6", weight: 2 },
  epic: { color: "#8B5CF6", weight: 3 },
} as const;

const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, { name: string; icon: string }> = {
  win_streaks: { name: "Win Streaks", icon: "Trophy" },
  skill_milestones: { name: "Skill Milestones", icon: "Target" },
  games_played: { name: "Games Played", icon: "GameController2" },
} as const;

const XP_CONSTANTS = {
  BASE_XP_PER_GAME: 50,
  POSITION_MULTIPLIERS: {
    1: 2.0,  // 1st place: 100% bonus
    2: 1.5,  // 2nd place: 50% bonus
    3: 1.2,  // 3rd place: 20% bonus
    4: 1.0,  // 4th place: no bonus
    5: 0.8,  // 5th place: -20%
    6: 0.6,  // 6th place: -40%
    7: 0.4,  // 7th place: -60%
    8: 0.2,  // 8th place: -80%
  },
  ROUNDS_BONUS_PER_WIN: 10,
  XP_PER_LEVEL: 1000,
} as const;

// Notification Queue Types
interface NotificationQueueItem {
  id: string;
  type: "achievement" | "level_up" | "skill_rating";
  data: Achievement | LevelReward | SkillRatingData;
  priority: number;
  timestamp: string;
}

interface NotificationQueueState {
  queue: NotificationQueueItem[];
  current: NotificationQueueItem | null;
  isProcessing: boolean;
}

// Extended Player Progression Data
interface PlayerProgressionData {
  // Existing fields maintained
  skillRating: number;
  totalXpEarned: number;
  achievements: string[];
  
  // New fields for UI enhancement
  xpHistory: XPHistoryEntry[];
  achievementProgress: Record<string, number>;
  lastLevelUp?: string;
  notificationQueue: AchievementNotification[];
  currentLevel: number;
  currentXP: number;
}
