import {
  createMockUser,
  createMockDocumentSnapshot,
  createMockQuerySnapshot,
  mockFirebaseAuth,
  mockFirestore,
  mockFirebaseStorage,
  setupFirebaseMocks,
  cleanupFirebaseMocks,
} from "./firebase-mocks";
import { createMockAnonymousUser } from "./mock-data";

describe("Firebase Mocks", () => {
  beforeEach(() => {
    setupFirebaseMocks();
  });

  afterEach(() => {
    cleanupFirebaseMocks();
  });

  describe("User Mocks", () => {
    it("should create a mock user", () => {
      const user = createMockUser();

      expect(user.uid).toBeDefined();
      expect(user.email).toBe("test@example.com");
      expect(user.isAnonymous).toBe(false);
      expect(user.getIdToken).toBeDefined();
    });

    it("should create a mock anonymous user", () => {
      const user = createMockAnonymousUser();

      expect(user.isAnonymous).toBe(true);
      expect(user.email).toBeNull();
    });
  });

  describe("Firestore Mocks", () => {
    it("should create a mock document snapshot", () => {
      const data = { name: "Test", value: 123 };
      const snapshot = createMockDocumentSnapshot(data, "test-id", true);

      expect(snapshot.id).toBe("test-id");
      expect(snapshot.exists()).toBe(true);
      expect(snapshot.data()).toEqual(data);
      expect(snapshot.get("name")).toBe("Test");
    });

    it("should create a mock query snapshot", () => {
      const doc1 = createMockDocumentSnapshot({ id: 1 }, "doc1");
      const doc2 = createMockDocumentSnapshot({ id: 2 }, "doc2");
      const snapshot = createMockQuerySnapshot([doc1, doc2]);

      expect(snapshot.docs).toHaveLength(2);
      expect(snapshot.empty).toBe(false);
      expect(snapshot.size).toBe(2);
    });

    it("should mock firestore operations", () => {
      const testData = { name: "Test Document" };
      mockFirestore.mockGetDoc(testData, true);

      expect(mockFirestore.getDoc).toBeDefined();
      expect(mockFirestore.addDoc).toBeDefined();
      expect(mockFirestore.updateDoc).toBeDefined();
      expect(mockFirestore.deleteDoc).toBeDefined();
    });
  });

  describe("Auth Mocks", () => {
    it("should mock auth operations", () => {
      expect(mockFirebaseAuth.signInAnonymously).toBeDefined();
      expect(mockFirebaseAuth.signOut).toBeDefined();
      expect(mockFirebaseAuth.onAuthStateChanged).toBeDefined();
    });

    it("should simulate auth state changes", () => {
      const user = createMockUser();
      const callback = jest.fn();

      mockFirebaseAuth.onAuthStateChanged.mockImplementation(callback);
      mockFirebaseAuth.simulateAuthStateChange(user);

      expect(mockFirebaseAuth.currentUser).toBe(user);
    });
  });

  describe("Storage Mocks", () => {
    it("should mock storage operations", () => {
      expect(mockFirebaseStorage.ref).toBeDefined();
      expect(mockFirebaseStorage.uploadBytes).toBeDefined();
      expect(mockFirebaseStorage.getDownloadURL).toBeDefined();
    });

    it("should mock successful upload", async () => {
      const downloadUrl = "https://example.com/test.jpg";
      mockFirebaseStorage.mockUploadSuccess(downloadUrl);

      // Test that the mocks are set up correctly
      const uploadResult = await mockFirebaseStorage.uploadBytes();
      const url = await mockFirebaseStorage.getDownloadURL();

      expect(uploadResult).toBeDefined();
      expect(url).toBe(downloadUrl);
    });
  });
});
