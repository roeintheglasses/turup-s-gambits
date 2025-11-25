# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Turup's Gambit is a real-time multiplayer card game built with Next.js 15 and **Colyseus** for multiplayer functionality. Features medieval-themed UI and Classic mode gameplay (Court Piece card game).

**⚠️ IMPORTANT ARCHITECTURAL CHANGE:**
The game was recently rebuilt with **Colyseus for multiplayer** (replacing Supabase Realtime). See `Documentation/COLYSEUS_MIGRATION.md` for full details.

## Development Commands

### Core Development
```bash
pnpm dev          # Start Next.js development server only
pnpm server       # Start Colyseus game server only (port 2567)
pnpm dev:all      # Start both Next.js and Colyseus together
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Database and Testing
```bash
node scripts/check-tables.js        # Verify database tables exist
node scripts/verify-env.ts          # Verify environment configuration
```

### Test Mode (Development Only)
For easier local testing without authentication:
```bash
# Navigate to test game lobby
http://localhost:3000/test-game

# Or directly join a test room
http://localhost:3000/test-game/test-room-123
```

**Test Mode Features:**
- Bypasses authentication (uses mock test users)
- Auto-generates test user IDs
- Supports custom user IDs via URL params: `?userId=custom-id`
- Only available in development mode (auto-redirects in production)
- Shows test mode banner for easy identification

**Testing Multiplayer:**
1. Open `/test-game` in your browser
2. Create a test room
3. Copy the room ID from the URL
4. Open new browser tabs/windows
5. Join the same room with "Join with Custom User ID"
6. Use different user IDs for each tab to simulate multiple players

## New Architecture (Colyseus-based)

### Game Server (`/server`)
**Server-authoritative multiplayer using Colyseus**

```
server/
├── index.ts              # Colyseus server entry point
├── rooms/
│   └── GameRoom.ts       # ALL game logic (server-authoritative)
├── schema/
│   └── GameState.ts      # State schema (auto-synced to clients)
└── utils/
    └── cardUtils.ts      # Card operations, validation
```

**Critical Concepts:**
- **Server-authoritative**: All game logic runs on the server
- **State synchronization**: Colyseus automatically syncs state to all clients
- **Validation**: Server validates every move (must follow suit, turn order, etc.)
- **Schema-based**: Uses `@type` decorators for automatic serialization

### Client Integration (`/lib/colyseus` & `/hooks`)

```
lib/colyseus/
└── ColyseusClient.ts     # Client service singleton

