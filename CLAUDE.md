# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Package Manager**: Use `pnpm` for all package management operations.

**Development**:

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production with Turbopack
- `pnpm start` - Start production server

**Code Quality**:

- `bun lint` - Run Biome linter (replaces ESLint)
- `bun format` - Format code with Biome
- `pnpm test` - Run all tests with Jest
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report (70% target)

## Project Architecture

**Meme Battles** is a sophisticated real-time multiplayer web game featuring Battle Royale matchmaking, AI-powered opponents, and dynamic meme-based gameplay. The application serves as a comprehensive gaming platform with advanced real-time features and scalable architecture.

## Tech Stack & Architecture

### Core Technologies
- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript 5.8.3 (strict mode)
- **Styling**: Tailwind CSS 4.1.11 + shadcn/ui (New York style)
- **Database**: Firebase Realtime Database + Firestore
- **Authentication**: Firebase Auth (Google + Guest modes)
- **AI**: Vercel AI SDK with Google AI
- **Real-time**: Firebase Realtime Database listeners
- **State Management**: SWR + React hooks
- **Animations**: Framer Motion + GSAP
- **Error Tracking**: Sentry with custom spans
- **Testing**: Jest + Testing Library (70% coverage target)
- **Linting**: Biome (replaces ESLint)
- **Package Manager**: pnpm

### Project Structure (MANDATORY)

```
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
/firebase               # Firebase configuration files
/types                  # TypeScript type definitions
```

### Advanced Features Implemented

**🎮 Game Modes**:
- **Classic Mode**: Traditional meme matching gameplay
- **Battle Royale**: Competitive matchmaking with skill-based rating system
- **AI Opponents**: Multiple personality types (Easy/Medium/Hard difficulty)

**🤖 AI Integration**:
- Dynamic situation generation using Vercel AI SDK
- AI bot opponents with personality-based decision making
- Skill rating system (Elo-based) for matchmaking

**⚡ Real-time Features**:
- Firebase Realtime Database for live game state
- Real-time chat system
- Live matchmaking queue
- Connection status monitoring with automatic reconnection

**🎯 Performance Optimizations**:
- Mobile-first responsive design (320px minimum)
- Image lazy loading for 800+ meme cards
- Connection pooling and heartbeat monitoring
- SWR caching with 5-minute TTL

### Authentication Architecture

**Dual Firebase Approach**:
1. **Client-side** (`/firebase/client.ts`): Browser authentication + RTDB access
2. **Server-side** (`/firebase/admin.ts`): Admin operations + session management

**Key Features**:
- HTTP-only session cookies for security
- Anonymous users with meme-themed display names
- Multi-provider support (Google, Guest)
- Server Actions for all auth operations
- 5-minute user data caching

### Game Architecture (Fully Implemented)

**Core Game Flow**:
1. **Lobby Phase**: Real-time player management, chat, settings
2. **Card Distribution**: 7 unique cards from 800+ meme pool
3. **AI Situation Generation**: Dynamic prompts using Vercel AI SDK
4. **Submission Phase**: Players select and submit one card
5. **Voting Phase**: One vote per player (self-voting prohibited)
6. **Results Phase**: Winner announcement with point distribution

**Battle Royale Features**:
- Skill-based matchmaking with Elo rating system
- Competitive queues with connection quality monitoring
- XP rewards and achievement system
- Tournament-style progression

### Firebase Data Structure

**Real-time Database Schema**:
```json
{
  "lobbies": {
    "lobbyId": {
      "code": "ABC123",
      "hostUid": "user123",
      "settings": { "rounds": 10, "timeLimit": 60 },
      "players": {
        "user123": { "displayName": "EpicChad", "score": 0 }
      },
      "gameState": { "phase": "waiting", "currentRound": 1 },
      "chat": { "msgId": { "message": "Hello!", "timestamp": 1234567890 } }
    }
  },
  "battleRoyaleQueue": {
    "playerUid": {
      "skillRating": 1200,
      "queuedAt": 1234567890
    }
  }
}
```

### Component Organization

**UI Components** (`/components/ui/`): Complete shadcn/ui library (50+ components)
- **Base**: Button, Card, Input, Dialog, etc.
- **Advanced**: Charts, Tables, Forms, Navigation
- **Accessibility**: Full Radix UI integration
- **Styling**: Tailwind CSS with consistent design tokens

