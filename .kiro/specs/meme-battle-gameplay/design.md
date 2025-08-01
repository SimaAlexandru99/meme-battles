# Design Document

## Overview

The Meme Battle Gameplay system is a real-time multiplayer game interface that orchestrates turn-based meme battles. Players progress through distinct phases: card selection, submission, voting, and results. The system leverages Firebase for real-time synchronization, Vercel AI SDK for situation generation, and a responsive React interface optimized for both mobile and desktop experiences.

## Architecture

### Component Hierarchy

```
GamePlay (Main Container)
├── GameHeader
│   ├── BackButton
│   ├── GameTitle
│   ├── LobbyCode
│   └── PlayerCount
├── GamePhaseManager
│   ├── LoadingPhase
│   ├── SubmissionPhase
│   │   ├── SituationDisplay
│   │   ├── MemeCardHand
│   │   ├── SubmissionTimer
│   │   └── SubmitButton
│   ├── VotingPhase
│   │   ├── SubmissionGrid
│   │   ├── VotingTimer
│   │   └── VoteButton
│   └── ResultsPhase
│       ├── WinnerAnnouncement
│       ├── ScoreBoard
│       └── NextRoundButton
├── GameSidebar
│   ├── PlayerList
│   ├── ScoreTracker
│   └── GameChat
└── GameFooter
    ├── LeaveGameButton
    └── GameStats
```

### State Management Architecture

```typescript
interface GameState {
  // Game Meta
  lobbyCode: string;
  gameId: string;
  currentRound: number;
  totalRounds: number;
  phase: GamePhase;

  // Players
  players: Player[];
  currentPlayer: Player;
  hostId: string;

  // Game Content
  currentSituation: string;
  playerHand: MemeCard[];
  submissions: Submission[];
  votes: Vote[];

  // Timers
  phaseTimer: number;
  phaseStartTime: Date;

  // UI State
  selectedCard: MemeCard | null;
  hasSubmitted: boolean;
  hasVoted: boolean;
  isLoading: boolean;
  error: string | null;
}

enum GamePhase {
  LOADING = "loading",
  SUBMISSION = "submission",
  VOTING = "voting",
  RESULTS = "results",
  GAME_OVER = "game_over",
}
```

## Components and Interfaces

### GamePlay Component

```typescript
interface GamePlayProps {
  lobbyCode: string;
  currentUser: User;
}

interface GamePlayState {
  gameState: GameState;
  isConnected: boolean;
  reconnectAttempts: number;
}
```

**Responsibilities:**

- Initialize game connection and state
- Handle real-time updates from Firebase
- Manage phase transitions
- Coordinate child components

### SituationDisplay Component

```typescript
interface SituationDisplayProps {
  situation: string;
  isLoading: boolean;
  onRetry: () => void;
}
```

**Responsibilities:**

- Display AI-generated situation text
- Handle loading and error states
- Provide retry mechanism for failed generations
- Animate situation changes

### MemeCardHand Component

```typescript
interface MemeCardHandProps {
  cards: MemeCard[];
  selectedCard: MemeCard | null;
  onCardSelect: (card: MemeCard) => void;
  disabled: boolean;
}

interface MemeCard {
  id: string;
  filename: string;
  url: string;
  alt: string;
}
```

**Responsibilities:**

- Display player's 7 meme cards
- Handle card selection with visual feedback
- Implement responsive layout (grid/horizontal scroll)
- Lazy load images with proper error handling

### SubmissionGrid Component

```typescript
interface SubmissionGridProps {
  submissions: Submission[];
  onVote: (submissionId: string) => void;
  hasVoted: boolean;
  currentUserId: string;
}

interface Submission {
  id: string;
  playerId: string;
  memeCard: MemeCard;
  votes: number;
  isWinner?: boolean;
}
```

**Responsibilities:**

- Display all player submissions anonymously
- Handle voting interactions
- Show vote counts during results phase
- Highlight winning submission

### GameChat Component

```typescript
interface GameChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUserId: string;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: Date;
}
```

**Responsibilities:**

- Real-time chat functionality
- Message filtering and moderation
- Auto-scroll to latest messages
- Mobile-optimized input

## Data Models

### Firebase Game Document Structure

