"use server";

import { auth, db } from "@/firebase/admin";
import { cookies } from "next/headers";
import * as Sentry from "@sentry/nextjs";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Session duration (1 week in seconds)
const SESSION_DURATION = 60 * 60 * 24 * 7;

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

        // Save new user to the database
        await db.collection("users").doc(uid).set({
          name,
          email,
          provider: "email",
          role: "user",
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          xp: 0,
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
          lastLoginAt: new Date().toISOString(),
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
              profileURL: decodedToken.picture,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              xp: 0,
            });

          span.setAttribute("user.created", true);
        }

        // Update last login timestamp for existing users
        if (userRecord.exists) {
          await db.collection("users").doc(decodedToken.uid).update({
            lastLoginAt: new Date().toISOString(),
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
              profileURL: decodedToken.picture,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
              xp: 0,
            });

          span.setAttribute("user.created", true);
        }

        // Update last login timestamp for existing users
        if (userRecord.exists) {
          await db.collection("users").doc(decodedToken.uid).update({
            lastLoginAt: new Date().toISOString(),
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

        span.setAttribute("user.role", user.role);
        span.setAttribute("user.provider", user.provider);
        return user;
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
