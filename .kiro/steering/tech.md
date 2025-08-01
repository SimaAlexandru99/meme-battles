# Tech Stack & Development

## Core Technologies

- **Framework**: Next.js 15.4.5 with App Router
- **Language**: TypeScript 5.8.3
- **Styling**: Tailwind CSS 4.1.11
- **UI Components**: shadcn/ui (New York style) with Radix UI primitives
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google + Guest)
- **AI**: Vercel AI SDK with Google AI
- **Animations**: Framer Motion + GSAP
- **Package Manager**: pnpm 9.15.4

## Key Libraries

- **State Management**: SWR for data fetching
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)
- **Theming**: next-themes
- **Error Tracking**: Sentry
- **Testing**: Jest + Testing Library

## Common Commands

```bash
# Development
pnpm dev              # Start dev server with Turbopack
pnpm build            # Production build
pnpm start            # Start production server

# Code Quality
pnpm lint             # ESLint check
pnpm format           # Prettier formatting

# Testing
pnpm test             # Run tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm test:ci          # CI testing
```

## Configuration

- **TypeScript**: Strict mode enabled, path aliases via `@/*`
- **ESLint**: Next.js recommended config with TypeScript
- **Prettier**: Automatic formatting on save
- **shadcn/ui**: New York style, CSS variables, Lucide icons
- **Jest**: jsdom environment, 70% coverage threshold

## Build & Deployment

- **Platform**: Vercel
- **Asset Prefix**: `/exp4-static`
- **Image Optimization**: Next.js Image with remote patterns
- **Monitoring**: Sentry integration with source maps
