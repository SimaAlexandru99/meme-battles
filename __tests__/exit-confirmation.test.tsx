import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GameLobby } from "@/components/game-lobby";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@sentry/nextjs", () => ({
  startSpan: jest.fn((config, callback) => callback()),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

jest.mock("@/hooks/useLobbyData", () => ({
  useLobbyData: jest.fn(),
}));

jest.mock("@/hooks/useReconnection", () => ({
  useReconnection: jest.fn(),
}));

jest.mock("@/lib/actions", () => ({
  startGame: jest.fn(),
  leaveLobby: jest.fn(),
}));

describe("GameLobby Exit Confirmation", () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockCurrentUser = {
    id: "user123",
    name: "Test User",
    email: "test@example.com",
    provider: "email",
    role: "user",
    createdAt: "2024-01-01T00:00:00.000Z",
    lastLoginAt: "2024-01-01T00:00:00.000Z",
    xp: 0,
    plan: "free" as const,
  };

  const mockLobbyData = {
    code: "ABC12",
    hostUid: "user123",
    hostDisplayName: "Test User",
    status: "waiting" as const,
    maxPlayers: 8,
    players: [
      {
        uid: "user123",
        displayName: "Test User",
        profileURL: null,
        joinedAt: "2024-01-01T00:00:00.000Z",
        isHost: true,
      },
    ],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    settings: {
      rounds: 5,
      timeLimit: 60,
      categories: ["funny", "wholesome"],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("should show exit confirmation dialog when back button is clicked", async () => {
    const { useLobbyData } = require("@/hooks/useLobbyData");
    const { useReconnection } = require("@/hooks/useReconnection");

    useLobbyData.mockReturnValue({
      lobbyData: mockLobbyData,
      error: null,
      isLoading: false,
      isValidating: false,
      refresh: jest.fn(),
      isHost: jest.fn(() => true),
    });

    useReconnection.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      connectionError: null,
      handleConnectionLoss: jest.fn(),
      triggerReconnection: jest.fn(),
      resetConnectionState: jest.fn(),
      canReconnect: true,
      reconnectProgress: 0,
    });

    render(<GameLobby lobbyCode="ABC12" currentUser={mockCurrentUser} />);

    // Find and click the back button
    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    // Check if the confirmation dialog appears
    await waitFor(() => {
      expect(
        screen.getByText("Are you sure you want to leave the lobby?")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "You are currently in a game lobby. Leaving now will abandon the game and remove you from the lobby."
      )
    ).toBeInTheDocument();
  });

  it("should call leaveLobby when user confirms leaving", async () => {
    const { useLobbyData } = require("@/hooks/useLobbyData");
    const { useReconnection } = require("@/hooks/useReconnection");
    const { leaveLobby } = require("@/lib/actions");

    useLobbyData.mockReturnValue({
      lobbyData: mockLobbyData,
      error: null,
      isLoading: false,
      isValidating: false,
      refresh: jest.fn(),
      isHost: jest.fn(() => true),
    });

    useReconnection.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      connectionError: null,
      handleConnectionLoss: jest.fn(),
      triggerReconnection: jest.fn(),
      resetConnectionState: jest.fn(),
      canReconnect: true,
      reconnectProgress: 0,
    });

    (leaveLobby as jest.Mock).mockResolvedValue({ success: true });

    render(<GameLobby lobbyCode="ABC12" currentUser={mockCurrentUser} />);

    // Click back button to show dialog
    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    // Wait for dialog to appear and click leave
    await waitFor(() => {
      const leaveButton = screen.getByRole("button", { name: /leave lobby/i });
      fireEvent.click(leaveButton);
    });

    // Verify leaveLobby was called
    await waitFor(() => {
      expect(leaveLobby).toHaveBeenCalledWith("ABC12");
    });

    // Verify success toast was shown
    expect(toast.success).toHaveBeenCalledWith("Successfully left the lobby");

    // Verify navigation occurred
    expect(mockRouter.push).toHaveBeenCalledWith("/");
  });

  it("should handle leaveLobby errors gracefully", async () => {
    const { useLobbyData } = require("@/hooks/useLobbyData");
    const { useReconnection } = require("@/hooks/useReconnection");
    const { leaveLobby } = require("@/lib/actions");

    useLobbyData.mockReturnValue({
      lobbyData: mockLobbyData,
      error: null,
      isLoading: false,
      isValidating: false,
      refresh: jest.fn(),
      isHost: jest.fn(() => true),
    });

    useReconnection.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      connectionError: null,
      handleConnectionLoss: jest.fn(),
      triggerReconnection: jest.fn(),
      resetConnectionState: jest.fn(),
      canReconnect: true,
      reconnectProgress: 0,
    });

    (leaveLobby as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<GameLobby lobbyCode="ABC12" currentUser={mockCurrentUser} />);

    // Click back button to show dialog
    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    // Wait for dialog to appear and click leave
    await waitFor(() => {
      const leaveButton = screen.getByRole("button", { name: /leave lobby/i });
      fireEvent.click(leaveButton);
    });

    // Verify error was handled
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network error");
    });

    // Verify Sentry exception was captured
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("should close dialog when cancel is clicked", async () => {
    const { useLobbyData } = require("@/hooks/useLobbyData");
    const { useReconnection } = require("@/hooks/useReconnection");

    useLobbyData.mockReturnValue({
      lobbyData: mockLobbyData,
      error: null,
      isLoading: false,
      isValidating: false,
      refresh: jest.fn(),
      isHost: jest.fn(() => true),
    });

    useReconnection.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      connectionError: null,
      handleConnectionLoss: jest.fn(),
      triggerReconnection: jest.fn(),
      resetConnectionState: jest.fn(),
      canReconnect: true,
      reconnectProgress: 0,
    });

    render(<GameLobby lobbyCode="ABC12" currentUser={mockCurrentUser} />);

    // Click back button to show dialog
    const backButton = screen.getByRole("button", { name: /back/i });
    fireEvent.click(backButton);

    // Wait for dialog to appear and click cancel
    await waitFor(() => {
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButton);
    });

    // Verify dialog is closed
    await waitFor(() => {
      expect(
        screen.queryByText("Are you sure you want to leave the lobby?")
      ).not.toBeInTheDocument();
    });
  });
});
