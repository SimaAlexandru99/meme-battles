import { updateLobbySettingsService } from "@/lib/services/lobby.service";
import { updateLobbySettings } from "@/lib/actions";

// Mock the server action
jest.mock("@/lib/actions", () => ({
  updateLobbySettings: jest.fn(),
}));

// Mock Sentry
jest.mock("@sentry/nextjs", () => ({
  startSpan: jest.fn((config, callback) => callback()),
  captureException: jest.fn(),
}));

const mockUpdateLobbySettings = updateLobbySettings as jest.MockedFunction<
  typeof updateLobbySettings
>;

describe("Game Settings Save Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully save lobby settings", async () => {
    const mockLobby = {
      code: "ABC12",
      hostUid: "user123",
      hostDisplayName: "Test Host",
      status: "waiting" as const,
      maxPlayers: 8,
      players: [],
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-01-01T00:00:00.000Z",
      settings: {
        rounds: 5,
        timeLimit: 120,
        categories: ["funny", "dark"],
      },
    };

    mockUpdateLobbySettings.mockResolvedValue({
      success: true,
      lobby: mockLobby,
      message: "Settings updated successfully",
    });

    const settings = {
      rounds: 5,
      timeLimit: 120,
      categories: ["funny", "dark"],
    };

    const result = await updateLobbySettingsService("ABC12", settings);

    expect(mockUpdateLobbySettings).toHaveBeenCalledWith("ABC12", settings);
    expect(result.success).toBe(true);
    expect(result.lobby.settings).toEqual(settings);
    expect(result.message).toBe("Settings updated successfully");
  });

  it("should handle save errors gracefully", async () => {
    const error = new Error("Failed to update settings");
    mockUpdateLobbySettings.mockRejectedValue(error);

    const settings = {
      rounds: 5,
      timeLimit: 120,
      categories: ["funny", "dark"],
    };

    await expect(updateLobbySettingsService("ABC12", settings)).rejects.toThrow(
      "Failed to update settings",
    );

    expect(mockUpdateLobbySettings).toHaveBeenCalledWith("ABC12", settings);
  });

  it("should validate settings before saving", async () => {
    const invalidSettings = {
      rounds: 15, // Invalid: max is 10
      timeLimit: 120,
      categories: ["funny"],
    };

    const error = new Error("Rounds must be between 1 and 10");
    mockUpdateLobbySettings.mockRejectedValue(error);

    await expect(
      updateLobbySettingsService("ABC12", invalidSettings),
    ).rejects.toThrow("Rounds must be between 1 and 10");
  });

  it("should handle network errors during save", async () => {
    const networkError = new Error("Network error");
    mockUpdateLobbySettings.mockRejectedValue(networkError);

    const settings = {
      rounds: 3,
      timeLimit: 60,
      categories: ["funny", "random"],
    };

    await expect(updateLobbySettingsService("ABC12", settings)).rejects.toThrow(
      "Network error",
    );
  });
});
