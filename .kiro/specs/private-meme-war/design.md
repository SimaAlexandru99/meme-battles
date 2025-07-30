# Design Document

## Overview

The Private Meme War feature transforms the existing hero section into an interactive lobby creation and joining interface. The design leverages smooth animations to transition between the main game selection and the private lobby interface, maintaining the existing visual language while introducing new functionality for private game management.

The feature consists of two main interaction flows:

1. **Join Flow**: Users enter a 5-character invitation code to join existing private lobbies
2. **Create Flow**: Users create new private lobbies and receive invitation codes to share

## Architecture

### Component Hierarchy

```
HeroSection (existing)
├── Header (existing)
├── GameCardsSection (existing)
│   ├── AvatarSetupCard (existing)
│   ├── MemeBattleRoyaleCard (existing)
│   └── PrivateMemeWarCard (existing) ← Triggers transition
├── PrivateLobbySection (NEW)
│   ├── BackButton (NEW)
│   ├── JoinWithCodeSection (NEW)
│   │   ├── EnvelopeIcon (NEW)
│   │   ├── InvitationCodeInput (NEW) ← Uses shadcn OTP
│   │   └── JoinButton (NEW)
│   └── CreateLobbySection (NEW)
│       ├── FriendCards (NEW)
│       ├── SpeechBubble (NEW)
│       └── CreateButton (NEW)
└── BottomNavigation (existing)
```

### State Management

The feature uses React state to manage the transition between views and lobby operations:

```typescript
interface PrivateLobbyState {
  showPrivateLobby: boolean;
  isJoining: boolean;
  isCreating: boolean;
  invitationCode: string;
  error: string | null;
  createdLobbyCode: string | null;
}
```

### Animation System

The design uses Framer Motion for smooth transitions with three animation phases:

1. **Exit Phase**: Existing cards animate out
2. **Enter Phase**: Private lobby interface animates in
3. **Return Phase**: Reverse animation back to main view

## Components and Interfaces

### PrivateLobbySection Component

```typescript
interface PrivateLobbySectionProps {
  onBackToMain: () => void;
  onJoinLobby: (code: string) => Promise<void>;
  onCreateLobby: () => Promise<string>;
  isLoading?: boolean;
  error?: string | null;
}
```

**Responsibilities:**

- Orchestrates the private lobby interface
- Manages loading states and error handling
- Coordinates between join and create sections
- Handles back navigation

### JoinWithCodeSection Component

```typescript
interface JoinWithCodeSectionProps {
  onJoinLobby: (code: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}
```

**Key Features:**

- Uses shadcn InputOTP component for 5-character code input
- Golden envelope icon with notification badge
- Romanian localization: "Alătură-te cu codul de invitație"
- Auto-focus and keyboard navigation
- Real-time validation

**Visual Design:**

- Centered layout with golden envelope icon
- 5 input boxes with purple theme styling
- Error states with red highlighting
- Loading spinner during join attempts

### CreateLobbySection Component

```typescript
interface CreateLobbySectionProps {
  onCreateLobby: () => Promise<string>;
  isLoading: boolean;
  createdCode?: string | null;
}
```

**Key Features:**

- Two overlapping blue cards with yellow smiley faces
- Green speech bubble with plus icon
- Romanian localization: "Creează un lobby și invită-ți prietenii"
- Success state showing generated invitation code

**Visual Design:**

- Two blue gradient cards (overlapping at slight angle)
- Yellow smiley face icons on each card
- Green speech bubble with plus icon positioned above cards
- Large green gradient button: "CREEAZĂ LOBBY-UL MEU"

### InvitationCodeInput Component

```typescript
interface InvitationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}
```

**Implementation Details:**

- Built on shadcn InputOTP component
- 5 character slots with auto-advance
- Paste support for full codes
- Backspace navigation between fields
- Purple theme integration

## Data Models

### LobbyInvitation

```typescript
interface LobbyInvitation {
  code: string; // 5-character alphanumeric
  lobbyId: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  maxPlayers: number;
  currentPlayers: number;
}
```

### PrivateLobby

```typescript
interface PrivateLobby {
  id: string;
  invitationCode: string;
  hostId: string;
  players: Player[];
  status: "waiting" | "starting" | "in-progress" | "completed";
  createdAt: Date;
  settings: {
    maxPlayers: number;
    gameMode: string;
    timeLimit: number;
  };
}
```

### Player

