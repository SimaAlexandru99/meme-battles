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
