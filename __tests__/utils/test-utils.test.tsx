import React from "react";
import { screen } from "@testing-library/react";
import { customRender } from "./test-utils";

// Simple test component
const TestComponent: React.FC<{ message?: string }> = ({
  message = "Hello World",
}) => {
  return <div>{message}</div>;
};

describe("Test Utils", () => {
  describe("customRender", () => {
    it("should render components with default providers", () => {
      customRender(<TestComponent />);

      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("should render components with custom props", () => {
      customRender(<TestComponent message="Custom Message" />);

      expect(screen.getByText("Custom Message")).toBeInTheDocument();
    });

    it("should render with theme provider", () => {
      customRender(<TestComponent />, { theme: "dark" });

      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });
  });
});
