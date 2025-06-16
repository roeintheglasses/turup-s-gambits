# Turup's Gambit

A modern card game built with Next.js, featuring real-time multiplayer gameplay and medieval aesthetics.

## Features

- 🎮 Multiple Game Modes
  - Classic Mode
  - Frenzy Mode
- 🎨 Medieval-themed UI with modern aesthetics
- 👥 Real-time multiplayer support with direct client-to-client communication
- 🎵 Immersive background music
- 🎯 Game replay system
- 🌓 Light/Dark theme support
- 📱 Responsive design for all devices

## Tech Stack

- **Framework:** Next.js 15
- **Styling:** Tailwind CSS
- **UI Components:**
  - Radix UI
  - Shadcn/ui
- **Authentication:** Custom auth system (with anonymous login support)
- **State Management:** Zustand
- **Animations:** Framer Motion
- **Real-time Communication:** Supabase Realtime (with direct client-to-client messaging)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended), npm, or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/SkwdStudios/turup-s-gambits.git
cd turup-s-gambits
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

## State Management

This project uses Zustand for state management. The state is organized into several stores:

### Auth Store (`stores/authStore.ts`)

Manages authentication state:

- User information
- Login/logout functionality
- Anonymous authentication

### Game Store (`stores/gameStore.ts`)

Manages game-related state:

- Room information
- Player information
- Game status and phase
- Game mechanics (cards, tricks, trump suit)
- Real-time communication

### UI Store (`stores/uiStore.ts`)

Manages UI-related state:

- Modal visibility
- Loading states
- Card selection
- Toast messages

### Settings Store (`stores/settingsStore.ts`)

Manages user preferences:

- Theme settings
- Music and sound effect settings

## Real-time Communication

The game uses Supabase Realtime for real-time multiplayer functionality:

- **Direct client-to-client communication** for most game actions, improving responsiveness and reducing server load
- **Smart routing logic** that sends security-critical operations through the server for validation
- **Fallback mechanisms** to ensure message delivery even when websocket connections fail
- **Optimized for low latency** to provide a seamless multiplayer experience

For more details, see the [Realtime Implementation Documentation](./Documentation/REALTIME_IMPLEMENTATION.md).
