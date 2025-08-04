# Game Settings Components

## Structure Guidelines

### File Organization

```
components/game-settings/
├── index.ts                    # Main exports
├── types.ts                    # Shared types and interfaces
├── animations.ts               # Shared animation variants
├── README.md                   # This documentation
├── PATTERNS.md                 # Patterns guide
├── GameSettingsModal.tsx       # Main modal component
├── GameSettingsForm.tsx        # Form container component
├── RoundsSelector.tsx          # Individual form field
├── TimeLimitSlider.tsx         # Individual form field
├── CategoriesSelector.tsx       # Individual form field
├── AISettingsSelector.tsx      # Individual form field
├── AddBotButton.tsx            # Action component
├── AddBotModal.tsx             # Dialog component
├── FormErrorDisplay.tsx        # Shared error display
├── settings-preview.tsx        # Preview component
└── settings-preview-demo.tsx   # Demo component
```

### Naming Conventions

#### Files

- **Component files**: PascalCase (`GameSettingsForm.tsx`)
- **Utility files**: kebab-case (`settings-preview.tsx`)
- **Type files**: kebab-case (`types.ts`)
- **Animation files**: kebab-case (`animations.ts`)

#### Components

- **Main components**: PascalCase (`GameSettingsForm`)
- **Sub-components**: PascalCase with descriptive names (`FormErrorDisplay`)

#### Interfaces

- **Props interfaces**: ComponentName + "Props" (`GameSettingsFormProps`)
- **Data interfaces**: Descriptive PascalCase (`GameSettingsFormData`)
- **Validation interfaces**: Descriptive PascalCase (`GameSettingsValidationErrors`)

### Component Structure Pattern

```typescript
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion"; // If animations needed
import { Card, CardContent } from "@/components/ui/card"; // UI components
import { cn } from "@/lib/utils"; // Utility imports
import { componentVariants, microInteractionVariants } from "./animations"; // Animation imports

interface ComponentNameProps {
  // Props definition
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function ComponentName({
  value,
  onChange,
  disabled = false,
  error,
  className,
}: ComponentNameProps) {
  // State management
  const [localState, setLocalState] = React.useState();

  // Event handlers with useCallback
  const handleChange = React.useCallback((newValue: string) => {
    onChange(newValue);
  }, [onChange]);

  // Render with animations
  return (
    <motion.div
      className={cn("space-y-4", className)}
      variants={componentVariants}
      initial="initial"
      animate="animate"
    >
      {/* Component content */}
    </motion.div>
  );
}
```

### Animation Pattern

All components use consistent Framer Motion animations from the shared `animations.ts` file:

```typescript
// Import animation variants
import {
  componentVariants,
  buttonVariants,
  cardVariants,
  microInteractionVariants,
  messageVariants,
  formFieldVariants
} from "./animations";

// Use in components
<motion.div
  variants={componentVariants}
  initial="initial"
  animate="animate"
  exit="exit"
>
  {/* Content */}
</motion.div>
```

### Available Animation Variants

- **`componentVariants`**: Standard entrance/exit animations for main components
- **`modalVariants`**: Modal-specific animations with spring physics
- **`buttonVariants`**: Button hover and tap animations
- **`cardVariants`**: Card selection and hover animations
- **`microInteractionVariants`**: Small element animations
- **`badgeVariants`**: Badge and indicator animations
- **`formFieldVariants`**: Form field entrance animations
- **`messageVariants`**: Error/success message animations
- **`listItemVariants`**: Staggered list animations
- **`slideVariants`**: Slide transitions
- **`fadeVariants`**: Simple fade transitions
- **`spinnerVariants`**: Loading spinner animations
- **`pulseVariants`**: Pulse animations for active states

### Validation Pattern

```typescript
// In types.ts
export interface ValidationErrors {
  fieldName?: string;
}

// In component
const [errors, setErrors] = React.useState<ValidationErrors>({});

const validateField = (value: string) => {
  const newErrors: ValidationErrors = {};

  if (!value) {
    newErrors.fieldName = "This field is required";
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### Error Display Pattern

```typescript
// Use FieldError component for inline errors
<FieldError error={errors.fieldName} />

// Use FormErrorDisplay for form-level errors
<FormErrorDisplay errors={errors} onDismiss={clearErrors} />
```

### Styling Pattern

```typescript
// Use consistent color scheme
const baseClasses = "bg-slate-800/50 backdrop-blur-sm border-slate-700/50";
const accentClasses = "bg-purple-600/20 border-purple-500/30";
const errorClasses = "border-red-500/50 bg-red-500/10";

// Use cn() for conditional classes
className={cn(
  "base-classes",
  isSelected && "selected-classes",
  error && "error-classes",
  className
)}
```

### Props Pattern

```typescript
interface ComponentProps {
  // Required props first
  value: string;
  onChange: (value: string) => void;

  // Optional props with defaults
  disabled?: boolean;
  error?: string;
  className?: string;

  // Event handlers
  onFocus?: () => void;
  onBlur?: () => void;
}
```

### State Management Pattern

```typescript
// Use React.useState for local state
const [isOpen, setIsOpen] = React.useState(false);

// Use React.useCallback for event handlers
const handleChange = React.useCallback(
  (value: string) => {
    onChange(value);
  },
  [onChange],
);

// Use React.useEffect for side effects
React.useEffect(() => {
  if (isOpen) {
    // Reset form when dialog opens
    setFormData(initialData);
    setErrors({});
  }
}, [isOpen]);
```

### Accessibility Pattern

```typescript
// Always include proper ARIA attributes
<div
  role="alert"
  aria-live="polite"
  className="error-display"
>
  {error}
</div>

// Use proper form labels
<Label htmlFor="field-id" className="text-sm font-medium text-white">
  Field Label
</Label>
```

### Export Pattern

```typescript
// In index.ts
export { ComponentName } from "./ComponentName";
export type { ComponentNameProps } from "./ComponentName";

// In component file
export { ComponentName };
export type { ComponentNameProps };
```

## Best Practices

1. **Consistent Error Handling**: Always use `FieldError` for field-level errors and `FormErrorDisplay` for form-level errors
2. **Validation**: Implement validation in the component and expose validation state through props
3. **Styling**: Use the established color scheme (slate/purple) and glass morphism effects
4. **Animations**: Use Framer Motion consistently with shared animation variants from `animations.ts`
5. **Accessibility**: Include proper ARIA attributes and keyboard navigation
6. **Performance**: Use `React.useCallback` for event handlers and `React.useMemo` for expensive calculations
7. **TypeScript**: Provide comprehensive type definitions for all props and return values
8. **Animation Consistency**: Always import and use animation variants from the shared animations file
