# 📘 Meme Battles — Project Documentation & Development Plan

**Meme Battles** is a real-time multiplayer web game where players compete to create the funniest meme matches. Inspired by **What Do You Meme?**, players draw seven random meme image cards from a pool of 800 images stored in `/public/memes/`, select one to match an AI-generated situation (using Vercel AI SDK), and rate submissions to determine the winner.

## 🎯 Project Overview

- **Platform**: Web-based, built with **Next.js**, **Tailwind CSS**, **shadcn/ui**, **Firebase**, and **Vercel AI SDK** (`npm i ai`).
- **Core Gameplay**: Players join rooms, receive seven random meme image cards from a folder of 800 images, submit one card to match an AI-generated situation, and rate all submissions (1-5 stars) to score points.
- **Goal**: Launch by **August 25, 2025 @ 10:00 PM**.

## 🎲 Game Mechanics (Inverted from What Do You Meme?)

1. Each player receives **seven random meme image cards** from a pool of 800 images in `/public/memes/`.
2. An **AI-generated situation** (e.g., "When you realize the meeting is all-you-can-eat...") is presented each round using Vercel AI SDK.
3. Players select and submit one meme image card to match the situation.
4. All players vote for their favorite meme submission (one vote per player, cannot vote for own submission).
5. The meme with the most votes wins the round, and the player earns points based on their submission's vote count.
6. Players draw back up to seven cards from the meme pool, and a new round begins.

### Key Features

- **Random Meme Selection**: Randomly assign seven unique meme images per player from 800 images, ensuring no duplicates within a player's hand.
- **AI Situations**: Dynamic, humorous prompts generated via Vercel AI SDK.
- **Voting System**: Simple one-vote-per-player system where the meme with the most votes wins.
- **Social Features**: Real-time chat and shareable winning memes.
- **Visual Polish**: Meme-centric UI with animations and confetti effects.

### 🎯 Simple Voting System

Players vote for their favorite meme submission:

**Voting Rules:**

- Each player can vote for **only one meme** per round
- Players cannot vote for their own submission
- The meme with the most votes wins the round
- In case of a tie, the submission with the most unique voters wins
- Players earn points based on their submission's vote count

**Voting UI:**

- Simple "Vote" button under each meme card
- Visual feedback showing vote count
- Disabled state for own submission
- Clear indication of which meme each player voted for

## 🚀 Getting Started

First, install dependencies:

```bash
pnpm install
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🗓️ Timeline to Launch (Approx. 4 Weeks)

### 🔹 Week 1: July 29 – August 4

**Goal: Setup & Core Structure**

- [ ] Initialize project: Next.js, Tailwind, shadcn/ui, Firebase, Vercel AI SDK.
- [ ] Configure Firebase: Auth (Google + Guest), Firestore, Storage.
- [ ] Build Create/Join Room flows with username/avatar input and guest with random name.
- [ ] Create real-time Lobby UI with player list and game status.
- [ ] Implement **MemeCardDeck** component to display seven random meme cards per player.

### 🔹 Week 2: August 5 – August 11

**Goal: Game Logic MVP**

- [ ] Develop logic to randomly select seven unique meme images from `/public/memes/` (800 images).
- [ ] Set up AI situation generator using Vercel AI SDK.
- [ ] Build **MemeCardSelector** for players to choose one card.
- [ ] Develop simple voting system (one vote per player) for submitted cards.
- [ ] Code round flow: situation → submission → voting → results → next round.
- [ ] Implement scoreboard logic in Firestore.

### 🔹 Week 3: August 12 – August 18

**Goal: Polish & Features**

- [ ] Style UI with shadcn/ui (Cards, Buttons, Emoji Rating Buttons).
- [ ] Add **GameChatBox** for real-time banter.
- [ ] Build Leaderboard page with top scores.
- [ ] Generate room invite links.
- [ ] Add confetti effects for round winners.

### 🔹 Week 4: August 19 – August 25

**Goal: Testing & Launch**

- [ ] Optimize for mobile devices.
- [ ] Test for bugs (multi-device, disconnections, empty submissions).
- [ ] Implement **shareable meme cards** (image + situation export).
- [ ] Finalize UI with animations.
- [ ] Deploy to Vercel by **August 25, 2025 @ 10:00 PM**.

## 🧱 Project Structure

```
/pages
  index.tsx              → Landing Page
  /create.tsx            → Create Room
  /join.tsx              → Join Room
  /game/[roomId].tsx     → Game Room
  /leaderboard.tsx       → Top Players

