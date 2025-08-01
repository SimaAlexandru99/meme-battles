import React, { useState, useEffect } from "react";
import { screen } from "@testing-library/react";
import { customRender } from "./test-utils";
import {
  waitForLoadingToFinish,
  waitForApiCall,
  waitForDataToLoad,
  waitForCondition,
  simulateNetworkDelay,
  delay,
} from "./async-helpers";

// Test component with loading state
const LoadingComponent: React.FC<{ isLoading?: boolean }> = ({
  isLoading = true,
}) => {
  const [loading, setLoading] = useState(isLoading);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <div>
      {loading ? (
        <div role="status">Loading...</div>
      ) : (
        <div>Content loaded!</div>
      )}
    </div>
  );
};

// Test component with API call simulation
const ApiComponent: React.FC<{ shouldSucceed?: boolean }> = ({
  shouldSucceed = true,
}) => {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus(shouldSucceed ? "success" : "error");
    }, 200);
    return () => clearTimeout(timer);
  }, [shouldSucceed]);

  return (
    <div>
      {status === "loading" && <div role="status">Loading API...</div>}
      {status === "success" && <div>API call successful!</div>}
      {status === "error" && <div>API call failed!</div>}
    </div>
  );
};

describe("Async Helpers", () => {
  describe("waitForLoadingToFinish", () => {
    it("should wait for loading indicators to disappear", async () => {
      customRender(<LoadingComponent />);

      // Initially loading should be present
      expect(screen.getByRole("status")).toBeInTheDocument();

      // Wait for loading to finish
      await waitForLoadingToFinish();

      // Loading should be gone and content should be visible
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByText("Content loaded!")).toBeInTheDocument();
    });

    it("should handle components that are not loading", async () => {
      customRender(<LoadingComponent isLoading={false} />);

      // Should complete immediately since there's no loading
      await waitForLoadingToFinish();

      expect(screen.getByText("Content loaded!")).toBeInTheDocument();
    });
  });

  describe("waitForApiCall", () => {
    it("should wait for successful API call", async () => {
      customRender(<ApiComponent shouldSucceed={true} />);

      const result = await waitForApiCall(/successful/i, /failed/i);

      expect(result).toBe("success");
      expect(screen.getByText("API call successful!")).toBeInTheDocument();
    });

    it("should wait for failed API call", async () => {
      customRender(<ApiComponent shouldSucceed={false} />);

      const result = await waitForApiCall(/successful/i, /failed/i);

      expect(result).toBe("error");
      expect(screen.getByText("API call failed!")).toBeInTheDocument();
    });
  });

  describe("waitForDataToLoad", () => {
    it("should wait for data to load by test id", async () => {
      const DataComponent = () => {
        const [loaded, setLoaded] = useState(false);

        useEffect(() => {
          const timer = setTimeout(() => setLoaded(true), 100);
          return () => clearTimeout(timer);
        }, []);

        return loaded ? (
          <div data-testid="data-loaded">Data is here!</div>
        ) : (
          <div role="status">Loading...</div>
        );
      };

      customRender(<DataComponent />);

      await waitForDataToLoad("data-loaded");

      expect(screen.getByTestId("data-loaded")).toBeInTheDocument();
    });
  });

  describe("waitForCondition", () => {
    it("should wait for condition to be true", async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };

      await waitForCondition(condition, 1000, 50);

      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it("should timeout if condition is never met", async () => {
      const condition = () => false;

      await expect(waitForCondition(condition, 100, 10)).rejects.toThrow(
        "Condition not met within 100ms"
      );
    });
  });

  describe("simulateNetworkDelay", () => {
    it("should delay execution", async () => {
      const startTime = Date.now();

      await simulateNetworkDelay(100);

      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe("delay", () => {
    it("should create a delay promise", async () => {
      const startTime = Date.now();

      await delay(50);

      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(40); // Allow some tolerance
    });
  });
});
