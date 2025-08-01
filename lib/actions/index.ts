// ============================================================================
// AUTH ACTIONS
// ============================================================================

export {
  // Session management
  setSessionCookie,
  signOut,

  // User authentication
  signUp,
  signIn,
  signInWithGoogle,
  signInWithGitHub,
  signInAsGuest,

  // User data
  getCurrentUser,
  isAuthenticated,
  isAnonymousUser,
  isFirstTimeUser,
  updateUserDisplayName,
  markUserSetupComplete,
  updateUserProfile,
  getUserDisplayName,
  getUserActiveLobby,

  // Cache management
  clearUserCache,
} from "./auth.action";

// ============================================================================
// LOBBY ACTIONS
// ============================================================================

export {
  // Lobby creation and joining
  createLobby,
  joinLobby,

  // Lobby management
  getLobbyData,
  startGame,
  leaveLobby,
  updateLobbySettings,

  // Lobby queries
  getUserActiveLobbies,
} from "./lobby.action";
