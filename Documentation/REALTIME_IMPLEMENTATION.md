# Enhanced Supabase Realtime Implementation

## Overview

This document explains the enhanced implementation of Supabase Realtime for game communication in Turup's Gambit. The realtime system has been completely refactored into a modular architecture for better maintainability, performance, and reliability. The latest implementation includes comprehensive **Frenzy Mode support** with power synchronization and enhanced gameplay features.

## Architecture Overview

The realtime system is now organized into focused modules with enhanced capabilities:

- **Modular Structure**: Split into 6 specialized modules instead of a single monolithic file
- **Connection Management**: Centralized connection handling with auto-reconnection
- **Enhanced Performance**: Debounced operations, connection pooling, and retry logic
- **Strong Typing**: Comprehensive TypeScript interfaces for all payloads
- **Improved Reliability**: Graceful fallbacks and error recovery
- **Frenzy Mode Integration**: Full support for power system synchronization

### Module Structure

```
stores/gameStore/realtime/
├── constants.ts      # Configuration values, message types, and Frenzy Mode constants
├── types.ts          # TypeScript interfaces including Frenzy power payloads
├── utils.ts          # Utility functions and Frenzy Mode helpers
├── handlers.ts       # Message handlers with Frenzy power support
├── connection.ts     # ConnectionManager class for Supabase management
├── index.ts          # Main API that combines all modules
└── README.md         # Detailed module documentation
```

## Enhanced Implementation Features

The refactored implementation provides:

1. **ConnectionManager Class** - Centralized connection management with:
   - Connection pooling and reuse
   - Automatic reconnection with exponential backoff
   - Connection status tracking
   - Graceful cleanup and disconnection

2. **Enhanced Message Handling** - Organized message handlers by category:
   - Player management (join/leave)
   - Game flow (start/end/phases)
   - Bidding system
   - Card play mechanics
   - Trump selection
   - **Frenzy Mode powers** ✨ NEW
   - Social features (emotes)
   - Presence tracking

3. **Performance Optimizations**:
   - Debounced database synchronization (300ms)
   - Connection pooling for efficiency
   - Retry logic with exponential backoff
   - Timeout handling for all operations
   - Optimized state updates

4. **Reliability Features**:
   - Automatic fallback to API when WebSocket fails
   - Message validation and error handling
   - Connection state monitoring
   - Graceful degradation

### Game Flow and Message Types

The game progresses through several phases, each with specific message types:

1. **Waiting Room Phase**
   - `player:joined` - Player joins the room
   - `player:left` - Player leaves the room
   - `room:joined` - Room state synchronization
   - `room:updated` - Room state changes
   - `game:start` - Host initiates game start (server-processed)

2. **Initial Deal Phase**
   - `game:started` - Game initialization complete
   - `game:updated` - Game state updates
   - Trump selection process begins

3. **Trump Selection Process**
   - `game:select-trump` - Player selects trump suit
   - `game:trump-vote` - Records trump vote
   - `game:trump-selected` - Final trump determination

4. **Power Activation Phase** ✨ NEW (Frenzy Mode)
   - `game:frenzy-power:activated` - Power system activation
   - `game:power-interface:ready` - Power interface available
   - `game:power-rules:display` - Power usage rules shown

5. **Bidding & Final Deal Phases** (Classic Mode Only)
   - `game:bid` - Player places bid
   - `game:bid-placed` - Bid confirmation
   - `game:bidding-complete` - Bidding phase ends
   - `game:final-deal` - Final cards dealt

6. **Enhanced Playing Phase**
   - `game:play-card` - Player plays card
   - `game:card-played` - Card play confirmation
   - `game:trick-complete` - Trick resolution
   - `game:trick-winner` - Trick winner announcement
   - `game:playing-started` - Playing phase begins
   - **Frenzy Power Messages** ✨ NEW:
     - `game:frenzy-power` - Power activation by player
     - `game:frenzy-effect` - Power effect application
     - `game:power-cooldown` - Cooldown status updates
     - `game:power-usage-limit` - Usage limit notifications

