# Turup's Gambit Documentation

## Project Overview

Turup's Gambit is a modern card game built with Next.js 15, featuring real-time multiplayer gameplay, medieval aesthetics, and rich interactive features. The game implements a sophisticated bidding system, real-time card animations, and social features to create an engaging multiplayer experience. The latest implementation includes **Frenzy Mode** - an enhanced game variant with special powers and abilities.

## Architecture Overview

The application follows a layered architecture pattern with a refactored modular realtime system:

1. **Presentation Layer**: React components and UI elements
2. **Business Logic Layer**: Custom hooks and game state management using Zustand
3. **Data Layer**: Refactored modular Supabase Realtime system with enhanced connection management
4. **Infrastructure Layer**: Authentication, routing, and utility functions

### Realtime System Architecture

The realtime system has been completely refactored into a modular architecture:

- **6 Specialized Modules**: Split from a single 1191-line file into focused modules
- **ConnectionManager Class**: Centralized connection handling with auto-reconnection
- **Enhanced Performance**: Debounced operations, connection pooling, and retry logic
- **Strong Typing**: Comprehensive TypeScript interfaces for all payloads
- **Improved Reliability**: Graceful fallbacks and comprehensive error recovery

## Game Modes

### Classic Mode
The traditional card game experience with standard rules, trump selection, and bidding phases.

### Frenzy Mode ✨ NEW
An enhanced game variant featuring special powers based on the trump suit:

- **Hearts Power**: Extra points for winning tricks with heart cards
- **Spades Power**: Free lead after winning a trick
- **Diamonds Power**: Peek at opponent's cards (2 uses per game)
- **Clubs Power**: Play one card out of turn (1 use per game)

## Game Flow

The game follows a structured flow with distinct phases:

1. **Waiting Room (waiting)**: Players join the room and wait for the game to start
2. **Initial Deal (initial_deal)**: 5 cards are dealt to each player
3. **Trump Selection**: Players vote on the trump suit based on their initial hand
4. **Bidding Phase (bidding)**: Players place bids after trump selection
5. **Final Deal (final_deal)**: Remaining 8 cards are dealt to each player
6. **Playing Phase (playing)**: Players take turns playing cards
7. **Game End (finished/ended)**: Game concludes, showing final results

## Detailed Component Documentation

### Game Components

1. **Game Board (game-board.tsx)**

   - Main game interface that renders the playing area
   - Enhanced with Frenzy Mode support and special power visualization
   - Handles player hands and game state visualization
   - Implements responsive layout for different screen sizes
   - Manages card positioning and game flow
   - Conditionally renders game phases and their corresponding UI elements
   - **New Features**:
     - Frenzy power displays and interactions
     - Enhanced replay system integration
     - Improved card play validation
     - Better state management with Zustand selectors

2. **Frenzy Powers (frenzy-powers.tsx)** ✨ NEW

   - Interactive power management system for Frenzy Mode
   - Displays available powers based on trump suit selection
   - Handles power usage, cooldowns, and usage limits
   - Visual feedback for power states (active, on cooldown, used up)
   - Animated power cards with motion effects
   - **Power Types**:
     - **Extra Points**: Passive power for hearts trump
     - **Free Lead**: Passive power for spades trump
     - **Peek Card**: Active power for diamonds trump (2 uses)
     - **Out of Turn**: Active power for clubs trump (1 use)

3. **Trump Selection Popup (trump-selection-popup.tsx)**

   - Modal component for selecting the trump suit
   - Appears after initial 5 cards are dealt
   - Analyzes player's hand to suggest optimal suit selection
   - Displays votes from all players in real-time
   - Includes timeout mechanism to force selection after a period
   - Supports host-triggered voting for bots
   - Shows card count by suit to help player decision-making
   - **Enhanced** with Frenzy Mode power previews

4. **Bidding Panel (bidding-panel.tsx)**

   - Interactive bid interface with validation
   - Real-time bid updates across players
   - Visual feedback for valid/invalid bids
   - Bid history tracking

5. **Card Components**:

   - **card.tsx**
     - Individual card rendering with animations
     - Click handlers for card selection
     - Card state management (selected, played, etc.)
     - Visual effects for card interactions
     - **Enhanced** with Frenzy Mode special effects
   - **card-shuffle-animation.tsx**
     - Smooth shuffling animations
     - Physics-based card movement
     - Configurable animation parameters
   - **floating-cards.tsx**
     - Floating card effects for emphasis
     - Parallax movement based on mouse position
     - Performance-optimized animations
   - **flying-cards.tsx**
     - Card movement between positions
     - Trajectory calculations
     - Collision detection and handling

6. **Game Mode Selector (game-mode-selector.tsx)**

   - Mode selection interface with Classic and Frenzy options
   - Mode-specific rule explanations
   - Player count validation
   - Mode transition animations
   - **Enhanced** with Frenzy Mode power explanations

7. **Turn Timer (turn-timer.tsx)**

   - Configurable turn duration
   - Visual countdown display
   - Time extension handling
   - Turn timeout actions

8. **Replay Summary (replay-summary.tsx)**
   - Enhanced game replay visualization
   - Player statistics display
   - Move-by-move analysis with Frenzy power tracking
   - Export functionality
   - **New Features**:
     - Frenzy power usage tracking
     - Enhanced statistics and metrics
     - Improved replay data structure

### UI Components

1. **Navbar (navbar.tsx)**

   - Responsive navigation design
   - Authentication state management
   - Theme toggle integration
   - Mobile menu implementation

