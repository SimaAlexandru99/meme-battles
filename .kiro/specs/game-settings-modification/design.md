# Design Document

## Overview

The Game Settings Modification feature extends the existing private lobby system by providing hosts with the ability to customize game parameters before starting a match. The design leverages the existing lobby infrastructure and UI patterns while introducing a modal-based settings interface that maintains visual consistency with the current design system.

The feature integrates seamlessly with the existing `GameLobby` component and uses the established `LobbySettings` interface, providing real-time updates to all lobby participants when settings are modified.

## Architecture

### Component Hierarchy

```
GameLobby (existing)
├── LobbyInfoCard (existing)
│   ├── GameSettingsSection (existing)
│   └── HostControls (existing)
│       ├── StartGameButton (existing)
│       └── GameSettingsButton (existing) ← Enhanced
└── GameSettingsModal (NEW)
    ├── SettingsHeader (NEW)
    ├── SettingsForm (NEW)
    │   ├── RoundsSelector (NEW)
    │   ├── TimeLimitSlider (NEW)
    │   └── CategoriesSelector (NEW)
    ├── SettingsPreview (NEW)
    └── SettingsActions (NEW)
        ├── SaveButton (NEW)
        └── CancelButton (NEW)
```

### State Management

The feature extends the existing lobby state management pattern using React state and SWR for data synchronization:

```typescript
interface GameSettingsState {
  isOpen: boolean;
  isLoading: boolean;
  isDirty: boolean;
  error: string | null;
  formData: LobbySettings;
  originalSettings: LobbySettings;
}

interface GameSettingsActions {
  openSettings: () => void;
  closeSettings: () => void;
  updateSetting: <K extends keyof LobbySettings>(
    key: K,
    value: LobbySettings[K],
  ) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
}
```

### Data Flow

1. **Settings Access**: Host clicks "Game Settings" button → Modal opens with current settings
2. **Settings Modification**: Host modifies settings → Form state updates with validation
3. **Settings Preview**: Changes are previewed in real-time within the modal
4. **Settings Save**: Host saves → API call updates lobby → All players receive updates via SWR
5. **Settings Sync**: Updated settings appear in lobby info for all participants

## Components and Interfaces

### GameSettingsModal Component

```typescript
interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: LobbySettings;
  onSave: (settings: LobbySettings) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}
```

**Key Features:**

- Modal overlay with backdrop blur
- Responsive design (full-screen on mobile, centered on desktop)
- Form validation with real-time feedback
- Unsaved changes warning on close
- Keyboard navigation and accessibility support

**Visual Design:**

- Consistent with existing modal patterns using shadcn Dialog
- Purple gradient theme matching lobby design
- Smooth entrance/exit animations using Framer Motion
- Glass morphism effect with backdrop blur

### SettingsForm Component

```typescript
interface SettingsFormProps {
  settings: LobbySettings;
  onChange: (settings: LobbySettings) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}
```

**Form Fields:**

1. **Rounds Selector**
   - Select dropdown with options 1-10
   - Default: 3 rounds
   - Validation: Must be between 1-10

2. **Time Limit Slider**
   - Range slider 30-300 seconds
   - Default: 60 seconds
   - Display format: "1m 30s" for values ≥60s, "45s" for <60s
   - Validation: Must be between 30-300 seconds

3. **Categories Selector**
   - Multi-select checkboxes for meme categories
   - Available categories: ["funny", "wholesome", "dark", "random", "trending"]
   - Default: ["funny", "random"]
   - Validation: At least one category must be selected

### RoundsSelector Component

```typescript
interface RoundsSelectorProps {
  value: number;
  onChange: (rounds: number) => void;
  disabled?: boolean;
  error?: string;
}
```

**Implementation:**

- Uses shadcn Select component
- Options: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
- Custom styling to match lobby theme
- Descriptive labels: "1 Round (Quick)", "3 Rounds (Standard)", "5 Rounds (Extended)", etc.

### TimeLimitSlider Component

```typescript
interface TimeLimitSliderProps {
  value: number; // seconds
  onChange: (seconds: number) => void;
  disabled?: boolean;
  error?: string;
}
```

**Implementation:**

