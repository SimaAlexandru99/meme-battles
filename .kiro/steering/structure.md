# Project Structure & Organization

## Directory Layout

```
/app                    # Next.js App Router pages
  /(auth)              # Authentication routes (grouped)
  /(front)             # Main application routes (grouped)
  /test-invitation-code # Testing utilities
  layout.tsx           # Root layout with providers
  globals.css          # Global styles and Tailwind

/components             # React components
  /forms               # Form-specific components
  /game-settings       # Game configuration components
  /logos               # Brand assets
  /shared              # Reusable components
  /ui                  # shadcn/ui components

/hooks                  # Custom React hooks
/lib                    # Utility functions and services
  /actions             # Server actions
  /animations          # Animation variants and configs
  /services            # Business logic services

/providers              # React context providers
/firebase               # Firebase configuration
/types                  # TypeScript type definitions
/__tests__              # Test files
  /utils               # Test utilities
```

## Naming Conventions

- **Files**: kebab-case (e.g., `game-lobby.tsx`, `use-mobile.ts`)
- **Components**: PascalCase exports, kebab-case files
- **Hooks**: camelCase starting with `use` (e.g., `useCurrentUser`)
- **Types**: PascalCase interfaces/types
- **Constants**: UPPER_SNAKE_CASE

## Component Organization

- **UI Components**: Located in `/components/ui` (shadcn/ui)
- **Feature Components**: Organized by domain (e.g., game, auth, forms)
- **Shared Components**: Reusable across features in `/components/shared`
- **Page Components**: Co-located with routes in `/app`

## Import Patterns

```typescript
// External libraries first
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

// Internal imports with path aliases
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { GameService } from "@/lib/services/game-service";
```

## Code Organization Principles

- **Feature-based**: Group related functionality together
- **Separation of Concerns**: UI, business logic, and data layers separated
- **Accessibility First**: All components include proper ARIA labels and keyboard navigation
- **Type Safety**: Comprehensive TypeScript coverage with strict mode
- **Testing**: Co-located test files with `.test.tsx` suffix

## Configuration Files

- `components.json`: shadcn/ui configuration
- `tsconfig.json`: TypeScript compiler options with path aliases
- `jest.config.ts`: Testing configuration with coverage thresholds
- `next.config.ts`: Next.js configuration with Sentry integration
