import {
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";

// ============================================================================
// ASYNC TESTING UTILITIES
// ============================================================================

/**
 * Default timeout for async operations
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Waits for loading indicators to disappear
 */
export async function waitForLoadingToFinish(
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  await waitFor(
    () => {
      // Common loading indicators
      const spinners = screen.queryAllByRole("status");
      const loadingTexts = screen.queryAllByText(/loading|wait/i);
      const loadingButtons = screen.queryAllByRole("button", {
        name: /loading|submitting/i,
      });

      expect(
        spinners.length + loadingTexts.length + loadingButtons.length
      ).toBe(0);
    },
    { timeout }
  );
}

/**
 * Waits for a specific loading indicator to disappear
 */
export async function waitForSpecificLoadingToFinish(
  loadingText: string | RegExp,
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  const loadingElement = screen.queryByText(loadingText);

  if (loadingElement) {
    await waitForElementToBeRemoved(loadingElement, { timeout });
  }
}

/**
 * Waits for an API call to complete by checking for success/error states
 */
export async function waitForApiCall(
  successIndicator?: string | RegExp,
  errorIndicator?: string | RegExp,
  timeout: number = DEFAULT_TIMEOUT
): Promise<"success" | "error"> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`API call timeout after ${timeout}ms`));
    }, timeout);

    const checkForCompletion = async () => {
      try {
        // Check for success indicator
        if (successIndicator) {
          const successElement = screen.queryByText(successIndicator);
          if (successElement) {
            clearTimeout(timeoutId);
            resolve("success");
            return;
          }
        }

        // Check for error indicator
        if (errorIndicator) {
          const errorElement = screen.queryByText(errorIndicator);
          if (errorElement) {
            clearTimeout(timeoutId);
            resolve("error");
            return;
          }
        }

        // Check if loading is finished (no more loading indicators)
        const loadingElements = [
          ...screen.queryAllByRole("status"),
          ...screen.queryAllByText(/loading|wait/i),
        ];

        if (loadingElements.length === 0) {
          clearTimeout(timeoutId);
          resolve("success");
          return;
        }

        // Continue checking
        setTimeout(checkForCompletion, 100);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    };

    checkForCompletion();
  });
}

/**
 * Waits for data to be loaded and displayed
 */
export async function waitForDataToLoad(
  dataTestId?: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  await waitFor(
    () => {
      if (dataTestId) {
        const dataElement = screen.getByTestId(dataTestId);
        expect(dataElement).toBeInTheDocument();
      } else {
        // Wait for loading to finish
        const loadingElements = screen.queryAllByRole("status");
        expect(loadingElements.length).toBe(0);
      }
    },
    { timeout }
  );
}

/**
 * Waits for an element to appear with retry logic
 */
export async function waitForElementWithRetry(
  getElement: () => HTMLElement | null,
  maxRetries: number = 5,
  retryDelay: number = 1000
): Promise<HTMLElement> {
  let retries = 0;

  while (retries < maxRetries) {
    const element = getElement();

    if (element) {
      return element;
    }

    retries++;

    if (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(`Element not found after ${maxRetries} retries`);
}

/**
 * Waits for multiple async operations to complete
 */
export async function waitForMultipleOperations<T = unknown>(
  operations: Array<() => Promise<T>>,
  timeout: number = DEFAULT_TIMEOUT
): Promise<T[]> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operations timeout after ${timeout}ms`));
    }, timeout);
  });

  const operationsPromise = Promise.all(operations.map((op) => op()));

  return Promise.race([operationsPromise, timeoutPromise]) as Promise<T[]>;
}

/**
 * Waits for a condition to be true with custom polling
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = DEFAULT_TIMEOUT,
  pollInterval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();

    if (result) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Simulates network delay for testing loading states
 */
export async function simulateNetworkDelay(
  delay: number = 1000
): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Waits for error messages to appear
 */
export async function waitForErrorMessage(
  errorText?: string | RegExp,
  timeout: number = DEFAULT_TIMEOUT
): Promise<HTMLElement> {
  return waitFor(
    () => {
      if (errorText) {
        return screen.getByText(errorText);
      } else {
        // Look for common error indicators
        const errorElements = [
          ...screen.queryAllByRole("alert"),
          ...screen.queryAllByText(/error|failed|invalid/i),
        ];

        if (errorElements.length === 0) {
          throw new Error("No error message found");
        }

        return errorElements[0];
      }
    },
    { timeout }
  );
}

/**
 * Waits for success messages to appear
 */
export async function waitForSuccessMessage(
  successText?: string | RegExp,
  timeout: number = DEFAULT_TIMEOUT
): Promise<HTMLElement> {
  return waitFor(
    () => {
      if (successText) {
        return screen.getByText(successText);
      } else {
        // Look for common success indicators
        const successElements = [
          ...screen.queryAllByText(/success|saved|updated|created/i),
        ];

        if (successElements.length === 0) {
          throw new Error("No success message found");
        }

        return successElements[0];
      }
    },
    { timeout }
  );
}

/**
 * Waits for navigation to complete (useful for testing redirects)
 */
export async function waitForNavigation(
  expectedPath?: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  await waitFor(
    () => {
      if (expectedPath) {
        expect(window.location.pathname).toBe(expectedPath);
      } else {
        // Just wait for any navigation change
        // This is a simplified check - in real apps you might check router state
        expect(document.readyState).toBe("complete");
      }
    },
    { timeout }
  );
}

/**
 * Creates a promise that resolves after a specified delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Waits for component to re-render after state change
 */
export async function waitForRerender(): Promise<void> {
  await waitFor(() => {
    // This forces a wait for the next tick
    expect(true).toBe(true);
  });
}
