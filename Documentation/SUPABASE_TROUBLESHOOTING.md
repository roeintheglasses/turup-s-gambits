# Supabase Database & Realtime Troubleshooting Guide

This guide provides solutions for common issues with the Supabase database configuration and the refactored realtime system for Turup's Gambit.

## Common Database Errors

1. **Error fetching game room: `{}`**
2. **Error creating game room: `{}`**
3. **Failed to create game room**
4. **Invalid input syntax for type uuid: "ROOMID"**

## Common Realtime Errors (Refactored System)

1. **Connection Manager errors: Cannot connect to realtime**
2. **Message handler errors: Unhandled message type**
3. **Auto-reconnection failures: Max reconnection attempts reached**
4. **Database sync errors: Failed to sync game state**
5. **Connection pooling issues: Channel not found in pool**

These errors typically occur due to one of the following issues:

### Database Issues:
- Missing or incorrectly configured database tables
- Row Level Security (RLS) policy restrictions
- Foreign key constraints with the `host_id` field
- Realtime publication configuration issues
- Data type mismatch between the database schema and application code

### Realtime System Issues:
- Network connectivity problems
- Supabase service disruptions
- Invalid message payloads
- Connection state synchronization issues
- Module import/export problems in the refactored structure

## Quick Fix Instructions

### 1. Run the Database Fix Script

The easiest way to fix database issues is to run the provided SQL script in your Supabase dashboard:

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `scripts/fix-database-permissions.sql`
4. Paste and run the script in the SQL Editor

This script will:

- Create any missing tables with the correct structure
- Update RLS policies to be more permissive for development
- Make the `host_id` field nullable to avoid foreign key constraint issues
- Set up the realtime publication for all required tables
- **Fix the data type mismatch by using TEXT for room IDs instead of UUID**

### 2. Verify Realtime Module Structure

Ensure the refactored realtime modules are properly structured:

```
stores/gameStore/realtime/
├── constants.ts      ✓ Configuration values and message types
├── types.ts          ✓ TypeScript interfaces and type definitions
├── utils.ts          ✓ Utility functions and helpers
├── handlers.ts       ✓ Message handlers organized by category
├── connection.ts     ✓ ConnectionManager class for Supabase management
├── index.ts          ✓ Main API that combines all modules
└── README.md         ✓ Detailed module documentation
```

### 3. Check Environment Variables

Make sure your `.env.local` file contains the correct Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Restart Your Development Server

After making these changes, restart your Next.js development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Realtime System Troubleshooting

### 1. Connection Manager Issues

**Problem**: `ConnectionManager` fails to establish connection

**Solution**:
```typescript
// Check connection status
const { getConnectionStatus } = createRealtimeFunctions(get, set);
const status = getConnectionStatus();

console.log("Connection status:", status);

// If connection failed, check:
// 1. Network connectivity
// 2. Supabase project status
// 3. Environment variables
```

### 2. Message Handler Errors

**Problem**: "Unhandled message type" errors in console

**Solution**: Check that the message type is properly registered in `handlers.ts`:

```typescript
// In handlers.ts, ensure your message type is included:
export const messageHandlers: Record<string, MessageHandler> = {
  // ... existing handlers
  "your:message-type": handleYourMessageType,
};
```

### 3. Auto-reconnection Failures

**Problem**: "Max reconnection attempts reached" errors

**Solution**: 
1. Check network stability
2. Verify Supabase service status
3. Adjust reconnection parameters in `constants.ts`:

```typescript
// In constants.ts
export const CONNECTION = {
  MAX_RECONNECT_ATTEMPTS: 10, // Increase if needed
  RETRY_BACKOFF_MULTIPLIER: 2,
  MAX_RETRY_DELAY: 60000, // Increase max delay
  RECONNECT_DELAY: 2000,
} as const;
```

### 4. Database Sync Errors

**Problem**: "Failed to sync game state" errors

**Solution**: Check database permissions and payload structure:

```typescript
// Ensure proper payload structure
const gameState = {
  gamePhase: "playing",
  trumpSuit: "hearts",
  // ... other required fields
};

// Check database permissions for the game_rooms table
```

### 5. Module Import Errors

**Problem**: Import/export errors in the refactored modules

**Solution**: Verify import paths and exports:

```typescript
// Correct import from the main realtime module
import { createRealtimeFunctions } from "./realtime";

// Or from specific modules
import { logger } from "./realtime/utils";
import { CONNECTION } from "./realtime/constants";
```

## Manual Database Fixes

If the quick fix doesn't resolve your issues, you may need to manually check and fix the following:

### 1. Check Database Tables

Ensure the following tables exist with the correct structure:

- `game_rooms`
- `trump_votes`
- `player_actions`

### 2. Check RLS Policies

For development, you may want to temporarily set more permissive RLS policies:

