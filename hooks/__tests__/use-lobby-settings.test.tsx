import { renderHook, act } from "@testing-library/react";
import { useLobbySettings } from "@/hooks/use-lobby-settings";
import { LobbyService } from "@/lib/services/lobby.service";
import * as Sentry from "@sentry/nextjs";
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

// Mock dependencies
jest.mock("@/lib/services/lobby.service");
jest.mock("@sentry/nextjs");

// Mock useCurrentUser hook directly
jest.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: jest.fn(),
}));

const mockUseCurrentUser = useCurrentUser;

const mockLobbyService = {
  updateLobbySettings: jest.fn(),
};

const mockUser = {
  id: "user123",
  name: "Test User",
  email: "test@example.com",
  avatarId: "avatar1",
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

describe("useLobbySettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (LobbyService.getInstance as jest.Mock).mockReturnValue(mockLobbyService);
    (mockUseCurrentUser as jest.Mock).mockReturnValue({ user: mockUser });
    (Sentry.addBreadcrumb as jest.Mock).mockImplementation(() => {});
    (Sentry.captureException as jest.Mock).mockImplementation(() => {});
  });

  describe("initialization", () => {
    it("should initialize with lobby settings", () => {
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      expect(result.current.settings).toEqual(mockLobbyData.settings);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.validationErrors).toEqual({});
    });

    it("should identify host correctly", () => {
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      expect(result.current.isHost).toBe(true);
      expect(result.current.canModifySettings).toBe(true);
    });

    it("should identify non-host correctly", () => {
      (mockUseCurrentUser as jest.Mock).mockReturnValue({
        user: { ...mockUser, id: "user456" },
      } as unknown as User);

      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      expect(result.current.isHost).toBe(false);
      expect(result.current.canModifySettings).toBe(false);
    });

    it("should handle null lobby data", () => {
      const { result } = renderHook(() => useLobbySettings("ABC12", null));

      expect(result.current.settings).toBe(null);
      expect(result.current.isHost).toBe(false);
      expect(result.current.canModifySettings).toBe(false);
    });
  });

  describe("settings validation", () => {
    it("should validate rounds correctly", () => {
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      // Valid rounds
      let validation = result.current.validateSettings({
        rounds: 5,
        timeLimit: 60,
        categories: ["general"],
      });
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Invalid rounds - too low
      validation = result.current.validateSettings({
        rounds: 2,
        timeLimit: 60,
        categories: ["general"],
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Rounds must be between 3 and 15");

      // Invalid rounds - too high
      validation = result.current.validateSettings({
        rounds: 20,
        timeLimit: 60,
        categories: ["general"],
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Rounds must be between 3 and 15");
    });

    it("should validate time limit correctly", () => {
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      // Valid time limit
      let validation = result.current.validateSettings({
        rounds: 5,
        timeLimit: 90,
        categories: ["general"],
      });
      expect(validation.isValid).toBe(true);

      // Invalid time limit - too low
      validation = result.current.validateSettings({
        rounds: 5,
        timeLimit: 20,
        categories: ["general"],
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Time limit must be between 30 and 120 seconds",
      );

      // Invalid time limit - too high
      validation = result.current.validateSettings({
        rounds: 5,
        timeLimit: 150,
        categories: ["general"],
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Time limit must be between 30 and 120 seconds",
      );
    });

    it("should validate categories correctly", () => {
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      // Valid categories
      let validation = result.current.validateSettings({
        rounds: 5,
        timeLimit: 60,
        categories: ["general", "reaction"],
      });
      expect(validation.isValid).toBe(true);

      // Invalid categories - empty array
      validation = result.current.validateSettings({
        rounds: 5,
        timeLimit: 60,
        categories: [],
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "At least 1 category must be selected",
      );

      // Invalid categories - invalid category name
      validation = result.current.validateSettings({
        rounds: 5,
        timeLimit: 60,
        categories: ["invalid-category"],
      });
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Invalid categories: invalid-category",
      );
    });

    it("should update validation errors state", () => {
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      act(() => {
        result.current.validateSettings({
          rounds: 2, // Invalid
          timeLimit: 20, // Invalid
          categories: [], // Invalid
        });
      });

      expect(result.current.validationErrors).toEqual({
        rounds: "Rounds must be between 3 and 15",
        timeLimit: "Time limit must be between 30 and 120 seconds",
        categories: "At least 1 category must be selected",
      });
    });
  });

  describe("updateSettings", () => {
    it("should update settings successfully with optimistic updates", async () => {
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
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockLobbyService.updateLobbySettings).toHaveBeenCalledWith(
        "ABC12",
        { rounds: 10 },
        "user123",
      );
    });

    it("should handle validation errors before sending request", async () => {
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      await act(async () => {
        await result.current.updateSettings({ rounds: 2 }); // Invalid
      });

      expect(result.current.error).toContain("Invalid settings");
      expect(mockLobbyService.updateLobbySettings).not.toHaveBeenCalled();
    });

    it("should rollback optimistic update on service failure", async () => {
      mockLobbyService.updateLobbySettings.mockRejectedValue(
        new Error("Network error"),
      );

      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      const originalRounds = result.current.settings?.rounds;

      await act(async () => {
        try {
          await result.current.updateSettings({ rounds: 10 });
        } catch (error) {
          console.log(error);
          // Expected to throw
        }
      });

      // Should show optimistic update initially
      expect(result.current.settings?.rounds).toBe(10);
      expect(result.current.error).toContain("Network error");

      // Wait for rollback timeout
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      });

      expect(result.current.settings?.rounds).toBe(originalRounds);
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it("should prevent updates for non-host users", async () => {
      (mockUseCurrentUser as jest.Mock).mockReturnValue({
        user: { ...mockUser, id: "user456" },
      });

      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      // Wait for hook to initialize
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await expect(
        act(async () => {
          await result.current.updateSettings({ rounds: 10 });
        }),
      ).rejects.toThrow("Cannot modify settings: insufficient permissions");

      expect(mockLobbyService.updateLobbySettings).not.toHaveBeenCalled();
    });

    it("should prevent updates when lobby is not in waiting status", async () => {
      const startedLobby = {
        ...mockLobbyData,
        status: "started" as LobbyStatus,
      };
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", startedLobby),
      );

      expect(result.current.canModifySettings).toBe(false);

      // Wait for hook to initialize
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await expect(
        act(async () => {
          await result.current.updateSettings({ rounds: 10 });
        }),
      ).rejects.toThrow("Cannot modify settings: insufficient permissions");
    });
  });

  describe("resetSettings", () => {
    it("should reset settings to lobby data", () => {
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      // Simulate some changes
      act(() => {
        result.current.updateSettings({ rounds: 10 });
      });

      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings).toEqual(mockLobbyData.settings);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.validationErrors).toEqual({});
    });
  });

  describe("real-time synchronization", () => {
    it("should sync with lobby data changes when no unsaved changes", () => {
      const { result, rerender } = renderHook(
        ({ lobbyData }) => useLobbySettings("ABC12", lobbyData),
        { initialProps: { lobbyData: mockLobbyData } },
      );

      const updatedLobbyData = {
        ...mockLobbyData,
        settings: { ...mockLobbyData.settings, rounds: 12 },
      };

      rerender({ lobbyData: updatedLobbyData });

      expect(result.current.settings?.rounds).toBe(12);
    });

    it("should not sync when there are unsaved changes", () => {
      const { result, rerender } = renderHook(
        ({ lobbyData }) => useLobbySettings("ABC12", lobbyData),
        { initialProps: { lobbyData: mockLobbyData } },
      );

      // Make local changes
      act(() => {
        result.current.updateSettings({ rounds: 10 });
      });

      const updatedLobbyData = {
        ...mockLobbyData,
        settings: { ...mockLobbyData.settings, rounds: 12 },
      };

      rerender({ lobbyData: updatedLobbyData });

      // Should keep local changes, not sync
      expect(result.current.settings?.rounds).toBe(10);
    });
  });

  describe("permission changes", () => {
    it("should reset changes when user loses host privileges", () => {
      const { result, rerender } = renderHook(
        ({ user }) => {
          (mockUseCurrentUser as jest.Mock).mockReturnValue({
            user,
          } as unknown as User);
          return useLobbySettings("ABC12", mockLobbyData);
        },
        { initialProps: { user: mockUser } },
      );

      // Make some changes as host
      act(() => {
        result.current.updateSettings({ rounds: 10 });
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      // Lose host privileges
      rerender({ user: { ...mockUser, id: "user456" } });

      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.settings).toEqual(mockLobbyData.settings);
    });
  });

  describe("error handling", () => {
    it("should clear errors", () => {
      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      // Set an error
      act(() => {
        result.current.updateSettings({ rounds: 2 }); // Invalid
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.validationErrors).toEqual({});
    });

    it("should handle lobby errors with user messages", async () => {
      const lobbyError = new Error("Service error") as LobbyError;
      lobbyError.type = "PERMISSION_DENIED";
      lobbyError.userMessage = "Only the host can change settings";
      lobbyError.retryable = false;

      mockLobbyService.updateLobbySettings.mockRejectedValue(lobbyError);

      const { result } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      await act(async () => {
        try {
          await result.current.updateSettings({ rounds: 10 });
        } catch (error) {
          console.log(error);
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Only the host can change settings");
      expect(Sentry.captureException).toHaveBeenCalledWith(
        lobbyError,
        expect.objectContaining({
          tags: expect.objectContaining({
            operation: "update_settings",
            lobbyCode: "ABC12",
            userId: "user123",
            isHost: true,
          }),
        }),
      );
    });
  });

  describe("cleanup", () => {
    it("should cleanup timeouts on unmount", () => {
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      const { unmount } = renderHook(() =>
        useLobbySettings("ABC12", mockLobbyData),
      );

      unmount();

      // Verify cleanup was attempted (timeout may or may not exist)
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});
