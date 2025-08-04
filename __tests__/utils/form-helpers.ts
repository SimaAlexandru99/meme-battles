import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ============================================================================
// FORM TESTING UTILITIES
// ============================================================================

/**
 * Interface for form field data
 */
export interface FormFieldData {
  [fieldName: string]: string | number | boolean | string[];
}

/**
 * Fills a form input field by label or placeholder
 */
export async function fillInput(
  labelOrPlaceholder: string,
  value: string | number,
): Promise<void> {
  const user = userEvent.setup();

  // Try to find input by label first
  let input = screen.queryByLabelText(labelOrPlaceholder);

  // If not found by label, try by placeholder
  if (!input) {
    input = screen.queryByPlaceholderText(labelOrPlaceholder);
  }

  // If still not found, try by role and name
  if (!input) {
    input = screen.queryByRole("textbox", { name: labelOrPlaceholder });
  }

  if (!input) {
    throw new Error(`Could not find input field: ${labelOrPlaceholder}`);
  }

  await user.clear(input);
  await user.type(input, String(value));
}

/**
 * Selects an option from a select dropdown
 */
export async function selectOption(
  selectLabel: string,
  optionValue: string,
): Promise<void> {
  const user = userEvent.setup();

  const select = screen.getByLabelText(selectLabel);
  await user.selectOptions(select, optionValue);
}

/**
 * Checks or unchecks a checkbox
 */
export async function toggleCheckbox(
  checkboxLabel: string,
  checked: boolean = true,
): Promise<void> {
  const user = userEvent.setup();

  const checkbox = screen.getByLabelText(checkboxLabel) as HTMLInputElement;

  if (checked && !checkbox.checked) {
    await user.click(checkbox);
  } else if (!checked && checkbox.checked) {
    await user.click(checkbox);
  }
}

/**
 * Selects a radio button option
 */
export async function selectRadioOption(
  radioGroupName: string,
  optionValue: string,
): Promise<void> {
  const user = userEvent.setup();

  const radio = screen.getByRole("radio", { name: optionValue });
  await user.click(radio);
}

/**
 * Fills multiple form fields at once
 */
export async function fillForm(formData: FormFieldData): Promise<void> {
  for (const [fieldName, value] of Object.entries(formData)) {
    if (typeof value === "string" || typeof value === "number") {
      await fillInput(fieldName, value);
    } else if (typeof value === "boolean") {
      await toggleCheckbox(fieldName, value);
    } else if (Array.isArray(value)) {
      // Handle multi-select or checkbox groups
      for (const option of value) {
        await toggleCheckbox(`${fieldName}-${option}`, true);
      }
    }
  }
}

/**
 * Submits a form by finding and clicking the submit button
 */
export async function submitForm(
  submitButtonText: string = "Submit",
): Promise<void> {
  const user = userEvent.setup();

  // Try different ways to find the submit button
  let submitButton = screen.queryByRole("button", { name: submitButtonText });

  if (!submitButton) {
    submitButton = screen.queryByText(submitButtonText);
  }

  if (!submitButton) {
    submitButton = screen.queryByRole("button", { name: /submit/i });
  }

  if (!submitButton) {
    throw new Error(`Could not find submit button: ${submitButtonText}`);
  }

  await user.click(submitButton);
}

/**
 * Waits for form validation errors to appear
 */
export async function waitForValidationErrors(): Promise<HTMLElement[]> {
  await waitFor(() => {
    const errors = screen.queryAllByRole("alert");
    expect(errors.length).toBeGreaterThan(0);
  });

  return screen.getAllByRole("alert");
}

/**
 * Checks if a form field has a validation error
 */
export function hasValidationError(fieldLabel: string): boolean {
  const field = screen.queryByLabelText(fieldLabel);
  if (!field) return false;

  // Check for aria-invalid attribute
  if (field.getAttribute("aria-invalid") === "true") {
    return true;
  }

  // Check for error message near the field
  const fieldContainer = field.closest("div");
  if (fieldContainer) {
    const errorMessage = fieldContainer.querySelector('[role="alert"]');
    return !!errorMessage;
  }

  return false;
}

/**
 * Gets validation error message for a field
 */
export function getValidationError(fieldLabel: string): string | null {
  const field = screen.queryByLabelText(fieldLabel);
  if (!field) return null;

  const fieldContainer = field.closest("div");
  if (fieldContainer) {
    const errorMessage = fieldContainer.querySelector('[role="alert"]');
    return errorMessage?.textContent || null;
  }

  return null;
}

/**
 * Clears all form fields
 */
export async function clearForm(): Promise<void> {
  const user = userEvent.setup();

  const inputs = screen.getAllByRole("textbox");
  for (const input of inputs) {
    await user.clear(input);
  }

  const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
  for (const checkbox of checkboxes) {
    if (checkbox.checked) {
      await user.click(checkbox);
    }
  }
}

/**
 * Uploads a file to a file input
 */
export async function uploadFile(
  fileInputLabel: string,
  file: File,
): Promise<void> {
  const user = userEvent.setup();

  const fileInput = screen.getByLabelText(fileInputLabel);
  await user.upload(fileInput, file);
}

/**
 * Creates a mock file for testing file uploads
 */
export function createMockFile(
  name: string = "test-file.jpg",
  type: string = "image/jpeg",
  size: number = 1024,
): File {
  const file = new File(["mock file content"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

/**
 * Waits for a form to be submitted (useful for async form submissions)
 */
export async function waitForFormSubmission(): Promise<void> {
  await waitFor(() => {
    // Look for loading states or success messages
    const loadingIndicator = screen.queryByText(/loading|submitting/i);
    const successMessage = screen.queryByText(/success|submitted/i);

    expect(loadingIndicator || successMessage).toBeInTheDocument();
  });
}

/**
 * Asserts that a form is in a loading state
 */
export function expectFormLoading(): void {
  const loadingIndicator = screen.queryByText(/loading|submitting/i);
  const disabledSubmitButton = screen
    .queryByRole("button", {
      name: /submit/i,
    })
    ?.hasAttribute("disabled");

  expect(loadingIndicator || disabledSubmitButton).toBeTruthy();
}

/**
 * Asserts that a form submission was successful
 */
export function expectFormSuccess(): void {
  const successMessage = screen.queryByText(/success|submitted|saved/i);
  expect(successMessage).toBeInTheDocument();
}