**Domain Components**:
- **`/components/forms/`**: Authentication & game settings forms
- **`/components/game-settings/`**: Lobby configuration components
- **`/components/lobby/`**: Real-time lobby management
- **`/components/shared/`**: Cross-feature utilities
- **`/components/logos/`**: Technology brand components

**Game Components**:
- `game-lobby.tsx` - Main lobby interface
- `game-play.tsx` - Active game interface
- `voting-phase.tsx` - Voting system UI
- `results-phase.tsx` - Winner announcements
- `meme-card.tsx` - Meme card display component

### Environment & Configuration

**Required Environment Variables**:

**Firebase Configuration**:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

**AI Configuration**:
- `GOOGLE_GENERATIVE_AI_API_KEY` (for Vercel AI SDK)

**Next.js Configuration** (`next.config.ts`):
- Turbopack enabled for development
- Remote images from multiple domains
- Sentry integration for error tracking
- Asset optimization for meme images

### Development Guidelines

**Strict Architecture Patterns**:

**File Naming & Organization**:
- **Components**: PascalCase exports, kebab-case filenames (`game-lobby.tsx`)
- **Hooks**: camelCase with `use` prefix (`useCurrentUser`)
- **Types**: PascalCase (`GameState`, `PlayerData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PLAYERS`)
- **Directories**: kebab-case (`game-settings`, `shared`)

**Import Order (MANDATORY)**:
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

**State Management Patterns**:
- **SWR**: Server state caching with Firebase as data source
- **React State**: UI state and local component state
- **Custom Hooks**: Extract business logic from components
- **Real-time**: Firebase listeners with proper cleanup

**Performance Best Practices**:
- **Mobile-First**: 320px minimum width, touch-friendly
- **Image Loading**: Lazy loading for meme cards
- **Component Optimization**: `React.memo` for expensive components
- **Bundle Splitting**: Dynamic imports for heavy features

### TypeScript Standards

**Strict Mode Enabled**:
- No `any` types - always define proper interfaces
- Global types in `/types/index.d.ts` (no import/export needed)
- Component props always typed with interfaces
- Server Actions return typed ServiceResult<T>

### Testing Strategy

**Multi-Level Testing**:
- **Unit Tests**: Individual functions and hooks
- **Integration Tests**: Service layer with Firebase mocking
- **E2E Tests**: Critical user flows (planned)

**Coverage Targets**: 70% across all metrics
- Jest + Testing Library for React components
- Firebase mocking for database operations
- Custom test utilities in `__tests__/utils/`

### Error Handling & Monitoring

**Sentry Integration**:
- Custom spans for operation tracking
- User context and error tagging
- Performance monitoring with breadcrumbs
- Real-time error alerting

**Error Boundaries**:
- Global error boundary (`global-error.tsx`)
- Lobby-specific error boundaries
- Graceful degradation for network issues

### Real-time Best Practices

**Firebase RTDB Patterns**:
- Singleton service instances (`LobbyService.getInstance()`)
- Proper listener cleanup to prevent memory leaks
- Connection status monitoring with heartbeat
- Atomic operations with server timestamps

**Connection Management**:
- Automatic reconnection with exponential backoff
- Connection quality monitoring
- Offline state handling with SWR fallbacks

### Game Development Status

**✅ Fully Implemented Features**:
- Complete authentication system (Google + Guest)
- Real-time multiplayer lobby system
- Battle Royale matchmaking with skill ratings
- AI bot opponents with personality types
- Dynamic situation generation with Vercel AI SDK
- Complete voting and scoring system
- Real-time chat and player management
- 800+ meme image collection with intelligent distribution
- Mobile-responsive UI with animations
- Production-ready error handling and monitoring

**🎯 Performance Targets**:
- <200ms latency for 8 concurrent players
- Mobile-first responsive design
- Optimized image loading and caching
- Real-time synchronization across devices

### Key Development Commands

```bash
# Development
pnpm dev              # Turbopack development server
pnpm build           # Production build
pnpm start           # Production server

# Code Quality
bun lint             # Biome linting (0 errors target)
bun format           # Biome formatting

# Testing
pnpm test            # Run all tests (70% coverage)
pnpm test:watch      # Watch mode testing
pnpm test:coverage   # Coverage report
```

### AI/LLM Integration Guidelines

- **shadcn/ui MCP**: Always use shadcn/ui MCP tools before building custom components
- **Component Discovery**: Check available components before building new ones
- **Global Types**: `/types/index.d.ts` contains all global interfaces (no import needed)
- **Firebase Patterns**: Follow established RTDB patterns for consistency
- **Error Handling**: Use Sentry spans for all operations tracking