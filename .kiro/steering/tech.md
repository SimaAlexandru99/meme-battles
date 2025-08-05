---
inclusion: always
---

# Tech Stack & Development Guidelines

## Core Technologies

- **Framework**: Next.js 15.4.5 with App Router (use App Router patterns, not Pages Router)
- **Language**: TypeScript 5.8.3 (strict mode enabled, always use proper typing)
- **Styling**: Tailwind CSS 4.1.11 (use utility classes, avoid custom CSS when possible)
- **UI Components**: shadcn/ui New York style with Radix UI (import from `@/components/ui`)
- **Database**: Firebase Realtime Database (real-time listeners for game state and chat)
- **Authentication**: Firebase Auth with Google + Guest modes
- **AI**: Vercel AI SDK with Google AI for situation generation
- **Animations**: Framer Motion for UI, GSAP for complex sequences
- **Package Manager**: pnpm (never use npm or yarn commands)
- **Type Checking**: ESLint for TypeScript, Prettier for formatting

## Required Libraries & Patterns

- **State Management**: SWR for server state, React state for UI state
- **Forms**: React Hook Form + Zod validation (always validate both client/server)
- **Icons**: Lucide React only (consistent icon family)
- **Notifications**: Sonner for toast messages
- **Theming**: next-themes for dark/light mode
- **Error Tracking**: Sentry for production errors
- **Testing**: Jest + Testing Library (70% coverage minimum)
- **Linter**: ESLint + Prettier (always use strict mode, never allow console.log)
- **Code Style**: Prettier + ESLint (always use strict mode, never allow console.log)
- **Deployment**: Vercel with automatic deployments

## Development Commands

```bash
# Always use pnpm, never npm/yarn
pnpm dev              # Development with Turbopack
pnpm build            # Production build
pnpm test             # Run test suite
pnpm lint             # ESLint validation
```

## Code Style Requirements

- **TypeScript**: Use strict mode, proper types for all props/functions, don't use `any` and for interfaces use index.d.ts what is global
- **Path Aliases**: Always use `@/*` imports, never relative paths for cross-directory imports
- **Component Props**: Define interfaces for all component props
- **Error Handling**: Wrap async operations in try-catch, use error boundaries
- **Performance**: Use React.memo for expensive components, useMemo for calculations

## Firebase Integration Rules

- **Real-time**: Use Firebase Realtime Database listeners for game state and chat
- **Security**: All Realtime Database operations must respect security rules
- **Offline**: Handle offline states gracefully with SWR fallbacks
- **Data Structure**: Use JSON tree structure for efficient real-time updates
- **Listeners**: Implement proper cleanup of real-time listeners to prevent memory leaks
- **Optimization**: Flatten data structure to minimize listener overhead
- **Security Rules**: Define granular read/write rules for different user roles

## UI/UX Standards

- **Responsive**: Mobile-first design, test on 320px minimum width
- **Accessibility**: Include ARIA labels, keyboard navigation, focus management
- **Loading States**: Show skeletons/spinners for all async operations
- **Error States**: Provide clear error messages with recovery actions
- **Animations**: Use Framer Motion variants, respect prefers-reduced-motion

## Build & Deployment

- **Platform**: Vercel with automatic deployments
- **Assets**: Use Next.js Image component, optimize for mobile bandwidth
- **Monitoring**: Sentry integration with source maps enabled
- **Environment**: Use `.env.local` for development secrets
