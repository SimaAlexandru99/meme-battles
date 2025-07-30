import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { InvitationCodeInput } from "@/components/invitation-code-input";

// Mock the input-otp library to avoid JSDOM issues
jest.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({ children, onChange, value, onPaste, ...props }: any) => (
    <div data-testid="input-otp" {...props}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onPaste={onPaste}
        data-testid="otp-input"
      />
      {children}
    </div>
  ),
  InputOTPGroup: ({ children, ...props }: any) => (
    <div data-testid="input-otp-group" {...props}>
      {children}
    </div>
  ),
  InputOTPSlot: ({ index, ...props }: any) => (
    <div data-testid={`input-otp-slot-${index}`} {...props}>
      Slot {index}
    </div>
  ),
}));

describe("InvitationCodeInput", () => {
  const mockOnChange = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnComplete.mockClear();
  });

  it("renders the component", () => {
    render(
      <InvitationCodeInput
        value=""
        onChange={mockOnChange}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByTestId("input-otp")).toBeInTheDocument();
    expect(screen.getByTestId("input-otp-group")).toBeInTheDocument();
  });

  it("displays helper text", () => {
    render(
      <InvitationCodeInput
        value=""
        onChange={mockOnChange}
        onComplete={mockOnComplete}
      />
    );

    expect(
      screen.getByText("Enter 5-character invitation code")
    ).toBeInTheDocument();
  });

  it("shows error state and message", () => {
    render(
      <InvitationCodeInput
        value=""
        onChange={mockOnChange}
        onComplete={mockOnComplete}
        error={true}
      />
    );

    expect(screen.getByText("Invalid invitation code")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <InvitationCodeInput
        value=""
        onChange={mockOnChange}
        onComplete={mockOnComplete}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders 5 OTP slots", () => {
    render(
      <InvitationCodeInput
        value=""
        onChange={mockOnChange}
        onComplete={mockOnComplete}
      />
    );

    // Check that 5 slots are rendered
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`input-otp-slot-${i}`)).toBeInTheDocument();
    }
  });
});
