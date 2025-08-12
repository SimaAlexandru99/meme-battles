import { renderHook, act } from "@testing-library/react";
import { useLobbySettings } from "@/hooks/use-lobby-settings";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Mock Firebase Realtime Database
jest.mock("firebase/database", () => ({
  getDatabase: jest.fn(),
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
  remove: jest.fn(),
}));

// Mock Firebase client
jest.mock("@/firebase/client", () => ({
  rtdb: {},
}));

// Mock LobbyService
const mockLobbyService = {
  updateLobbySettings: jest.fn(),
};

jest.mock("@/lib/services/lobby.service", () => ({
  LobbyService: {
    getInstance: () => mockLobbyService,
  },
}));

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

// Mock useCurrentUser
jest.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: jest.fn(),
}));

const mockUseCurrentUser = jest.mocked(useCurrentUser);

const mockUser: User = {
  id: "user123",
  name: "Test User",
  email: "test@example.com",
  avatarId: "avatar1",
  provider: "google",
  role: "user",
  createdAt: "2025-01-08T10:00:00.000Z",
  lastLoginAt: "2025-01-08T10:00:00.000Z",
  xp: 0,
  plan: "free",
  isAnonymous: false,
  setupCompleted: true,
};

const mockLobbyData: LobbyData = {
  code: "ABC12",
  hostUid: "user123",
  hostDisplayName: "Test User",
  maxPlayers: 8,
  status: "waiting",
  settings: {
    rounds: 8,
    timeLimit: 60,
    categories: ["general", "reaction"],
  },
  players: {
    user123: {
      id: "user123",
      displayName: "Test User",
      avatarId: "avatar1",
      joinedAt: "2025-01-08T10:00:00.000Z",
      isHost: true,
      score: 0,
      status: "waiting",
      lastSeen: "2025-01-08T10:00:00.000Z",
    },
  },
  createdAt: "2025-01-08T10:00:00.000Z",
  updatedAt: "2025-01-08T10:00:00.000Z",
};

describe("useLobbySettings - Core Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUser.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isError: false,
      error: null,
      mutate: jest.fn(),
      refresh: jest.fn(),
      clear: jest.fn(),
    });
  });

  it("should initialize with lobby settings", () => {
    const { result } = renderHook(() =>
      useLobbySettings("ABC12", mockLobbyData),
    );

    expect(result.current.settings).toEqual(mockLobbyData.settings);
    expect(result.current.isHost).toBe(true);
    expect(result.current.canModifySettings).toBe(true);
  });

  it("should validate settings correctly", () => {
    const { result } = renderHook(() =>
      useLobbySettings("ABC12", mockLobbyData),
    );

    // Valid settings
    const validResult = result.current.validateSettings({
      rounds: 5,
      timeLimit: 60,
      categories: ["general"],
    });
    expect(validResult.isValid).toBe(true);

    // Invalid settings
    const invalidResult = result.current.validateSettings({
      rounds: 2, // Too low
      timeLimit: 20, // Too low
      categories: [], // Empty
    });
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors).toHaveLength(3);
  });

  it("should identify non-host correctly", () => {
    mockUseCurrentUser.mockReturnValue({
      user: { ...mockUser, id: "user456" },
      isLoading: false,
      isError: false,
      error: null,
      mutate: jest.fn(),
      refresh: jest.fn(),
      clear: jest.fn(),
    });

    const { result } = renderHook(() =>
      useLobbySettings("ABC12", mockLobbyData),
    );

    expect(result.current.isHost).toBe(false);
    expect(result.current.canModifySettings).toBe(false);
  });

  it("should handle successful settings update", async () => {
    mockLobbyService.updateLobbySettings.mockResolvedValue({
      success: true,
      data: {
        ...mockLobbyData,
        settings: { ...mockLobbyData.settings, rounds: 10 },
      },
    });

    const { result } = renderHook(() =>
      useLobbySettings("ABC12", mockLobbyData),
    );

    await act(async () => {
      await result.current.updateSettings({ rounds: 10 });
    });

    expect(result.current.settings?.rounds).toBe(10);
    expect(mockLobbyService.updateLobbySettings).toHaveBeenCalledWith(
      "ABC12",
      { rounds: 10 },
      "user123",
    );
  });

  it("should prevent invalid settings updates", async () => {
    const { result } = renderHook(() =>
      useLobbySettings("ABC12", mockLobbyData),
    );

    await act(async () => {
      await result.current.updateSettings({ rounds: 2 }); // Invalid
    });

    expect(result.current.error).toContain("Invalid settings");
    expect(mockLobbyService.updateLobbySettings).not.toHaveBeenCalled();
  });

  it("should reset settings to lobby data", () => {
    const { result } = renderHook(() =>
      useLobbySettings("ABC12", mockLobbyData),
    );

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(mockLobbyData.settings);
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should clear errors", () => {
    const { result } = renderHook(() =>
      useLobbySettings("ABC12", mockLobbyData),
    );

    // Trigger an error
    act(() => {
      result.current.updateSettings({ rounds: 2 }); // Invalid
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });
});