```typescript
interface GameDocument {
  // Meta
  id: string;
  lobbyCode: string;
  status: "waiting" | "playing" | "finished";
  createdAt: Date;
  updatedAt: Date;

  // Game Settings
  settings: {
    rounds: number;
    submissionTime: number; // seconds
    votingTime: number; // seconds
  };

  // Current State
  currentRound: number;
  phase: GamePhase;
  phaseStartTime: Date;
  currentSituation: string;

  // Players
  players: {
    [playerId: string]: {
      id: string;
      name: string;
      profileURL: string;
      score: number;
      isConnected: boolean;
      hand: string[]; // meme filenames
    };
  };

  // Round Data
  submissions: {
    [playerId: string]: {
      memeFilename: string;
      submittedAt: Date;
    };
  };

  votes: {
    [playerId: string]: string; // voted submission playerId
  };

  // Chat
  chat: ChatMessage[];
}
```

### Meme Card System

```typescript
interface MemeCardPool {
  cards: MemeCard[];
  usedCards: Set<string>; // Track used cards across all players
}

// Utility functions
function getRandomMemeCards(count: number, excludeIds: string[]): MemeCard[];
function shuffleMemePool(): MemeCard[];
function validateMemeCard(filename: string): boolean;
```

## Error Handling

### Connection Management

```typescript
interface ConnectionState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastHeartbeat: Date;
}

// Error scenarios
- Network disconnection: Auto-reconnect with exponential backoff
- Firebase timeout: Retry with user notification
- Invalid game state: Reset to last known good state
- Player disconnection: 30-second grace period before removal
```

### Game State Recovery

```typescript
interface GameRecovery {
  saveGameState: (state: GameState) => void;
  loadGameState: () => GameState | null;
  validateGameState: (state: GameState) => boolean;
  syncWithServer: () => Promise<GameState>;
}
```

## Testing Strategy

### Unit Tests

1. **Component Rendering**
   - GamePlay renders correctly with initial state
   - MemeCardHand displays cards properly
   - SituationDisplay handles loading states
   - SubmissionGrid shows submissions correctly

2. **State Management**
   - Game state updates correctly on Firebase changes
   - Phase transitions work as expected
   - Timer countdown functions properly
   - Vote counting is accurate

3. **User Interactions**
   - Card selection updates state
   - Submission process works end-to-end
   - Voting registers correctly
   - Chat messages send and receive

### Integration Tests

1. **Real-time Synchronization**
   - Multiple clients stay synchronized
   - Firebase updates propagate correctly
   - Connection recovery works properly
   - Game state remains consistent

2. **Game Flow**
   - Complete game rounds work end-to-end
   - Phase transitions happen automatically
   - Timers synchronize across clients
   - Scoring calculates correctly

3. **AI Integration**
   - Situation generation works reliably
   - Error handling for AI failures
   - Retry mechanisms function properly
   - Content filtering works as expected

### Performance Tests

1. **Image Loading**
   - Meme cards load efficiently
   - Lazy loading works properly
   - Error states handle gracefully
   - Mobile performance is acceptable

2. **Real-time Updates**
   - Firebase updates are timely (< 2 seconds)
   - Memory usage stays reasonable
   - No memory leaks in long games
   - Smooth animations and transitions

## Security Considerations

### Game Integrity

```typescript
// Server-side validation
interface GameValidation {
  validateSubmission: (playerId: string, memeId: string) => boolean;
  validateVote: (voterId: string, submissionId: string) => boolean;
  preventDoubleVoting: (playerId: string) => boolean;
  validateGamePhase: (action: string, currentPhase: GamePhase) => boolean;
}
```

### Content Moderation

```typescript
interface ContentModeration {
  filterChatMessage: (message: string) => string;
  validateMemeContent: (memeId: string) => boolean;
  reportInappropriateContent: (contentId: string, reporterId: string) => void;
}
```

## Accessibility Features

### Screen Reader Support

- Proper ARIA labels for all interactive elements
- Live regions for game state announcements
- Keyboard navigation for all functionality
- High contrast mode support

### Mobile Accessibility

- Touch targets minimum 44px
- Swipe gestures for card navigation
- Voice-over support for iOS
- TalkBack support for Android

### Visual Accessibility

- Color-blind friendly design
- Scalable text and UI elements
- Focus indicators for keyboard navigation
- Reduced motion options

## Performance Optimizations

### Image Optimization

- WebP format with fallbacks
- Responsive image sizes
- Lazy loading with intersection observer
- Image compression and caching

### Real-time Optimization

- Debounced Firebase updates
- Efficient listener management
- Connection pooling
- Optimistic UI updates

### Memory Management

- Component cleanup on unmount
- Image cache management
- Event listener cleanup
- Garbage collection optimization
