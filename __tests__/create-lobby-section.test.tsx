import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateLobbySection } from "@/components/create-lobby-section";

describe("CreateLobbySection", () => {
  const mockOnCreateLobby = jest.fn();

  beforeEach(() => {
    mockOnCreateLobby.mockClear();
  });

  it("renders correctly with all required elements", () => {
    render(
      <CreateLobbySection onCreateLobby={mockOnCreateLobby} isLoading={false} />
    );

    // Check for Romanian text
    expect(screen.getByText("Creează un lobby privat")).toBeInTheDocument();
    expect(
      screen.getByText("Creează un lobby și invită-ți prietenii")
    ).toBeInTheDocument();
    expect(screen.getByText("CREEAZĂ LOBBY-UL MEU")).toBeInTheDocument();

    // Check for helper text
    expect(
      screen.getByText(
        "Vei primi un cod de invitație pe care îl poți trimite prietenilor"
      )
    ).toBeInTheDocument();

    // Check for visual elements (by checking for specific classes or structure)
    const button = screen.getByRole("button", {
      name: /creează lobby-ul meu/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("calls onCreateLobby when button is clicked", async () => {
    mockOnCreateLobby.mockResolvedValue("ABC12");

    render(
      <CreateLobbySection onCreateLobby={mockOnCreateLobby} isLoading={false} />
    );

    const button = screen.getByRole("button", {
      name: /creează lobby-ul meu/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnCreateLobby).toHaveBeenCalledTimes(1);
    });
  });

  it("shows loading state when isLoading is true", () => {
    render(
      <CreateLobbySection onCreateLobby={mockOnCreateLobby} isLoading={true} />
    );

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(screen.getByText("Se creează...")).toBeInTheDocument();
  });

  it("shows loading state during creation", async () => {
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnCreateLobby.mockReturnValue(promise);

    render(
      <CreateLobbySection onCreateLobby={mockOnCreateLobby} isLoading={false} />
    );

    const button = screen.getByRole("button", {
      name: /creează lobby-ul meu/i,
    });
    fireEvent.click(button);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText("Se creează...")).toBeInTheDocument();
    });

    // Button should be disabled during loading
    expect(button).toBeDisabled();

    // Resolve the promise
    resolvePromise!("ABC12");

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText("Se creează...")).not.toBeInTheDocument();
    });
  });

  it("displays created code when provided", () => {
    render(
      <CreateLobbySection
        onCreateLobby={mockOnCreateLobby}
        isLoading={false}
        createdCode="ABC12"
      />
    );

    expect(screen.getByText("Codul tău de invitație:")).toBeInTheDocument();
    expect(screen.getByText("ABC12")).toBeInTheDocument();
    expect(
      screen.getByText("Trimite acest cod prietenilor tăi!")
    ).toBeInTheDocument();
  });

  it("handles errors gracefully", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockOnCreateLobby.mockRejectedValue(new Error("Network error"));

    render(
      <CreateLobbySection onCreateLobby={mockOnCreateLobby} isLoading={false} />
    );

    const button = screen.getByRole("button", {
      name: /creează lobby-ul meu/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to create lobby:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("prevents multiple simultaneous creation attempts", async () => {
    let resolvePromise: (value: string) => void;
    const promise = new Promise<string>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnCreateLobby.mockReturnValue(promise);

    render(
      <CreateLobbySection onCreateLobby={mockOnCreateLobby} isLoading={false} />
    );

    const button = screen.getByRole("button", {
      name: /creează lobby-ul meu/i,
    });

    // Click multiple times rapidly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should only call once
    expect(mockOnCreateLobby).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolvePromise!("ABC12");

    await waitFor(() => {
      expect(screen.queryByText("Se creează...")).not.toBeInTheDocument();
    });
  });

  it("applies custom className", () => {
    const { container } = render(
      <CreateLobbySection
        onCreateLobby={mockOnCreateLobby}
        isLoading={false}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });
});
