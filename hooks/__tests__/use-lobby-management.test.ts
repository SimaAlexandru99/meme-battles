import { act, renderHook, waitFor } from "@testing-library/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { LobbyService } from "@/lib/services/lobby.service";
import { useLobbyManagement } from "../use-lobby-management";

// Mock Firebase client
jest.mock("@/firebase/client", () => ({
  rtdb: {},
}));

// Mock Firebase admin
jest.mock("@/firebase/admin", () => ({
  auth: {},
  db: {},
  rtdb: {},
}));

// Mock auth actions
jest.mock("@/lib/actions/auth.action", () => ({
  getCurrentUser: jest.fn(),
}));

// Mock dependencies
jest.mock("@/lib/services/lobby.service");
jest.mock("@/hooks/useCurrentUser");
jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn((_, fn) => fn()),
}));

const mockLobbyService = {
  createLobby: jest.fn(),
  joinLobby: jest.fn(),
  leaveLobby: jest.fn(),
  updateLobbySettings: jest.fn(),
  kickPlayer: jest.fn(),
  updatePlayerStatus: jest.fn(),
  subscribeToLobby: jest.fn(),
};

const mockUser: User = {
  id: "user123",
  name: "Test User",
  email: "test@example.com",
  provider: "google",
  role: "user",
  avatarId: "test-avatar",
  profileURL: "https://example.com/avatar.jpg",
  isAnonymous: false,
  setupCompleted: true,
  createdAt: "2025-01-01T00:00:00.000Z",
  lastLoginAt: "2025-01-08T00:00:00.000Z",
  xp: 100,
  plan: "free",
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
      avatarId: "test-avatar",
      profileURL: "https://example.com/avatar.jpg",
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

describe("useLobbyManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock LobbyService.getInstance
    (LobbyService.getInstance as jest.Mock).mockReturnValue(mockLobbyService);

    // Mock useCurrentUser
    (useCurrentUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isLoading: false,
      isError: false,
    });

    // Default mock implementations
    mockLobbyService.subscribeToLobby.mockImplementation((code, callback) => {
      // Simulate successful subscription
      setTimeout(() => callback(mockLobbyData), 0);
      return jest.fn(); // unsubscribe function
    });
  });

  describe("Initial State", () => {
    it("should initialize with correct default state", () => {
      const { result } = renderHook(() => useLobbyManagement());

      expect(result.current.lobby).toBeNull();
      expect(result.current.players).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.connectionStatus).toBe("disconnected");
      expect(result.current.isHost).toBe(false);
      expect(result.current.canStartGame).toBe(false);
      expect(result.current.playerCount).toBe(0);
    });

    it("should set up subscription when lobbyCode is provided", async () => {
      renderHook(() => useLobbyManagement("ABC12"));

      await waitFor(() => {
        expect(mockLobbyService.subscribeToLobby).toHaveBeenCalledWith(
          "ABC12",
          expect.any(Function),
        );
      });
    });
  });

  describe("createLobby", () => {
    it("should create lobby successfully", async () => {
      mockLobbyService.createLobby.mockResolvedValue({
        success: true,
        data: { code: "ABC12", lobby: mockLobbyData },
      });

      const { result } = renderHook(() => useLobbyManagement());

      let lobbyCode: string;
      await act(async () => {
        lobbyCode = await result.current.createLobby();
      });

      expect(lobbyCode!).toBe("ABC12");
      expect(mockLobbyService.createLobby).toHaveBeenCalledWith({
        hostUid: "user123",
        hostDisplayName: "Test User",
        hostAvatarId: "test-avatar",
        hostProfileURL: "https://example.com/avatar.jpg",
        settings: undefined,
      });
      expect(result.current.lobby).toEqual(mockLobbyData);
    });

    it("should handle create lobby error", async () => {
      const error = new Error("Failed to create lobby") as LobbyError;
      error.type = "NETWORK_ERROR";
      error.userMessage = "Network error occurred";
      error.retryable = true;

      mockLobbyService.createLobby.mockRejectedValue(error);

      const { result } = renderHook(() => useLobbyManagement());

      await act(async () => {
        try {
          await result.current.createLobby();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Network error occurred");
      expect(result.current.isLoading).toBe(false);
    });

    it("should throw error when user is not authenticated", async () => {
      (useCurrentUser as jest.Mock).mockReturnValue({
        user: null,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useLobbyManagement());

      await act(async () => {
        await expect(result.current.createLobby()).rejects.toThrow(
          "User must be authenticated to create a lobby",
        );
      });
    });
  });

  describe("joinLobby", () => {
    it("should join lobby successfully", async () => {
      mockLobbyService.joinLobby.mockResolvedValue({
        success: true,
        data: mockLobbyData,
      });

      const { result } = renderHook(() => useLobbyManagement());

      await act(async () => {
        await result.current.joinLobby("ABC12");
      });

      expect(mockLobbyService.joinLobby).toHaveBeenCalledWith("ABC12", {
        uid: "user123",
        displayName: "Test User",
        avatarId: "test-avatar",
        profileURL: "https://example.com/avatar.jpg",
      });
      expect(result.current.lobby).toEqual(mockLobbyData);
    });

    it("should handle join lobby error", async () => {
      const error = new Error("Lobby not found") as LobbyError;
      error.type = "LOBBY_NOT_FOUND";
      error.userMessage = "Lobby not found. Please check the code.";
      error.retryable = false;

      mockLobbyService.joinLobby.mockRejectedValue(error);

      const { result } = renderHook(() => useLobbyManagement());

      await act(async () => {
        try {
          await result.current.joinLobby("INVALID");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(
        "Lobby not found. Please check the code.",
      );
    });
  });

  describe("leaveLobby", () => {
    it("should leave lobby successfully", async () => {
      mockLobbyService.leaveLobby.mockResolvedValue({
        success: true,
      });

      // First create a lobby to have something to leave
      mockLobbyService.createLobby.mockResolvedValue({
        success: true,
        data: { code: "ABC12", lobby: mockLobbyData },
      });

      const { result } = renderHook(() => useLobbyManagement());

      // Create lobby first
      await act(async () => {
        await result.current.createLobby();
      });

      // Then leave it
      await act(async () => {
        await result.current.leaveLobby();
      });

      expect(mockLobbyService.leaveLobby).toHaveBeenCalledWith(
        "ABC12",
        "user123",
      );

      // Wait for the state to update
      await waitFor(() => {
        expect(result.current.lobby).toBeNull();
        expect(result.current.connectionStatus).toBe("disconnected");
      });
    });

    it("should handle leave lobby when no lobby exists", async () => {
      const { result } = renderHook(() => useLobbyManagement());

      await act(async () => {
        await result.current.leaveLobby();
      });

      expect(mockLobbyService.leaveLobby).not.toHaveBeenCalled();
    });
  });

  describe("updateSettings", () => {
    it("should update settings successfully when user is host", async () => {
      mockLobbyService.updateLobbySettings.mockResolvedValue({
        success: true,
        data: mockLobbyData,
      });

      // First create a lobby to have something to update
      mockLobbyService.createLobby.mockResolvedValue({
        success: true,
        data: { code: "ABC12", lobby: mockLobbyData },
      });

      const { result } = renderHook(() => useLobbyManagement());

      // Create lobby first (user will be host)
      await act(async () => {
        await result.current.createLobby();
      });

      const newSettings = { rounds: 10, timeLimit: 90 };

      await act(async () => {
        await result.current.updateSettings(newSettings);
      });

      expect(mockLobbyService.updateLobbySettings).toHaveBeenCalledWith(
        "ABC12",
        newSettings,
        "user123",
      );
    });

    it("should throw error when user is not host", async () => {
      const nonHostLobby = {
        ...mockLobbyData,
        hostUid: "other-user",
      };

      const { result } = renderHook(() => useLobbyManagement());

      act(() => {
        result.current.lobby = nonHostLobby;
      });

      await act(async () => {
        await expect(
          result.current.updateSettings({ rounds: 10 }),
        ).rejects.toThrow("Only the host can update lobby settings");
      });
    });
  });

  describe("kickPlayer", () => {
    it("should kick player successfully when user is host", async () => {
      mockLobbyService.kickPlayer.mockResolvedValue({
        success: true,
        data: mockLobbyData,
      });

      // First create a lobby to have something to kick from
      mockLobbyService.createLobby.mockResolvedValue({
        success: true,
        data: { code: "ABC12", lobby: mockLobbyData },
      });

      const { result } = renderHook(() => useLobbyManagement());

      // Create lobby first (user will be host)
      await act(async () => {
        await result.current.createLobby();
      });

      await act(async () => {
        await result.current.kickPlayer("player456");
      });

      expect(mockLobbyService.kickPlayer).toHaveBeenCalledWith(
        "ABC12",
        "player456",
        "user123",
      );
    });

    it("should throw error when user is not host", async () => {
      const nonHostLobby = {
        ...mockLobbyData,
        hostUid: "other-user",
      };

      const { result } = renderHook(() => useLobbyManagement());

      act(() => {
        result.current.lobby = nonHostLobby;
      });

      await act(async () => {
        await expect(result.current.kickPlayer("player456")).rejects.toThrow(
          "Only the host can kick players",
        );
      });
    });
  });

  describe("Derived State", () => {
    it("should calculate isHost correctly", async () => {
      // First create a lobby to have proper state
      mockLobbyService.createLobby.mockResolvedValue({
        success: true,
        data: { code: "ABC12", lobby: mockLobbyData },
      });

      const { result } = renderHook(() => useLobbyManagement());

      // Create lobby first (user will be host)
      await act(async () => {
        await result.current.createLobby();
      });

      expect(result.current.isHost).toBe(true);
    });

    it("should calculate canStartGame correctly", async () => {
      const lobbyWithMultiplePlayers = {
        ...mockLobbyData,
        players: {
          user123: mockLobbyData.players.user123,
          user456: {
            ...mockLobbyData.players.user123,
            displayName: "Player 2",
            isHost: false,
          },
          user789: {
            ...mockLobbyData.players.user123,
            displayName: "Player 3",
            isHost: false,
          },
        },
      };

      // Mock subscription to return lobby with multiple players
      mockLobbyService.subscribeToLobby.mockImplementation((code, callback) => {
        setTimeout(() => callback(lobbyWithMultiplePlayers), 0);
        return jest.fn();
      });

      mockLobbyService.createLobby.mockResolvedValue({
        success: true,
        data: { code: "ABC12", lobby: lobbyWithMultiplePlayers },
      });

      const { result } = renderHook(() => useLobbyManagement());

      // Create lobby first
      await act(async () => {
        await result.current.createLobby();
      });

      expect(result.current.canStartGame).toBe(true);
      expect(result.current.playerCount).toBe(3);
    });

    it("should not allow game start with insufficient players", async () => {
      // First create a lobby to have proper state
      mockLobbyService.createLobby.mockResolvedValue({
        success: true,
        data: { code: "ABC12", lobby: mockLobbyData },
      });

      const { result } = renderHook(() => useLobbyManagement());

      // Create lobby first (only 1 player)
      await act(async () => {
        await result.current.createLobby();
      });

      expect(result.current.canStartGame).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should clear error state", async () => {
      // First create an error by failing to join a lobby
      const error = new Error("Lobby not found") as LobbyError;
      error.type = "LOBBY_NOT_FOUND";
      error.userMessage = "Lobby not found. Please check the code.";
      error.retryable = false;

      mockLobbyService.joinLobby.mockRejectedValue(error);

      const { result } = renderHook(() => useLobbyManagement());

      // Create an error
      await act(async () => {
        try {
          await result.current.joinLobby("INVALID");
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(
        "Lobby not found. Please check the code.",
      );

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it("should handle subscription errors", async () => {
      const subscriptionError = new Error("Connection failed");
      mockLobbyService.subscribeToLobby.mockImplementation(
        (code, callback, onError) => {
          setTimeout(() => onError?.(subscriptionError), 0);
          return jest.fn();
        },
      );

      renderHook(() => useLobbyManagement("ABC12"));

      await waitFor(() => {
        expect(mockLobbyService.subscribeToLobby).toHaveBeenCalled();
      });
    });
  });

  describe("Cleanup", () => {
    it("should cleanup subscriptions on unmount", () => {
      const unsubscribe = jest.fn();
      mockLobbyService.subscribeToLobby.mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useLobbyManagement("ABC12"));

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it("should cleanup timeouts on unmount", () => {
      jest.useFakeTimers();

      const { unmount } = renderHook(() => useLobbyManagement());

      unmount();

      jest.runAllTimers();
      jest.useRealTimers();
    });
  });

  describe("Player Status Updates", () => {
    it("should update player status periodically when connected", async () => {
      jest.useFakeTimers();

      // Mock the subscription to return lobby data
      mockLobbyService.subscribeToLobby.mockImplementation((code, callback) => {
        // Simulate successful subscription with connected status
        setTimeout(() => {
          callback(mockLobbyData);
        }, 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useLobbyManagement("ABC12"));

      // Wait for the subscription to be set up and lobby data to be received
      await waitFor(() => {
        expect(result.current.lobby).toEqual(mockLobbyData);
        expect(result.current.connectionStatus).toBe("connected");
      });

      // Fast-forward 30 seconds to trigger the status update
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockLobbyService.updatePlayerStatus).toHaveBeenCalledWith(
          "ABC12",
          "user123",
          "waiting",
        );
      });

      jest.useRealTimers();
    });

    it("should not update status when disconnected", () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useLobbyManagement());

      act(() => {
        result.current.lobby = mockLobbyData;
        result.current.connectionStatus = "disconnected";
      });

      jest.advanceTimersByTime(30000);

      expect(mockLobbyService.updatePlayerStatus).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
