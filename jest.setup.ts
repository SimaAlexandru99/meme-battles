import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
}));

// Mock Next.js image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return {
      type: "img",
      props: { src, alt, ...rest },
    };
  },
}));

// Mock Firebase
jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({})),
  signInAnonymously: jest.fn(() => Promise.resolve({ user: {} })),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(() => jest.fn()),
  connectAuthEmulator: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  addDoc: jest.fn(() => Promise.resolve({})),
  getDoc: jest.fn(() =>
    Promise.resolve({ data: () => ({}), exists: () => true }),
  ),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  orderBy: jest.fn(() => ({})),
  limit: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
}));

jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(() => ({})),
  uploadBytes: jest.fn(() => Promise.resolve()),
  getDownloadURL: jest.fn(() => Promise.resolve("")),
  connectStorageEmulator: jest.fn(),
}));

// Mock Firebase Realtime Database
jest.mock("firebase/database", () => ({
  getDatabase: jest.fn(() => ({})),
  ref: jest.fn(() => ({})),
  set: jest.fn(() => Promise.resolve()),
  get: jest.fn(() =>
    Promise.resolve({
      val: () => ({}),
      exists: () => true,
      key: null,
      ref: {},
      toJSON: () => ({}),
    }),
  ),
  update: jest.fn(() => Promise.resolve()),
  remove: jest.fn(() => Promise.resolve()),
  onValue: jest.fn(() => jest.fn()),
  off: jest.fn(),
  query: jest.fn(() => ({})),
  orderByChild: jest.fn(() => ({})),
  orderByKey: jest.fn(() => ({})),
  orderByValue: jest.fn(() => ({})),
  limitToFirst: jest.fn(() => ({})),
  limitToLast: jest.fn(() => ({})),
  startAt: jest.fn(() => ({})),
  endAt: jest.fn(() => ({})),
  equalTo: jest.fn(() => ({})),
  onDisconnect: jest.fn(() => ({
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve()),
    cancel: jest.fn(() => Promise.resolve()),
  })),
  serverTimestamp: jest.fn(() => ({ ".sv": "timestamp" })),
  push: jest.fn(() => ({ key: "mock-key" })),
  connectDatabaseEmulator: jest.fn(),
}));

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();

  // Enable fake timers globally
  jest.useFakeTimers();
});

afterEach(() => {
  // Restore real timers after each test
  jest.useRealTimers();
});

// Suppress console errors during tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress common React testing warnings
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render is deprecated") ||
        args[0].includes("Warning: An update to") ||
        args[0].includes(
          "Not implemented: HTMLFormElement.prototype.requestSubmit",
        ) ||
        args[0].includes("Warning: React does not recognize the") ||
        args[0].includes("Warning: Invalid DOM property") ||
        args[0].includes("An update to") ||
        args[0].includes("Error: Not implemented:"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds: number[] = [];
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: jest.fn(),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Mock global timers
const mockSetInterval = jest.fn();
const mockClearInterval = jest.fn();
const mockSetTimeout = jest.fn();
const mockClearTimeout = jest.fn();

Object.defineProperty(global, "setInterval", {
  value: mockSetInterval,
  writable: true,
});
Object.defineProperty(global, "clearInterval", {
  value: mockClearInterval,
  writable: true,
});
Object.defineProperty(global, "setTimeout", {
  value: mockSetTimeout,
  writable: true,
});
Object.defineProperty(global, "clearTimeout", {
  value: mockClearTimeout,
  writable: true,
});
