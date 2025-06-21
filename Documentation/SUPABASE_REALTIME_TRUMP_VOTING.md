# Supabase Realtime Trump Voting System

This document explains the implementation of the trump voting system using the refactored modular Supabase Realtime architecture for Turup's Gambit.

## Overview

The trump voting system allows players to vote for their preferred trump suit during the initial deal phase of the game. The implementation uses the new modular realtime system with enhanced connection management, automatic reconnection, and improved error handling for real-time updates across all connected clients.

### Refactored Implementation Benefits

- **Enhanced Reliability**: Auto-reconnection with exponential backoff
- **Better Performance**: Debounced operations and connection pooling
- **Improved Error Handling**: Graceful fallbacks and comprehensive validation
- **Strong Typing**: TypeScript interfaces for all trump voting payloads
- **Modular Architecture**: Organized handlers in dedicated modules

## Components

The system consists of the following components:

1. **Database schema**: Tables and policies in Supabase
2. **Realtime channels**: For broadcasting and receiving votes
3. **React hooks**: For managing state and interactions
4. **UI components**: For displaying votes and allowing user interaction

## Database Schema

The system uses a `trump_votes` table in Supabase with the following structure:

```sql
CREATE TABLE public.trump_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  player_id UUID, -- For regular players
  bot_id TEXT, -- For bots
  suit TEXT NOT NULL CHECK (suit IN ('hearts', 'spades', 'diamonds', 'clubs')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Either player_id OR bot_id must be provided
  CONSTRAINT player_or_bot_required CHECK (
    (player_id IS NOT NULL AND bot_id IS NULL) OR
    (player_id IS NULL AND bot_id IS NOT NULL)
  )
);
```

Row Level Security (RLS) policies are applied to ensure players can only vote as themselves and see votes for rooms they're in.

## Integration with Refactored Game Store

The trump voting system is integrated with the refactored modular realtime system:

```typescript
// Enhanced trump voting with refactored realtime system
interface GameState {
  // Other state properties
  trumpVotes: Record<string, string>; // playerId -> suit
  trumpSuit: string | null;
  votingComplete: boolean;

  // Actions
  handleTrumpVote: (suit: string) => void;
  handleForceBotVotes: () => void;
  resetVotingState: () => void;
}

// Implementation with new modular realtime system
const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  trumpVotes: {},
  trumpSuit: null,
  votingComplete: false,

  // Actions with enhanced error handling
  handleTrumpVote: async (suit: string) => {
    const { sendMessage } = get().realtimeFunctions;

    try {
      // Send trump vote message with enhanced payload validation
      const success = await sendMessage({
        type: "game:select-trump",
        payload: {
          roomId: get().roomId,
          playerId: get().userId,
          playerName: get().currentUser?.username,
          suit,
          timestamp: Date.now(),
        },
      });

      if (success) {
        // Update local state
        set((state) => ({
          trumpVotes: {
            ...state.trumpVotes,
            [get().userId]: suit,
          },
        }));

        // Check if voting is complete
        if (Object.keys(get().trumpVotes).length === get().players.length) {
          set({ votingComplete: true });
          get().determineFinalTrumpSuit();
        }
      } else {
        // Handle send failure with user notification
        useUIStore.getState().showToast("Failed to send trump vote. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error sending trump vote:", error);
      useUIStore.getState().showToast("Error voting for trump suit.", "error");
    }
  },

  handleForceBotVotes: async () => {
    // Enhanced implementation with retry logic
    const { sendMessage } = get().realtimeFunctions;
    
    try {
      await sendMessage({
        type: "game:force-bot-votes",
        payload: {
          roomId: get().roomId,
          hostId: get().userId,
        },
      });
    } catch (error) {
      console.error("Error forcing bot votes:", error);
    }
  },

  resetVotingState: () => {
    set({
      trumpVotes: {},
      trumpSuit: null,
      votingComplete: false,
    });
  },

  determineFinalTrumpSuit: () => {
    // Enhanced algorithm with validation
    const votes = Object.values(get().trumpVotes);
    const suitCounts = votes.reduce((acc, suit) => {
      acc[suit] = (acc[suit] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Determine winning suit
    const winningsuit = Object.entries(suitCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    if (winningsuit) {
      set({ trumpSuit: winningsuit });
    }
  },
}));
```

## Trump Selection Popup Component

The `TrumpSelectionPopup` component provides the interface for voting:

