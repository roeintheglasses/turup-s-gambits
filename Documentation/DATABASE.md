# Database Setup Guide

> **⚠️ NOTE**: With the Colyseus migration, Supabase is now used ONLY for:
> - User authentication (login/signup)
> - User profiles and statistics
> - Game history and replays (after game completion)
>
> **NOT used for**:
> - ❌ Real-time game state (now handled by Colyseus)
> - ❌ Active gameplay (runs on Colyseus server)
> - ❌ Game logic (server-authoritative in Colyseus)
>
> See [`COLYSEUS_MIGRATION.md`](./COLYSEUS_MIGRATION.md) for the new architecture.

## Overview

This project uses Supabase as the database provider with PostgreSQL as the underlying database engine for persistent storage of user data, profiles, and game history.

## Prerequisites

1. A Supabase account and project
2. Node.js 18.x or later
3. pnpm package manager

## Setup Steps

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Setup

Run the table creation script in Supabase SQL Editor:

```bash
node scripts/check-tables.js
```

If tables are missing, you can create them using the SQL file:

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `scripts/create-tables-manual.sql`
4. Run the SQL query

## Enhanced Database Schema

### User Model (Enhanced)

- Stores user information and authentication details
- Supports both anonymous and registered users
- Links to game participation through Player model
- **New Features**:
  - Player statistics tracking (games played, won, tricks won)
  - Frenzy powers usage statistics
  - Preferred game mode setting
  - Enhanced user profile management

### Game Rooms Model (New)

- Manages game room instances and settings
- Supports different game modes (Classic, Frenzy)
- Room privacy and password protection
- **Features**:
  - Game mode selection
  - Turn timer configuration
  - Bot player settings
  - Room capacity management

### Games Model (Enhanced)

- Represents a game instance with extended functionality
- Tracks game mode, status, and winner
- Connected to players, session, and replay data
- **New Features**:
  - Game mode support (Classic/Frenzy)
  - Enhanced status tracking (finished/ended distinction)
  - Frenzy power type and effects tracking
  - Special effects and revealed cards storage
  - Improved timing and duration tracking

### Players Model (Enhanced)

- Links users to games with comprehensive player data
- Tracks team assignment and position
- **New Features**:
  - Bot player support with difficulty levels
  - Enhanced game state tracking
  - Trump voting with timestamps
  - Bidding history
  - Cards played tracking
  - Connection status monitoring

### Game Cards Model (Enhanced)

- Tracks individual cards with detailed state information
- **Features**:
  - Card ownership and play history
  - Trump card identification
  - Position tracking in hands
  - Trick association
  - Detailed timing information

### Game Tricks Model (Enhanced)

- Represents individual tricks with comprehensive data
- **Features**:
  - Lead and trump suit tracking
  - Winner determination
  - Point calculation
  - Card play sequence
  - Timing information

### Game Replays Model (Significantly Enhanced)

- Comprehensive replay system with detailed tracking
- **New Features**:
  - Game mode specific replay data
  - Detailed move-by-move tracking
  - Player statistics and performance metrics
  - Frenzy power usage tracking
  - Enhanced metadata storage
  - Longest streak calculation
  - Game duration and timing statistics

### Frenzy Powers Model (New)

- Dedicated table for Frenzy Mode power tracking
- **Features**:
  - Power type and usage tracking
  - Target player identification
  - Effect data storage
  - Usage timestamps and cooldowns
  - Power success/failure tracking

### Bot Players Model (New)

- Manages bot player instances and configurations
- **Features**:
  - Bot difficulty levels
  - Personality and behavior settings
  - Performance tracking
  - Connection status
  - Activation/deactivation state

## Realtime Data Storage

The application uses a refactored modular Supabase Realtime system for synchronizing game state between players:

### Enhanced Realtime Architecture

- **Modular Connection Management**: ConnectionManager class handles all Supabase connections with auto-reconnection
- **Organized Message Handlers**: Message handlers are categorized by functionality (player management, game flow, Frenzy powers, etc.)
- **Enhanced Performance**: Debounced database sync prevents excessive calls (300ms debounce)
- **Improved Reliability**: Automatic fallback to API when WebSocket connections fail
- **Better Error Handling**: Comprehensive validation and graceful error recovery

### Data Synchronization Features

- **Game State Changes**: Real-time broadcasting with enhanced validation
- **Trump Selection**: Voting system with proper TypeScript interfaces
- **Frenzy Powers**: Real-time power usage and effect synchronization
- **Player Actions**: Comprehensive action tracking and synchronization
- **Game Phases**: Enhanced phase transition management
- **Presence Tracking**: Real-time player connection status monitoring
- **Automatic Retry**: Exponential backoff for failed operations
- **Bot Integration**: Seamless bot player synchronization

