"use server";

import { auth, db } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// Import types from global definitions
import * as Sentry from "@sentry/nextjs";
import { cookies } from "next/headers";
import { getRandomAvatar } from "@/lib/utils";
import { convertFirestoreData } from "@/lib/utils";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Session duration (1 week in seconds)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Simple in-memory cache for user data (5 minute TTL)
const userCache = new Map<string, { user: User; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// ============================================================================
// CACHE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Gets cached user data if valid, null otherwise
 */
function getCachedUser(sessionCookie: string): User | null {
  const cached = userCache.get(sessionCookie);
  if (!cached) return null;

  // Check if cache is still valid
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    userCache.delete(sessionCookie);
    return null;
  }

  return cached.user;
}

/**
 * Caches user data with timestamp
 */
function cacheUser(sessionCookie: string, user: User): void {
  userCache.set(sessionCookie, { user, timestamp: Date.now() });
}

/**
 * Clears user cache (called on updates)
 */
export async function clearUserCache(): Promise<void> {
  userCache.clear();
}

// ============================================================================
// SESSION MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Sets a session cookie for authenticated users
 * @param idToken - Firebase ID token from client authentication
 */
export async function setSessionCookie(idToken: string) {
  return Sentry.startSpan(
    {
      op: "auth.session.set",
      name: "Set Session Cookie",
    },
    async (span) => {
      try {
        const cookieStore = await cookies();

        // Create session cookie using Firebase Admin SDK
        const sessionCookie = await auth.createSessionCookie(idToken, {
          expiresIn: SESSION_DURATION * 1000, // Convert to milliseconds
        });

        // Set secure HTTP-only cookie in the browser
        cookieStore.set("session", sessionCookie, {
          maxAge: SESSION_DURATION,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          sameSite: "lax",
        });

        span.setAttribute("session.duration", SESSION_DURATION);
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * Clears the session cookie to sign out the user
 */
export async function signOut() {
  return Sentry.startSpan(
    {
      op: "auth.session.clear",
      name: "Clear Session Cookie",
    },
    async (span) => {
      try {
        const cookieStore = await cookies();
        cookieStore.delete("session");
        span.setAttribute("session.cleared", true);
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

// ============================================================================
// USER AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Creates a new user account in the database
 * @param params - User registration parameters (uid, name, email)
 * @returns Success/error response with a message
 */
export async function signUp(params: SignUpParams) {
  return Sentry.startSpan(
    {
      op: "auth.user.create",
      name: "Create User Account",
    },
    async (span) => {
      const { uid, name, email } = params;

      try {
        span.setAttribute("user.email", email);
        span.setAttribute("user.provider", "email");

        // Check if a user already exists in a database
        const userRecord = await db.collection("users").doc(uid).get();
        if (userRecord.exists) {
          return {
            success: false,
            message: "User already exists. Please sign in.",
          };
        }

        // Get a random avatar for the new user
        const randomAvatar = getRandomAvatar();

        // Save new user to the database
        await db.collection("users").doc(uid).set({
          name,
          email,
          provider: "email",
          role: "user",
          profileURL: randomAvatar.src,
          avatarId: randomAvatar.id,
          setupCompleted: false,
          createdAt: FieldValue.serverTimestamp(),
          lastLoginAt: FieldValue.serverTimestamp(),
          xp: 0,
          plan: "free",
        });

        span.setAttribute("user.created", true);
        return {
          success: true,
          message: "Account created successfully. Please sign in.",
        };
      } catch (error: unknown) {
        Sentry.captureException(error);
        console.error("Error creating user:", error);

        // Handle Firebase specific errors
        if (
          error instanceof Error &&
          error.message === "auth/email-already-exists"
        ) {
          return {
            success: false,
            message: "This email is already in use",
          };
        }

        return {
          success: false,
          message: "Failed to create account. Please try again.",
        };
      }
    }
  );
}

/**
 * Authenticates a user with email and sets session cookie
 * @param params - Sign in parameters (email, idToken)
 * @returns Success/error response with a message
 */
export async function signIn(params: SignInParams) {
  return Sentry.startSpan(
    {
      op: "auth.user.signin",
      name: "Sign In User",
    },
    async (span) => {
      const { email, idToken } = params;

      try {
        span.setAttribute("user.email", email);

        // Verify user exists in Firebase Auth
        const userRecord = await auth.getUserByEmail(email);
        if (!userRecord) {
          return {
            success: false,
            message: "User does not exist. Create an account.",
          };
        }

        // Update last login timestamp
        await db.collection("users").doc(userRecord.uid).update({
          lastLoginAt: FieldValue.serverTimestamp(),
        });

        // Set session cookie for authenticated user
        await setSessionCookie(idToken);

        span.setAttribute("user.signed_in", true);
        return {
          success: true,
          message: "Successfully signed in.",
        };
      } catch (error: unknown) {
        Sentry.captureException(error);
        console.log("Error signing in:", error);

        return {
          success: false,
          message: "Failed to log into account. Please try again.",
        };
      }
    }
  );
}

// ============================================================================
// SOCIAL AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Handles Google OAuth authentication
 * Creates user in database if new, sets session cookie
 * @param idToken - Google ID token from client authentication
 * @returns Success/error response with message
 */
export async function signInWithGoogle(idToken: string) {
  return Sentry.startSpan(
    {
      op: "auth.oauth.google",
      name: "Sign In with Google",
    },
    async (span) => {
      try {
        // Verify the ID token with Firebase Admin
        const decodedToken = await auth.verifyIdToken(idToken);

        span.setAttribute("user.email", decodedToken.email);
        span.setAttribute("user.provider", "google");

        // Check if user exists in our database
        const userRecord = await db
          .collection("users")
          .doc(decodedToken.uid)
          .get();

        if (!userRecord.exists) {
          // Get a random avatar for the new user
          const randomAvatar = getRandomAvatar();

          // Create new user in database for first-time Google sign-in
          await db
            .collection("users")
            .doc(decodedToken.uid)
            .set({
              name:
                decodedToken.name || decodedToken.display_name || "Google User",
              email: decodedToken.email,
              provider: "google",
              role: "user",
              profileURL: decodedToken.picture || randomAvatar.src,
              avatarId: randomAvatar.id,
              setupCompleted: false,
              createdAt: FieldValue.serverTimestamp(),
              lastLoginAt: FieldValue.serverTimestamp(),
              xp: 0,
              plan: "free",
            });

          span.setAttribute("user.created", true);
        }

        // Update last login timestamp for existing users
        if (userRecord.exists) {
          await db.collection("users").doc(decodedToken.uid).update({
            lastLoginAt: FieldValue.serverTimestamp(),
          });
        }

        // Set session cookie for authenticated user
        await setSessionCookie(idToken);

        span.setAttribute("user.signed_in", true);
        return {
          success: true,
          message: "Successfully signed in with Google.",
        };
      } catch (error: unknown) {
        Sentry.captureException(error);
        console.error("Error signing in with Google:", error);

        return {
          success: false,
          message: "Failed to sign in with Google. Please try again.",
        };
      }
    }
  );
}

/**
 * Handles GitHub OAuth authentication
 * Creates user in database if new, sets session cookie
 * @param idToken - GitHub ID token from client authentication
 * @returns Success/error response with message
 */
export async function signInWithGitHub(idToken: string) {
  return Sentry.startSpan(
    {
      op: "auth.oauth.github",
      name: "Sign In with GitHub",
    },
    async (span) => {
      try {
        // Verify the ID token with Firebase Admin
        const decodedToken = await auth.verifyIdToken(idToken);

        span.setAttribute("user.email", decodedToken.email);
        span.setAttribute("user.provider", "github");

        // Check if user exists in our database
        const userRecord = await db
          .collection("users")
          .doc(decodedToken.uid)
          .get();

        if (!userRecord.exists) {
          // Get a random avatar for the new user
          const randomAvatar = getRandomAvatar();

          // Create new user in database for first-time GitHub sign-in
          await db
            .collection("users")
            .doc(decodedToken.uid)
            .set({
              name:
                decodedToken.name || decodedToken.display_name || "GitHub User",
              email: decodedToken.email,
              provider: "github",
              role: "user",
              profileURL: decodedToken.picture || randomAvatar.src,
              avatarId: randomAvatar.id,
              setupCompleted: false,
              createdAt: FieldValue.serverTimestamp(),
              lastLoginAt: FieldValue.serverTimestamp(),
              xp: 0,
              plan: "free",
            });

          span.setAttribute("user.created", true);
        }

        // Update last login timestamp for existing users
        if (userRecord.exists) {
          await db.collection("users").doc(decodedToken.uid).update({
            lastLoginAt: FieldValue.serverTimestamp(),
          });
        }

        // Set session cookie for authenticated user
        await setSessionCookie(idToken);

        span.setAttribute("user.signed_in", true);
        return {
          success: true,
          message: "Successfully signed in with GitHub.",
        };
      } catch (error: unknown) {
        Sentry.captureException(error);
        console.error("Error signing in with GitHub:", error);

        return {
          success: false,
          message: "Failed to sign in with GitHub. Please try again.",
        };
      }
    }
  );
}

/**
 * Handles anonymous authentication for guest users
 * Creates temporary user session with generated display name
 * @param params - Anonymous sign in parameters (idToken, displayName)
 * @returns Success/error response with message
 */
export async function signInAsGuest(params: {
  idToken: string;
  displayName: string;
}) {
  return Sentry.startSpan(
    {
      op: "auth.anonymous.signin",
      name: "Sign In as Guest",
    },
    async (span) => {
      const { idToken, displayName } = params;

      try {
        // Verify the ID token with Firebase Admin
        const decodedToken = await auth.verifyIdToken(idToken);

        span.setAttribute("user.provider", "anonymous");
        span.setAttribute("user.display_name", displayName);
        span.setAttribute("user.is_anonymous", true);

        // Check if anonymous user already exists in our database
        const userRecord = await db
          .collection("users")
          .doc(decodedToken.uid)
          .get();

        if (!userRecord.exists) {
          // Get a random avatar for the new anonymous user
          const randomAvatar = getRandomAvatar();

          // Create new anonymous user in database
          await db.collection("users").doc(decodedToken.uid).set({
            name: displayName,
            email: null, // Anonymous users don't have email
            provider: "anonymous",
            role: "guest",
            isAnonymous: true,
            profileURL: randomAvatar.src,
            avatarId: randomAvatar.id,
            setupCompleted: false,
            createdAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
            xp: 0,
            plan: "free",
          });

          span.setAttribute("user.created", true);
        } else {
          // Update last login timestamp for existing anonymous users
          await db.collection("users").doc(decodedToken.uid).update({
            lastLoginAt: FieldValue.serverTimestamp(),
          });
        }

        // Set session cookie for anonymous user (shorter duration)
        const sessionCookie = await auth.createSessionCookie(idToken, {
          expiresIn: 60 * 60 * 24 * 1000, // 1 day for anonymous users
        });

        const cookieStore = await cookies();
        cookieStore.set("session", sessionCookie, {
          maxAge: 60 * 60 * 24, // 1 day
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          sameSite: "lax",
        });

        span.setAttribute("user.signed_in", true);
        return {
          success: true,
          message: `Successfully signed in as ${displayName}.`,
        };
      } catch (error: unknown) {
        Sentry.captureException(error);
        console.error("Error signing in as guest:", error);

        return {
          success: false,
          message: "Failed to sign in as guest. Please try again.",
        };
      }
    }
  );
}

// ============================================================================
// USER STATE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Retrieves the current authenticated user from session cookie
 * @returns User object if authenticated, null otherwise
 */
export async function getCurrentUser(): Promise<User | null> {
  return Sentry.startSpan(
    {
      op: "auth.user.get",
      name: "Get Current User",
    },
    async (span) => {
      const cookieStore = await cookies();

      // Get session cookie from browser
      const sessionCookie = cookieStore.get("session")?.value;
      if (!sessionCookie) return null;

      // Check cache first
      const cachedUser = getCachedUser(sessionCookie);
      if (cachedUser) {
        span.setAttribute("user.cached", true);
        return cachedUser;
      }

      try {
        // Verify session cookie with Firebase Admin
        const decodedClaims = await auth.verifySessionCookie(
          sessionCookie,
          true
        );

        span.setAttribute("user.uid", decodedClaims.uid);

        // Get user information from database
        const userRecord = await db
          .collection("users")
          .doc(decodedClaims.uid)
          .get();

        if (!userRecord.exists) return null;

        // Return user data with ID
        const user = {
          ...userRecord.data(),
          id: userRecord.id,
        } as User;

        // Convert Firestore data to serializable format
        const serializedUser = convertFirestoreData(user);

        // Cache the user
        cacheUser(sessionCookie, serializedUser);

        span.setAttribute("user.role", serializedUser.role);
        span.setAttribute("user.provider", serializedUser.provider);
        return serializedUser;
      } catch (error) {
        Sentry.captureException(error);
        console.log("Session verification error:", error);

        // Invalid or expired session - return null
        return null;
      }
    }
  );
}

/**
 * Checks if a user is currently authenticated
 * @returns Boolean indicating authentication status
 */
export async function isAuthenticated() {
  return Sentry.startSpan(
    {
      op: "auth.user.check",
      name: "Check Authentication Status",
    },
    async (span) => {
      const user = await getCurrentUser();
      const isAuth = !!user;
      span.setAttribute("user.authenticated", isAuth);
      return isAuth;
    }
  );
}

/**
 * Checks if the current user is anonymous
 * @returns Boolean indicating if user is anonymous, null if not authenticated
 */
export async function isAnonymousUser() {
  return Sentry.startSpan(
    {
      op: "auth.user.check_anonymous",
      name: "Check Anonymous Status",
    },
    async (span) => {
      const user = await getCurrentUser();
      const isAnonymous = user?.isAnonymous ?? null;
      span.setAttribute("user.is_anonymous", isAnonymous ?? false);

      // Log anonymous user behavior for analytics
      if (isAnonymous) {
        const { logger } = Sentry;
        logger.info("Anonymous user accessing auth pages", {
          userId: user?.id,
          userRole: user?.role,
          userProvider: user?.provider,
        });
      }

      return isAnonymous;
    }
  );
}

/**
 * Checks if the current user is a first-time user (needs setup)
 * @returns Boolean indicating if user needs first-time setup
 */
export async function isFirstTimeUser() {
  return Sentry.startSpan(
    {
      op: "auth.user.check_first_time",
      name: "Check First Time User Status",
    },
    async (span) => {
      const user = await getCurrentUser();

      if (!user) {
        span.setAttribute("user.first_time", false);
        return false;
      }

      // Anonymous users should never see the setup dialog
      if (user.isAnonymous) {
        span.setAttribute("user.first_time", false);
        span.setAttribute("user.is_anonymous", true);
        return false;
      }

      // For authenticated users, check if they haven't customized their profile yet
      const hasCustomName = !!(user.name && user.name.length > 2);
      const hasCustomAvatar = !!(
        user.avatarId && user.avatarId !== "evil-doge"
      );

      // User is first-time if they don't have custom name or avatar, or haven't completed setup
      const isFirstTime =
        !hasCustomName || !hasCustomAvatar || !user.setupCompleted;

      span.setAttribute("user.first_time", isFirstTime);
      span.setAttribute("user.has_custom_name", hasCustomName);
      span.setAttribute("user.has_custom_avatar", hasCustomAvatar);
      span.setAttribute("user.setup_completed", user.setupCompleted ?? false);
      return isFirstTime;
    }
  );
}

/**
 * Updates the current user's display name
 * @param displayName - New display name for the user
 * @returns Success/error response with message
 */
export async function updateUserDisplayName(displayName: string) {
  return Sentry.startSpan(
    {
      op: "auth.user.update_name",
      name: "Update User Display Name",
    },
    async (span) => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          return {
            success: false,
            message: "User not authenticated",
          };
        }

        span.setAttribute("user.uid", user.id);
        span.setAttribute("user.new_name", displayName);

        // Update user's display name in database
        await db.collection("users").doc(user.id).update({
          name: displayName,
          lastLoginAt: FieldValue.serverTimestamp(),
        });

        // Clear cache for the current session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;
        if (sessionCookie) {
          userCache.delete(sessionCookie);
        }
        // Also clear the global cache to ensure consistency
        await clearUserCache();

        span.setAttribute("user.name_updated", true);
        return {
          success: true,
          message: "Display name updated successfully",
        };
      } catch (error: unknown) {
        Sentry.captureException(error);
        console.error("Error updating display name:", error);

        return {
          success: false,
          message: "Failed to update display name. Please try again.",
        };
      }
    }
  );
}

/**
 * Marks a user as having completed their first-time setup
 * @returns Success/error response with message
 */
export async function markUserSetupComplete() {
  return Sentry.startSpan(
    {
      op: "auth.user.setup_complete",
      name: "Mark User Setup Complete",
    },
    async (span) => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          return {
            success: false,
            message: "User not authenticated",
          };
        }

        span.setAttribute("user.uid", user.id);

        // Update user's setup completion status
        await db.collection("users").doc(user.id).update({
          setupCompleted: true,
          lastLoginAt: FieldValue.serverTimestamp(),
        });

        // Clear cache for the current session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;
        if (sessionCookie) {
          userCache.delete(sessionCookie);
        }
        // Also clear the global cache to ensure consistency
        await clearUserCache();

        span.setAttribute("user.setup_completed", true);
        return {
          success: true,
          message: "Setup completed successfully",
        };
      } catch (error: unknown) {
        Sentry.captureException(error);
        console.error("Error marking setup complete:", error);

        return {
          success: false,
          message: "Failed to mark setup complete. Please try again.",
        };
      }
    }
  );
}

/**
 * Updates the current user's profile information
 * @param updates - Object containing profile updates
 * @returns Success/error response with message
 */
export async function updateUserProfile(updates: {
  name?: string;
  profileURL?: string;
  avatarId?: string;
}) {
  return Sentry.startSpan(
    {
      op: "auth.user.update_profile",
      name: "Update User Profile",
    },
    async (span) => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          return {
            success: false,
            message: "User not authenticated",
          };
        }

        span.setAttribute("user.uid", user.id);
        span.setAttribute("profile.updates", JSON.stringify(updates));

        // Prepare update object
        const updateData: {
          name?: string;
          profileURL?: string;
          avatarId?: string;
          lastLoginAt?: FirebaseFirestore.FieldValue;
        } = {
          lastLoginAt: FieldValue.serverTimestamp(),
        };

        if (updates.name) {
          updateData.name = updates.name;
        }

        if (updates.profileURL) {
          updateData.profileURL = updates.profileURL;
        }

        if (updates.avatarId) {
          updateData.avatarId = updates.avatarId;
        }

        // Update user's profile in database
        await db.collection("users").doc(user.id).update(updateData);

        // Clear cache for the current session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session")?.value;
        if (sessionCookie) {
          userCache.delete(sessionCookie);
        }
        // Also clear the global cache to ensure consistency
        await clearUserCache();

        span.setAttribute("user.profile_updated", true);
        return {
          success: true,
          message: "Profile updated successfully",
        };
      } catch (error: unknown) {
        Sentry.captureException(error);
        console.error("Error updating profile:", error);

        return {
          success: false,
          message: "Failed to update profile. Please try again.",
        };
      }
    }
  );
}

