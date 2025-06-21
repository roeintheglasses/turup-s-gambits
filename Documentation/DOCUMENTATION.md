# Turup's Gambit Documentation

## Project Overview

Turup's Gambit is a modern card game built with Next.js 15, featuring real-time multiplayer gameplay, medieval aesthetics, and rich interactive features. The game implements a sophisticated bidding system, real-time card animations, and social features to create an engaging multiplayer experience.

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

## Game Flow

The game follows a structured flow with distinct phases:

1. **Waiting Room (waiting)**: Players join the room and wait for the game to start
2. **Initial Deal (initial_deal)**: 5 cards are dealt to each player
3. **Trump Selection**: Players vote on the trump suit based on their initial hand
4. **Bidding Phase (bidding)**: Players place bids after trump selection
5. **Final Deal (final_deal)**: Remaining 8 cards are dealt to each player
6. **Playing Phase (playing)**: Players take turns playing cards
7. **Game End (ended)**: Game concludes, showing final results

## Detailed Component Documentation

### Game Components

1. **Game Board (game-board.tsx)**

   - Main game interface that renders the playing area
   - Handles player hands and game state visualization
   - Implements responsive layout for different screen sizes
   - Manages card positioning and game flow
   - Conditionally renders game phases and their corresponding UI elements

2. **Trump Selection Popup (trump-selection-popup.tsx)**

   - Modal component for selecting the trump suit
   - Appears after initial 5 cards are dealt
   - Analyzes player's hand to suggest optimal suit selection
   - Displays votes from all players in real-time
   - Includes timeout mechanism to force selection after a period
   - Supports host-triggered voting for bots
   - Shows card count by suit to help player decision-making
   - Integrates with game state through Zustand stores

3. **Bidding Panel (bidding-panel.tsx)**

   - Interactive bid interface with validation
   - Real-time bid updates across players
   - Visual feedback for valid/invalid bids
   - Bid history tracking

4. **Card Components**:

   - **card.tsx**
     - Individual card rendering with animations
     - Click handlers for card selection
     - Card state management (selected, played, etc.)
     - Visual effects for card interactions
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

5. **Game Mode Selector (game-mode-selector.tsx)**

   - Mode selection interface
   - Mode-specific rule explanations
   - Player count validation
   - Mode transition animations

6. **Turn Timer (turn-timer.tsx)**

   - Configurable turn duration
   - Visual countdown display
   - Time extension handling
   - Turn timeout actions

7. **Replay Summary (replay-summary.tsx)**
   - Game replay visualization
   - Player statistics display
   - Move-by-move analysis
   - Export functionality

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
   - **emoji-display.tsx**
     - Emoji rendering optimization
     - Custom emoji support
     - Emoji search functionality
   - **emoji-reactions.tsx**
     - Quick reaction system
     - Reaction counting
     - Animation effects
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

   - Particle effects
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
   - Integration with refactored modular realtime system

### Realtime Store Architecture

The realtime functionality is now organized in `stores/gameStore/realtime/`:

1. **constants.ts** - Configuration values, timing constants, and message types
2. **types.ts** - TypeScript interfaces and type definitions
3. **utils.ts** - Utility functions, validation, and helpers
4. **handlers.ts** - Message handlers organized by category (player management, game flow, etc.)
5. **connection.ts** - ConnectionManager class for Supabase management
6. **index.ts** - Main API that combines all modules with enhanced error handling

2. **UI Store (uiStore.ts)**

   - Modal visibility management
   - Trump selection popup visibility
   - Loading state management
   - Toast notifications
   - Card selection state
   - Animation coordination

3. **Auth Store (authStore.ts)**
   - User authentication state
   - Session management
   - User profile information
   - Authentication status checks

### Hooks

1. **use-auth**

   - Token management
   - Session persistence
   - Authentication state
   - User profile management

2. **use-game-state**

   - Game rules implementation
   - Turn management
   - Score calculation
   - Game phase transitions

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

- **Next.js 15**

  - App Router implementation
  - Server-side rendering
  - API route handlers
  - Middleware support

- **React 19**

  - Concurrent features
  - Server components
  - Suspense boundaries
  - Error boundaries

- **TypeScript**
  - Strict type checking
  - Custom type definitions
  - Interface definitions
  - Type safety

### UI Framework

- **Tailwind CSS**

  - Custom theme configuration
  - Responsive design utilities
  - Animation classes
  - Dark mode support

- **Radix UI / Shadcn UI**
  - Accessible component primitives
  - Headless UI components
  - Composable patterns
  - Theme integration

### State Management

- **Zustand**
  - Simple, fast state management
  - Middleware support
  - Immutable updates
  - Devtools integration

### Real-time Communication

- **Supabase Realtime**
  - WebSocket-based communication
  - Broadcast channels for game events
  - Presence for player status
  - Channel caching for performance

### Authentication

- **Supabase Auth**
  - Email/password authentication
  - OAuth providers
  - JWT token management
  - User profiles

### Database

- **Supabase PostgreSQL**
  - Relational data model
  - Real-time subscriptions
  - Row-level security
  - Stored procedures

## Testing & Development

- **Testing Framework**

  - Jest for unit testing
  - Cypress for E2E testing
  - MSW for service mocking
  - Realtime testing utilities

- **Development Tools**
  - ESLint for code quality
  - Prettier for formatting
  - Husky for git hooks
  - TypeScript for type checking

## Deployment

- **CI/CD**

  - GitHub Actions
  - Vercel integration
  - Preview deployments
  - Environment variable management

- **Monitoring**
  - Error logging
  - Performance metrics
  - Usage analytics
  - Uptime monitoring

## Future Roadmap

1. **Enhanced Social Features**

   - Friends list
   - Private messaging
   - Achievements

2. **Advanced Game Modes**

   - Tournament support
   - Custom rule creation
   - Spectator mode

3. **Mobile App**

   - Native mobile experience
   - Push notifications
   - Offline support

4. **AI Improvements**
   - Advanced bot strategies
   - Machine learning integration
   - Skill-based matching
