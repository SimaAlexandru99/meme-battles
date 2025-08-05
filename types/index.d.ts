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

interface FormFileUploadProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
  folder: string;
  userId?: string;
  className?: string;
  disabled?: boolean;
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

interface AdConfig {
  id: string;
  size: {
    width: number;
    height: number;
  };
  position: "left" | "right";
  upgradeUrl: string;
  removeAdsText: string;
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
      div: string
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

interface LobbySettings {
  rounds: number;
  timeLimit: number;
  categories: string[];
  aiSettings?: AISettings; // Optional to maintain backward compatibility
}

interface Lobby {
  code: string;
  hostUid: string;
  hostDisplayName: string;
  status: "waiting" | "started" | "finished";
  maxPlayers: number;
  players: LobbyPlayer[];
  createdAt: Date | FirebaseFirestore.Timestamp; // Can be either Date or Firestore timestamp
  updatedAt: Date | FirebaseFirestore.Timestamp; // Can be either Date or Firestore timestamp
  settings: LobbySettings;
}

interface JoinLobbyResponse {
  success: boolean;
  lobby: Lobby;
}

interface CreateLobbyResponse {
  success: boolean;
  lobby: Lobby;
}

interface ApiError {
  error: string;
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

// Lobby operations interfaces
interface LobbyState {
  isLoading: boolean;
  error: string | null;
  createdLobbyCode: string | null;
  joinSuccess: boolean;
}

interface UseLobbyOperationsReturn {
  lobbyState: LobbyState;
  handleJoinLobby: (code: string) => Promise<void>;
  handleCreateLobby: () => Promise<string>;
  resetLobbyState: () => void;
}

// Ad localization interface
interface UseAdLocalizationOptions {
  locale?: string;
  removeAdsText?: string;
  customLocalizations?: AdLocalizationConfig;
}

// View transition types
type ViewState =
  | "main"
  | "transitioning-out"
  | "private-lobby"
  | "transitioning-in";

interface ViewTransitionState {
  currentView: ViewState;
  isAnimating: boolean;
  animationPhase: "idle" | "exit" | "enter" | "complete";
}

// Private lobby types
interface PrivateLobbyState {
  showPrivateLobby: boolean;
  isJoining: boolean;
  isCreating: boolean;
  invitationCode: string;
  error: string | null;
  createdLobbyCode: string | null;
}

interface LobbyInvitation {
  code: string; // 5-character alphanumeric
  lobbyId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  maxPlayers: number;
  currentPlayers: number;
}

interface PrivateLobby {
  id: string;
  invitationCode: string;
  hostId: string;
  players: LobbyPlayer[];
  status: "waiting" | "starting" | "in-progress" | "completed";
  createdAt: Date;
  settings: {
    maxPlayers: number;
    gameMode: string;
    timeLimit: number;
  };
}

// Lobby-related interfaces
interface LobbyPlayer {
  uid: string;
  displayName: string;
  profileURL?: string | null;
  joinedAt: Date | string | { toDate: () => Date }; // Can be Date, ISO string, or Firestore Timestamp
  isHost: boolean;
  // AI-specific properties
  isAI?: boolean;
  aiPersonalityId?: string;
  aiPlayer?: AIPlayer;
  // Score tracking
  score?: number;
  totalWins?: number;
  totalGames?: number;
}

interface GameScore {
  playerId: string;
  playerName: string;
  score: number;
  roundScores: {
    [roundNumber: number]: {
      points: number;
      reason: "win" | "participation" | "bonus";
      timestamp: Date | string;
    };
  };
  totalWins: number;
  totalGames: number;
  lastUpdated: Date | string;
}

type LobbyError =
  | "INVALID_CODE"
  | "LOBBY_NOT_FOUND"
  | "LOBBY_FULL"
  | "LOBBY_EXPIRED"
  | "NETWORK_ERROR"
  | "CREATION_FAILED"
  | "PERMISSION_DENIED";

// Hook-related interfaces
interface ReconnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastConnectionTime: Date | null;
  connectionError: string | null;
}

interface UseReconnectionOptions {
  lobbyCode: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onReconnectSuccess?: () => void;
  onReconnectFailure?: () => void;
}

interface UseLobbyRefreshOptions {
  lobbyCode: string;
  enabled?: boolean;
  refreshInterval?: number;
  onDataUpdate?: (lobbyData: LobbyData) => void;
  onError?: (error: string) => void;
}

// Provider interfaces
interface SWRProviderProps {
  children: React.ReactNode;
}

interface FirstTimeSetupProviderProps {
  children: React.ReactNode;
  initialUserData?: User | null;
}

interface AnonymousAuthProviderProps {
  children: React.ReactNode;
}

// Component prop interfaces (non-UI components)
interface GameLobbyProps {
  lobbyCode: string;
  currentUser: User;
}

interface LobbyData {
  code: string;
  hostUid: string;
  hostDisplayName: string;
  status: "waiting" | "started" | "finished";
  maxPlayers: number;
  players: LobbyPlayer[];
  createdAt: Date | FirebaseFirestore.Timestamp | string;
  updatedAt: Date | FirebaseFirestore.Timestamp | string;
  settings: {
    rounds: number;
    timeLimit: number;
    categories: string[];
  };
  gameState?: {
    currentRound: number;
    phase: "submission" | "voting" | "results";
    phaseStartTime: string;
    currentSituation: string;
    submissions: {
      [playerId: string]: {
        cardId: string;
        submittedAt: string;
        playerId: string;
      };
    };
    votes: {
      [playerId: string]: string; // voted submission playerId
    };
    playerUsedCards?: {
      [playerId: string]: string[]; // array of used card IDs
    };
    roundHistory: Array<{
      roundNumber: number;
      situation: string;
      submissions: Submission[];
      votes: Vote[];
      completedAt: string;
    }>;
  };
}

// SWR Hook interfaces
interface UseLobbyDataOptions {
  refreshInterval?: number;
  enabled?: boolean;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
  keepPreviousData?: boolean;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  [key: string]: unknown; // Allow other SWR options
}

interface UseLobbyDataReturn {
  lobbyData: LobbyData | undefined;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<LobbyData | undefined>;
  refresh: () => Promise<LobbyData | undefined>;
  hasData: boolean;
  isHost: (userId: string) => boolean;
  playerCount: number;
  addAIPlayer: (botConfig: {
    personalityId: string;
    difficulty: "easy" | "medium" | "hard";
  }) => Promise<{ success: boolean; lobby: Lobby; message: string }>;
  removeAIPlayer: (
    aiPlayerId: string
  ) => Promise<{ success: boolean; lobby: Lobby; message: string }>;
  aiPlayers: LobbyPlayer[];
  humanPlayers: LobbyPlayer[];
}

interface UseActiveLobbiesOptions {
  enabled?: boolean;
  refreshInterval?: number;
  keepPreviousData?: boolean;
  errorRetryCount?: number;
  errorRetryInterval?: number;
  [key: string]: unknown; // Allow other SWR options
}

interface UseLobbyAndActiveDataOptions {
  lobbyOptions?: UseLobbyDataOptions;
  activeLobbiesOptions?: UseActiveLobbiesOptions;
}

interface ProfilePickerProps {
  currentAvatar?: string;
  profileURL?: string;
  onAvatarChange?: (avatarId: string, avatarSrc: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  isUpdating?: boolean;
}

interface PrivateLobbySectionProps {
  onJoinLobby: (code: string) => Promise<void>;
  onCreateLobby: () => Promise<string>;
  isLoading?: boolean;
}

interface LanguageSelectorProps {
  currentLocale: string;
  onLocaleChange: (locale: string) => void;
  className?: string;
}

interface JoinWithCodeSectionProps {
  onJoinLobby: (code: string) => Promise<void>;
  isLoading?: boolean;
}

interface InvitationCodeInputProps {
  onSubmit: (code: string) => void;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

interface AvatarSetupCardProps {
  currentUser: User;
  onProfileUpdate: (updates: {
    name?: string;
    profileURL?: string;
    avatarId?: string;
  }) => void;
  isLoading?: boolean;
}

interface HeroSectionProps {
  currentUser: User | null;
  onProfileUpdate: (updates: {
    name?: string;
    profileURL?: string;
    avatarId?: string;
  }) => void;
  isLoading?: boolean;
}

interface GameRedirectProps {
  lobbyCode: string;
  currentUser: User;
}

interface GamePlayProps {
  lobbyCode: string;
  currentUser: User;
}

interface GameCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

interface CreateLobbySectionProps {
  onCreateLobby: () => Promise<string>;
  isLoading?: boolean;
}

interface FirstTimeSetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

interface AuthErrorProps {
  error: string;
  onRetry?: () => void;
  className?: string;
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

interface ActiveGameCheckProps {
  children: React.ReactNode;
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

// Meme Battle Game Types
enum GamePhase {
  LOADING = "loading",
  SUBMISSION = "submission",
  VOTING = "voting",
  RESULTS = "results",
  GAME_OVER = "game_over",
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
}

interface Submission {
  id: string;
  playerId: string;
  playerName: string;
  memeCard: MemeCard;
  votes: number;
  submittedAt: Date;
  isWinner?: boolean;
}

interface Vote {
  id: string;
  voterId: string;
  submissionId: string;
  votedAt: Date;
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
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  phase: "waiting" | "prompt" | "playing" | "voting" | "results" | "game_over";
  currentPrompt: string;
  winner?: Player;
}

interface GameDocument {
  // Meta
  id: string;
  lobbyCode: string;
  status: "waiting" | "playing" | "finished";
  createdAt: Date | FirebaseFirestore.Timestamp;
  updatedAt: Date | FirebaseFirestore.Timestamp;

