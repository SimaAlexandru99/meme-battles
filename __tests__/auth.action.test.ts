jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  })),
}));

import { signUp } from "@/lib/actions/auth.action";
import { db } from "@/firebase/admin";

jest.mock("@/firebase/admin", () => ({
  auth: {
    createSessionCookie: jest.fn().mockResolvedValue("session-cookie"),
    getUserByEmail: jest.fn(),
    verifyIdToken: jest.fn(),
  },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@sentry/nextjs", () => ({
  startSpan: jest.fn((_, fn) => fn({ setAttribute: jest.fn() })),
  captureException: jest.fn(),
}));

describe("Auth Actions", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signUp", () => {
    it("should create a new user if one does not exist", async () => {
      // Mock the document reference methods
      const mockDocRef = {
        get: jest.fn().mockResolvedValue({ exists: false }),
        set: jest.fn().mockResolvedValue(undefined),
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef),
      });

      const result = await signUp({
        uid: "test-uid",
        name: "Test User",
        email: "test@example.com",
        password: "testpassword",
      });

      expect(result.success).toBe(true);
      expect(db.collection).toHaveBeenCalledWith("users");
      expect(mockDocRef.set).toHaveBeenCalled();
    });

    it("should not create a new user if one already exists", async () => {
      // Mock the document reference methods
      const mockDocRef = {
        get: jest.fn().mockResolvedValue({ exists: true }),
        set: jest.fn().mockResolvedValue(undefined),
      };

      (db.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue(mockDocRef),
      });

      const result = await signUp({
        uid: "test-uid",
        name: "Test User",
        email: "test@example.com",
        password: "testpassword",
      });

      expect(result.success).toBe(false);
      expect(mockDocRef.set).not.toHaveBeenCalled();
    });
  });
});
