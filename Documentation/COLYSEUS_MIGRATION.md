# Colyseus Migration Guide

## Overview

The game has been rebuilt with **Colyseus** for multiplayer functionality, replacing the previous Supabase Realtime implementation. This provides a **server-authoritative architecture** that is more secure, reliable, and purpose-built for multiplayer games.

## Architecture Changes

### Before (Old Architecture)
```
Client ← Supabase Realtime → Client
  ↓                            ↓
Game Logic (Client)    Game Logic (Client)
```
❌ Problems:
- Game logic on client (cheating possible)
- Complex state synchronization
- Not designed for games
- Difficult to maintain

### After (New Architecture)
```
Client ← WebSocket → Colyseus Server ← WebSocket → Client
                           ↓
                    Game Logic (Server)
                           ↓
                    State Validation
```
✅ Benefits:
- Server-authoritative (secure)
- Built for multiplayer games
- Automatic state synchronization
- Easy to maintain and extend

## What Stays

### Supabase (Limited Use)
- **Authentication**: User login/signup
- **User Profiles**: Player data, stats, preferences
- **Game History**: Completed games, replays, leaderboards
- **NOT for real-time gameplay**

### UI Components (Preserved)
All UI components are preserved:
- `components/card.tsx` - Card display
- `components/game-board.tsx` - Game board
- `components/trump-selection-popup.tsx` - Trump selection
- All Shadcn/UI components
- Visual effects and animations
- Medieval theme and styling

## New Structure

### Server Side (`/server`)

```
server/
├── index.ts              # Colyseus server entry point
├── schema/
│   └── GameState.ts      # State schema (auto-synced to clients)
├── rooms/
│   └── GameRoom.ts       # Game logic (server-authoritative)
└── utils/
    └── cardUtils.ts      # Card operations, validation
```

**Key Files:**

- **`GameRoom.ts`**: Contains ALL game logic
  - Trump selection voting
  - Bidding system
  - Card play validation
  - Trick resolution
  - Score tracking
  - Win conditions

- **`GameState.ts`**: Defines synchronized state
  - Uses Colyseus `@type` decorators
  - Automatically synced to all clients
  - Type-safe schema

### Client Side (`/lib/colyseus` & `/hooks`)

```
lib/colyseus/
└── ColyseusClient.ts     # Client service singleton

hooks/
└── useColyseus.ts        # React hooks for game integration
```

**Usage Example:**

```typescript
import { useColyseus, useCurrentPlayer } from "@/hooks/useColyseus";

function GameComponent() {
  const {
    gameState,
    isConnected,
    playCard,
    voteTrump
  } = useColyseus({
    userId: user.id,
    userName: user.name,
    autoConnect: true
  });

  const player = useCurrentPlayer(gameState, room?.sessionId);

  const handleCardClick = (cardId: string) => {
    playCard(cardId);
  };

  return <div>Game UI...</div>;
}
```

## How Game Flow Works Now

### 1. Waiting Room
```typescript
// Client: Join room
const room = await colyseusClient.joinOrCreateRoom(userId, userName);

// Host: Start game
colyseusClient.startGame();
```

### 2. Trump Selection
```typescript
// Each player votes
colyseusClient.voteTrump("hearts");

// Server automatically:
// - Counts votes
// - Determines winner
// - Broadcasts result
```

### 3. Bidding
```typescript
// Players bid in turn
colyseusClient.placeBid(7);

// Server:
// - Validates turn
// - Tracks highest bid
// - Moves to next phase
```

### 4. Playing Cards
```typescript
// Player plays card
colyseusClient.playCard(cardId);

// Server:
// - Validates card is in hand
// - Validates must follow suit
// - Removes card from hand
// - Adds to current trick
// - Determines trick winner
// - Updates scores
```

### 5. Game End
```typescript
// Server automatically:
// - Detects 7 tricks won
// - Determines winner
// - Broadcasts game over
// - Room can be saved to Supabase for history
```

## State Synchronization

### Automatic Sync
Colyseus automatically syncs state changes:

```typescript
// Server changes state
this.state.currentTurn = nextPlayerId;
this.state.royalsTricks++;

// Clients automatically receive updates
room.onStateChange((state) => {
  console.log("New state:", state);
  // React components re-render automatically
});
```

### Listening to Changes
```typescript
// Listen to any state change
room.state.onChange(() => {
  setGameState({ ...room.state });
});

// Listen to specific changes
room.state.players.onAdd((player, key) => {
  console.log("Player joined:", player.name);
});

room.state.players.onRemove((player, key) => {
  console.log("Player left:", player.name);
});
```

## Migration Steps for UI Components

### Step 1: Remove Old Game Store
The old Zustand game store in `stores/gameStore/` can be significantly simplified or removed. Most game state is now managed by Colyseus.

