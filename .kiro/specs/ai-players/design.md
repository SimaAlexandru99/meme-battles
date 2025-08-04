# AI Players Design Document

## Overview

The AI Players feature introduces intelligent bot players to the Meme Battles game lobby system. These AI players will automatically join lobbies when needed, participate meaningfully in gameplay through contextual meme selection and voting, and provide distinct personalities to enhance the gaming experience. The system leverages the existing Vercel AI SDK integration (Google AI) for decision-making, Firebase Firestore for real-time synchronization, and integrates seamlessly with the current lobby and game architecture.

## Architecture

### Core Components

```
AI Player System
├── AIPlayerManager (Singleton)
│   ├── createAIPlayer()
│   ├── removeAIPlayer()
│   └── manageAIPlayerCount()
├── AIPlayer (Class)
│   ├── personality: AIPersonality
│   ├── makeDecision()
│   └── simulateThinking()
├── AIDecisionEngine
│   ├── selectMeme()
│   ├── castVote()
│   └── generateChatMessage()
└── AIPersonalitySystem
    ├── personalities: AIPersonality[]
    └── getRandomPersonality()
```

### Integration Points

- **Lobby System**: Extends existing `LobbyPlayer` interface with `isAI: boolean` flag
- **Game Engine**: AI players participate in all game phases (submission, voting, results)
- **Chat System**: AI players send contextual messages based on personality
- **Firebase**: AI player data stored in lobby documents with special handling

## Components and Interfaces

### 1. AI Player Data Structure

```typescript
interface AIPlayer extends LobbyPlayer {
  isAI: true;
  personality: AIPersonality;
  thinkingTime: number; // milliseconds
  lastActionTime: Date;
  decisionHistory: AIDecision[];
}

interface AIPersonality {
  id: string;
  name: string;
  avatar: string;
  traits: {
    humor: "sarcastic" | "wholesome" | "edgy" | "random";
    chattiness: "quiet" | "moderate" | "talkative";
    competitiveness: "casual" | "moderate" | "competitive";
    riskTaking: "safe" | "moderate" | "bold";
  };
  chatPhrases: {
    submission: string[];
    voting: string[];
    winning: string[];
    losing: string[];
  };
}

interface AIDecision {
  type: "meme_selection" | "vote" | "chat";
  timestamp: Date;
  context: string;
  reasoning: string;
  confidence: number;
}
```

### 2. AI Player Manager

```typescript
class AIPlayerManager {
  private static instance: AIPlayerManager;
  private aiPlayers: Map<string, AIPlayer> = new Map();

  static getInstance(): AIPlayerManager;

  async addAIPlayerToLobby(
    lobbyCode: string,
    maxAIPlayers: number
  ): Promise<AIPlayer>;

  async removeAIPlayerFromLobby(
    lobbyCode: string,
    playerId: string
  ): Promise<void>;

  async balanceAIPlayers(
    lobbyCode: string,
    currentPlayerCount: number,
    maxPlayers: number,
    aiSettings: AISettings
  ): Promise<void>;

  private generateUniqueAIPlayer(): AIPlayer;
  private selectPersonality(): AIPersonality;
}
```

### 3. AI Decision Engine

```typescript
class AIDecisionEngine {
  constructor(private aiPlayer: AIPlayer) {}

  async selectMemeCard(
    situation: string,
    availableCards: MemeCard[]
  ): Promise<{
    selectedCard: MemeCard;
    reasoning: string;
    confidence: number;
  }>;

  async castVote(
    submissions: Submission[],
    situation: string
  ): Promise<{
    votedSubmissionId: string;
    reasoning: string;
    confidence: number;
  }>;

  async generateChatMessage(
    context: "submission" | "voting" | "results" | "general",
    gameState: GameState
  ): Promise<string | null>;

  private async callAI(prompt: string): Promise<string>;
  private simulateThinkingDelay(): Promise<void>;
}
```

### 4. Lobby Settings Extension

```typescript
interface LobbySettings {
  rounds: number;
  timeLimit: number;
  categories: string[];
  aiPlayers: {
    enabled: boolean;
    maxCount: number; // 1-6
    difficulty: "easy" | "medium" | "hard";
    personalityVariety: boolean;
  };
}
```

## Data Models

### AI Personalities

Pre-defined personality templates:

```typescript
const AI_PERSONALITIES: AIPersonality[] = [
  {
    id: "sarcastic_sam",
    name: "Sarcastic Sam",
    avatar: "/icons/sarcastic-pepe.png",
    traits: {
      humor: "sarcastic",
      chattiness: "moderate",
      competitiveness: "competitive",
      riskTaking: "bold",
    },
    chatPhrases: {
      submission: ["Oh, this should be good...", "Perfect meme incoming 🙄"],
      voting: ["Tough choice... not really", "Some interesting choices here"],
      winning: ["Surprised? I'm not", "Ez win"],
      losing: ["Rigged", "Y'all have no taste"],
    },
  },
  {
    id: "wholesome_wendy",
    name: "Wholesome Wendy",
    avatar: "/icons/wholesome-doggo.png",
    traits: {
      humor: "wholesome",
      chattiness: "talkative",
      competitiveness: "casual",
      riskTaking: "safe",
    },
    chatPhrases: {
      submission: ["This is so fun! 😊", "Great situation!"],
      voting: ["Everyone did amazing!", "So hard to choose!"],
      winning: ["Yay! Good game everyone! 🎉", "Thanks for the fun round!"],
      losing: ["Great job winner! 👏", "That was a good one!"],
    },
  },
  // ... more personalities
];
```

