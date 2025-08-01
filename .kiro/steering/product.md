# Product Overview

**Meme Battles** is a real-time multiplayer web game where players compete to create the funniest meme matches. Players join rooms, receive seven random meme image cards from a pool of 800 images, and submit one card to match an AI-generated situation. All players then vote for their favorite submissions to determine the winner.

## Core Game Mechanics

- Players receive 7 random meme cards from `/public/memes/` (800 total images)
- AI generates humorous situations using Vercel AI SDK
- Players submit one meme card to match the situation
- Simple voting system: one vote per player, cannot vote for own submission
- Winner determined by most votes, earns points based on vote count
- Real-time gameplay with chat and social features

## Key Features

- **Random Meme Selection**: Unique card distribution without duplicates in player hands
- **AI Situations**: Dynamic prompts via Vercel AI SDK
- **Real-time Multiplayer**: Firebase-powered live updates
- **Social Elements**: Chat, shareable winning memes, leaderboards
- **Mobile-First**: Responsive design for all devices

## Target Launch

August 25, 2025 @ 10:00 PM

## User Experience Focus

- Meme-centric UI with animations and visual polish
- Accessibility-compliant components with proper ARIA labels
- Dark theme by default with theme switching support
- Confetti effects and micro-interactions for engagement