```tsx
export const TrumpSelectionPopup = () => {
  const {
    trumpVotes,
    userVote,
    votingComplete,
    players,
    isHost,
    handleVote,
    handleForceBotVotes,
  } = useGameStore();

  // Count votes for each suit
  const voteCountBySuit = {
    hearts: 0,
    spades: 0,
    diamonds: 0,
    clubs: 0,
  };

  Object.values(trumpVotes).forEach((suit) => {
    voteCountBySuit[suit]++;
  });

  // Cards by suit in player's hand
  const cardsBySuit = countCardsBySuit(playerHand);

  return (
    <div className="trump-selection-popup">
      <h2>Select Trump Suit</h2>

      <div className="suits-grid">
        {Object.entries(cardsBySuit).map(([suit, count]) => (
          <button
            key={suit}
            className={`suit-button ${userVote === suit ? "selected" : ""}`}
            onClick={() => handleVote(suit)}
            disabled={votingComplete || userVote !== null}
          >
            <SuitIcon suit={suit} />
            <div className="card-count">{count} cards</div>
            <div className="vote-count">{voteCountBySuit[suit]} votes</div>
          </button>
        ))}
      </div>

      {isHost && !votingComplete && (
        <button
          className="force-bot-votes-button"
          onClick={handleForceBotVotes}
        >
          Force Bot Votes
        </button>
      )}

      <div className="voting-status">
        {votingComplete
          ? "Voting complete!"
          : `${Object.keys(trumpVotes).length} of ${players.length} votes`}
      </div>
    </div>
  );
};
```

## Refactored Realtime Implementation

### Enhanced Connection Management

The trump voting system now uses the `ConnectionManager` class for improved reliability:

```typescript
// Enhanced trump voting with ConnectionManager
const setupTrumpVotingSystem = (roomId: string, get: () => GameStoreState, set: SetStateFn) => {
  const connectionManager = new ConnectionManager(supabase);

  // Setup enhanced realtime subscription with auto-reconnection
  connectionManager.subscribeToRealtime(roomId, get, set);

  // Trump voting message handler (now in handlers.ts)
  const handleTrumpSelection: MessageHandler = (message, get, set) => {
    const { suit: selectedSuit, playerId, playerName } = message.payload as TrumpSelectionPayload;
    
    if (!selectedSuit) {
      logger.warn("Received trump selection without suit");
      return;
    }

    logger.info(`Trump suit selected by ${playerName}: ${selectedSuit}`);

    set({
      trumpSuit: selectedSuit,
      votingComplete: true,
      trumpVotes: {
        ...get().trumpVotes,
        [playerId]: selectedSuit,
      },
    });

    showToast(`${playerName} voted for ${selectedSuit}`, "info");
  };

  // Enhanced message sending with retry logic
  const sendTrumpVote = async (suit: string) => {
    const message = {
      type: "game:select-trump",
      payload: {
        roomId,
        playerId: getCurrentUser()?.id,
        playerName: getCurrentUser()?.username,
        suit,
        timestamp: Date.now(),
      },
    };

    return await connectionManager.sendMessage(message, get, set);
  };

  return { sendTrumpVote, cleanup: () => connectionManager.disconnect() };
};

      if (message.type === "game:select-trump") {
        const { playerId, suit } = message.payload;

        // Update vote in store
        useGameStore.getState().updateTrumpVote(playerId, suit);
      }
    })
    .subscribe();

  return channel;
};
```

### Vote Broadcasting

```typescript
const broadcastVote = (roomId, playerId, suit) => {
  const channel = getOrCreateChannel(`trump-voting:${roomId}`);

  return channel.send({
    type: "broadcast",
    event: "message",
    payload: {
      type: "game:select-trump",
      payload: {
        roomId,
        playerId,
        suit,
      },
    },
  });
};
```

## Bot Voting Implementation

Bots vote automatically with a weighted algorithm based on their cards:

```typescript
const generateBotVote = (botHand) => {
  const cardsBySuit = countCardsBySuit(botHand);

  // Apply weighted randomization based on card count
  let totalWeight = 0;
  const weights = {};

  for (const [suit, count] of Object.entries(cardsBySuit)) {
    const weight = count * count; // Square for more emphasis on higher counts
    weights[suit] = weight;
    totalWeight += weight;
  }

  // If bot has no cards, random selection
  if (totalWeight === 0) {
    const suits = ["hearts", "spades", "diamonds", "clubs"];
    return suits[Math.floor(Math.random() * suits.length)];
  }

  // Weighted random selection
  let random = Math.random() * totalWeight;

  for (const [suit, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) {
      return suit;
    }
  }

  // Fallback - should never reach here
  return "hearts";
};
```