```typescript
interface Player {
  id: string;
  nickname: string;
  avatarId: string;
  profileURL?: string;
  isHost: boolean;
  joinedAt: Date;
}
```

## Error Handling

### Error Types

```typescript
type LobbyError =
  | "INVALID_CODE"
  | "LOBBY_NOT_FOUND"
  | "LOBBY_FULL"
  | "LOBBY_EXPIRED"
  | "NETWORK_ERROR"
  | "CREATION_FAILED"
  | "PERMISSION_DENIED";
```

### Error Display Strategy

- **Inline Errors**: Show below input fields with red styling
- **Toast Notifications**: For network and system errors
- **Fallback Navigation**: Return to main screen on critical errors
- **Retry Mechanisms**: Allow users to retry failed operations

## Testing Strategy

### Unit Tests

1. **Component Rendering**
   - PrivateLobbySection renders correctly
   - JoinWithCodeSection displays proper UI elements
   - CreateLobbySection shows correct layout

2. **State Management**
   - Animation state transitions work correctly
   - Loading states are properly managed
   - Error states are handled appropriately

3. **Input Validation**
   - InvitationCodeInput validates 5-character codes
   - Auto-advance functionality works
   - Paste support functions correctly

### Integration Tests

1. **Animation Flow**
   - Cards animate out smoothly
   - Private lobby interface animates in
   - Back navigation reverses animations

2. **Lobby Operations**
   - Join lobby with valid code succeeds
   - Create lobby generates valid invitation code
   - Error handling works for invalid operations

3. **User Experience**
   - Keyboard navigation functions properly
   - Screen reader accessibility works
   - Mobile responsive design functions

### End-to-End Tests

1. **Complete User Flows**
   - User can navigate from main screen to private lobby
   - User can successfully join a lobby with invitation code
   - User can create a lobby and receive invitation code
   - User can return to main screen from private lobby

2. **Error Scenarios**
   - Invalid invitation codes show appropriate errors
   - Network failures are handled gracefully
   - Expired lobbies show proper messaging

## Animation Specifications

### Exit Animation (Cards Out)

```typescript
const cardExitVariants = {
  exit: {
    x: (custom: number) => (custom === 0 ? -1000 : 1000),
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.6,
      ease: [0.4, 0.0, 0.2, 1], // Custom easing
      staggerChildren: 0.1,
    },
  },
};
```

### Enter Animation (Lobby In)

```typescript
const lobbyEnterVariants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    y: 50,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.8,
      type: "spring",
      stiffness: 100,
      damping: 15,
      staggerChildren: 0.2,
    },
  },
};
```

### Micro-interactions

- **Button Hover**: Scale 1.05 with 200ms transition
- **Input Focus**: Purple glow with ring animation
- **Error States**: Shake animation for invalid inputs
- **Success States**: Bounce animation for successful operations

## Responsive Design

### Breakpoint Strategy

- **Mobile (< 640px)**: Stack sections vertically, full-width inputs
- **Tablet (640px - 1024px)**: Side-by-side layout with adjusted spacing
- **Desktop (> 1024px)**: Full layout with optimal spacing

### Mobile Optimizations

- Larger touch targets (minimum 44px)
- Simplified animations for performance
- Optimized keyboard handling for mobile browsers
- Reduced motion for users with motion sensitivity preferences

## Accessibility Features

### Keyboard Navigation

- Tab order: Back button → Join inputs → Create button
- Enter key submits forms
- Escape key returns to main screen
- Arrow keys navigate between OTP inputs

### Screen Reader Support

- Proper ARIA labels for all interactive elements
- Live regions for dynamic content updates
- Descriptive text for visual elements
- Error announcements for form validation

### Visual Accessibility

- High contrast text (WCAG AA compliant)
- Focus indicators with 2px purple outline
- Error states with both color and text indicators
- Reduced motion support via prefers-reduced-motion

## Performance Considerations

### Animation Performance

- Use transform and opacity for animations (GPU accelerated)
- Implement will-change CSS property for animating elements
- Debounce input validation to reduce computation
- Lazy load components not immediately visible

### Bundle Size Optimization

- Tree-shake unused Framer Motion features
- Use dynamic imports for heavy components
- Optimize image assets with next/image
- Implement code splitting for lobby functionality

### Memory Management

- Clean up event listeners on component unmount
- Cancel pending network requests on navigation
- Implement proper cleanup for animation timers
- Use React.memo for expensive re-renders
