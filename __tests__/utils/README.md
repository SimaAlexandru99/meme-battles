# Testing Utilities

This directory contains comprehensive testing utilities for the Meme Battles application. These utilities provide helper functions for testing React components, Firebase integration, forms, async operations, and mock data generation with full TypeScript support.

## Overview

The testing utilities are organized into several modules:

- **test-utils.ts** - Custom render function with provider support and proper TypeScript types
- **firebase-mocks.ts** - Firebase service mocking utilities with type-safe mocks
- **form-helpers.ts** - Form testing and interaction helpers
- **async-helpers.ts** - Async operation testing utilities with generic type support
- **mock-data.ts** - Mock data factory functions
- **index.ts** - Convenient exports for all utilities

## Recent Improvements

### TypeScript Enhancements

- ✅ **Removed all `any` types** for better type safety
- ✅ **Added generic type support** for async operations
- ✅ **Improved Firebase mock types** with proper DocumentReference and Query types
- ✅ **Enhanced custom render options** with proper TypeScript interfaces

### Code Quality

- ✅ **Consistent formatting** with proper trailing commas
- ✅ **Better error handling** in async utilities
- ✅ **Improved mock data generation** with type-safe overrides

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
    initialState: { user: { isLoggedIn: true } },
  });

  expect(screen.getByText("Hello World")).toBeInTheDocument();
});
```

### Firebase Mocking

Set up Firebase mocks for testing with improved type safety:

```typescript
import {
  setupFirebaseMocks,
  cleanupFirebaseMocks,
  createMockUser,
  createMockDocumentSnapshot,
} from "@/__tests__/utils";

describe("Firebase Tests", () => {
  beforeEach(() => {
    setupFirebaseMocks();
  });

  afterEach(() => {
    cleanupFirebaseMocks();
  });

  test("creates mock user with type safety", () => {
    const user = createMockUser({ displayName: "Test User" });
    expect(user.displayName).toBe("Test User");
    expect(user.uid).toBeDefined();
  });

  test("creates mock document snapshot", () => {
    const snapshot = createMockDocumentSnapshot(
      { name: "Test", value: 123 },
      "test-doc-id",
      true
    );
    expect(snapshot.exists()).toBe(true);
    expect(snapshot.data()).toEqual({ name: "Test", value: 123 });
  });
});
```

### Form Testing

Test form interactions easily with improved type safety:

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

Handle loading states and async operations with generic type support:

```typescript
import {
  customRender,
  waitForLoadingToFinish,
  waitForApiCall,
  waitForMultipleOperations,
} from "@/__tests__/utils";

test("waits for async operations with type safety", async () => {
  customRender(<AsyncComponent />);

  // Wait for loading to complete
  await waitForLoadingToFinish();

  // Wait for specific API call results
  const result = await waitForApiCall(/success/i, /error/i);
  expect(result).toBe("success");

  // Wait for multiple operations with generic types
  const operations = [
    () => Promise.resolve("result1"),
    () => Promise.resolve("result2"),
  ];
  const results = await waitForMultipleOperations(operations);
  expect(results).toEqual(["result1", "result2"]);
});
```

### Mock Data Generation

Generate consistent test data with type-safe overrides:

```typescript
import {
  createMockUser,
  createMockGameData,
  createMockApiSuccess,
} from "@/__tests__/utils";

test("uses mock data with proper types", () => {
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

Renders React components with providers and proper TypeScript support.

**Parameters:**

- `ui` - React element to render
- `options` - Render options with improved type safety
  - `theme` - Theme provider theme ('light' | 'dark' | 'system')
  - `user` - Mock user for auth context
  - `router` - Mock router options
  - `initialState` - Initial state for providers (type: `Record<string, unknown>`)

### Firebase Mocks

#### `setupFirebaseMocks()`

Sets up all Firebase mocks with default behavior and improved type safety.

#### `cleanupFirebaseMocks()`

Cleans up Firebase mocks after tests.

#### `createMockUser(overrides)`

Creates a mock Firebase user with optional overrides and proper typing.

#### `createMockAnonymousUser(overrides)`

Creates a mock anonymous Firebase user with type safety.

#### `createMockDocumentSnapshot(data, id, exists)`

Creates a mock Firestore document snapshot with proper DocumentReference types.

#### `createMockQuerySnapshot(docs, empty)`

Creates a mock Firestore query snapshot with proper Query types.

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

#### `waitForMultipleOperations<T>(operations, timeout)`

Waits for multiple async operations to complete with generic type support.

#### `waitForCondition(condition, timeout, pollInterval)`

Waits for a custom condition to be true.

#### `simulateNetworkDelay(delay)`

Simulates network delay for testing loading states.

### Mock Data

#### `createMockUser(overrides)`

Creates a mock user with customizable properties and proper typing.

#### `createMockGameData(overrides)`

Creates mock game data with players and settings.

#### `createMockApiSuccess(data, status, message)`

Creates a successful API response mock.

#### `createMockApiError(error, status)`

Creates an error API response mock.

## Type Safety Features

### Generic Type Support

```typescript
// Async operations now support generic types
const results = await waitForMultipleOperations<string>([
  () => Promise.resolve("result1"),
  () => Promise.resolve("result2"),
]);
// results is typed as string[]
```

### Improved Firebase Types

```typescript
// Firebase mocks now use proper types instead of 'any'
const snapshot = createMockDocumentSnapshot(data, "doc-id", true);
// snapshot.ref is properly typed as DocumentReference
```

### Type-Safe Custom Render

```typescript
// initialState is now properly typed
customRender(<Component />, {
  initialState: { user: { isLoggedIn: true } }, // Type-safe
});
```

## Best Practices

1. **Always use setupFirebaseMocks/cleanupFirebaseMocks** in beforeEach/afterEach hooks
2. **Use customRender instead of RTL render** to ensure providers are available
3. **Prefer semantic queries** (getByLabelText, getByRole) over test IDs when possible
4. **Wait for async operations** using the provided async helpers with generic types
5. **Create realistic mock data** that matches your application's data structures
6. **Test user interactions** rather than implementation details
7. **Leverage TypeScript types** for better IDE support and error catching

## Examples

See the test files in this directory for comprehensive examples of how to use each utility:

- `test-utils.test.tsx` - Custom render examples with type safety
- `firebase-mocks.test.ts` - Firebase mocking examples with proper types
- `form-helpers.test.tsx` - Form testing examples
- `async-helpers.test.tsx` - Async testing examples with generic types
- `mock-data.test.ts` - Mock data generation examples
- `integration.test.tsx` - Combined utilities example

## Migration Notes

If you're updating from an older version:

1. **Replace `any` types** with proper TypeScript interfaces
2. **Update async operation calls** to use generic types where applicable
3. **Use the improved Firebase mock types** for better type safety
4. **Update custom render calls** to use the new initialState type