/components
  MemeCardDeck.tsx       → Displays player's 7 random meme cards
  MemeCardSelector.tsx   → Submits selected meme card
  VotingPanel.tsx        → Simple voting UI
  PlayerList.tsx         → Real-time player list
  Scoreboard.tsx         → Displays scores
  GameChatBox.tsx        → Real-time chat

/lib
  firebase.ts            → Firebase config
  aiSituation.ts         → AI prompt generation (Vercel AI SDK)
  gameEngine.ts          → Manages rounds, card selection, ratings
  db.ts                  → Firestore helpers
  avatarGen.ts           → Random avatars
  memeSelector.ts        → Logic for random meme card distribution

/public
  memes/                 → Folder with 800 meme images (e.g., meme001.jpg to meme800.jpg)
```

## 🔐 Firestore Structure

```
/rooms/{roomId}
  - players: [{ id, name, avatar, score, cards: [memeUrl, ...] }] # 7 URLs per player
  - situation: "AI-generated text"    # E.g., "When you realize the meeting is all-you-can-eat..."
  - submissions: { playerId: memeUrl } # Selected meme card
  - votes: { playerId: votedForPlayerId } # Simple vote tracking
  - status: "submitting" | "rating" | "results"
  - round: number

/users/{uid}
  - name
  - score
  - gamesPlayed
```

## 🧪 MVP Feature Checklist

| Feature                             | Status |
| ----------------------------------- | ------ |
| Firebase Auth (Google + Guest)      | ⬜️    |
| Room creation + join                | ⬜️    |
| Real-time room updates              | ⬜️    |
| Random 7 meme cards (from 800)      | ⬜️    |
| AI-generated situation              | ⬜️    |
| Meme card submission                | ⬜️    |
| Voting system (one vote per player) | ⬜️    |
| Winner display + scoring            | ⬜️    |
| Leaderboard                         | ⬜️    |
| Real-time chat                      | ⬜️    |
| Mobile responsive UI                | ⬜️    |
| Shareable meme cards                | ⬜️    |
| Deployment (Vercel)                 | ⬜️    |

## 🌟 Stretch Goals

- **AI Caption Suggestions**: Offer AI-generated caption hints for situations.
- **Themed Meme Packs**: Categorize the 800 memes into themes (e.g., pop culture, animals).
- **Custom Memes**: Allow moderated image uploads.
- **Enhanced Voting**: Add voting animations and sound effects.
- **Freestyle Mode**: Players create custom situations.

## 📋 Meme Card Selection Logic

- **Folder**: `/public/memes/` contains 800 images (e.g., `meme001.jpg` to `meme800.jpg`).
- **Distribution**: For each player, randomly select seven unique images without replacement within their hand, but allow overlap across players.
- **Implementation**: Use `memeSelector.ts` to generate a list of image URLs (e.g., `/memes/meme123.jpg`) and store them in Firestore under `players.cards`.
- **Refill**: After each round, replenish each player's hand to seven cards, ensuring no duplicates in their new hand.

### Sample Code for `memeSelector.ts`

```javascript
// /lib/memeSelector.ts
export function getRandomMemeCards(numCards = 7, totalMemes = 800) {
  const memeUrls = [];
  const usedIndices = new Set();

  while (memeUrls.length < numCards) {
    const index = Math.floor(Math.random() * totalMemes) + 1;
    const paddedIndex = String(index).padStart(3, "0");
    const memeUrl = `/memes/meme${paddedIndex}.jpg`;

    if (!usedIndices.has(index)) {
      usedIndices.add(index);
      memeUrls.push(memeUrl);
    }
  }

  return memeUrls;
}

// Usage: Assign to player in Firestore
// const playerCards = getRandomMemeCards(7, 800);
// db.collection('rooms').doc(roomId).update({ [`players.${playerId}.cards`]: playerCards });
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google + Guest)
- **AI**: Vercel AI SDK
- **Deployment**: Vercel
- **Package Manager**: pnpm

## 📋 Next Steps

- **Format**: Generate as a **Notion project**, **GitHub Issues**, or **downloadable doc**?
- **Development**: Start coding Week 1 (e.g., project setup, Firebase config, `memeSelector.ts`)?
- **Sample Code**: Provide a starter for `aiSituation.ts` or Firebase setup?

Let me know how to proceed! 🎉
