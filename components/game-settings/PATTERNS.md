# Game Settings Component Patterns

## Current Structure Analysis

### ✅ **Consistent Patterns Found:**

1. **File Naming**: All component files use PascalCase (`GameSettingsForm.tsx`)
2. **Component Naming**: All components use PascalCase (`GameSettingsForm`)
3. **Interface Naming**: Props interfaces use ComponentName + "Props" pattern
4. **Import Structure**: Consistent import order (React, external libs, internal components)
5. **Styling**: Consistent use of `cn()` utility and Tailwind classes
6. **Error Handling**: Consistent error display patterns using `FieldError` and `FormErrorDisplay`

### ❌ **Inconsistencies Found:**

1. **Animation Usage**: Some components use Framer Motion (`GameSettingsModal`, `AddBotDialog`), others don't
2. **Validation Patterns**: Inconsistent validation implementation across components
3. **Type Organization**: Some types in `types.ts`, others inline in components
4. **Component Structure**: Mixed patterns in component organization

## Recommendations for Consistency

### 1. **Animation Consistency**

All components that need animations should use Framer Motion with consistent variants:

```typescript
// Standard animation variants for all components
const componentVariants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
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
    transition: { duration: 0.2, ease: "easeInOut" },
  },
};
```

### 2. **Validation Pattern Standardization**

All form components should follow this validation pattern:

```typescript
// In component
const [errors, setErrors] = React.useState<Record<string, string>>({});

const validateField = (value: string) => {
  const newErrors: Record<string, string> = {};

  if (!value) {
    newErrors.fieldName = "This field is required";
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### 3. **Type Organization**

Move all shared types to `types.ts` and keep only component-specific interfaces inline:

```typescript
// In types.ts
export interface BaseFormFieldProps {
  disabled?: boolean;
  error?: string;
  className?: string;
}

// In component
interface ComponentNameProps extends BaseFormFieldProps {
  value: string;
  onChange: (value: string) => void;
}
```

### 4. **Component Structure Standardization**

All components should follow this structure:

```typescript
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion"; // If needed
import { cn } from "@/lib/utils";
import { FieldError } from "./FormErrorDisplay";

interface ComponentNameProps {
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

  // Render with consistent styling
  return (
    <div className={cn("space-y-4", className)}>
      {/* Component content */}
      <FieldError error={error} />
    </div>
  );
}
```

### 5. **Styling Consistency**

Use consistent color scheme and styling patterns:

```typescript
// Base classes
const baseClasses = "bg-slate-800/50 backdrop-blur-sm border-slate-700/50";
const accentClasses = "bg-purple-600/20 border-purple-500/30";
const errorClasses = "border-red-500/50 bg-red-500/10";

// Conditional classes with cn()
className={cn(
  "base-classes",
  isSelected && "selected-classes",
  error && "error-classes",
  className
)}
```

### 6. **Props Pattern**

Follow consistent props ordering:

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

### 7. **Error Handling Standardization**

Always use the established error components:

```typescript
// For field-level errors
<FieldError error={errors.fieldName} />

// For form-level errors
<FormErrorDisplay errors={errors} onDismiss={clearErrors} />
```

## Implementation Checklist

When creating or modifying game-settings components:

- [ ] Use PascalCase for component names and files
- [ ] Follow the established import order
- [ ] Use `cn()` utility for conditional classes
- [ ] Include proper TypeScript interfaces
- [ ] Use `React.useCallback` for event handlers
- [ ] Include proper error handling with `FieldError`
- [ ] Use consistent color scheme (slate/purple)
- [ ] Add proper ARIA attributes for accessibility
- [ ] Use Framer Motion for animations when needed
- [ ] Follow the established validation patterns
- [ ] Export components and types properly in `index.ts`

## File Organization

```
components/game-settings/
├── index.ts                    # Main exports
├── types.ts                    # Shared types
├── README.md                   # Documentation
├── PATTERNS.md                 # This patterns guide
├── GameSettingsModal.tsx       # Main modal
├── GameSettingsForm.tsx        # Form container
├── RoundsSelector.tsx          # Form field
├── TimeLimitSlider.tsx         # Form field
├── CategoriesSelector.tsx       # Form field
├── AISettingsSelector.tsx      # Form field
├── AddBotButton.tsx            # Action component
├── AddBotDialog.tsx            # Dialog component
├── FormErrorDisplay.tsx        # Error utilities
├── settings-preview.tsx        # Preview component
└── settings-preview-demo.tsx   # Demo component
```