- Uses shadcn Slider component
- Range: 30-300 seconds (30s to 5m)
- Step: 15 seconds
- Custom thumb styling with purple gradient
- Real-time value display with formatted time
- Preset markers at common values (30s, 60s, 120s, 180s, 300s)

### CategoriesSelector Component

```typescript
interface CategoriesSelectorProps {
  value: string[];
  onChange: (categories: string[]) => void;
  disabled?: boolean;
  error?: string;
}

interface CategoryOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}
```

**Implementation:**

- Grid layout of category cards
- Each card shows icon, label, and description
- Toggle selection with visual feedback
- Minimum one category required
- Categories:
  - **Funny** 😂: Classic humor and jokes
  - **Wholesome** 🥰: Positive and heartwarming content
  - **Dark** 🌚: Edgy and dark humor
  - **Random** 🎲: Mixed content from all categories
  - **Trending** 🔥: Popular and viral memes

### SettingsPreview Component

```typescript
interface SettingsPreviewProps {
  settings: LobbySettings;
  originalSettings: LobbySettings;
  className?: string;
}
```

**Features:**

- Side-by-side comparison of current vs. new settings
- Highlight changed values with color coding
- Estimated game duration calculation
- Visual indicators for setting changes

## Data Models

### Enhanced LobbySettings Interface

The existing `LobbySettings` interface is already well-defined:

```typescript
interface LobbySettings {
  rounds: number; // 1-10, default: 3
  timeLimit: number; // 30-300 seconds, default: 60
  categories: string[]; // Array of category IDs, default: ["funny", "random"]
}
```

### Settings Validation Schema

```typescript
interface SettingsValidation {
  rounds: {
    min: 1;
    max: 10;
    required: true;
  };
  timeLimit: {
    min: 30;
    max: 300;
    step: 15;
    required: true;
  };
  categories: {
    minLength: 1;
    maxLength: 5;
    allowedValues: ["funny", "wholesome", "dark", "random", "trending"];
    required: true;
  };
}
```

### API Integration

The feature integrates with existing lobby management APIs:

```typescript
// Update lobby settings endpoint
PUT /api/lobbies/{lobbyCode}/settings
{
  "settings": {
    "rounds": 5,
    "timeLimit": 120,
    "categories": ["funny", "dark", "trending"]
  }
}

// Response
{
  "success": true,
  "lobby": Lobby,
  "message": "Settings updated successfully"
}
```

## Error Handling

### Error Types

```typescript
type SettingsError =
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "LOBBY_NOT_FOUND"
  | "NETWORK_ERROR"
  | "CONCURRENT_MODIFICATION"
  | "GAME_ALREADY_STARTED";
```

### Error Display Strategy

1. **Field-Level Errors**: Show inline validation errors below form fields
2. **Form-Level Errors**: Display general errors at the top of the modal
3. **Network Errors**: Show toast notifications with retry options
4. **Permission Errors**: Redirect to lobby view with error message
5. **Conflict Errors**: Show conflict resolution dialog

### Error Recovery

- **Validation Errors**: Allow user to correct and retry
- **Network Errors**: Provide retry button with exponential backoff
- **Permission Errors**: Close modal and refresh lobby data
- **Conflict Errors**: Offer to reload current settings or force save

## Animation and Interaction Design

### Modal Animations

```typescript
const modalVariants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2,
      ease: "easeInOut",
    },
  },
};
```

### Form Interactions

- **Field Focus**: Subtle glow effect with purple accent
- **Value Changes**: Smooth transitions for slider and visual feedback for selections
- **Validation**: Shake animation for invalid inputs
- **Save Success**: Brief success animation before modal closes

### Real-time Updates

- **Setting Changes**: Animate lobby info updates for all players
- **Player Notifications**: Subtle toast notifications for setting changes
- **Optimistic Updates**: Show changes immediately, rollback on error

## Responsive Design

### Breakpoint Strategy

- **Mobile (< 640px)**: Full-screen modal with stacked form layout
- **Tablet (640px - 1024px)**: Centered modal with two-column form
- **Desktop (> 1024px)**: Centered modal with side-by-side preview

### Mobile Optimizations

