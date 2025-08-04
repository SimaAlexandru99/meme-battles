import { render, screen, fireEvent } from "@testing-library/react";
import { SituationDisplay } from "@/components/situation-display";
import { SituationService } from "@/lib/services/situation-service";

// Mock the SituationService
jest.mock("@/lib/services/situation-service");

const mockSituationService = SituationService as jest.Mocked<
  typeof SituationService
>;

describe("SituationDisplay", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state correctly", () => {
    render(
      <SituationDisplay situation="" isLoading={true} onRetry={jest.fn()} />,
    );

    expect(screen.getByText("Generating situation...")).toBeInTheDocument();
    // Check for the loading spinner (SVG icon)
    expect(
      screen.getByText((content, element) => {
        return (
          element?.tagName.toLowerCase() === "svg" &&
          element?.classList.contains("animate-spin")
        );
      }),
    ).toBeInTheDocument();
  });

  it("renders situation correctly", () => {
    const testSituation =
      "When you realize you've been pronouncing a word wrong your entire life";

    render(
      <SituationDisplay
        situation={testSituation}
        isLoading={false}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText(testSituation)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new situation/i }),
    ).toBeInTheDocument();
  });

  it("renders error state correctly", () => {
    const mockRetry = jest.fn();
    const errorMessage = "Network connection failed";

    render(
      <SituationDisplay
        situation=""
        isLoading={false}
        error={errorMessage}
        onRetry={mockRetry}
      />,
    );

    // Check for the error message - there is one element with the hardcoded text
    expect(
      screen.getByText("Failed to generate situation"),
    ).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it("shows retry count in loading state", () => {
    render(
      <SituationDisplay
        situation=""
        isLoading={true}
        retryCount={2}
        onRetry={jest.fn()}
      />,
    );

    expect(
      screen.getByText("Generating situation... (Attempt 3)"),
    ).toBeInTheDocument();
  });

  it("calls onRetry when new situation button is clicked", () => {
    const mockRetry = jest.fn();
    const testSituation = "Test situation";

    render(
      <SituationDisplay
        situation={testSituation}
        isLoading={false}
        onRetry={mockRetry}
      />,
    );

    const newSituationButton = screen.getByRole("button", {
      name: /new situation/i,
    });
    fireEvent.click(newSituationButton);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});

describe("SituationService", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();

    // Mock the static methods
    mockSituationService.generateSituation = jest.fn();
    mockSituationService.generateMultipleSituations = jest.fn();
    mockSituationService.validateSituation = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("generates situation successfully", async () => {
    const mockSituation =
      "When your phone battery dies at the worst possible moment";

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ situation: mockSituation }),
    });

    mockSituationService.generateSituation.mockResolvedValue(mockSituation);

    const result = await mockSituationService.generateSituation();
    expect(result).toBe(mockSituation);
  });

  it("handles API errors correctly", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    mockSituationService.generateSituation.mockRejectedValue(
      new Error("HTTP error! status: 500"),
    );

    await expect(mockSituationService.generateSituation()).rejects.toThrow(
      "HTTP error! status: 500",
    );
  });

  it("handles response errors correctly", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: "AI service unavailable" }),
    });

    mockSituationService.generateSituation.mockRejectedValue(
      new Error("AI service unavailable"),
    );

    await expect(mockSituationService.generateSituation()).rejects.toThrow(
      "AI service unavailable",
    );
  });

  it("validates situations correctly", () => {
    mockSituationService.validateSituation
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    expect(
      mockSituationService.validateSituation(
        "When you realize you've been doing it wrong",
      ),
    ).toBe(true);
    expect(mockSituationService.validateSituation("")).toBe(false);
    expect(mockSituationService.validateSituation("Too short")).toBe(false);
    expect(
      mockSituationService.validateSituation(
        "I'm sorry, I cannot generate that",
      ),
    ).toBe(false);
  });

  it("generates multiple situations", async () => {
    const mockSituations = ["Situation 1", "Situation 2", "Situation 3"];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ situation: mockSituations[0] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ situation: mockSituations[1] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ situation: mockSituations[2] }),
      });

    mockSituationService.generateMultipleSituations.mockResolvedValue(
      mockSituations,
    );

    const results = await mockSituationService.generateMultipleSituations(3);
    expect(results).toEqual(mockSituations);
  });
});