7. **Game End & Social**
   - `game:over` - Game completion
   - `game:replay-available` - Replay data ready
   - `game:emote` - Player emote messages
   - `presence:sync` - Connection status updates
   - `presence:join` - Player connects
   - `presence:leave` - Player disconnects

### Enhanced Message Types and Payloads

#### Frenzy Mode Power Messages ✨ NEW

```typescript
// Power activation message
interface FrenzyPowerPayload {
  powerType: "extra_points" | "free_lead" | "peek_card" | "out_of_turn";
  playerId: string;
  playerName: string;
  roomId: string;
  data?: any;
  timestamp?: number;
}

// Power effect application
interface FrenzyPowerEffectPayload {
  effectType: "reveal_card" | "extra_points_scored" | "out_of_turn_granted" | "free_lead_granted";
  targetPlayer?: string;
  sourcePlayer: string;
  roomId: string;
  data?: any;
  timestamp?: number;
}

// Power cooldown updates
interface PowerCooldownPayload {
  powerType: string;
  playerId: string;
  cooldownRemaining: number;
  roomId: string;
  timestamp: number;
}
```

#### Enhanced Game State Updates

```typescript
interface GameStateUpdatePayload {
  gameState: any;
  roomId: string;
  timestamp?: number;
  source?: string;
  frenzyPowers?: Record<string, any>; // Power state tracking
  specialEffects?: Record<string, any>; // Active effects
  revealedCards?: Record<string, any>; // Peek card effects
}
```

### Key Components

#### Enhanced ConnectionManager Class

The ConnectionManager now includes Frenzy Mode support:

```typescript
export class ConnectionManager {
  private connectionState: ConnectionState;
  private channels: Map<string, any>;
  private supabase: any;
  private powerStateCache: Map<string, any>; // NEW: Power state caching

  constructor(supabase: any) {
    this.supabase = supabase;
    this.connectionState = {
      isConnected: false,
      reconnectAttempts: 0,
      lastReconnectTime: 0,
    };
    this.channels = new Map();
    this.powerStateCache = new Map(); // NEW
  }

  // Enhanced message sending with Frenzy Mode support
  async sendMessage(message: any, get: () => GameStoreState, set: SetStateFn): Promise<boolean> {
    // Intelligent routing based on message type
    // Frenzy power message handling
    // Timeout handling and retry logic
    // Fallback to API when WebSocket fails
  }

  // Enhanced subscription with power state tracking
  async subscribeToRealtime(roomId: string, get: () => GameStoreState, set: SetStateFn): Promise<void> {
    // Setup realtime subscription
    // Setup database subscription
    // Setup presence tracking
    // NEW: Setup power state synchronization
    // Handle reconnection logic
  }

  // NEW: Power state synchronization
  async syncPowerState(roomId: string, powerState: any): Promise<void> {
    // Sync power states across clients
    // Handle power cooldowns and usage limits
    // Broadcast power effects
  }

  // Cleanup and disconnection
  disconnect(): void {
    // Properly cleanup all channels and connections
    // Clear power state cache
  }
}
```

#### Enhanced Message Handler Registry

Message handlers now include comprehensive Frenzy Mode support:

```typescript
export const messageHandlers: Record<string, MessageHandler> = {
  // Player management
  "player:joined": handlePlayerJoined,
  "player:left": handlePlayerLeft,
  
  // Game flow
  "game:start": handleGameStart,
  "game:started": handleGameStarted,
  "game:over": handleGameOver,
  
  // Bidding phase (Classic Mode)
  "game:bid": handleBidPlaced,
  "game:bidding-complete": handleBiddingComplete,
  
  // Card play
  "game:card-played": handleCardPlayed,
  "game:trick-complete": handleTrickComplete,
  
  // Trump selection
  "game:trump-selected": handleTrumpSelection,
  
  // Frenzy Mode powers ✨ NEW
  "game:frenzy-power": handleFrenzyPowerUsed,
  "game:frenzy-effect": handleFrenzyPowerEffect,
  "game:power-cooldown": handlePowerCooldown,
  "game:power-usage-limit": handlePowerUsageLimit,
  "game:power-state-sync": handlePowerStateSync,
  
  // Social features
  "game:emote": handleEmote,
  
  // Presence tracking
  "presence:sync": handlePresenceSync,
  "presence:join": handlePresenceJoin,
  "presence:leave": handlePresenceLeave,
};
```

