# 🎮 Meme Battles — Advanced Real-Time Multiplayer Gaming Platform

**Meme Battles** is a sophisticated real-time multiplayer web game featuring Battle Royale matchmaking, AI-powered opponents, and dynamic meme-based gameplay. This production-ready application serves as a comprehensive gaming platform with advanced real-time features, scalable architecture, and enterprise-grade performance optimizations.

## 🎯 Project Overview

- **Platform**: Web-based gaming platform with real-time multiplayer capabilities
- **Core Gameplay**: Players compete in meme-matching games with AI-generated situations
- **Advanced Features**: Battle Royale mode, skill-based matchmaking, AI opponents
- **Performance Target**: <200ms latency for 8 concurrent players, mobile-first responsive design
- **Tech Stack**: Next.js 15.4.5, TypeScript, Firebase, Vercel AI SDK, shadcn/ui

## 🎮 Game Features

### Core Game Modes

**🎯 Classic Mode**:
- Traditional meme matching gameplay
- 7 unique cards from 800+ meme pool per player
- AI-generated situations using Vercel AI SDK
- Single vote per player (self-voting prohibited)
- Point-based scoring with streak bonuses

**🏆 Battle Royale Mode**:
- Competitive matchmaking with skill-based rating system
- Elo rating system for player progression
- Tournament-style elimination rounds
- XP rewards and achievement system
- Connection quality monitoring

### 🤖 AI Integration

**Dynamic Situation Generation**:
- Vercel AI SDK with Google AI integration
- Contextually relevant, family-friendly prompts
- Fallback templates for reliability
- Personality-based AI opponents (Easy/Medium/Hard)

**Smart AI Opponents**:
- Multiple personality types for varied gameplay
- Difficulty scaling based on player performance
- Realistic decision-making patterns

### ⚡ Real-Time Features

**Multiplayer Infrastructure**:
- Firebase Realtime Database for live game state
- Real-time chat with player interactions
- Live matchmaking queue system
- Automatic reconnection with heartbeat monitoring
- Connection status tracking across devices

**Performance Optimizations**:
- <200ms latency target for 8 concurrent players
- Mobile-first responsive design (320px minimum)
- Lazy loading for 800+ meme images
- SWR caching with 5-minute TTL

## 🏗️ Architecture & Tech Stack

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

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Firebase project with Realtime Database enabled
- Google AI API key for Vercel AI SDK

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Configure your environment variables
```

### Development

```bash
# Start development server with Turbopack
pnpm dev

# Run linting (Biome)
bun lint

# Run tests with coverage
pnpm test:coverage

# Build for production
pnpm build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📊 Database Schema

### Firebase Realtime Database Structure

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

## 🔧 Development Guidelines

### File Naming & Organization
- **Components**: PascalCase exports, kebab-case filenames (`game-lobby.tsx`)
- **Hooks**: camelCase with `use` prefix (`useCurrentUser`)
- **Types**: PascalCase (`GameState`, `PlayerData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PLAYERS`)
- **Directories**: kebab-case (`game-settings`, `shared`)

### Import Order (MANDATORY)
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

### TypeScript Standards
- **Strict Mode Enabled**: No `any` types, always define proper interfaces
- **Global Types**: `/types/index.d.ts` contains all interfaces (no import needed)
- **Component Props**: Always typed with interfaces
- **Server Actions**: Return typed ServiceResult<T>

## 🧪 Testing Strategy

**Multi-Level Testing**:
- **Unit Tests**: Individual functions and hooks
- **Integration Tests**: Service layer with Firebase mocking
- **E2E Tests**: Critical user flows

**Coverage Targets**: 70% across all metrics
- Jest + Testing Library for React components
- Firebase mocking for database operations
- Custom test utilities in `__tests__/utils/`

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables Required
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

# AI Configuration
GOOGLE_GENERATIVE_AI_API_KEY=your_ai_api_key

# Firebase Admin (Server-side only)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

## 🎯 Performance Targets

- **Latency**: <200ms for 8 concurrent players
- **Mobile**: 320px minimum width, touch-friendly
- **Images**: Lazy loading for 800+ meme cards
- **Real-time**: Optimized Firebase listeners with cleanup

## 📈 Features Status

### ✅ Fully Implemented
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

### 🚧 In Development
- Advanced matchmaking algorithms
- Tournament system
- Achievement system
- Social features expansion

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality Standards
- Follow the established architecture patterns
- Maintain 70% test coverage
- Pass all linting checks (`bun lint`)
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Inspired by**: What Do You Meme? game mechanics
- **Built with**: Modern web technologies and AI integration
- **Powered by**: Firebase, Vercel, and Google AI

---

**🎮 Ready to battle with memes? Join the fun!**
