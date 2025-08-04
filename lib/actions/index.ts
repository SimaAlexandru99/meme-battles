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
// LOBBY ACTIONS
// ============================================================================

export {
  joinLobby,
  createLobby,
  leaveLobby,
  updateLobbySettings,
  addAIPlayerToLobby,
  removeAIPlayerFromLobby,
  getLobbyData,
  startGame,
  getUserActiveLobbies,
} from "./lobby.action";