#### Enhanced Utilities for Frenzy Mode

The `utils.ts` module provides enhanced utility functions:

```typescript
// Enhanced message creation with Frenzy Mode validation
export const createEnhancedMessage = (
  message: RealtimeMessage,
  roomId: string,
  user: any
): EnhancedMessage => {
  // Message ID generation
  // Timestamp addition
  // User context injection
  // Payload validation
  // NEW: Frenzy power validation
};

// NEW: Power state validation
export const validatePowerUsage = (
  powerType: string,
  playerId: string,
  gameState: any
): boolean => {
  // Validate power cooldowns
  // Check usage limits
  // Verify game phase
  // Confirm player eligibility
};

// NEW: Power effect application
export const applyPowerEffect = (
  effectType: string,
  sourcePlayer: string,
  targetPlayer: string,
  gameState: any
): any => {
  // Apply power effects to game state
  // Update player states
  // Track power usage
  // Return updated state
};

// Retry logic with exponential backoff
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> => {
  // Implementation with exponential backoff
};

// Debounced function creator
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): ((...args: Parameters<T>) => void) => {
  // Debouncing implementation
};
```

### Enhanced Message Routing Logic

The system intelligently routes messages based on their type with Frenzy Mode support:

1. **Server-processed messages** - Routed through API for validation:
   - Room creation (`room:create`)
   - Game start (`game:start`)
   - Authentication events (`auth:*`)
   - Game end (`game:end`)
   - Bidding (`game:bid`) - Classic Mode only
   - **Power validation** (`game:frenzy-power`) - Frenzy Mode

2. **Direct messages** - Sent via Supabase Realtime WebSocket:
   - Card plays (`game:play-card`)
   - Trump selections (`game:select-trump`)
   - Player actions
   - State updates
   - Social interactions
   - **Power effects** (`game:frenzy-effect`) - Frenzy Mode
   - **Power cooldowns** (`game:power-cooldown`) - Frenzy Mode

3. **Fallback mechanism** - Automatic API fallback when WebSocket fails

### Enhanced Performance Features

1. **Debounced Database Sync** - Prevents excessive database calls (300ms)
2. **Connection Pooling** - Reuses WebSocket connections efficiently
3. **Retry Logic** - Exponential backoff for failed operations (1s, 2s, 4s, 8s, 16s)
4. **Timeout Handling** - Prevents hanging requests (5s/10s timeouts)
5. **Optimized State Updates** - Reduces unnecessary re-renders
6. **Power State Caching** ✨ NEW - Efficient power state management
7. **Effect Batching** ✨ NEW - Batch power effects for performance

### Enhanced State Management Integration

The realtime system integrates with Zustand stores with Frenzy Mode support:

```typescript
// Game store integration with power state
interface GameStoreState {
  // ... existing state ...
  
  // Frenzy Mode power tracking
  frenzyPowers?: Record<string, Record<string, {
    used: boolean;
    lastUsed: number;
    usageCount: number;
  }>>;
  
  // Special effects tracking
  specialEffects?: Record<string, {
    type: string;
    active: boolean;
    targetPlayer?: string;
    data?: any;
  }>;
  
  // Revealed cards tracking
  revealedCards?: Record<string, {
    playerId: string;
    card: Card;
    revealedAt: number;
  }>;
}
```

### Frenzy Mode Specific Features ✨ NEW

#### Power Synchronization

