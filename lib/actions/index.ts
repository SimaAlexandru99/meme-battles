// ============================================================================
// AUTH ACTIONS
// ============================================================================

export {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  isAuthenticated,
  isAnonymousUser,
  isFirstTimeUser,
  updateUserDisplayName,
  markUserSetupComplete,
  updateUserProfile,
  getUserDisplayName,
  getUserActiveLobby,
  setSessionCookie,
  signInWithGoogle,
  signInWithGitHub,
  signInAsGuest,
} from "./auth.action";

// ============================================================================
// LOBBY ACTIONS - REMOVED FOR STATIC UI
// ============================================================================

// Lobby actions have been removed to simplify the transition to static UI
// These will be re-implemented with Realtime Database when needed
