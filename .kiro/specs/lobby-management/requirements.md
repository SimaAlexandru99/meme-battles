# Requirements Document

## Introduction

The lobby management system is the core feature that enables players to create and join private game rooms in Meme Battles. This system handles the entire lifecycle from lobby creation, player joining, game configuration, to transitioning into active gameplay. The system must support real-time synchronization across all connected players using Firebase Realtime Database, ensuring a seamless multiplayer experience with low latency and high reliability.

## Requirements

### Requirement 1

**User Story:** As a player, I want to create a private lobby with a unique invitation code, so that I can invite specific friends to play together.

#### Acceptance Criteria

1. WHEN a player clicks "Create Lobby" THEN the system SHALL generate a unique 5-character alphanumeric invitation code
2. WHEN a lobby is created THEN the system SHALL store the lobby data in Firebase Realtime Database under `/lobbies/{code}`
3. WHEN a lobby is created THEN the system SHALL set the creator as the host with administrative privileges
4. WHEN a lobby is created THEN the system SHALL initialize the lobby with default game settings (8 rounds, 60-second time limit, all categories enabled)
5. WHEN a lobby is created THEN the system SHALL set the maximum player count to 8 players
6. WHEN a lobby is created THEN the system SHALL set the lobby status to "waiting"
7. IF lobby creation fails THEN the system SHALL display a clear error message and allow retry

### Requirement 2

**User Story:** As a player, I want to join a private lobby using an invitation code, so that I can participate in games with my friends.

#### Acceptance Criteria

1. WHEN a player enters a 5-character invitation code THEN the system SHALL validate the code format before attempting to join
2. WHEN a valid invitation code is submitted THEN the system SHALL check if the lobby exists in Firebase Realtime Database
3. WHEN joining a lobby THEN the system SHALL verify the lobby is not full (less than maxPlayers)
4. WHEN joining a lobby THEN the system SHALL verify the lobby status is "waiting" (not started or ended)
5. WHEN successfully joining THEN the system SHALL add the player to the lobby's players list with their profile information
6. WHEN successfully joining THEN the system SHALL redirect the player to the lobby interface
7. IF the lobby code is invalid THEN the system SHALL display "Lobby not found" error
8. IF the lobby is full THEN the system SHALL display "Lobby is full" error
9. IF the lobby has already started THEN the system SHALL display "Game already in progress" error

### Requirement 3

**User Story:** As a lobby host, I want to configure game settings before starting the game, so that I can customize the experience for my group.

#### Acceptance Criteria

1. WHEN the host is in the lobby THEN the system SHALL display game settings controls only to the host
2. WHEN the host changes settings THEN the system SHALL update the lobby data in real-time for all players
3. WHEN configuring rounds THEN the system SHALL allow selection between 3-15 rounds
4. WHEN configuring time limit THEN the system SHALL allow selection between 30-120 seconds per round
5. WHEN configuring categories THEN the system SHALL allow enabling/disabling meme categories
6. WHEN settings are changed THEN the system SHALL validate all settings are within acceptable ranges
7. WHEN settings are invalid THEN the system SHALL prevent saving and display validation errors

### Requirement 4

**User Story:** As a player in a lobby, I want to see real-time updates of other players joining and leaving, so that I know who will be participating in the game.

#### Acceptance Criteria

1. WHEN a player joins the lobby THEN the system SHALL immediately update the player list for all connected players
2. WHEN a player leaves the lobby THEN the system SHALL remove them from the player list in real-time
3. WHEN the host leaves THEN the system SHALL transfer host privileges to the next player who joined
4. WHEN displaying players THEN the system SHALL show their display name, avatar, and host status
5. WHEN a player's profile updates THEN the system SHALL reflect changes in real-time
6. WHEN the lobby becomes empty THEN the system SHALL automatically delete the lobby after 5 minutes
7. IF real-time connection is lost THEN the system SHALL attempt to reconnect and show connection status

### Requirement 5

**User Story:** As a lobby host, I want to start the game when all players are ready, so that we can begin playing together.

#### Acceptance Criteria

1. WHEN the host clicks "Start Game" THEN the system SHALL verify at least 3 players are in the lobby
2. WHEN starting the game THEN the system SHALL change the lobby status to "started"
3. WHEN starting the game THEN the system SHALL initialize the game state with round 1, submission phase
4. WHEN starting the game THEN the system SHALL distribute 7 unique meme cards to each player
5. WHEN starting the game THEN the system SHALL generate the first situation prompt using AI
6. WHEN starting the game THEN the system SHALL redirect all players to the game interface
7. IF fewer than 3 players THEN the system SHALL display "Need at least 3 players to start" error
8. IF game start fails THEN the system SHALL maintain lobby state and display error message

### Requirement 6

**User Story:** As a player, I want to leave a lobby at any time, so that I can exit if I no longer want to participate.

#### Acceptance Criteria

1. WHEN a player clicks "Leave Lobby" THEN the system SHALL remove them from the lobby immediately
2. WHEN a player leaves THEN the system SHALL update the player count for remaining players
3. WHEN a non-host player leaves THEN the system SHALL maintain the current host
4. WHEN the host leaves and other players remain THEN the system SHALL transfer host to the next player
5. WHEN the last player leaves THEN the system SHALL mark the lobby for deletion
6. WHEN leaving THEN the system SHALL redirect the player to the main menu
7. WHEN leaving THEN the system SHALL clean up any real-time listeners to prevent memory leaks

### Requirement 7

**User Story:** As a player, I want to see lobby information and player status clearly, so that I understand the current state before the game starts.

#### Acceptance Criteria

1. WHEN viewing the lobby THEN the system SHALL display the lobby code prominently for sharing
2. WHEN viewing the lobby THEN the system SHALL show current player count vs maximum players
3. WHEN viewing the lobby THEN the system SHALL display current game settings (rounds, time limit, categories)
4. WHEN viewing the lobby THEN the system SHALL show each player's name, avatar, and join time
5. WHEN viewing the lobby THEN the system SHALL clearly indicate who is the host
6. WHEN viewing the lobby THEN the system SHALL show the lobby status (waiting, starting, etc.)
7. WHEN viewing the lobby THEN the system SHALL display appropriate action buttons based on user role (host vs player)

### Requirement 8

**User Story:** As a player, I want the system to handle network issues gracefully, so that temporary connectivity problems don't ruin the game experience.

#### Acceptance Criteria

1. WHEN network connection is lost THEN the system SHALL display a connection status indicator
2. WHEN connection is restored THEN the system SHALL automatically reconnect to the lobby
3. WHEN reconnecting THEN the system SHALL sync the latest lobby state
4. WHEN connection issues persist THEN the system SHALL provide manual reconnect option
5. WHEN offline for more than 2 minutes THEN the system SHALL remove the player from the lobby
6. WHEN rejoining after disconnection THEN the system SHALL restore the player's position if the lobby still exists
7. IF the lobby was deleted during disconnection THEN the system SHALL redirect to main menu with explanation
