// ============================================================================
// AUTH ACTIONS
// ============================================================================

export {
  getCurrentUser,
  getUserActiveLobby,
  getUserDisplayName,
  isAnonymousUser,
  isAuthenticated,
  isFirstTimeUser,
  markUserSetupComplete,
  setSessionCookie,
  signIn,
  signInAsGuest,
  signInWithGitHub,
  signInWithGoogle,
  signOut,
  signUp,
  updateUserDisplayName,
  updateUserProfile,
} from "./auth.action";

// ============================================================================
// LOBBY ACTIONS - REMOVED FOR STATIC UI
// ============================================================================

// Lobby actions have been removed to simplify the transition to static UI
// These will be re-implemented with Realtime Database when needed
