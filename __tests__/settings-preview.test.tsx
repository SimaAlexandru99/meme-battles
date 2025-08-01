import React from "react";
import { render, screen } from "@testing-library/react";
import { SettingsPreview } from "@/components/game-settings/settings-preview";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("SettingsPreview", () => {
  const originalSettings: LobbySettings = {
    rounds: 3,
    timeLimit: 60,
    categories: ["funny", "random"],
  };

  const modifiedSettings: LobbySettings = {
    rounds: 5,
    timeLimit: 120,
    categories: ["funny", "dark", "trending"],
  };

  it("renders without crashing", () => {
    render(
      <SettingsPreview
        settings={originalSettings}
        originalSettings={originalSettings}
      />,
    );

    expect(screen.getByText("Settings Preview")).toBeInTheDocument();
  });

  it("shows no changes when settings are identical", () => {
    render(
      <SettingsPreview
        settings={originalSettings}
        originalSettings={originalSettings}
      />,
    );

    expect(screen.queryByText("Modified")).not.toBeInTheDocument();
    expect(screen.queryByText("Changed")).not.toBeInTheDocument();
  });

  it("shows modified badge when settings have changed", () => {
    render(
      <SettingsPreview
        settings={modifiedSettings}
        originalSettings={originalSettings}
      />,
    );

    expect(screen.getByText("Modified")).toBeInTheDocument();
  });

  it("displays rounds correctly", () => {
    render(
      <SettingsPreview
        settings={originalSettings}
        originalSettings={originalSettings}
      />,
    );

    expect(screen.getByText("Rounds")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("displays time limit correctly", () => {
    render(
      <SettingsPreview
        settings={originalSettings}
        originalSettings={originalSettings}
      />,
    );

    expect(screen.getByText("Time Limit")).toBeInTheDocument();
    expect(screen.getByText("1m")).toBeInTheDocument();
  });

  it("displays categories correctly", () => {
    render(
      <SettingsPreview
        settings={originalSettings}
        originalSettings={originalSettings}
      />,
    );

    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("😂 Funny")).toBeInTheDocument();
    expect(screen.getByText("🎲 Random")).toBeInTheDocument();
  });

  it("shows changed indicators for modified settings", () => {
    render(
      <SettingsPreview
        settings={modifiedSettings}
        originalSettings={originalSettings}
      />,
    );

    // Should show "Changed" badges for each modified setting
    const changedBadges = screen.getAllByText("Changed");
    expect(changedBadges).toHaveLength(3); // rounds, timeLimit, categories
  });

  it("displays estimated duration", () => {
    render(
      <SettingsPreview
        settings={originalSettings}
        originalSettings={originalSettings}
      />,
    );

    expect(screen.getByText("Estimated Duration")).toBeInTheDocument();
    expect(screen.getByText("~3 minutes")).toBeInTheDocument();
  });

  it("formats time limits correctly", () => {
    const settingsWithShortTime: LobbySettings = {
      rounds: 3,
      timeLimit: 45,
      categories: ["funny"],
    };

    render(
      <SettingsPreview
        settings={settingsWithShortTime}
        originalSettings={settingsWithShortTime}
      />,
    );

    expect(screen.getByText("45s")).toBeInTheDocument();
  });

  it("formats time limits with minutes and seconds", () => {
    const settingsWithLongTime: LobbySettings = {
      rounds: 3,
      timeLimit: 90,
      categories: ["funny"],
    };

    render(
      <SettingsPreview
        settings={settingsWithLongTime}
        originalSettings={settingsWithLongTime}
      />,
    );

    expect(screen.getByText("1m 30s")).toBeInTheDocument();
  });

  it("shows before and after values for changed settings", () => {
    render(
      <SettingsPreview
        settings={modifiedSettings}
        originalSettings={originalSettings}
      />,
    );

    // Should show original values (crossed out) and new values
    expect(screen.getByText("3")).toBeInTheDocument(); // original rounds
    expect(screen.getByText("5")).toBeInTheDocument(); // new rounds
    expect(screen.getByText("1m")).toBeInTheDocument(); // original time limit
    expect(screen.getByText("2m")).toBeInTheDocument(); // new time limit
  });
});
