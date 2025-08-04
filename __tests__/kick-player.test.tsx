import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KickPlayerButton } from "@/components/kick-player-button";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

// Mock dependencies
jest.mock("sonner");
jest.mock("@sentry/nextjs");
jest.mock("@/lib/services/lobby.service", () => ({
  kickPlayerService: jest.fn(),
  removeAIPlayerFromLobbyService: jest.fn(),
}));

const mockToast = toast as jest.Mocked<typeof toast>;
const mockSentry = Sentry as jest.Mocked<typeof Sentry>;

describe("KickPlayerButton", () => {
  const defaultProps = {
    lobbyCode: "ABC123",
    playerId: "player123",
    playerName: "Test Player",
    isHost: true,
    isCurrentUser: false,
    isAI: false,
    disabled: false,
    onKickSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not render when user is not host", () => {
    render(<KickPlayerButton {...defaultProps} isHost={false} />);
    expect(screen.queryByText("Kick")).not.toBeInTheDocument();
  });

  it("should not render when player is current user", () => {
    render(<KickPlayerButton {...defaultProps} isCurrentUser={true} />);
    expect(screen.queryByText("Kick")).not.toBeInTheDocument();
  });

  it("should render kick button for human players", () => {
    render(<KickPlayerButton {...defaultProps} />);
    expect(screen.getByText("Kick")).toBeInTheDocument();
  });

  it("should render remove button for AI players", () => {
    render(<KickPlayerButton {...defaultProps} isAI={true} />);
    expect(screen.getByText("Kick")).toBeInTheDocument(); // Button text stays "Kick" but dialog changes
  });

  it("should show confirmation dialog when clicked", () => {
    render(<KickPlayerButton {...defaultProps} />);

    fireEvent.click(screen.getByText("Kick"));

    expect(screen.getByText("Kick Player")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to kick/),
    ).toBeInTheDocument();
  });

  it("should show AI removal dialog for AI players", () => {
    render(<KickPlayerButton {...defaultProps} isAI={true} />);

    fireEvent.click(screen.getByText("Kick"));

    expect(screen.getByText("Remove AI Player")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to remove/),
    ).toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", () => {
    render(<KickPlayerButton {...defaultProps} disabled={true} />);
    expect(screen.getByText("Kick")).toBeDisabled();
  });
});
