import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrivateLobbySection } from "@/components/private-lobby-section";

// Mock the components
jest.mock("@/components/join-with-code-section", () => ({
  JoinWithCodeSection: ({
    onJoinLobby,
    isLoading,
    error,
  }: {
    onJoinLobby: (code: string) => Promise<void>;
    isLoading: boolean;
    error?: string | null;
  }) => (
    <div data-testid="join-section">
      <button onClick={() => onJoinLobby("TEST123")}>Join</button>
      {isLoading && <span>Joining...</span>}
      {error && <span>{error}</span>}
    </div>
  ),
}));

jest.mock("@/components/create-lobby-section", () => ({
  CreateLobbySection: ({
    onCreateLobby,
    isLoading,
    createdCode,
  }: {
    onCreateLobby: () => Promise<string>;
    isLoading: boolean;
    createdCode?: string | null;
  }) => (
    <div data-testid="create-section">
      <button onClick={() => onCreateLobby()}>Create</button>
      {isLoading && <span>Creating...</span>}
      {createdCode && <span>{createdCode}</span>}
    </div>
  ),
}));

describe("PrivateLobbySection", () => {
  const mockProps = {
    onBackToMain: jest.fn(),
    onJoinLobby: jest.fn(),
    onCreateLobby: jest.fn(),
    isLoading: false,
    isJoining: false,
    isCreating: false,
    joinError: null,
    createError: null,
    createdCode: null,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the component with all sections", () => {
    render(<PrivateLobbySection {...mockProps} />);

    expect(screen.getByText("BACK TO START")).toBeInTheDocument();
    expect(screen.getByTestId("join-section")).toBeInTheDocument();
    expect(screen.getByTestId("create-section")).toBeInTheDocument();
  });

  it("calls onBackToMain when back button is clicked", () => {
    render(<PrivateLobbySection {...mockProps} />);

    const backButton = screen.getByText("BACK TO START");
    fireEvent.click(backButton);

    expect(mockProps.onBackToMain).toHaveBeenCalledTimes(1);
  });

  it("displays global error when provided", () => {
    render(<PrivateLobbySection {...mockProps} error="Global error message" />);

    expect(screen.getAllByText("Global error message")).toHaveLength(2); // Global error and join section error
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("displays loading overlay when isLoading is true", () => {
    render(<PrivateLobbySection {...mockProps} isLoading={true} />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("renders helper text", () => {
    render(<PrivateLobbySection {...mockProps} />);

    expect(
      screen.getByText(
        /Choose to join an existing lobby with an invitation code/,
      ),
    ).toBeInTheDocument();
  });
});