hooks/
└── useColyseus.ts        # React hooks for game integration
```

**Usage Pattern:**
```typescript
const { gameState, playCard, voteTrump, isConnected } = useColyseus({
  userId: user.id,
  userName: user.name,
  roomId: roomId
});
```

### What Supabase Is Used For Now

**Only for non-gameplay features:**
- Authentication (login/signup)
- User profiles and stats
- Game history and replays
- Leaderboards

**NOT used for:**
- ❌ Real-time gameplay
- ❌ Game state synchronization
- ❌ Game logic

## Game Rules (Classic Mode)

### Overview
- **Players**: 4 players in 2 teams (Royals vs Rebels)
- **Deck**: Standard 52 cards (no jokers)
- **Objective**: Win 7 tricks (baazi) or all 13 tricks (kot)

### Game Phases
1. **Waiting Room**: 4 players join
2. **Initial Deal**: 5 cards to each player
3. **Trump Selection**: Players vote for trump suit
4. **Bidding**: Bid 7-13 tricks
5. **Final Deal**: 8 more cards (13 total per player)
6. **Playing**: Play tricks, follow suit rules, trump beats all
7. **Game End**: Winner determined, stats saved to Supabase

### Server Validation
The Colyseus server validates:
- Card is in player's hand
- Must follow suit if possible
- Player's turn
- Bid ranges (7-13)
- Trump voting (one vote per player)

## State Management

### Current Architecture
- **Colyseus** (`useColyseus` hook): Game state, multiplayer sync
- **authStore** (`stores/authStore.ts`): Authentication state
- **uiStore** (`stores/uiStore.ts`): UI state (modals, loading, toasts)
- **settingsStore** (`stores/settingsStore.ts`): User preferences

### Old Code to Remove
The following can be removed or significantly simplified:
- `stores/gameStore/realtime/` - Entire folder (replaced by Colyseus)
- `stores/gameStore/gameActions.ts` - Most logic now on server
- Complex game state management in stores

## UI Components (Preserved)

All UI components are preserved with medieval theme:
- `components/card.tsx` - Card display with 3D effects
- `components/game-board.tsx` - Main game board
- `components/trump-selection-popup.tsx` - Trump voting
- `components/waiting-room.tsx` - Lobby
- All Shadcn/UI and Radix UI components
- Visual effects and animations

**To update components**: Replace old `sendMessage` patterns with Colyseus hooks. See `COLYSEUS_MIGRATION.md`.

## TypeScript Configuration

- Strict mode enabled
- **Experimental decorators enabled** (required for Colyseus schema)
- Path alias: `@/*` maps to project root

## Important Implementation Notes

### 1. Server-Authoritative Pattern
**Always remember**: Game logic runs on the server. Clients just send actions and render state.

```typescript
// ✅ Correct: Client sends action
playCard(cardId);

// ❌ Wrong: Client calculates game logic
const winner = calculateTrickWinner(...);
```

### 2. State Synchronization
State changes on the server automatically sync to all clients:

```typescript
// Server changes state
this.state.currentTurn = nextPlayerId;

// Clients automatically receive update via room.onStateChange()
```

### 3. No Direct State Modification
Clients cannot modify game state directly. They can only:
- Send actions to server
- Render received state
- Update local UI state (modals, animations, etc.)

### 4. Reconnection Handling
Colyseus handles player reconnection automatically. Always store `room.id` and `room.sessionId` for reconnection.

### 5. Turn Timer
Server has a 30-second turn timer. If a player doesn't act, server auto-plays first valid card.

### 6. Testing Changes
When testing game logic changes:
1. Update `server/rooms/GameRoom.ts`
2. Server hot-reloads automatically (using tsx watch)
3. Refresh browser to see changes

### 7. Adding New Game Actions
To add a new action:
1. Add message handler in `GameRoom.ts`:
   ```typescript
   this.onMessage("new_action", (client, data) => {
     // Validate and execute
   });
   ```
2. Add method to `ColyseusClient.ts`:
   ```typescript
   newAction(data) {
     this.send("new_action", data);
   }
   ```
3. Add to `useColyseus` hook if needed

## Development Workflow

### Starting Development
```bash
pnpm dev:all
```
This starts:
- Next.js on `http://localhost:3000`
- Colyseus server on `ws://localhost:2567`

### Making Changes

**Game Logic Changes:**
- Edit `server/rooms/GameRoom.ts`
- Server auto-reloads
- Refresh browser

**UI Changes:**
- Edit components as usual
- Next.js hot-reloads automatically

**State Schema Changes:**
- Edit `server/schema/GameState.ts`
- May need to restart server
- Update TypeScript types accordingly

## Environment Variables

Required variables:
```env
# Colyseus Game Server
NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567
COLYSEUS_PORT=2567

# Supabase (auth and history only)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Documentation References

- **`COLYSEUS_MIGRATION.md`**: Complete migration guide and new architecture
- **`GAME_RULES_REFERENCE.md`**: Game rules for implementation
- **`DATABASE.md`**: Database schema (Supabase for non-gameplay data)
- **`FLOW.md`**: Original game flow documentation
- **`PRD.md`**: Product requirements

External docs:
- **Colyseus**: https://docs.colyseus.io
- **Colyseus Schema**: https://docs.colyseus.io/state/schema/

## Deployment

### Production Setup
1. **Colyseus Server**: Deploy separately (Heroku, Railway, DigitalOcean)
2. **Next.js App**: Deploy as usual (Vercel, Netlify)
3. **Update env**: `NEXT_PUBLIC_COLYSEUS_URL=wss://your-game-server.com`

Colyseus supports:
- Multiple servers with Redis
- Load balancing
- Auto-scaling

## Project Context

- Originally developed with Cursor AI assistance
- Recently rebuilt with Colyseus (2025)
- Uses pnpm for package management
- Medieval fantasy theme
- Focus on clean, server-authoritative architecture
- Classic mode complete, Frenzy mode planned for future

## Quick Reference

### Game Flow (Server-Side)
```
waiting → initial_deal → trump_selection → bidding
→ final_deal → playing → ended
```

### Key Files
- **Game Logic**: `server/rooms/GameRoom.ts`
- **State Schema**: `server/schema/GameState.ts`
- **Client Hook**: `hooks/useColyseus.ts`
- **UI Components**: `components/game-board.tsx`, `components/card.tsx`

### Common Tasks
- **Add validation**: Edit `GameRoom.ts` message handlers
- **Change state structure**: Edit `GameState.ts` schema
- **Update UI**: Edit components, use `useColyseus` hook
- **Test locally**: `pnpm dev:all`
