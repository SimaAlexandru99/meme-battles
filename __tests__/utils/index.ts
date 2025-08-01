// ============================================================================
// TESTING UTILITIES INDEX
// ============================================================================

// Re-export all testing utilities for easy importing
export * from "./firebase-mocks";
export * from "./form-helpers";
export * from "./async-helpers";
export * from "./mock-data";

// Default exports for common utilities
export {
  setupFirebaseMocks,
  cleanupFirebaseMocks,
  mockFirebaseAuth,
  mockFirestore,
  mockFirebaseStorage,
} from "./firebase-mocks";
export { fillForm, submitForm } from "./form-helpers";
export { waitForLoadingToFinish, waitForApiCall } from "./async-helpers";
export {
  createMockUser,
  createMockGameData,
  createMockApiSuccess,
  createMockApiError,
} from "./mock-data";
