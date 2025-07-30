# Testing Utilities

This directory contains comprehensive testing utilities for the Meme Battles application. These utilities provide helper functions for testing React components, Firebase integration, forms, async operations, and mock data generation.

## Overview

The testing utilities are organized into several modules:

- **test-utils.ts** - Custom render function with provider support
- **firebase-mocks.ts** - Firebase service mocking utilities
- **form-helpers.ts** - Form testing and interaction helpers
- **async-helpers.ts** - Async operation testing utilities
- **mock-data.ts** - Mock data factory functions
- **index.ts** - Convenient exports for all utilities

## Usage

### Basic Import

```typescript
// Import specific utilities
import {
  customRender,
  fillForm,
  waitForLoadingToFinish,
} from "@/__tests__/utils";

// Or import from specific modules
import { customRender } from "@/__tests__/utils/test-utils";
import { fillForm } from "@/__tests__/utils/form-helpers";
```

### Custom Render Function

The `customRender` function wraps components with necessary providers for testing:

```typescript
import { customRender, screen } from "@/__tests__/utils";

test("renders component with providers", () => {
  customRender(<MyComponent />, {
    theme: "dark",
    user: createMockUser(),
    router: { pathname: "/test" },
  });

  expect(screen.getByText("Hello World")).toBeInTheDocument();
});
```

### Firebase Mocking

Set up Firebase mocks for testing:

```typescript
import {
  setupFirebaseMocks,
  cleanupFirebaseMocks,
  createMockUser,
} from "@/__tests__/utils";

describe("Firebase Tests", () => {
  beforeEach(() => {
    setupFirebaseMocks();
  });

  afterEach(() => {
    cleanupFirebaseMocks();
  });

  test("creates mock user", () => {
    const user = createMockUser({ displayName: "Test User" });
    expect(user.displayName).toBe("Test User");
  });
});
```

### Form Testing

Test form interactions easily:

```typescript
import { customRender, fillForm, submitForm } from "@/__tests__/utils";

test("fills and submits form", async () => {
  customRender(<MyForm />);

  await fillForm({
    Name: "John Doe",
    Email: "john@example.com",
    Subscribe: true,
  });

  await submitForm("Submit");

  // Assert form submission results
});
```

### Async Testing

Handle loading states and async operations:

```typescript
import {
  customRender,
  waitForLoadingToFinish,
  waitForApiCall,
} from "@/__tests__/utils";

test("waits for async operations", async () => {
  customRender(<AsyncComponent />);

  // Wait for loading to complete
  await waitForLoadingToFinish();

  // Wait for specific API call results
  const result = await waitForApiCall(/success/i, /error/i);
  expect(result).toBe("success");
});
```

### Mock Data Generation

Generate consistent test data:

```typescript
import {
  createMockUser,
  createMockGameData,
  createMockApiSuccess,
} from "@/__tests__/utils";

test("uses mock data", () => {
  const user = createMockUser({ isAnonymous: true });
  const game = createMockGameData({ maxPlayers: 4 });
  const apiResponse = createMockApiSuccess({ message: "Success" });

  expect(user.isAnonymous).toBe(true);
  expect(game.maxPlayers).toBe(4);
  expect(apiResponse.data.message).toBe("Success");
});
```

## API Reference

### Test Utils

#### `customRender(ui, options)`

Renders React components with providers.

**Parameters:**

- `ui` - React element to render
- `options` - Render options
  - `theme` - Theme provider theme ('light' | 'dark' | 'system')
  - `user` - Mock user for auth context
  - `router` - Mock router options
  - `initialState` - Initial state for providers

### Firebase Mocks

#### `setupFirebaseMocks()`

Sets up all Firebase mocks with default behavior.

#### `cleanupFirebaseMocks()`

Cleans up Firebase mocks after tests.

#### `createMockUser(overrides)`

Creates a mock Firebase user with optional overrides.

#### `createMockAnonymousUser(overrides)`

Creates a mock anonymous Firebase user.

### Form Helpers

#### `fillInput(label, value)`

Fills a form input by label or placeholder.

#### `fillForm(formData)`

Fills multiple form fields at once.

#### `submitForm(buttonText)`

Submits a form by finding and clicking the submit button.

#### `toggleCheckbox(label, checked)`

Checks or unchecks a checkbox.

### Async Helpers

#### `waitForLoadingToFinish(timeout)`

Waits for loading indicators to disappear.

#### `waitForApiCall(successIndicator, errorIndicator, timeout)`

Waits for API calls to complete and returns result type.

#### `waitForCondition(condition, timeout, pollInterval)`

Waits for a custom condition to be true.

#### `simulateNetworkDelay(delay)`

Simulates network delay for testing loading states.

### Mock Data

#### `createMockUser(overrides)`

Creates a mock user with customizable properties.

#### `createMockGameData(overrides)`

Creates mock game data with players and settings.

#### `createMockApiSuccess(data, status, message)`

Creates a successful API response mock.

#### `createMockApiError(error, status)`

Creates an error API response mock.

## Best Practices

1. **Always use setupFirebaseMocks/cleanupFirebaseMocks** in beforeEach/afterEach hooks
2. **Use customRender instead of RTL render** to ensure providers are available
3. **Prefer semantic queries** (getByLabelText, getByRole) over test IDs when possible
4. **Wait for async operations** using the provided async helpers
5. **Create realistic mock data** that matches your application's data structures
6. **Test user interactions** rather than implementation details

## Examples

See the test files in this directory for comprehensive examples of how to use each utility:

- `test-utils.test.tsx` - Custom render examples
- `firebase-mocks.test.ts` - Firebase mocking examples
- `form-helpers.test.tsx` - Form testing examples
- `async-helpers.test.tsx` - Async testing examples
- `mock-data.test.ts` - Mock data generation examples
- `integration.test.tsx` - Combined utilities example
