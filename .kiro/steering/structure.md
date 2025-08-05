---
inclusion: always
---

# Project Structure & Code Organization

## Directory Structure Rules

**ALWAYS follow this exact structure when creating new files:**

```text
/app                    # Next.js App Router - pages and layouts only
  /(auth)              # Authentication routes (grouped)
  /(front)             # Main application routes (grouped)
  layout.tsx           # Root layout with providers
  globals.css          # Global styles and Tailwind

/components             # React components - organized by domain
  /forms               # Form-specific components
  /game-settings       # Game configuration components
  /shared              # Reusable cross-feature components
  /ui                  # shadcn/ui components ONLY

/hooks                  # Custom React hooks - business logic
/lib                    # Utilities and services
  /actions             # Next.js Server Actions
  /services            # Business logic services
  /utils               # Pure utility functions

/providers              # React context providers
/firebase               # Firebase configuration files (Realtime Database)
/types                  # TypeScript type definitions
```

## Mandatory Naming Conventions

- **Files**: kebab-case (e.g., `game-lobby.tsx`, `use-mobile.ts`)
- **Components**: PascalCase exports, kebab-case filenames
- **Hooks**: camelCase starting with `use` (e.g., `useCurrentUser`)
- **Types/Interfaces**: PascalCase (e.g., `GameState`, `PlayerData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_PLAYERS`)

## Import Order Requirements

**ALWAYS organize imports in this exact order:**

```typescript
// 1. External libraries first
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

// 2. Internal imports with path aliases
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { GameService } from "@/lib/services/game-service";

// 3. Type imports last
import type { GameState } from "@/types";
```

## Component Placement Rules

- **UI Components**: `/components/ui` - shadcn/ui components ONLY
- **Feature Components**: `/components/{domain}` - group by game feature
- **Shared Components**: `/components/shared` - reusable across features
- **Page Components**: Co-located with routes in `/app`

## Architecture Patterns

- **Separation of Concerns**: UI components should NOT contain business logic
- **Custom Hooks**: Extract all stateful logic into custom hooks
- **Server Actions**: Place all server-side operations in `/lib/actions`
- **Type Safety**: Every component must have proper TypeScript types
- **Accessibility**: Include ARIA labels and keyboard navigation for all interactive elements

## File Creation Guidelines

- **Components**: Create in appropriate domain folder with `.tsx` extension
- **Hooks**: Place in `/hooks` with descriptive names starting with `use`
- **Services**: Business logic goes in `/lib/services` with class-based structure
- **Types**: Define in `/types/index.d.ts` or co-located type files
- **Tests**: Co-locate with `.test.tsx` suffix in same directory
