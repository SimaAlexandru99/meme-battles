import React from "react";
import { screen } from "@testing-library/react";
import { customRender } from "./test-utils";
import {
  fillInput,
  fillForm,
  submitForm,
  toggleCheckbox,
  createMockFile,
  hasValidationError,
} from "./form-helpers";

// Test form component
const TestForm: React.FC = () => {
  return (
    <form>
      <label htmlFor="name">Name</label>
      <input id="name" type="text" />

      <label htmlFor="email">Email</label>
      <input id="email" type="email" />

      <label htmlFor="subscribe">
        <input id="subscribe" type="checkbox" />
        Subscribe to newsletter
      </label>

      <button type="submit">Submit</button>
    </form>
  );
};

describe("Form Helpers", () => {
  describe("fillInput", () => {
    it("should fill input by label", async () => {
      customRender(<TestForm />);

      await fillInput("Name", "John Doe");

      expect(screen.getByLabelText("Name")).toHaveValue("John Doe");
    });

    it("should fill input by placeholder", async () => {
      customRender(
        <form>
          <input placeholder="Enter your name" />
        </form>,
      );

      await fillInput("Enter your name", "Jane Doe");

      expect(screen.getByPlaceholderText("Enter your name")).toHaveValue(
        "Jane Doe",
      );
    });
  });

  describe("fillForm", () => {
    it("should fill multiple form fields", async () => {
      customRender(<TestForm />);

      await fillForm({
        Name: "John Doe",
        Email: "john@example.com",
        "Subscribe to newsletter": true,
      });

      expect(screen.getByLabelText("Name")).toHaveValue("John Doe");
      expect(screen.getByLabelText("Email")).toHaveValue("john@example.com");
      expect(screen.getByLabelText("Subscribe to newsletter")).toBeChecked();
    });
  });

  describe("toggleCheckbox", () => {
    it("should check a checkbox", async () => {
      customRender(<TestForm />);

      await toggleCheckbox("Subscribe to newsletter", true);

      expect(screen.getByLabelText("Subscribe to newsletter")).toBeChecked();
    });

    it("should uncheck a checkbox", async () => {
      customRender(
        <form>
          <label htmlFor="checked">
            <input id="checked" type="checkbox" defaultChecked />
            Already checked
          </label>
        </form>,
      );

      await toggleCheckbox("Already checked", false);

      expect(screen.getByLabelText("Already checked")).not.toBeChecked();
    });
  });

  describe("submitForm", () => {
    it("should submit form by button text", async () => {
      const handleSubmit = jest.fn();

      customRender(
        <form onSubmit={handleSubmit}>
          <button type="submit">Submit</button>
        </form>,
      );

      await submitForm("Submit");

      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe("createMockFile", () => {
    it("should create a mock file with default values", () => {
      const file = createMockFile();

      expect(file.name).toBe("test-file.jpg");
      expect(file.type).toBe("image/jpeg");
      expect(file.size).toBe(1024);
    });

    it("should create a mock file with custom values", () => {
      const file = createMockFile("custom.png", "image/png", 2048);

      expect(file.name).toBe("custom.png");
      expect(file.type).toBe("image/png");
      expect(file.size).toBe(2048);
    });
  });

  describe("hasValidationError", () => {
    it("should detect validation error by aria-invalid", () => {
      customRender(
        <form>
          <label htmlFor="invalid">Invalid Field</label>
          <input id="invalid" aria-invalid="true" />
        </form>,
      );

      expect(hasValidationError("Invalid Field")).toBe(true);
    });

    it("should return false for valid field", () => {
      customRender(<TestForm />);

      expect(hasValidationError("Name")).toBe(false);
    });
  });
});
