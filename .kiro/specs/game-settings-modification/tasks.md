# Implementation Plan

- [x] 1. Create core form components for game settings
  - Build RoundsSelector component using shadcn Select with options 1-10
  - Implement TimeLimitSlider component using shadcn Slider with 30-300 second range and formatted display
  - Create CategoriesSelector component with checkbox grid layout for meme categories
  - Add proper TypeScript interfaces and validation for each component
  - Style components to match existing lobby theme with purple gradients
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 9.1, 9.2_

- [x] 2. Implement settings validation and form state management
  - Create settings validation schema with min/max constraints for all fields
  - Implement form validation logic with real-time error checking
  - Add validation error display with inline field errors and form-level errors
  - Create form state management hooks for settings data and dirty state tracking
  - Implement form reset and change detection functionality
  - _Requirements: 2.3, 2.6, 3.3, 3.6, 4.3, 4.6, 8.2_

- [x] 3. Build GameSettingsModal component with responsive design
  - Create modal component using shadcn Dialog with backdrop blur and animations
  - Implement responsive layout (full-screen mobile, centered desktop)
  - Add modal header with title and close button
  - Integrate form components into modal layout with proper spacing
  - Implement unsaved changes warning dialog on close attempt
  - _Requirements: 1.2, 1.3, 7.1, 7.4, 6.5, 9.3, 9.4_

- [ ] 4. Create SettingsPreview component for change visualization
  - Build preview component showing current vs new settings side-by-side
  - Add visual indicators for changed values with color coding
  - Implement estimated game duration calculation based on rounds and time limit
  - Create formatted display for time values and category lists
  - Add smooth animations for preview updates
  - _Requirements: 6.1, 6.2_

- [ ] 5. Implement settings save and cancel functionality
  - Create save settings function with API integration for lobby updates
  - Add cancel functionality that discards unsaved changes
  - Implement loading states during save operations with spinner indicators
  - Add success notifications and error handling for save operations
  - Create confirmation dialog for unsaved changes on modal close
  - _Requirements: 6.3, 6.4, 6.5, 6.6, 8.1, 8.3_

- [ ] 6. Integrate settings modal into GameLobby component
  - Modify GameLobby component to include settings modal state management
  - Update "Game Settings" button to open modal (host only)
  - Add modal trigger and state management to host controls section
  - Implement host permission checking for settings access
  - Connect modal to existing lobby data and SWR hooks
  - _Requirements: 1.1, 1.4, 1.5_

- [ ] 7. Add real-time settings updates for all lobby participants
  - Implement settings update notifications for non-host players
  - Update lobby info display when settings change with smooth animations
  - Add batched notifications to prevent spam during rapid changes
  - Create settings change announcements for screen readers
  - Ensure new players see current settings immediately upon joining
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Create API endpoint for updating lobby settings
  - Implement PUT /api/lobbies/{code}/settings endpoint
  - Add server-side validation for all settings parameters
  - Implement host authorization checking in API endpoint
  - Add proper error responses for validation failures and permission errors
  - Create database update logic for Firestore lobby settings
  - _Requirements: 2.4, 2.5, 3.4, 3.5, 4.4, 4.5, 8.4_

- [ ] 9. Implement comprehensive error handling system
  - Create error type definitions for all possible settings errors
  - Add network error handling with retry functionality
  - Implement validation error display with field-specific messages
  - Create conflict resolution for concurrent settings modifications
  - Add graceful error recovery and fallback mechanisms
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 10. Add accessibility features and keyboard navigation
  - Implement proper ARIA labels and roles for all form elements
  - Add keyboard navigation support with logical tab order
  - Create screen reader announcements for modal state changes
  - Implement focus management and focus trapping within modal
  - Add keyboard shortcuts for save (Ctrl+S) and cancel (Escape)
  - _Requirements: 7.2, 7.3, 7.5_

- [ ] 11. Implement responsive design and mobile optimizations
  - Add responsive breakpoints for mobile, tablet, and desktop layouts
  - Optimize touch targets for mobile devices (minimum 44px)
  - Implement mobile-specific modal behavior (full-screen)
  - Add mobile-optimized slider interaction with larger thumb
  - Create responsive category card layout for different screen sizes
  - _Requirements: 7.1, 7.4_

- [ ] 12. Add animations and micro-interactions
  - Implement modal entrance and exit animations using Framer Motion
  - Add form field focus animations with purple glow effects
  - Create smooth transitions for slider value changes
  - Add validation error shake animations for invalid inputs
  - Implement success animations for save operations
  - _Requirements: 9.3, 9.4, 9.5_

- [ ] 13. Create comprehensive unit tests for all components
  - Write unit tests for RoundsSelector, TimeLimitSlider, and CategoriesSelector components
  - Test GameSettingsModal component rendering and interaction behavior
  - Add tests for settings validation logic and error handling
  - Test form state management and change detection functionality
  - Verify accessibility features and keyboard navigation work correctly
  - _Requirements: All requirements - testing coverage_

- [ ] 14. Implement integration tests for settings flow
  - Test complete settings modification flow from open to save
  - Verify API integration and lobby data synchronization
  - Test real-time updates across multiple lobby participants
  - Add tests for error scenarios and recovery mechanisms
  - Verify responsive design behavior across different screen sizes
  - _Requirements: All requirements - integration testing_

- [ ] 15. Add performance optimizations and final polish
  - Implement lazy loading for settings modal component
  - Add debounced validation to reduce API calls during rapid input
  - Optimize animations for GPU acceleration using transform properties
  - Implement proper cleanup for event listeners and timers
  - Add final visual polish and micro-interactions for enhanced UX
  - _Requirements: 9.1, 9.2, 9.5_