- **Touch Targets**: Minimum 44px for all interactive elements
- **Slider Interaction**: Larger thumb size for easier manipulation
- **Category Cards**: Full-width cards with larger touch areas
- **Modal Height**: Scrollable content with fixed header/footer

### Keyboard Navigation

- **Tab Order**: Logical flow through form fields
- **Escape Key**: Close modal with unsaved changes warning
- **Enter Key**: Save settings when form is valid
- **Arrow Keys**: Navigate slider and select options

## Accessibility Features

### Screen Reader Support

- **Modal Announcement**: Announce modal opening and purpose
- **Form Labels**: Proper labels and descriptions for all form fields
- **Error Announcements**: Live regions for validation errors
- **Setting Changes**: Announce successful saves and updates

### Visual Accessibility

- **High Contrast**: WCAG AA compliant color ratios
- **Focus Indicators**: Clear 2px purple outline for focused elements
- **Error States**: Color and text indicators for validation errors
- **Reduced Motion**: Respect prefers-reduced-motion settings

### Keyboard Accessibility

- **Focus Management**: Trap focus within modal when open
- **Logical Tab Order**: Sequential navigation through form elements
- **Keyboard Shortcuts**: Standard shortcuts for save (Ctrl+S) and cancel (Escape)
- **Skip Links**: Allow skipping to main actions

## Performance Considerations

### Optimization Strategies

- **Lazy Loading**: Load modal component only when needed
- **Debounced Validation**: Reduce validation calls during rapid input
- **Memoized Components**: Prevent unnecessary re-renders
- **Optimistic Updates**: Show changes immediately for better UX

### Bundle Size Management

- **Code Splitting**: Separate modal code from main lobby bundle
- **Tree Shaking**: Import only used form components
- **Icon Optimization**: Use lightweight icons for categories
- **Animation Optimization**: Use transform and opacity for GPU acceleration

### Memory Management

- **Event Cleanup**: Remove event listeners on component unmount
- **State Reset**: Clear form state when modal closes
- **SWR Cache**: Leverage existing cache for lobby data
- **Debounce Cleanup**: Cancel pending debounced calls

## Integration Points

### Existing Components

1. **GameLobby**: Add settings modal trigger and state management
2. **LobbyInfoCard**: Update to show real-time setting changes
3. **HostControls**: Enhance settings button with modal trigger
4. **SWR Hooks**: Extend to handle settings updates

### API Endpoints

1. **GET /api/lobbies/{code}**: Already returns settings in lobby data
2. **PUT /api/lobbies/{code}/settings**: New endpoint for updating settings
3. **WebSocket Events**: Real-time notifications for setting changes

### Database Schema

The existing Firestore schema already supports the required fields:

```typescript
// lobbies/{lobbyCode}
{
  settings: {
    rounds: number,
    timeLimit: number,
    categories: string[]
  }
  // ... other lobby fields
}
```

## Testing Strategy

### Unit Tests

1. **Component Rendering**: Test all form components render correctly
2. **Validation Logic**: Test form validation rules and error states
3. **State Management**: Test settings state updates and persistence
4. **Event Handling**: Test user interactions and form submissions

### Integration Tests

1. **Modal Flow**: Test complete open → modify → save → close flow
2. **API Integration**: Test settings update API calls and responses
3. **Real-time Updates**: Test lobby data synchronization across clients
4. **Error Scenarios**: Test network failures and validation errors

### End-to-End Tests

1. **Host Settings Flow**: Complete settings modification by lobby host
2. **Player Updates**: Verify non-host players see setting changes
3. **Responsive Design**: Test modal behavior across screen sizes
4. **Accessibility**: Test keyboard navigation and screen reader support

## Security Considerations

### Authorization

- **Host Verification**: Ensure only lobby host can modify settings
- **Session Validation**: Verify user session before allowing changes
- **Lobby Ownership**: Confirm user owns the lobby being modified

### Input Validation

- **Server-Side Validation**: Validate all settings on the backend
- **Sanitization**: Clean user input to prevent injection attacks
- **Rate Limiting**: Prevent rapid-fire settings updates

### Data Integrity

- **Atomic Updates**: Ensure settings updates are atomic operations
- **Conflict Resolution**: Handle concurrent modification attempts
- **Audit Trail**: Log settings changes for debugging and monitoring