### Firebase Schema Updates

```typescript
// Lobby document extension
interface LobbyDocument {
  // ... existing fields
  aiSettings: {
    enabled: boolean;
    maxCount: number;
    currentCount: number;
    difficulty: "easy" | "medium" | "hard";
  };
  players: Array<LobbyPlayer | AIPlayer>;
}

// Game document extension
interface GameDocument {
  // ... existing fields
  aiDecisions: {
    [roundNumber: number]: {
      [aiPlayerId: string]: {
        submission?: {
          memeFilename: string;
          reasoning: string;
          submittedAt: Date;
        };
        vote?: {
          targetPlayerId: string;
          reasoning: string;
          votedAt: Date;
        };
      };
    };
  };
}
```

## Error Handling

### AI Service Failures

```typescript
class AIErrorHandler {
  static async handleAIServiceError(
    error: Error,
    aiPlayer: AIPlayer,
    fallbackAction: "random_selection" | "skip_turn" | "remove_player"
  ): Promise<void> {
    // Log error with Sentry
    Sentry.captureException(error, {
      tags: { component: "ai_player" },
      extra: { aiPlayerId: aiPlayer.id, personality: aiPlayer.personality.id },
    });

    // Execute fallback strategy
    switch (fallbackAction) {
      case "random_selection":
        await this.makeRandomDecision(aiPlayer);
        break;
      case "skip_turn":
        await this.skipAITurn(aiPlayer);
        break;
      case "remove_player":
        await AIPlayerManager.getInstance().removeAIPlayerFromLobby(
          aiPlayer.lobbyCode,
          aiPlayer.id
        );
        break;
    }
  }
}
```

### Connection and Sync Issues

- **Graceful Degradation**: If AI service is unavailable, fall back to random decisions
- **Retry Logic**: Implement exponential backoff for AI API calls
- **State Recovery**: AI players can rejoin game state after temporary disconnections
- **Cleanup**: Automatic removal of orphaned AI players from lobbies

## Testing Strategy

### Unit Tests

```typescript
describe('AIDecisionEngine', () => {
  test('should select appropriate meme for situation', async () => {
    const engine = new AIDecisionEngine(mockAIPlayer);
    const result = await engine.selectMemeCard(
      'When you realize it\'s Monday',
      mockMemeCards
    );

    expect(result.selectedCard).toBeDefined();
    expect(result.reasoning).toContain('Monday');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('should not vote for own submission', async () => {
    const submissions = [
      { playerId: 'ai_player_1', ... },
      { playerId: 'human_player_1', ... }
    ];

    const result = await engine.castVote(submissions, 'test situation');
    expect(result.votedSubmissionId).not.toBe('ai_player_1');
  });
});
```

### Integration Tests

```typescript
describe("AI Player Integration", () => {
  test("should automatically join lobby when enabled", async () => {
    const lobby = await createTestLobby({
      aiPlayers: { enabled: true, maxCount: 2 },
    });

    // Add human player
    await joinLobby(lobby.code, humanPlayer);

    // Verify AI player was added
    const updatedLobby = await getLobbyData(lobby.code);
    expect(updatedLobby.players.some((p) => p.isAI)).toBe(true);
  });

  test("should participate in full game flow", async () => {
    const game = await startGameWithAI();

    // Verify AI submits meme
    await waitForPhase("voting");
    expect(game.submissions).toHaveProperty(aiPlayer.id);

    // Verify AI votes
    await waitForPhase("results");
    expect(game.votes).toHaveProperty(aiPlayer.id);
  });
});
```

### Performance Tests

- **AI Response Time**: Ensure AI decisions complete within reasonable timeframes (5-30 seconds)
- **Concurrent AI Players**: Test multiple AI players in same lobby
- **Memory Usage**: Monitor memory consumption with multiple AI personalities
- **Firebase Load**: Test impact on Firestore read/write operations

## Implementation Phases

### Phase 1: Core AI Player System

- Implement `AIPlayer` class and basic personality system
- Create `AIPlayerManager` for lobby integration
- Add AI player toggle to lobby settings
- Basic meme selection using random + simple AI scoring

### Phase 2: Advanced Decision Making

- Integrate Vercel AI SDK for contextual meme selection
- Implement voting logic with situation analysis
- Add personality-based decision variations
- Create fallback systems for AI service failures

### Phase 3: Social Features

- Implement AI chat messages based on personality
- Add realistic timing delays for AI actions
- Create visual indicators for AI players
- Implement AI player removal when humans join

### Phase 4: Polish and Optimization

- Fine-tune AI personalities and decision quality
- Add comprehensive error handling and monitoring
- Implement performance optimizations
- Add admin controls for AI behavior tuning

## Security Considerations

### AI Service Protection

- Rate limiting for AI API calls to prevent abuse
- Input validation for all AI prompts and responses
- Secure storage of AI API keys using environment variables
- Monitoring for unusual AI behavior patterns

### Game Integrity

- AI players cannot access information unavailable to human players
- AI decisions are logged for transparency and debugging
- Prevent AI players from being manipulated by external actors
- Ensure AI players follow same game rules as human players

### Privacy and Data

- AI player data is ephemeral and not stored long-term
- No personal information is processed by AI services
- AI decision logs are anonymized for analysis
- Compliance with data protection regulations