### Step 2: Update Game Board Component
`components/game-board.tsx` needs to use `useColyseus` hook:

**Before:**
```typescript
const { sendMessage, gameState } = useGameStore();
```

**After:**
```typescript
const { gameState, playCard, isConnected } = useColyseus({
  userId: user.id,
  userName: user.name,
  roomId: roomId
});
```

### Step 3: Update Card Playing
**Before:**
```typescript
const handleCardPlay = async (card) => {
  await sendMessage({
    type: "game:play-card",
    payload: { card }
  });
};
```

**After:**
```typescript
const handleCardPlay = (card) => {
  playCard(card.id); // Server validates everything
};
```

### Step 4: Update Trump Selection
**Before:**
```typescript
const handleTrumpVote = async (suit) => {
  await sendMessage({
    type: "game:trump-vote",
    payload: { suit }
  });
};
```

**After:**
```typescript
const handleTrumpVote = (suit) => {
  voteTrump(suit); // Server handles voting logic
};
```

## Running the New System

### Development

**Terminal 1: Start Colyseus Server**
```bash
pnpm server
```
Server runs on `ws://localhost:2567`

**Terminal 2: Start Next.js**
```bash
pnpm dev
```
Frontend runs on `http://localhost:3000`

**Or run both together:**
```bash
pnpm dev:all
```

### Environment Variables
Update your `.env.local`:
```env
# Colyseus
NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567

# Supabase (still needed for auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

## What to Remove

### Can be Removed:
- `stores/gameStore/realtime/` - Entire realtime folder
- `stores/gameStore/gameActions.ts` - Most of it (logic now on server)
- Complex state management in stores - Simplified to just UI state

### Keep:
- `stores/authStore.ts` - Still needed for Supabase auth
- `stores/uiStore.ts` - UI state (modals, loading, etc.)
- `stores/settingsStore.ts` - User preferences

## Testing

### Test Server Alone
```bash
# Start server
pnpm server

# In another terminal, test connection
node -e "const Colyseus = require('colyseus.js'); const client = new Colyseus.Client('ws://localhost:2567'); client.joinOrCreate('game_room', { userId: 'test', name: 'Test' }).then(() => console.log('Connected!')).catch(console.error);"
```

### Test Full Flow
1. Start both servers: `pnpm dev:all`
2. Open two browser windows at `localhost:3000`
3. Create a game in window 1
4. Join with same room ID in window 2
5. Play through a full game

## Server-Authoritative Validation

The server validates EVERYTHING:

✅ **What Server Checks:**
- Player is in the room
- It's player's turn
- Card is in player's hand
- Must follow suit if possible
- Bid is within valid range (7-13)
- Player hasn't voted twice
- Game phase is correct for action

❌ **What Clients CAN'T Do:**
- Cheat by sending invalid moves
- Play out of turn
- Play cards they don't have
- Skip mandatory actions

## Deployment

### Production Considerations

1. **Colyseus Server**: Deploy separately (e.g., Heroku, Railway, DigitalOcean)
2. **Next.js App**: Deploy as usual (Vercel, Netlify, etc.)
3. **Update env var**: `NEXT_PUBLIC_COLYSEUS_URL=wss://your-game-server.com`

### Scaling
Colyseus supports:
- Multiple servers with Redis
- Load balancing
- Automatic room distribution
- Player reconnection

## Benefits Summary

### Security ✅
- Server validates all moves
- Impossible to cheat
- Secure game state

### Reliability ✅
- Auto-reconnection
- State persistence
- Error recovery

### Performance ✅
- Binary protocol (fast)
- Delta compression
- Optimized for games

### Developer Experience ✅
- Clean separation of concerns
- Type-safe state
- Easy to test
- Built for games

## Next Steps

1. ✅ Server is running and tested
2. ✅ Client library is ready
3. ✅ React hooks are available
4. ⏳ Update UI components to use new hooks
5. ⏳ Remove old realtime code
6. ⏳ Test full game flow
7. ⏳ Save completed games to Supabase for history

## Getting Help

- **Colyseus Docs**: https://docs.colyseus.io
- **Schema Sync**: https://docs.colyseus.io/state/schema/
- **Room API**: https://docs.colyseus.io/server/room/

## Questions?

**Q: Do we still need Supabase?**
A: Yes, for auth, profiles, and game history. NOT for real-time gameplay.

**Q: Can I test locally?**
A: Yes! Run `pnpm dev:all` to run both servers.

**Q: What about Frenzy Mode?**
A: Focus on Classic Mode first. Frenzy Mode can be added later using the same pattern.

**Q: Is the UI changing?**
A: No! All UI components stay the same, just connected differently.

**Q: What if a player disconnects?**
A: Colyseus handles reconnection automatically. Player can rejoin with same session ID.
