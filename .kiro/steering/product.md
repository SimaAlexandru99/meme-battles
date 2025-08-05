---
inclusion: always
---

# Product Overview

**Meme Battles** is a real-time multiplayer web game where players compete to create the funniest meme matches. Players join rooms, receive seven random meme image cards from a pool of 800 images, and submit one card to match an AI-generated situation. All players then vote for their favorite submissions to determine the winner.

## Game Flow & States

- **Lobby Phase**: Players join rooms, configure settings, chat while waiting
- **Card Distribution**: Each player receives 7 unique meme cards (no duplicates across hands)
- **Situation Generation**: AI creates humorous prompts using Vercel AI SDK
- **Submission Phase**: Players select and submit one meme card with optional caption
- **Voting Phase**: Anonymous voting on all submissions (cannot vote for own)
- **Results Phase**: Winner announcement, point distribution, meme sharing

## Core Business Rules

- **Meme Pool**: 800 images in `/public/memes/` directory
- **Hand Size**: Exactly 7 cards per player and get a new one after each round
- **Voting**: One vote per player, self-voting prohibited
- **Scoring**: Winner gets points equal to vote count
- **Room Limits**: 3-8 players per game room
- **Real-time**: All state changes broadcast via Firebase Realtime Database with optimized JSON structure

## Technical Constraints

- **Performance**: Game must handle 8 concurrent players with <200ms latency
- **Mobile-First**: Touch-friendly interactions, responsive breakpoints
- **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support
- **Image Loading**: Lazy loading for meme cards, optimized for mobile bandwidth
- **State Management**: Firebase Realtime Database for real-time sync, SWR for client caching

## UX Principles

- **Immediate Feedback**: Visual confirmations for all user actions
- **Progressive Disclosure**: Show relevant information based on game state
- **Error Recovery**: Clear error messages with actionable next steps
- **Social Features**: Chat, reactions, shareable winning combinations
- **Engagement**: Confetti animations, sound effects, micro-interactions

## Content Guidelines

- **Family-Friendly**: All memes and generated content appropriate for general audiences
- **Humor Focus**: Prioritize comedic timing and meme culture references
- **Inclusive**: Avoid content that excludes or marginalizes any groups
- **Dynamic**: AI-generated situations should be varied and contextually relevant

## Launch Target

August 25, 2025 @ 10:00 PM