2. **Chat System**:

   - **chat.tsx**
     - Real-time message synchronization
     - Message history management
     - Typing indicators
     - Message formatting
   - **in-game-emotes.tsx**
     - Game-specific emote system
     - Emote cooldown management
     - Emote visibility controls

3. **Audio System**:

   - **audio-player.tsx**
     - Audio context management
     - Playlist handling
     - Volume controls
     - Audio state persistence
   - **music-controls.tsx**
     - Playback controls
     - Track information display
     - Audio visualization
     - Mute/unmute functionality

4. **Theme Provider (theme-provider.tsx)**

   - Theme state management
   - CSS variable injection
   - Theme transition animations
   - System theme detection

5. **Login Modal (login-modal.tsx)**

   - Multiple authentication methods
   - Form validation
   - Error handling
   - Loading states

6. **Visual Effects (visual-effects.tsx)**

   - Particle effects for Frenzy Mode powers
   - Screen transitions
   - Highlight effects
   - Performance optimization

7. **Loading Skeletons**:
   - **game-board-skeleton.tsx**
   - **waiting-room-skeleton.tsx**
   - **game-controls-skeleton.tsx**
   - **game-info-skeleton.tsx**
   - **player-skeleton.tsx**
   - Provides smooth loading experiences
   - Maintains UI layout during data fetching
   - Improves perceived performance

### Store Management

1. **Game Store (gameStore.ts)**

   - Central game state management
   - Game phase transitions
   - Player management
   - Card dealing logic
   - Trump suit selection handling
   - Game scoring and tracking
   - **Enhanced Features**:
     - Frenzy Mode support and power tracking
     - Improved team assignment logic
     - Better game state synchronization
     - Enhanced played cards tracking

### Realtime Store Architecture

The realtime functionality is now organized in `stores/gameStore/realtime/`:

1. **constants.ts** - Configuration values, timing constants, and message types
   - **Enhanced** with Frenzy Mode message types
   - Added power-specific constants and timing
2. **types.ts** - TypeScript interfaces and type definitions
   - **New** Frenzy power payload interfaces
   - Enhanced game state type definitions
3. **utils.ts** - Utility functions, validation, and helpers
4. **handlers.ts** - Message handlers organized by category
   - **New** Frenzy power handlers and effects
   - Enhanced game flow handlers
5. **connection.ts** - ConnectionManager class for Supabase management
6. **index.ts** - Main API that combines all modules with enhanced error handling

2. **UI Store (uiStore.ts)**

   - Modal visibility management
   - Trump selection popup visibility
   - Loading state management
   - Toast notifications
   - Card selection state
   - Animation coordination
   - **Enhanced** with Frenzy Mode UI state management

3. **Auth Store (authStore.ts)**
   - User authentication state
   - Session management
   - User profile information
   - Authentication status checks

### Hooks

1. **use-replay.tsx** - Enhanced Replay System

   - Advanced replay data capture and management
   - **New Features**:
     - Frenzy power usage tracking
     - Enhanced move categorization
     - Better replay metadata
     - Improved statistics calculation
   - Game statistics and analysis
   - Replay data persistence
   - Export functionality

2. **use-game-state**

   - Game rules implementation
   - Turn management
   - Score calculation
   - Game phase transitions
   - **Enhanced** with Frenzy Mode logic

3. **use-music-player**

   - Audio playback control
   - Playlist management
   - Volume state
   - Audio effects

4. **use-supabase-realtime**
   - WebSocket connection management
   - Realtime message handling
   - Reconnection logic
   - Message queuing for reliability

## Tech Stack Details

### Core Technologies

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: Lightweight state management
- **Supabase**: Backend-as-a-Service with real-time capabilities
- **Framer Motion**: Animation library for React
- **Shadcn/ui**: Component library

### Enhanced Database Schema

The database now supports:
- **Frenzy Mode**: Special powers, effects, and usage tracking
- **Enhanced Replay System**: Detailed move tracking and statistics
- **Bot Players**: Improved bot management and difficulty levels
- **Advanced Statistics**: Player performance tracking
- **Game Modes**: Support for different game variants

### Development Tools

- **pnpm**: Fast, disk space efficient package manager
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for code quality

## Performance Optimizations

- **Debounced Operations**: Reduced API calls through intelligent debouncing
- **Connection Pooling**: Efficient WebSocket connection management
- **Memoization**: React.memo and useMemo for expensive calculations
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Next.js Image component for optimized loading

## Security Features

- **Row-Level Security**: Supabase RLS policies
- **Input Validation**: Server-side and client-side validation
- **Authentication**: Secure user authentication with Supabase Auth
- **CSRF Protection**: Built-in Next.js CSRF protection

## Accessibility

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Color Contrast**: WCAG AA compliant color schemes
- **Focus Management**: Proper focus handling

## Mobile Responsiveness

- **Responsive Design**: Tailwind CSS responsive utilities
- **Touch Optimization**: Touch-friendly interactions
- **Mobile Navigation**: Optimized navigation for mobile devices
- **Performance**: Optimized for mobile performance

## Future Enhancements

The modular architecture enables future enhancements:

- **Tournament Mode**: Competitive tournament system
- **Spectator Mode**: Watch games in progress
- **Advanced Statistics**: Detailed player analytics
- **Custom Game Modes**: User-created game variants
- **Enhanced Social Features**: Friend systems, chat improvements
- **Mobile App**: React Native mobile application