```typescript
// Power state synchronization across clients
const syncPowerStates = async (roomId: string, powerStates: any) => {
  await connectionManager.broadcast(roomId, {
    type: 'game:power-state-sync',
    payload: {
      powerStates,
      timestamp: Date.now(),
      roomId
    }
  });
};

// Power cooldown management
const managePowerCooldowns = (playerId: string, powerType: string) => {
  const cooldownDuration = POWER_COOLDOWNS[powerType];
  setTimeout(() => {
    broadcastPowerCooldownComplete(playerId, powerType);
  }, cooldownDuration);
};
```

#### Power Effect Broadcasting

```typescript
// Broadcast power effects to all players
const broadcastPowerEffect = async (
  effectType: string,
  sourcePlayer: string,
  targetPlayer: string,
  roomId: string,
  data: any
) => {
  await connectionManager.broadcast(roomId, {
    type: 'game:frenzy-effect',
    payload: {
      effectType,
      sourcePlayer,
      targetPlayer,
      roomId,
      data,
      timestamp: Date.now()
    }
  });
};
```

### Enhanced Testing Strategy

#### Unit Testing for Frenzy Mode

```typescript
describe('Frenzy Mode Realtime Integration', () => {
  test('should handle power activation messages', async () => {
    // Test power activation flow
  });
  
  test('should sync power states across clients', async () => {
    // Test power state synchronization
  });
  
  test('should enforce power cooldowns', async () => {
    // Test cooldown management
  });
  
  test('should validate power usage limits', async () => {
    // Test usage limit enforcement
  });
});
```

#### Integration Testing

- **Power Flow Testing**: Complete power activation and effect flow
- **State Synchronization**: Multi-client power state consistency
- **Fallback Testing**: API fallback when WebSocket fails for power messages
- **Performance Testing**: Power system performance under load

### Migration and Backward Compatibility

**Important Note**: All enhancements maintain **complete backward compatibility**. Classic Mode functionality remains unchanged, and the Frenzy Mode additions are purely additive.

```typescript
// Backward compatible API
const realtimeFunctions = createRealtimeFunctions(get, set);

// Existing functionality (unchanged)
realtimeFunctions.sendMessage(classicMessage);
realtimeFunctions.subscribeToRealtime(roomId);

// New Frenzy Mode functionality
realtimeFunctions.sendPowerMessage(powerMessage); // NEW
realtimeFunctions.syncPowerState(powerState); // NEW
```

### Enhanced Debugging and Monitoring

#### Power System Debugging

```typescript
// Enhanced logging for power system
const powerLogger = {
  logPowerActivation: (playerId: string, powerType: string) => {
    console.log(`[Power] ${playerId} activated ${powerType}`);
  },
  
  logPowerEffect: (effectType: string, target: string) => {
    console.log(`[Effect] ${effectType} applied to ${target}`);
  },
  
  logPowerCooldown: (playerId: string, powerType: string, remaining: number) => {
    console.log(`[Cooldown] ${playerId} ${powerType}: ${remaining}ms remaining`);
  }
};
```

#### Performance Monitoring

- **Power Message Latency**: Track power message round-trip times
- **State Sync Performance**: Monitor power state synchronization speed
- **Effect Application Speed**: Measure power effect processing time
- **Memory Usage**: Track power state memory consumption

### Future Enhancements

The modular architecture enables future Frenzy Mode enhancements:

- **Advanced Power Combinations**: Multiple power interactions
- **Custom Power Scripting**: User-defined power behaviors
- **Power Analytics**: Detailed power usage statistics
- **Tournament Power Modes**: Competitive power configurations
- **AI Power Strategies**: Smart bot power usage

### Summary

The enhanced realtime implementation provides:

1. **Complete Frenzy Mode Integration** - Full power system support
2. **Improved Performance** - Optimized for both Classic and Frenzy modes
3. **Enhanced Reliability** - Robust error handling and recovery
4. **Strong Type Safety** - Comprehensive TypeScript coverage
5. **Backward Compatibility** - No breaking changes to existing functionality
6. **Future Extensibility** - Modular architecture for easy enhancement

The system successfully combines traditional card game mechanics with innovative power systems while maintaining excellent performance and reliability.