## Host Controls for Bot Voting

The host can force bots to vote immediately:

```typescript
const handleForceBotVotes = () => {
  const { players, trumpVotes } = useGameStore.getState();

  // Find bots that haven't voted yet
  const botsNeedingVotes = players.filter(
    (player) => player.isBot && !trumpVotes[player.id]
  );

  // Generate and send votes for each bot
  botsNeedingVotes.forEach((bot) => {
    const suit = generateBotVote(bot.hand);
    broadcastVote(roomId, bot.id, suit);
  });
};
```

## Final Trump Selection Algorithm

Once all votes are in, the system determines the winning suit:

```typescript
const determineFinalTrumpSuit = () => {
  const { trumpVotes } = useGameStore.getState();

  // Count votes for each suit
  const voteCount = {
    hearts: 0,
    spades: 0,
    diamonds: 0,
    clubs: 0,
  };

  Object.values(trumpVotes).forEach((suit) => {
    voteCount[suit]++;
  });

  // Find suit(s) with highest votes
  let maxVotes = 0;
  let topSuits = [];

  for (const [suit, count] of Object.entries(voteCount)) {
    if (count > maxVotes) {
      maxVotes = count;
      topSuits = [suit];
    } else if (count === maxVotes) {
      topSuits.push(suit);
    }
  }

  // If there's a tie, randomly select from the tied suits
  const selectedSuit =
    topSuits.length === 1
      ? topSuits[0]
      : topSuits[Math.floor(Math.random() * topSuits.length)];

  // Broadcast final selection
  const { sendMessage } = useSupabaseRealtime.getState();
  sendMessage({
    type: "game:trump-selected",
    payload: {
      roomId: useGameStore.getState().roomId,
      suit: selectedSuit,
    },
  });

  return selectedSuit;
};
```

## Vote Timeout Mechanism

To prevent stalled games, a timeout triggers automatic voting:

```typescript
useEffect(() => {
  if (!votingComplete) {
    const timeout = setTimeout(() => {
      const { trumpVotes, players } = useGameStore.getState();

      // Check if voting is still incomplete
      if (Object.keys(trumpVotes).length < players.length) {
        // Force remaining votes
        handleForceBotVotes();

        // Force votes for inactive human players
        players.forEach((player) => {
          if (!player.isBot && !trumpVotes[player.id]) {
            // Generate default vote for inactive player
            const suit = "hearts"; // Default to hearts
            broadcastVote(roomId, player.id, suit);
          }
        });
      }
    }, 30000); // 30 seconds timeout

    return () => clearTimeout(timeout);
  }
}, [votingComplete]);
```

## Testing and Debugging

A test utility is available for simulating the trump voting process:

```typescript
// Test trump voting flow
const testTrumpVoting = async () => {
  const roomId = "test-room";
  const setupChannel = setupTrumpVotingChannel(roomId);

  // Simulate player votes
  await broadcastVote(roomId, "player1", "hearts");
  await broadcastVote(roomId, "player2", "spades");
  await broadcastVote(roomId, "player3", "hearts");
  await broadcastVote(roomId, "player4", "diamonds");

  // Check vote counts
  console.log("Trump votes:", useGameStore.getState().trumpVotes);

  // Determine final suit
  const finalSuit = determineFinalTrumpSuit();
  console.log("Final trump suit:", finalSuit);

  // Clean up
  setupChannel.unsubscribe();
};
```

## Future Improvements

1. **Vote Animation**: Add visual animation for vote casting
2. **Vote History**: Track voting patterns across games
3. **Predictive Suggestions**: Suggest optimal suit based on player's hand
4. **Team Voting Strategy**: Consider team-based voting strategies for bots
5. **Extended Timeout**: Allow players to request more time for voting

## Troubleshooting

If you encounter issues with the trump voting system:

1. Check console for Supabase Realtime connection errors
2. Verify that the channel is properly subscribed
3. Ensure RLS policies are correctly configured
4. Confirm that all players have valid IDs
5. Check for race conditions in vote processing