export async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.name || "Anonymous Player";
    }

    return "Anonymous Player";
  } catch (error) {
    console.error("Error fetching user display name:", error);
    return "Anonymous Player";
  }
}

/**
 * Checks if a user is currently in an active game lobby
 * @param uid - User ID to check
 * @returns Active lobby data or null if not in any lobby
 */
export async function getUserActiveLobby(uid: string) {
  return Sentry.startSpan(
    {
      op: "db.query",
      name: "Get User Active Lobby",
    },
    async (span) => {
      try {
        span.setAttribute("user.uid", uid);

        // Query lobbies where status is not finished
        const lobbiesRef = db.collection("lobbies");
        const query = lobbiesRef.where("status", "in", ["waiting", "started"]);

        const snapshot = await query.get();

        if (snapshot.empty) {
          span.setAttribute("lobby.found", false);
          return null;
        }

        // Find the lobby where the user is a player
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let userLobby: any = null;
        for (const doc of snapshot.docs) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lobbyData = doc.data() as any;
          const players = lobbyData.players || [];

          // Check if user is in the players array
          const isPlayer = players.some(
            (player: { uid: string }) => player.uid === uid
          );

          if (isPlayer) {
            userLobby = {
              ...lobbyData,
              id: doc.id,
            };
            break;
          }
        }

        if (!userLobby) {
          span.setAttribute("lobby.found", false);
          return null;
        }

        // Convert Firestore Timestamps to serializable objects
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const serializedPlayers = userLobby.players.map((player: any) => ({
          ...player,
          joinedAt:
            player.joinedAt &&
            typeof player.joinedAt === "object" &&
            "toDate" in player.joinedAt
              ? player.joinedAt.toDate().toISOString()
              : player.joinedAt instanceof Date
                ? player.joinedAt.toISOString()
                : player.joinedAt,
        }));

        const serializedLobby = {
          code: userLobby.code,
          status: userLobby.status,
          hostUid: userLobby.hostUid,
          players: serializedPlayers,
          settings: userLobby.settings,
        };

        span.setAttribute("lobby.found", true);
        span.setAttribute("lobby.code", userLobby.code);
        span.setAttribute("lobby.status", userLobby.status);

        return serializedLobby;
      } catch (error) {
        Sentry.captureException(error);
        console.error("Error checking user active lobby:", error);
        return null;
      }
    }
  );
}
