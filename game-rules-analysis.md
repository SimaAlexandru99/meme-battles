# Game Rules Implementation Analysis

## Overview

This document analyzes the current Arena component implementation against the specified game mechanics rules to identify gaps and required improvements.

## Game Rules (From Product Requirements)

1. Each player receives **seven random meme image cards** from a pool of 800 images in `/public/memes/`
2. An **AI-generated situation** is presented each round using Vercel AI SDK
3. Players select and submit one meme image card to match the situation
4. All players vote for their favorite meme submission (one vote per player, cannot vote for own submission)
5. The meme with the most votes wins the round, and the player earns points based on their submission's vote count
6. Players draw back up to seven cards from the meme pool, and a new round begins
7. After each round user gets a new card

## Current Implementation Analysis

### ✅ IMPLEMENTED CORRECTLY

#### 1. Meme Card Distribution (Rule 1)

- **Status**: ✅ GOOD
- **Implementation**: `useLobbyData` hook generates 7 random cards using `getRandomMemeCards(7)`
- **Card Pool**: 800+ memes available in `MEME_FILENAMES` array
- **Uniqueness**: Cards are unique within a player's hand
- **Evidence**: `lib/utils/meme-card-pool.ts` has comprehensive card management

#### 2. AI Situation Generation (Rule 2)

- **Status**: ✅ GOOD
- **Implementation**: `useSituationGeneration` hook calls `/api/situation` endpoint
- **Fallback**: Has fallback prompts if AI fails
- **Integration**: Properly integrated with Vercel AI SDK
- **Evidence**: Hook handles loading states and error recovery

#### 3. Card Selection Interface (Rule 3 - Partial)

- **Status**: ✅ GOOD (UI only)
- **Implementation**: `useMemeCardSelection` hook manages card selection
- **UI**: `MemeCardHand` component provides visual selection
- **Validation**: Prevents selecting cards not in hand

### ❌ MAJOR GAPS IDENTIFIED

#### 1. Card Submission System (Rule 3 - Backend)

- **Status**: ❌ NOT IMPLEMENTED
- **Current**: `handleSubmitCard` only adds chat message, doesn't submit to Firebase
- **Missing**:
  - Firebase submission logic
  - Tracking submitted cards per player
  - Preventing multiple submissions per round
  - Storing submissions for voting phase

#### 2. Voting System (Rule 4)

- **Status**: ❌ COMPLETELY MISSING
- **Current**: Mock voting with `const mockWinner = players[0]`
- **Missing**:
  - Voting UI interface
  - One-vote-per-player enforcement
  - Self-voting prevention
  - Vote collection and storage in Firebase
  - Real-time vote updates

#### 3. Winner Determination (Rule 5)

- **Status**: ❌ NOT IMPLEMENTED
- **Current**: Mock winner selection
- **Missing**:
  - Vote counting logic
  - Tie-breaking rules
  - Point calculation based on vote count
  - Winner announcement system

#### 4. Card Replenishment (Rules 6 & 7)

- **Status**: ❌ COMPLETELY MISSING
- **Current**: Cards persist throughout entire game session
- **Missing**:
  - Card replenishment after each round
  - Drawing new cards to maintain 7-card hand
  - Removing used cards from player's hand
  - Ensuring no duplicate cards across rounds

#### 5. Game Phase Management

- **Status**: ❌ PARTIALLY BROKEN
- **Current**: Timer-based transitions only
- **Issues**:
  - Phases change based on time, not game state
  - No validation that all players submitted before voting
  - No validation that all players voted before results
  - Auto-transitions can happen prematurely

### 🔧 IMPLEMENTATION ISSUES

#### 1. Firebase Integration Gaps

- **Submissions**: No Firebase schema for storing card submissions
- **Votes**: No Firebase schema for storing votes
- **Game State**: No real-time synchronization of game phases
- **Round Data**: No persistence of round-specific data

#### 2. Real-time Synchronization Issues

- **Player Actions**: Other players don't see when someone submits
- **Game Phases**: Phase transitions not synchronized across clients
- **Vote Updates**: No real-time vote count updates

#### 3. State Management Problems

- **Card Persistence**: Cards generated once and never updated
- **Round Isolation**: No separation between round data
- **Player Status**: No tracking of player submission/voting status

## Required Firebase Schema Extensions

```typescript
// Add to LobbyData interface
interface LobbyData {
  // ... existing fields
  currentRound: {
    roundNumber: number;
    phase: "submission" | "voting" | "results";
    situation: string;
    submissions: {
      [playerId: string]: {
        cardId: string;
        submittedAt: Timestamp;
      };
    };
    votes: {
      [voterId: string]: {
        submissionId: string; // playerId who submitted
        votedAt: Timestamp;
      };
    };
    results?: {
      winnerId: string;
      voteCount: number;
      pointsAwarded: number;
    };
  };
  roundHistory: Array<{
    roundNumber: number;
    winnerId: string;
    situation: string;
    submissions: any[];
    votes: any[];
  }>;
}

// Add to Player interface
interface Player {
  // ... existing fields
  currentRoundStatus: {
    hasSubmitted: boolean;
    hasVoted: boolean;
    submittedCardId?: string;
  };
  cardsUsedThisGame: string[]; // Track used cards for replenishment
}
```

## Priority Action Items

### HIGH PRIORITY (Game Breaking)

1. **Implement Card Submission System**
   - Create Firebase submission logic
   - Add submission tracking to game state
   - Prevent multiple submissions per round

2. **Implement Voting System**
   - Create voting UI component
   - Add vote collection and storage
   - Implement voting restrictions (one vote, no self-vote)

3. **Fix Game Phase Management**
   - Base transitions on player actions, not timers
   - Add validation before phase transitions
   - Synchronize phases across all clients

### MEDIUM PRIORITY (Core Mechanics)

4. **Implement Card Replenishment**
   - Remove used cards from player hands
   - Draw new cards after each round
   - Maintain 7-card hand size

5. **Implement Winner Determination**
   - Count votes accurately
   - Calculate points based on votes
   - Handle tie-breaking scenarios

### LOW PRIORITY (Polish)

6. **Improve Real-time Updates**
   - Show submission status of other players
   - Display live vote counts
   - Add better loading states

## Testing Requirements

1. **Multi-player Testing**: Verify rules work with 2-8 players
2. **Edge Cases**: Test tie votes, disconnections, simultaneous actions
3. **Card Pool**: Verify 800 cards are available and unique distribution works
4. **Performance**: Test with maximum players and rapid actions

## Conclusion

The current Arena component has good foundational elements (card distribution, AI integration, UI components) but is missing the core game mechanics that make it actually playable. The voting system and card replenishment are completely absent, making the current implementation more of a prototype than a functional game.

The highest priority should be implementing the submission and voting systems, as these are essential for basic gameplay functionality.
