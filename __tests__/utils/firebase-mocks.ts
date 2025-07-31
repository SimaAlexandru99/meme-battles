import { User } from "firebase/auth";
import {
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  DocumentReference,
  Firestore,
  Query,
} from "firebase/firestore";
import { simulateNetworkDelay } from "./async-helpers";

// ============================================================================
// FIREBASE AUTH MOCKING UTILITIES
// ============================================================================

/**
 * Creates a mock Firebase user object
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const defaultUser: Partial<User> = {
    uid: "test-user-123",
    email: "test@example.com",
    displayName: "Test User",
    isAnonymous: false,
    emailVerified: true,
    phoneNumber: null,
    photoURL: null,
    providerId: "firebase",
    refreshToken: "mock-refresh-token",
    tenantId: null,
    metadata: {
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    },
    providerData: [],
    getIdToken: jest.fn().mockResolvedValue("mock-id-token"),
    getIdTokenResult: jest.fn().mockResolvedValue({
      token: "mock-id-token",
      claims: {},
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: "anonymous",
      signInSecondFactor: null,
    }),
    reload: jest.fn().mockResolvedValue(undefined),
    toJSON: jest.fn().mockReturnValue({}),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  return { ...defaultUser, ...overrides } as User;
}

/**
 * Creates a mock anonymous Firebase user
 */
function createMockAnonymousUserForFirebase(
  overrides: Partial<User> = {},
): User {
  return createMockUser({
    uid: "anonymous-user-123",
    email: null,
    displayName: null,
    isAnonymous: true,
    emailVerified: false,
    ...overrides,
  });
}

/**
 * Mock Firebase Auth functions
 */
export const mockFirebaseAuth = {
  signInAnonymously: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  currentUser: null as User | null,

  // Helper methods for testing
  setCurrentUser: (user: User | null) => {
    mockFirebaseAuth.currentUser = user;
  },

  simulateAuthStateChange: (user: User | null) => {
    mockFirebaseAuth.currentUser = user;
    // Simulate auth state change callback
    const callbacks = mockFirebaseAuth.onAuthStateChanged.mock.calls.map(
      (call) => call[0],
    );
    callbacks.forEach((callback) => callback(user));
  },
};

// ============================================================================
// FIREBASE FIRESTORE MOCKING UTILITIES
// ============================================================================

/**
 * Creates a mock Firestore document snapshot
 */
export function createMockDocumentSnapshot(
  data: DocumentData | null = null,
  id: string = "mock-doc-id",
  exists: boolean = true,
): DocumentSnapshot {
  return {
    id,
    exists: () => exists,
    data: () => data,
    get: (field: string) => data?.[field],
    ref: {
      id,
      path: `collection/${id}`,
      parent: {} as DocumentReference,
      firestore: {} as Firestore,
    } as unknown as DocumentReference,
  } as DocumentSnapshot;
}

/**
 * Creates a mock Firestore query snapshot
 */
export function createMockQuerySnapshot(
  docs: DocumentSnapshot[] = [],
  empty: boolean = docs.length === 0,
): QuerySnapshot {
  return {
    docs,
    empty,
    size: docs.length,
    forEach: (callback: (doc: DocumentSnapshot) => void) => {
      docs.forEach(callback);
    },
    query: {} as unknown as Query,
    metadata: {
      hasPendingWrites: false,
      fromCache: false,
    },
  } as QuerySnapshot;
}

/**
 * Mock Firestore functions
 */
export const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),

  // Helper methods for testing
  mockGetDoc: (
    data: DocumentData | null,
    exists: boolean = true,
    delayMs?: number,
  ) => {
    mockFirestore.getDoc.mockImplementation(async () => {
      if (delayMs) await simulateNetworkDelay(delayMs);
      return Promise.resolve(
        createMockDocumentSnapshot(data, "mock-doc-id", exists),
      );
    });
  },

  mockGetDocs: (docsData: DocumentData[], delayMs?: number) => {
    mockFirestore.getDocs.mockImplementation(async () => {
      if (delayMs) await simulateNetworkDelay(delayMs);
      const docs = docsData.map((data, index) =>
        createMockDocumentSnapshot(data, `doc-${index}`, true),
      );
      return Promise.resolve(createMockQuerySnapshot(docs));
    });
  },

  mockAddDoc: (docId: string = "new-doc-id", delayMs?: number) => {
    mockFirestore.addDoc.mockImplementation(async () => {
      if (delayMs) await simulateNetworkDelay(delayMs);
      return Promise.resolve({ id: docId, path: `collection/${docId}` });
    });
  },

  mockUpdateDoc: (delayMs?: number) => {
    mockFirestore.updateDoc.mockImplementation(async () => {
      if (delayMs) await simulateNetworkDelay(delayMs);
      return Promise.resolve(undefined);
    });
  },

  mockDeleteDoc: (delayMs?: number) => {
    mockFirestore.deleteDoc.mockImplementation(async () => {
      if (delayMs) await simulateNetworkDelay(delayMs);
      return Promise.resolve(undefined);
    });
  },
};

// ============================================================================
// FIREBASE STORAGE MOCKING UTILITIES
// ============================================================================

/**
 * Mock Firebase Storage functions
 */
export const mockFirebaseStorage = {
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),

  // Helper methods for testing
  mockUploadSuccess: (downloadUrl: string = "https://example.com/file.jpg") => {
    mockFirebaseStorage.uploadBytes.mockResolvedValue({
      metadata: {
        name: "test-file.jpg",
        bucket: "test-bucket",
        fullPath: "uploads/test-file.jpg",
      },
      ref: {},
    });
    mockFirebaseStorage.getDownloadURL.mockResolvedValue(downloadUrl);
  },

  mockUploadError: (error: Error = new Error("Upload failed")) => {
    mockFirebaseStorage.uploadBytes.mockRejectedValue(error);
  },
};

// ============================================================================
// SETUP AND TEARDOWN UTILITIES
// ============================================================================

/**
 * Sets up all Firebase mocks with default behavior
 */
export function setupFirebaseMocks() {
  // Reset all mocks
  jest.clearAllMocks();

  // Setup default mock implementations
  mockFirebaseAuth.signInAnonymously.mockResolvedValue({
    user: createMockAnonymousUserForFirebase(),
  });

  mockFirebaseAuth.signOut.mockResolvedValue(undefined);

  mockFirestore.mockGetDoc(null, false); // Default to non-existent document
  mockFirestore.mockGetDocs([]); // Default to empty collection
  mockFirestore.mockAddDoc();
  mockFirestore.mockUpdateDoc();
  mockFirestore.mockDeleteDoc();

  mockFirebaseStorage.mockUploadSuccess();
}

/**
 * Cleans up Firebase mocks after tests
 */
export function cleanupFirebaseMocks() {
  jest.clearAllMocks();
  mockFirebaseAuth.currentUser = null;
}

/**
 * Helper to mock Firebase initialization
 */
export function mockFirebaseApp() {
  const mockApp = {
    name: "test-app",
    options: {},
    automaticDataCollectionEnabled: false,
  };

  require("firebase/app").getApps.mockReturnValue([mockApp]);
  require("firebase/app").getApp.mockReturnValue(mockApp);
  require("firebase/app").initializeApp.mockReturnValue(mockApp);

  return mockApp;
}
