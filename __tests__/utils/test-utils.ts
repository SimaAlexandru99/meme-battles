import React, { ReactElement } from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { ThemeProvider } from "@/providers/theme-provider";
import { User } from "firebase/auth";

// Mock Next.js router for testing
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: "/",
  query: {},
  asPath: "/",
};

// Custom render options interface
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // Provider options
  theme?: "light" | "dark" | "system";
  user?: User | null;
  // Router options
  router?: Partial<typeof mockRouter>;
  // Initial state for providers
  initialState?: Record<string, unknown>;
}

// All providers wrapper component
const AllTheProviders: React.FC<{
  children: React.ReactNode;
  options?: CustomRenderOptions;
}> = ({ children, options = {} }) => {
  const { theme = "light" } = options;

  return React.createElement(
    ThemeProvider,
    {
      attribute: "class",
      defaultTheme: theme,
      enableSystem: theme === "system",
      disableTransitionOnChange: true,
    },
    children,
  );
};

/**
 * Custom render function with provider support for React components
 * Wraps components with necessary providers for testing
 */
export function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {},
): RenderResult {
  const { theme, user, router, initialState, ...renderOptions } = options;

  // Mock router if custom router options provided
  if (router) {
    const nextRouter = require("next/router");
    nextRouter.useRouter = jest.fn(() => ({ ...mockRouter, ...router }));
  }

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(AllTheProviders, { options, children });

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from React Testing Library
export * from "@testing-library/react";

// Override render method with our custom render
export { customRender as render };