## Database Functions and Triggers (Enhanced)

### Game Logic Functions

- `update_user_stats_after_game()`: Updates player statistics after game completion
- `create_game_replay()`: Automatically creates detailed replay data
- `check_trump_voting_complete()`: Manages trump voting process completion

### Trigger System

- `update_user_stats_trigger`: Automatically updates user statistics
- `create_replay_trigger`: Creates replay data when games end
- `trump_voting_trigger`: Handles trump voting completion
- `update_updated_at_column()`: Maintains timestamp consistency

## Advanced Features

### Frenzy Mode Support

The database fully supports Frenzy Mode with:
- Power type tracking and usage limits
- Effect duration and cooldown management
- Target player identification
- Special effects data storage

### Enhanced Replay System

- **Detailed Move Tracking**: Every game action is recorded
- **Statistics Calculation**: Comprehensive performance metrics
- **Frenzy Power Analytics**: Usage patterns and effectiveness
- **Game Duration Tracking**: Precise timing information
- **Player Performance**: Individual and team statistics

### Bot Player Management

- **Difficulty Levels**: Easy, Medium, Hard bot configurations
- **Behavior Patterns**: Customizable bot personalities
- **Performance Tracking**: Bot effectiveness monitoring
- **Dynamic Management**: Runtime bot addition/removal

## Development Tools

### Supabase Dashboard

To view and edit data during development:

```bash
# Open your Supabase dashboard
https://app.supabase.com/project/{your-project-id}/editor
```

### Database Schema Updates

When making schema changes:

1. Update the SQL in `scripts/create-tables-manual.sql`
2. Apply changes via Supabase dashboard's SQL Editor
3. Update the corresponding TypeScript types in `/types` folder
4. Test with the enhanced realtime system

## Production Deployment

1. Ensure environment variables are properly set in your deployment platform
2. Make sure all schema changes are applied to your production Supabase instance
3. Verify Frenzy Mode functionality is working correctly
4. Test enhanced replay system performance

## Security Considerations

- **Row-level Security**: Enhanced policies for all new tables
- **Authentication**: Required for all database access
- **Validation**: Comprehensive server-side and client-side validation
- **Sensitive Operations**: Server-side verification for critical game actions
- **Frenzy Powers**: Validation to prevent power abuse

## Performance Optimization

- **Comprehensive Indexing**: Optimized indexes for all frequently queried fields
- **Query Optimization**: Enhanced queries for complex game operations
- **Connection Pooling**: Efficient database connection management
- **Caching Strategies**: Intelligent caching for frequently accessed data
- **Batch Operations**: Optimized bulk operations for better performance

## Backup and Recovery

- **Automated Backups**: Regular database backups through Supabase
- **Point-in-time Recovery**: Enhanced recovery options
- **Game State Snapshots**: Resilient game state preservation
- **Replay Data Protection**: Secure replay data storage

## Monitoring and Analytics

- **Performance Metrics**: Database query performance tracking
- **Usage Analytics**: Game mode popularity and usage patterns
- **Error Tracking**: Comprehensive error logging and monitoring
- **Player Behavior**: Detailed player interaction analytics

## Notes

- The database schema uses snake_case for table names and columns following Supabase conventions
- Column names are converted to camelCase in application code
- The database is accessed using Supabase's JavaScript SDK through the refactored modular realtime system
- All timestamps are stored in UTC with enhanced precision
- Foreign key relationships ensure data integrity across all tables
- Comprehensive indexes are created automatically for optimal query performance
- The application uses Zustand for client-side state management, which syncs with the database via the enhanced modular Supabase Realtime system

### Realtime System Integration

The database integrates seamlessly with the refactored realtime architecture:

- **Connection Pooling**: Database connections are pooled and reused efficiently through the ConnectionManager
- **Enhanced Sync**: Database state synchronization uses debounced operations to prevent excessive calls
- **Type Safety**: All database operations use proper TypeScript interfaces defined in the realtime/types.ts module
- **Error Recovery**: Failed database operations automatically retry with exponential backoff
- **Monitoring**: Real-time connection status tracking for database subscriptions
- **Graceful Fallbacks**: API fallback mechanisms when realtime database subscriptions fail
- **Frenzy Mode Integration**: Seamless integration with Frenzy Mode power tracking and effects
- **Enhanced Replay**: Comprehensive replay data storage and retrieval optimization