  // Game Settings
  settings: {
    rounds: number;
    submissionTime: number; // seconds
    votingTime: number; // seconds
  };

  // Current State
  currentRound: number;
  phase: GamePhase;
  phaseStartTime: Date | FirebaseFirestore.Timestamp;
  currentSituation: string;

  // Players
  players: {
    [playerId: string]: {
      id: string;
      name: string;
      profileURL?: string;
      score: number;
      isConnected: boolean;
      hand: string[]; // meme filenames
    };
  };

  // Round Data
  submissions: {
    [playerId: string]: {
      memeFilename: string;
      submittedAt: Date | FirebaseFirestore.Timestamp;
    };
  };

  votes: {
    [playerId: string]: string; // voted submission playerId
  };

  // Chat
  chat: ChatMessage[];
}

// AI Player Types
interface AIPersonality {
  id: string;
  name: string;
  displayName: string;
  avatarId: string;
  description: string;
  traits: {
    humorStyle: "sarcastic" | "wholesome" | "edgy" | "clever" | "random";
    responseTime: {
      min: number; // seconds
      max: number; // seconds
    };
    chatFrequency: "low" | "medium" | "high";
    memePreference: "funny" | "relevant" | "shocking" | "clever" | "random";
    votingStyle: "strategic" | "humor-focused" | "random" | "popular";
  };
  chatTemplates: {
    thinking: string[];
    submission: string[];
    voting: string[];
    winning: string[];
    losing: string[];
    general: string[];
  };
}

interface AIDecision {
  type: "meme-selection" | "voting" | "chat-message";
  context: {
    situation?: string;
    availableMemes?: string[];
    submissions?: Submission[];
    gamePhase?: GamePhase;
    currentRound?: number;
  };
  personalityId: string;
  decision: {
    selectedMeme?: string;
    votedSubmissionId?: string;
    chatMessage?: string;
    confidence: number; // 0-1
    reasoning?: string;
  };
  timestamp: Date;
  processingTime: number; // milliseconds
}

interface AIPlayer {
  id: string;
  personality: AIPersonality;
  isConnected: boolean;
  score: number;
  hand: string[]; // meme filenames
  selectedCard?: MemeCard;
  status: "waiting" | "playing" | "submitted" | "winner";
  lastActivity: Date;
  decisionHistory: AIDecision[];
  chatHistory: ChatMessage[];
}

// Extend existing LobbyPlayer interface with AI-specific properties
interface LobbyPlayer {
  uid: string;
  displayName: string;
  profileURL?: string | null;
  joinedAt: Date | string | { toDate: () => Date }; // Can be Date, ISO string, or Firestore Timestamp
  isHost: boolean;
  // AI-specific properties
  isAI?: boolean;
  aiPersonalityId?: string;
  aiPlayer?: AIPlayer;
  // Score tracking
  score?: number;
  totalWins?: number;
  totalGames?: number;
}

// AI Settings for lobby configuration
interface AISettings {
  enabled: boolean;
  maxAIPlayers: number; // 1-6
  minHumanPlayers: number; // minimum human players before adding AI
  personalityPool: string[]; // array of personality IDs to choose from
  autoBalance: boolean; // automatically remove AI when humans join
  difficulty: "easy" | "medium" | "hard"; // affects decision quality and timing
}

// LobbySettings interface is already defined above with optional aiSettings

// AI Player Management Types
interface AIPlayerManagerState {
  activeAIPlayers: Map<string, Map<string, AIPlayer>>; // lobbyCode -> playerId -> AIPlayer
  personalityPool: AIPersonality[];
  isInitialized: boolean;
}

interface AIPlayerCreationOptions {
  lobbyCode: string;
  personalityId?: string;
  forcePersonality?: boolean; // if true, use specified personality even if already in use
  maxPlayers?: number;
  personalityPool?: string[]; // array of personality IDs to choose from
}

interface AIPlayerRemovalOptions {
  lobbyCode: string;
  playerId: string;
  reason:
    | "human-joined"
    | "lobby-full"
    | "settings-changed"
    | "error"
    | "manual"
    | "lobby-cleanup"
    | "inactive";
}

// AI Decision Engine Types
interface AIDecisionEngineOptions {
  personality: AIPersonality;
  context: {
    situation?: string;
    availableMemes?: string[];
    submissions?: Submission[];
    gamePhase?: GamePhase;
    currentRound?: number;
  };
  timeout?: number; // milliseconds
}

interface AIDecisionResult {
  success: boolean;
  decision?: AIDecision;
  error?: string;
  processingTime: number;
}

// AI Chat System Types
interface AIChatMessageOptions {
  personality: AIPersonality;
  gameContext: {
    phase: GamePhase;
    currentRound: number;
    totalRounds: number;
    playerCount: number;
    aiPlayerCount: number;
  };
  trigger:
    | "thinking"
    | "submission"
    | "voting"
    | "winning"
    | "losing"
    | "general";
  customContext?: Record<string, unknown>;
}

// AI Player Error Types
type AIPlayerError =
  | "PERSONALITY_NOT_FOUND"
  | "DECISION_TIMEOUT"
  | "API_UNAVAILABLE"
  | "INVALID_CONTEXT"
  | "PERSONALITY_CONFLICT"
  | "LOBBY_FULL"
  | "INVALID_SETTINGS";

interface AIPlayerErrorInfo {
  error: AIPlayerError;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  playerId?: string;
  lobbyCode?: string;
}

// AI Performance Monitoring Types
interface AIPlayerMetrics {
  playerId: string;
  lobbyCode: string;
  personalityId: string;
  decisionsMade: number;
  averageDecisionTime: number;
  winRate: number;
  chatMessagesSent: number;
  errorsEncountered: number;
  lastActive: Date;
}

// AI Configuration Types
interface AIPersonalityConfig {
  id: string;
  name: string;
  displayName: string;
  avatarId: string;
  description: string;
  traits: {
    humorStyle: "sarcastic" | "wholesome" | "edgy" | "clever" | "random";
    responseTime: {
      min: number;
      max: number;
    };
    chatFrequency: "low" | "medium" | "high";
    memePreference: "funny" | "relevant" | "shocking" | "clever" | "random";
    votingStyle: "strategic" | "humor-focused" | "random" | "popular";
  };
  chatTemplates: {
    thinking: string[];
    submission: string[];
    voting: string[];
    winning: string[];
    losing: string[];
    general: string[];
  };
  enabled: boolean;
  difficulty: "easy" | "medium" | "hard";
}

interface AISystemConfig {
  maxConcurrentAIPlayers: number;
  defaultPersonalities: string[];
  decisionTimeout: number; // milliseconds
  chatCooldown: number; // milliseconds
  enableLogging: boolean;
  enableMetrics: boolean;
  fallbackPersonalityId: string;
}
