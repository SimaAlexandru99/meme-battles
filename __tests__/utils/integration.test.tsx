import React from "react";
import { screen } from "@testing-library/react";
import { customRender } from "./test-utils";
import { fillForm, submitForm } from "./form-helpers";
import { waitForLoadingToFinish } from "./async-helpers";
import { createMockUser, createMockGameData } from "./mock-data";
import { setupFirebaseMocks, cleanupFirebaseMocks } from "./firebase-mocks";

// Integration test component that uses multiple utilities
const IntegrationTestComponent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 100);
  };

  return (
    <div>
      <h1>Integration Test Form</h1>

      {isLoading && <div role="status">Submitting form...</div>}

      {submitted ? (
        <div>Form submitted successfully!</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>

          <button type="submit">Submit Form</button>
        </form>
      )}
    </div>
  );
};

describe("Testing Utilities Integration", () => {
  beforeEach(() => {
    setupFirebaseMocks();
  });

  afterEach(() => {
    cleanupFirebaseMocks();
  });

  it("should demonstrate all utilities working together", async () => {
    // Test mock data creation
    const mockUser = createMockUser({ displayName: "Test User" });
    const mockGame = createMockGameData({ title: "Test Game" });

    expect(mockUser.displayName).toBe("Test User");
    expect(mockGame.title).toBe("Test Game");

    // Test custom render with providers
    customRender(<IntegrationTestComponent />, { theme: "dark" });

    // Verify initial render
    expect(screen.getByText("Integration Test Form")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();

    // Test form helpers
    await fillForm({
      Name: "John Doe",
      Email: "john@example.com",
    });

    // Verify form was filled
    expect(screen.getByLabelText("Name")).toHaveValue("John Doe");
    expect(screen.getByLabelText("Email")).toHaveValue("john@example.com");

    // Test form submission
    await submitForm("Submit Form");

    // Test async helpers - wait for loading to finish
    await waitForLoadingToFinish();

    // Verify successful submission
    expect(
      screen.getByText("Form submitted successfully!"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should work with Firebase mocks", () => {
    // Test that Firebase mocks are properly set up
    const user = createMockUser();
    expect(user.uid).toBeDefined();
    expect(user.getIdToken).toBeDefined();

    // Firebase mocks should be available
    expect(
      jest.isMockFunction(require("firebase/auth").signInAnonymously),
    ).toBe(true);
    expect(jest.isMockFunction(require("firebase/firestore").getDoc)).toBe(
      true,
    );
  });
});
