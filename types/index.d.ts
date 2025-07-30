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
