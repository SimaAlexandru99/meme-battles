import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PrivateLobbySection } from "@/components/private-lobby-section";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const {
        variants,
        initial,
        animate,
        exit,
        whileHover,
        whileTap,
        ...rest
      } = props;
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: any) => {
      const {
        variants,
        initial,
        animate,
        exit,
        whileHover,
        whileTap,
        ...rest
      } = props;
      return <button {...rest}>{children}</button>;
    },
  },
}));

// Mock the child components
jest.mock("@/components/join-with-code-section", () => ({
  JoinWithCodeSection: ({ onJoinLobby, isLoading, error }: any) => (
    <div data-testid="join-section">
      <button onClick={() => onJoinLobby("TEST1")} disabled={isLoading}>
        Join Lobby
      </button>
      {error && <div data-testid="join-error">{error}</div>}
    </div>
  ),
}));

jest.mock("@/components/create-lobby-section", () => ({
  CreateLobbySection: ({ onCreateLobby, isLoading, createdCode }: any) => (
    <div data-testid="create-section">
      <button onClick={() => onCreateLobby()} disabled={isLoading}>
        Create Lobby
      </button>
      {createdCode && <div data-testid="created-code">{createdCode}</div>}
    </div>
  ),
}));

describe("PrivateLobbySection", () => {
  const mockProps = {
    onBackToMain: jest.fn(),
    onJoinLobby: jest.fn(),
    onCreateLobby: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the component with all sections", () => {
    render(<PrivateLobbySection {...mockProps} />);

    expect(screen.getByText("ÎNAPOI LA ÎNCEPUT")).toBeInTheDocument();
    expect(screen.getByTestId("join-section")).toBeInTheDocument();
    expect(screen.getByTestId("create-section")).toBeInTheDocument();
  });

  it("calls onBackToMain when back button is clicked", () => {
    render(<PrivateLobbySection {...mockProps} />);

    const backButton = screen.getByText("ÎNAPOI LA ÎNCEPUT");
    fireEvent.click(backButton);

    expect(mockProps.onBackToMain).toHaveBeenCalledTimes(1);
  });

  it("handles join lobby operation", async () => {
    mockProps.onJoinLobby.mockResolvedValue(undefined);

    render(<PrivateLobbySection {...mockProps} />);

    const joinButton = screen.getByText("Join Lobby");
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockProps.onJoinLobby).toHaveBeenCalledWith("TEST1");
    });
  });

  it("handles create lobby operation", async () => {
    mockProps.onCreateLobby.mockResolvedValue("ABCD1");

    render(<PrivateLobbySection {...mockProps} />);

    const createButton = screen.getByText("Create Lobby");
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockProps.onCreateLobby).toHaveBeenCalledTimes(1);
    });
  });

  it("displays global error when provided", () => {
    render(<PrivateLobbySection {...mockProps} error="Global error message" />);

    expect(screen.getAllByText("Global error message")).toHaveLength(2); // Global error and join section error
    expect(screen.getByText("Eroare")).toBeInTheDocument();
  });

  it("displays loading overlay when isLoading is true", () => {
    render(<PrivateLobbySection {...mockProps} isLoading={true} />);

    expect(screen.getByText("Se procesează...")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("displays created lobby code when provided", () => {
    render(<PrivateLobbySection {...mockProps} createdLobbyCode="ABCD1" />);

    expect(screen.getByTestId("created-code")).toHaveTextContent("ABCD1");
  });

  it("disables back button when operations are in progress", () => {
    render(<PrivateLobbySection {...mockProps} isLoading={true} />);

    const backButton = screen.getByLabelText("Back to main menu");
    expect(backButton).toBeDisabled();
  });

  it("supports keyboard navigation for back button", () => {
    render(<PrivateLobbySection {...mockProps} />);

    const backButton = screen.getByText("ÎNAPOI LA ÎNCEPUT");

    // Test Enter key
    fireEvent.keyDown(backButton, { key: "Enter" });
    expect(mockProps.onBackToMain).toHaveBeenCalledTimes(1);

    // Test Space key
    fireEvent.keyDown(backButton, { key: " " });
    expect(mockProps.onBackToMain).toHaveBeenCalledTimes(2);
  });

  it("renders helper text", () => {
    render(<PrivateLobbySection {...mockProps} />);

    expect(
      screen.getByText(/Alege să te alături unui lobby existent/)
    ).toBeInTheDocument();
  });

  it("has proper responsive layout classes", () => {
    const { container } = render(<PrivateLobbySection {...mockProps} />);

    const mainContainer = container.querySelector(".grid");
    expect(mainContainer).toHaveClass("grid-cols-1", "lg:grid-cols-2");
  });
});
