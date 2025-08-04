import React, { ReactElement } from "react";
import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { ThemeProvider } from "@/providers/theme-provider";

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
  route: "/",
  basePath: "",
  isLocaleDomain: false,
};

// Custom render options interface
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // Provider options
  theme?: "light" | "dark" | "system";
  // Router options
  router?: Partial<typeof mockRouter>;
}

// All providers wrapper component
const AllTheProviders = ({
  children,
  options = {},
}: {
  children: React.ReactNode;
  options?: CustomRenderOptions;
}) => {
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
  const { router, ...renderOptions } = options;

  // Mock router if custom router options provided
  if (router) {
    // Mock the router without complex typing
    jest.doMock("next/router", () => ({
      useRouter: () => ({ ...mockRouter, ...router }),
    }));
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    // eslint-disable-next-line react/no-children-prop
    return React.createElement(AllTheProviders, { options, children });
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from React Testing Library
export * from "@testing-library/react";

// Override render method with our custom render
export { customRender as render };
