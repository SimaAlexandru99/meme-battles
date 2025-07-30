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

// Lobby-related interfaces
interface LobbyPlayer {
  uid: string;
  displayName: string;
  profileURL?: string | null;
  joinedAt: Date | string | { toDate: () => Date }; // Can be Date, ISO string, or Firestore Timestamp
  isHost: boolean;
}

interface LobbySettings {
  rounds: number;
  timeLimit: number;
  categories: string[];
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
  | { type: "SET_IS_LOADING"; payload: boolean };

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
  players: Player[];
  status: "waiting" | "starting" | "in-progress" | "completed";
  createdAt: Date;
  settings: {
    maxPlayers: number;
    gameMode: string;
    timeLimit: number;
  };
}

interface Player {
  id: string;
  nickname: string;
  avatarId: string;
  profileURL?: string;
  isHost: boolean;
  joinedAt: Date;
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
  onDataUpdate?: (lobbyData: SerializedLobbyData) => void;
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
  createdAt: Date | FirebaseFirestore.Timestamp;
  updatedAt: Date | FirebaseFirestore.Timestamp;
  settings: {
    rounds: number;
    timeLimit: number;
    categories: string[];
  };
}

interface SerializedLobbyData {
  code: string;
  hostUid: string;
  hostDisplayName: string;
  status: "waiting" | "started" | "finished";
  maxPlayers: number;
  players: LobbyPlayer[];
  createdAt: string;
  updatedAt: string;
  settings: {
    rounds: number;
    timeLimit: number;
    categories: string[];
  };
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
