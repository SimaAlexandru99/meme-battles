import { renderHook, act } from "@testing-library/react";
import { useGameSettingsForm } from "@/hooks/useGameSettingsForm";
import { DEFAULT_GAME_SETTINGS } from "@/components/game-settings/types";

describe("useGameSettingsForm", () => {
  it("should initialize with default settings", () => {
    const { result } = renderHook(() => useGameSettingsForm());

    expect(result.current.settings).toEqual(DEFAULT_GAME_SETTINGS);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isValid).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it("should update settings and mark as dirty", () => {
    const { result } = renderHook(() => useGameSettingsForm());

    act(() => {
      result.current.updateSetting("rounds", 5);
    });

    expect(result.current.settings.rounds).toBe(5);
    expect(result.current.isDirty).toBe(true);
  });

  it("should validate settings and show errors", async () => {
    const { result } = renderHook(() => useGameSettingsForm());

    act(() => {
      result.current.updateSetting("rounds", 15); // Invalid: max is 10
    });

    // Wait for debounced validation
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors.rounds).toBeDefined();
  });

  it("should reset form to original state", () => {
    const { result } = renderHook(() => useGameSettingsForm());

    act(() => {
      result.current.updateSetting("rounds", 5);
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.settings).toEqual(DEFAULT_GAME_SETTINGS);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.errors).toEqual({});
  });

  it("should handle form submission", async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useGameSettingsForm({ onSubmit: mockOnSubmit }),
    );

    act(() => {
      result.current.updateSetting("rounds", 5);
    });

    await act(async () => {
      await result.current.submitForm();
    });

    expect(mockOnSubmit).toHaveBeenCalledWith({
      ...DEFAULT_GAME_SETTINGS,
      rounds: 5,
    });
  });

  it("should handle submission errors", async () => {
    const mockOnSubmit = jest
      .fn()
      .mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() =>
      useGameSettingsForm({ onSubmit: mockOnSubmit }),
    );

    await act(async () => {
      await result.current.submitForm();
    });

    expect(result.current.isSubmitting).toBe(false);
    // Error handling is implemented but specific error mapping would depend on the actual error structure
  });

  it("should clear field errors when updating settings", () => {
    const { result } = renderHook(() => useGameSettingsForm());

    // Set an invalid value to trigger error
    act(() => {
      result.current.updateSetting("rounds", 15);
    });

    // Manually validate to set error
    act(() => {
      result.current.validateForm();
    });

    expect(result.current.errors.rounds).toBeDefined();

    // Update to valid value should clear error
    act(() => {
      result.current.updateSetting("rounds", 5);
    });

    expect(result.current.errors.rounds).toBeUndefined();
  });
});
