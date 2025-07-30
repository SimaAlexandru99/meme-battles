# Requirements Document

## Introduction

This feature implements a private meme war functionality that allows users to create private lobbies and invite friends to participate in meme battles. The feature includes animated transitions from the main hero section to a private lobby interface, with options to either join an existing lobby using an invitation code or create a new lobby.

## Requirements

### Requirement 1

**User Story:** As a user, I want to access the private meme war feature from the main game selection, so that I can play with specific friends rather than random opponents.

#### Acceptance Criteria

1. WHEN the user clicks on the "Private Meme War" card THEN the system SHALL animate the existing game cards out of view
2. WHEN the cards exit animation completes THEN the system SHALL display the private lobby interface
3. WHEN the private lobby interface loads THEN the system SHALL show both "Join with Code" and "Create Lobby" options
4. WHEN the user wants to return to main menu THEN the system SHALL provide an "ÎNAPOI LA ÎNCEPUT" (Back to Start) button

### Requirement 2

**User Story:** As a user, I want to join a private lobby using an invitation code, so that I can participate in a meme war with friends who have already created a lobby.

#### Acceptance Criteria

1. WHEN the user selects the join option THEN the system SHALL display 5 input fields for the invitation code
2. WHEN the user enters a character in an input field THEN the system SHALL automatically focus the next field
3. WHEN the user completes entering 5 characters THEN the system SHALL validate the invitation code format
4. WHEN a valid invitation code is entered THEN the system SHALL attempt to join the specified lobby
5. WHEN an invalid invitation code is entered THEN the system SHALL display an appropriate error message
6. WHEN the join section is displayed THEN the system SHALL show a golden envelope icon with a notification badge

### Requirement 3

**User Story:** As a user, I want to create a new private lobby, so that I can invite my friends to join a meme war that I host.

#### Acceptance Criteria

1. WHEN the user selects the create lobby option THEN the system SHALL display the lobby creation interface
2. WHEN the create lobby interface loads THEN the system SHALL show two blue cards with yellow smiley faces
3. WHEN the create lobby interface loads THEN the system SHALL display a green speech bubble with plus icon
4. WHEN the user clicks "CREEAZĂ LOBBY-UL MEU" button THEN the system SHALL create a new private lobby
5. WHEN a lobby is successfully created THEN the system SHALL generate a unique 5-character invitation code
6. WHEN a lobby is created THEN the system SHALL provide the invitation code to share with friends

### Requirement 4

**User Story:** As a user, I want smooth animations when transitioning between the main menu and private lobby interface, so that the experience feels polished and engaging.

#### Acceptance Criteria

1. WHEN transitioning to private lobby THEN the system SHALL animate existing cards out with slide and fade effects
2. WHEN cards exit THEN the avatar setup card SHALL slide left and game cards SHALL slide right
3. WHEN exit animation completes THEN the system SHALL animate the private lobby interface in from center
4. WHEN private lobby enters THEN the system SHALL use spring animation with stagger effect for sections
5. WHEN returning to main menu THEN the system SHALL reverse the animation sequence
6. WHEN any animation plays THEN the system SHALL maintain the purple gradient background and particles

### Requirement 5

**User Story:** As a user, I want the private lobby interface to be accessible and responsive, so that I can use it effectively on different devices and with assistive technologies.

#### Acceptance Criteria

1. WHEN the interface loads on mobile devices THEN the system SHALL stack sections vertically
2. WHEN using keyboard navigation THEN the system SHALL provide proper tab order and focus management
3. WHEN using screen readers THEN the system SHALL provide appropriate ARIA labels for all interactive elements
4. WHEN viewing on different screen sizes THEN the system SHALL maintain readability and usability
5. WHEN errors occur THEN the system SHALL provide high contrast, accessible error messages

### Requirement 6

**User Story:** As a user, I want proper error handling and loading states, so that I understand what's happening when operations take time or fail.

#### Acceptance Criteria

1. WHEN joining a lobby fails THEN the system SHALL display a clear error message explaining the issue
2. WHEN creating a lobby fails THEN the system SHALL show appropriate error feedback
3. WHEN network operations are in progress THEN the system SHALL display loading indicators
4. WHEN critical errors occur THEN the system SHALL provide a fallback option to return to main screen
5. WHEN operations complete successfully THEN the system SHALL provide clear confirmation feedback

### Requirement 7

**User Story:** As a user, I want the invitation code input to be user-friendly and intuitive, so that I can easily enter codes shared by friends.

#### Acceptance Criteria

1. WHEN focusing on code input THEN the system SHALL auto-focus the first empty field
2. WHEN typing in a field THEN the system SHALL automatically advance to the next field
3. WHEN backspacing in an empty field THEN the system SHALL focus the previous field
4. WHEN pasting a 5-character code THEN the system SHALL distribute characters across all fields
5. WHEN all fields are filled THEN the system SHALL automatically attempt validation
6. WHEN using the shadcn OTP component THEN the system SHALL maintain consistent styling with the app theme
