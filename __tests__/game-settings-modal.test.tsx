import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GameSettingsModal } from "@/components/game-settings/GameSettingsModal";
import {
  GameSettingsFormData,
  GameSettingsValidationErrors,
} from "@/components/game-settings/types";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock the form components
jest.mock("@/components/game-settings/RoundsSelector", () => ({
  RoundsSelector: ({
    value,
    onChange,
    error,
    disabled,
  }: {
    value: number;
    onChange: (value: number) => void;
    error?: string;
    disabled?: boolean;
  }) => (
    <div data-testid="rounds-selector">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        data-testid="rounds-input"
        disabled={disabled}
      />
      {error && <span data-testid="rounds-error">{error}</span>}
    </div>
  ),
}));

jest.mock("@/components/game-settings/TimeLimitSlider", () => ({
  TimeLimitSlider: ({
    value,
    onChange,
    error,
    disabled,
  }: {
    value: number;
    onChange: (value: number) => void;
    error?: string;
    disabled?: boolean;
  }) => (
    <div data-testid="time-limit-slider">
      <input
        type="range"
        min="30"
        max="300"
        step="15"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        data-testid="time-limit-input"
        disabled={disabled}
      />
      {error && <span data-testid="time-limit-error">{error}</span>}
    </div>
  ),
}));

jest.mock("@/components/game-settings/CategoriesSelector", () => ({
  CategoriesSelector: ({
    value,
    onChange,
    error,
    disabled,
  }: {
    value: string[];
    onChange: (value: string[]) => void;
    error?: string;
    disabled?: boolean;
  }) => (
    <div data-testid="categories-selector">
      {["funny", "wholesome", "dark", "random", "trending"].map((category) => (
        <label key={category}>
          <input
            type="checkbox"
            checked={value.includes(category)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...value, category]);
              } else {
                onChange(value.filter((c: string) => c !== category));
              }
            }}
            data-testid={`category-${category}`}
            disabled={disabled}
          />
          {category}
        </label>
      ))}
      {error && <span data-testid="categories-error">{error}</span>}
    </div>
  ),
}));

jest.mock("@/components/game-settings/FormErrorDisplay", () => ({
  FormErrorDisplay: ({
    errors,
    onDismiss,
  }: {
    errors: GameSettingsValidationErrors;
    onDismiss?: () => void;
  }) => (
    <div data-testid="form-errors">
      {Object.entries(errors).map(([key, error]) => (
        <div key={key} data-testid={`error-${key}`}>
          {error as string}
        </div>
      ))}
      {onDismiss && (
        <button onClick={onDismiss} data-testid="dismiss-errors">
          Dismiss
        </button>
      )}
    </div>
  ),
}));

const mockCurrentSettings: GameSettingsFormData = {
  rounds: 3,
  timeLimit: 60,
  categories: ["funny", "random"],
};

const mockOnSave = jest.fn();
const mockOnClose = jest.fn();

describe("GameSettingsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal when open", () => {
    render(
      <GameSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
      />,
    );

    expect(screen.getByText("Game Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Customize your game experience"),
    ).toBeInTheDocument();
  });

  it("does not render modal when closed", () => {
    render(
      <GameSettingsModal
        isOpen={false}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
      />,
    );

    expect(screen.queryByText("Game Settings")).not.toBeInTheDocument();
  });

  it("renders form components with current settings", () => {
    render(
      <GameSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
      />,
    );

    expect(screen.getByTestId("rounds-selector")).toBeInTheDocument();
    expect(screen.getByTestId("time-limit-slider")).toBeInTheDocument();
    expect(screen.getByTestId("categories-selector")).toBeInTheDocument();

    // Check initial values - input values are numbers, not strings
    expect(screen.getByTestId("rounds-input")).toHaveValue(3);
    expect(screen.getByTestId("time-limit-input")).toHaveValue("60");
    expect(screen.getByTestId("category-funny")).toBeChecked();
    expect(screen.getByTestId("category-random")).toBeChecked();
    expect(screen.getByTestId("category-wholesome")).not.toBeChecked();
  });

  it("shows unsaved changes indicator when form is dirty", async () => {
    render(
      <GameSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
      />,
    );

    // Change rounds value
    const roundsInput = screen.getByTestId("rounds-input");
    fireEvent.change(roundsInput, { target: { value: "5" } });

    await waitFor(() => {
      expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    });
  });

  it("enables save button when form is valid and dirty", async () => {
    render(
      <GameSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
      />,
    );

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).toBeDisabled();

    // Change rounds value
    const roundsInput = screen.getByTestId("rounds-input");
    fireEvent.change(roundsInput, { target: { value: "5" } });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
  });

  it("calls onSave with updated settings when save button is clicked", async () => {
    render(
      <GameSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
      />,
    );

    // Change settings
    const roundsInput = screen.getByTestId("rounds-input");
    fireEvent.change(roundsInput, { target: { value: "5" } });

    const timeLimitInput = screen.getByTestId("time-limit-input");
    fireEvent.change(timeLimitInput, { target: { value: "120" } });

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).toBeEnabled();
    });

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        rounds: 5,
        timeLimit: 120,
        categories: ["funny", "random"],
      });
    });
  });

  it("shows unsaved changes dialog when closing with unsaved changes", async () => {
    render(
      <GameSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
      />,
    );

    // Make changes
    const roundsInput = screen.getByTestId("rounds-input");
    fireEvent.change(roundsInput, { target: { value: "5" } });

    await waitFor(() => {
      expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    });

    // Try to close
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
      expect(
        screen.getByText(
          "You have unsaved changes to your game settings. What would you like to do?",
        ),
      ).toBeInTheDocument();
    });
  });

  it("discards changes when discard button is clicked in unsaved changes dialog", async () => {
    render(
      <GameSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
      />,
    );

    // Make changes
    const roundsInput = screen.getByTestId("rounds-input");
    fireEvent.change(roundsInput, { target: { value: "5" } });

    // Try to close
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
    });

    // Click discard
    const discardButton = screen.getByRole("button", {
      name: /discard changes/i,
    });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("displays error messages", () => {
    render(
      <GameSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
        error="Network error occurred"
      />,
    );

    // The error is displayed directly in the modal, not using FormErrorDisplay
    expect(screen.getByText("Network error occurred")).toBeInTheDocument();
  });

  it("shows loading state when submitting", () => {
    render(
      <GameSettingsModal
        isOpen={true}
        onClose={mockOnClose}
        currentSettings={mockCurrentSettings}
        onSave={mockOnSave}
        isLoading={true}
      />,
    );

    // Form components should be disabled when loading
    expect(screen.getByTestId("rounds-input")).toBeDisabled();
    expect(screen.getByTestId("time-limit-input")).toBeDisabled();
  });
});