```sql
-- Example for game_rooms table
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read game rooms
CREATE POLICY "Anyone can read game rooms"
  ON game_rooms FOR SELECT
  USING (true);

-- Allow anyone to create game rooms
CREATE POLICY "Anyone can create game rooms"
  ON game_rooms FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update game rooms
CREATE POLICY "Anyone can update game rooms"
  ON game_rooms FOR UPDATE
  USING (true);
```

### 3. Check Realtime Publication

Ensure the realtime publication includes all required tables:

```sql
-- Create or update the realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE game_rooms, trump_votes, player_actions;
```

### 4. Make host_id Nullable

If you're having issues with the `host_id` foreign key constraint:

```sql
-- Alter the game_rooms table to make host_id nullable
ALTER TABLE game_rooms ALTER COLUMN host_id DROP NOT NULL;
```

## Debugging the Refactored Realtime System

### 1. Enable Debug Logging

The refactored system includes enhanced logging. To enable debug output:

```typescript
// In your component or store
import { logger } from "./realtime/utils";

// The logger automatically includes prefixes and structured output
logger.info("Connection established successfully");
logger.warn("Retry attempt failed", { attempt: 3, error });
logger.error("Critical error occurred", error);
```

### 2. Monitor Connection Status

```typescript
// Get real-time connection status
const realtimeFunctions = createRealtimeFunctions(get, set);
const status = realtimeFunctions.getConnectionStatus();

console.log("Connection State:", {
  isConnected: status.isConnected,
  reconnectAttempts: status.reconnectAttempts,
  lastReconnectTime: new Date(status.lastReconnectTime),
});
```

### 3. Test Message Handlers

```typescript
// Test individual message handlers
import { messageHandlers } from "./realtime/handlers";

const testMessage = {
  type: "game:card-played",
  payload: {
    card: { suit: "hearts", rank: "ace" },
    playerId: "test-player",
    playerName: "Test Player",
  },
};

// Test if handler exists
const handler = messageHandlers[testMessage.type];
if (handler) {
  handler(testMessage, get, set);
} else {
  console.error("No handler for message type:", testMessage.type);
}
```

## Performance Optimization

The refactored system includes several performance enhancements:

### 1. Debounced Operations

If you experience excessive database calls:

```typescript
// Database sync is automatically debounced (300ms)
// Adjust in realtime/index.ts if needed
const debouncedSyncToDatabase = debounce(
  createSyncGameStateToDatabase(get),
  500 // Increase delay if needed
);
```

### 2. Connection Pooling

Connections are automatically pooled and reused. Monitor in browser DevTools:

```typescript
// Check active channels
const connectionManager = new ConnectionManager(supabase);
console.log("Active channels:", connectionManager.getConnectionStatus());
```

## Code Improvements

The refactored codebase includes enhanced error handling:

1. **ConnectionManager class** - Centralized connection management with retry logic
2. **Enhanced message validation** - Proper TypeScript interfaces for all payloads
3. **Graceful fallbacks** - Automatic API fallback when WebSocket fails
4. **Comprehensive logging** - Structured logging with different levels
5. **Better state management** - Optimized state updates and synchronization

## UUID vs TEXT Issue

If you encounter an error like:

```
Error: invalid input syntax for type uuid: "ROOMID"
```

This indicates a data type mismatch between the database schema and application code:

- The database was expecting a UUID format for the `id` field
- But the application is using text-based room IDs like "TROODZ"

The updated SQL script fixes this by:

1. Dropping existing tables to avoid conflicts
2. Recreating tables with `id` as TEXT type instead of UUID
3. Updating all foreign key references to use TEXT type

## Testing Your Fix

After applying the fixes, you can test if the issues are resolved by:

1. **Database Operations**: Creating and joining game rooms
2. **Realtime Connectivity**: Monitoring connection status in browser DevTools
3. **Message Handling**: Sending various game actions and checking console logs
4. **Auto-reconnection**: Temporarily disabling network and verifying reconnection
5. **Performance**: Monitoring for excessive API calls or database operations

### Testing Commands

```bash
# Check database tables
node scripts/check-tables.js

# Test realtime connectivity
node scripts/test-realtime-multiplayer.js

# Verify realtime configuration
node scripts/verify-realtime-config.js
```

If you continue to experience issues, check:

1. **Browser DevTools Console** - For client-side errors
2. **Supabase Dashboard Logs** - For server-side issues
3. **Network Tab** - For failed requests or timeouts
4. **Realtime Inspector** - In Supabase dashboard for WebSocket issues

## Migration from Old System

If you're migrating from the old realtime implementation:

1. **No code changes required** - The API remains backward compatible
2. **Enhanced features available** - Use new cleanup and status methods
3. **Better error handling** - Automatic fallbacks and retry logic
4. **Improved performance** - Debounced operations and connection pooling

```typescript
// Old usage (still works)
const { sendMessage, subscribeToRealtime, syncGameStateToDatabase } = 
  createRealtimeFunctions(get, set);

// New features available
const realtimeFunctions = createRealtimeFunctions(get, set);
realtimeFunctions.cleanup(); // Proper cleanup
const status = realtimeFunctions.getConnectionStatus(); // Connection monitoring
```
