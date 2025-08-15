# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Manager**: Use `pnpm` for all package management operations.

**Development**:

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server

**Code Quality**:

- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier

**Testing**:

- `pnpm test` - Run all tests with Jest
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:ci` - Run tests for CI (no watch, with coverage)

To run specific tests: `pnpm test <test-file-name>` or `pnpm test --testPathPattern=<pattern>`

## Project Architecture

**Meme Battles** is a real-time multiplayer web game where players compete to create the funniest meme matches using AI-generated situations.

### Tech Stack Foundation

- **Framework**: Next.js 15.4.4 with App Router (not Pages Router)
- **Styling**: Tailwind CSS 4.1.11 with shadcn/ui components
- **Database**: Firebase Firestore with Firebase Admin SDK for server-side operations
- **Authentication**: Firebase Auth with multi-provider support (Google, GitHub, Anonymous)
- **AI Integration**: Vercel AI SDK with Google AI (`@ai-sdk/google`)
- **Error Monitoring**: Sentry integration for production tracking
- **Testing**: Jest with React Testing Library and jsdom environment

### Authentication Architecture

The authentication system uses a **dual Firebase approach**:

1. **Client-side**: `/firebase/client.ts` - Firebase client SDK for browser authentication
2. **Server-side**: `/firebase/admin.ts` - Firebase Admin SDK for server-side user management

**Key Authentication Patterns**:

- Session-based auth using HTTP-only cookies (not just client tokens)
- Server actions in `/lib/actions/auth.action.ts` handle all auth operations
- Anonymous user support with meme-themed display name generation
- User caching system (5-minute TTL) to reduce Firebase calls
- Custom user types defined in `/types/index.d.ts`

**Authentication Flow**:

1. Client authenticates with Firebase Client SDK
2. ID token sent to server action (`signIn`, `signInWithGoogle`, etc.)
3. Server creates session cookie using Firebase Admin SDK
4. User data stored/retrieved from Firestore collection `users`

### Game Architecture (Planned)

The game follows an **inverted "What Do You Meme?" format**:

- Players receive 7 random meme images from 800+ images in `/public/memes/`
- AI generates humorous situations using Vercel AI SDK
- Players submit one meme to match the situation
- Simple voting system determines winners

**Firestore Structure** (from README.md):

```
/rooms/{roomId}
  - players: [{ id, name, avatar, score, cards: [memeUrl, ...] }]
  - situation: "AI-generated text"
  - submissions: { playerId: memeUrl }
  - votes: { playerId: votedForPlayerId }
  - status: "submitting" | "rating" | "results"
  - round: number

/users/{uid}
  - Standard user fields (see User interface in types/index.d.ts)
```

### Component Organization

**UI Components**: Extensive shadcn/ui component library in `/components/ui/`

- Follows shadcn/ui patterns and conventions
- Tailwind CSS for styling with design system consistency

**Custom Components**:

- Authentication forms in `/components/forms/`
- Game-specific components (hero-section, game-card, profile-picker)
- Logo components for various technologies in `/components/logos/`

### Environment & Configuration

**Required Environment Variables**:

- Firebase Client: `NEXT_PUBLIC_FIREBASE_*` (public)
- Firebase Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Sentry: Configured in `sentry.*.config.ts` files

**Next.js Configuration**:

- Asset prefix: `/exp4-static`
- Remote image patterns for makeitmeme.com and GitHub
- Sentry integration with monitoring route `/monitoring`

### Development Guidelines

**File Patterns**:

- Server actions: `/lib/actions/*.action.ts` (use "use server")
- Client components: Use "use client" directive when needed
- Type definitions: Global types in `/types/index.d.ts`

**State Management**:

- React hooks for local state (`useState`, `useEffect`)
- Custom hooks in `/hooks/` directory (e.g., `useUpdateDisplayName`, `useUpdateProfile`)
- Firebase real-time subscriptions for multiplayer features

**Testing Configuration**:

- Jest config supports TypeScript, path aliases (`@/`), and jsdom environment
- Coverage thresholds: 70% for branches, functions, lines, and statements
- Setup file: `jest.setup.ts`
- Mock utilities in `__tests__/utils/` directory

**Error Handling**:

- Sentry spans for operation tracking in auth actions
- Custom error messages with success/failure response patterns
- Client-side error boundaries (global-error.tsx)

### Game Development Status

Currently implemented:

- ✅ Authentication system (all providers)
- ✅ User profile management
- ✅ UI component system
- ✅ 800+ meme image collection

Pending implementation:

- ⏳ Real-time game rooms with Firestore
- ⏳ AI situation generation with Vercel AI SDK
- ⏳ Voting and scoring system
- ⏳ Multiplayer lobby system

When implementing game features, follow the Firestore schema outlined in the README.md and ensure real-time updates using Firebase listeners.

- in this project we have index.d.ts where we have all interfaces so we dont need to import and we dont need to export from it, because is global already
- Always for ui/ux use and shadcn/ui mcp