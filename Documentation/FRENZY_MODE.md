# Frenzy Mode Documentation

## Overview

Frenzy Mode is an enhanced game variant that introduces special powers and abilities based on the trump suit selection. This mode adds strategic depth and exciting gameplay mechanics while maintaining the core card game experience.

## Game Mode Selection

Players can choose between two game modes:
- **Classic Mode**: Traditional gameplay with standard rules
- **Frenzy Mode**: Enhanced gameplay with special powers based on trump suit

## Power System

### Power Types by Trump Suit

#### Hearts Power: Extra Points
- **Type**: Passive
- **Effect**: Gain extra points for winning tricks with heart cards
- **Activation**: Automatic when winning tricks containing hearts
- **Cooldown**: None (passive ability)
- **Usage Limit**: Unlimited

#### Spades Power: Free Lead
- **Type**: Passive
- **Effect**: Lead with any card after winning a trick
- **Activation**: Automatic after winning any trick
- **Cooldown**: None (passive ability)
- **Usage Limit**: Unlimited

#### Diamonds Power: Peek at Card
- **Type**: Active
- **Effect**: See one opponent's card
- **Activation**: Manual activation by player
- **Cooldown**: 30 seconds
- **Usage Limit**: 2 uses per game

#### Clubs Power: Out of Turn Play
- **Type**: Active
- **Effect**: Play one card out of turn
- **Activation**: Manual activation by player
- **Cooldown**: 45 seconds
- **Usage Limit**: 1 use per game

## Technical Implementation

### Component Architecture

#### FrenzyPowers Component (`components/frenzy-powers.tsx`)

```typescript
interface FrenzyPowersProps {
  trumpSuit: Suit;
  gameMode: "classic" | "frenzy";
  currentPlayer: string;
  isCurrentUserTurn: boolean;
  onUsePower: (powerType: string, data?: any) => void;
}
```

**Key Features:**
- Power state management with usage tracking
- Cooldown timers with visual feedback
- Usage limit enforcement
- Animated power cards with motion effects
- Modal components for interactive powers

#### Power Card Component

```typescript
interface PowerCardProps {
  power: PowerDefinition;
  powerState: PowerState;
  isActive: boolean;
  isUsable: boolean;
  onUse: () => void;
}
```

**Visual States:**
- **Active**: Power is available for the current trump suit
- **On Cooldown**: Power is temporarily unavailable
- **Used Up**: Power has reached usage limit
- **Disabled**: Power is not available (wrong trump suit or not player's turn)

### State Management

#### Game Store Integration

```typescript
interface GameStoreState {
  // Frenzy mode powers tracking
  frenzyPowers?: Record<string, Record<string, {
    used: boolean;
    lastUsed: number;
    usageCount: number;
  }>>;
  
  // Special effects tracking for frenzy mode
  specialEffects?: Record<string, {
    type: string;
    active: boolean;
    targetPlayer?: string;
    data?: any;
  }>;
  
  // Revealed cards tracking (for peek card power)
  revealedCards?: Record<string, {
    playerId: string;
    card: Card;
    revealedAt: number;
  }>;
}
```

### Database Schema

#### Frenzy Powers Table

```sql
CREATE TABLE IF NOT EXISTS public.frenzy_powers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Power details
  power_type TEXT CHECK (power_type IN ('extra_points', 'free_lead', 'peek_card', 'out_of_turn')) NOT NULL,
  trump_suit TEXT CHECK (trump_suit IN ('hearts', 'spades', 'diamonds', 'clubs')) NOT NULL,
  
  -- Usage tracking
  used_at TIMESTAMPTZ DEFAULT NOW(),
  target_player UUID REFERENCES users(id),
  power_data JSONB DEFAULT '{}',
  
  -- Results
  was_successful BOOLEAN DEFAULT true,
  effect_duration INTEGER, -- in seconds
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Realtime Integration

#### Message Types

```typescript
export const MESSAGE_TYPES = {
  // Frenzy mode powers
  GAME_FRENZY_POWER: 'game:frenzy-power',
  GAME_FRENZY_EFFECT: 'game:frenzy-effect',
} as const;
```

#### Power Usage Payload

```typescript
interface FrenzyPowerPayload {
  powerType: "extra_points" | "free_lead" | "peek_card" | "out_of_turn";
  playerId: string;
  playerName: string;
  roomId: string;
  data?: any;
  timestamp?: number;
}
```

#### Power Effect Payload

```typescript
interface FrenzyPowerEffectPayload {
  effectType: "reveal_card" | "extra_points_scored" | "out_of_turn_granted" | "free_lead_granted";
  targetPlayer?: string;
  sourcePlayer: string;
  roomId: string;
  data?: any;
  timestamp?: number;
}
```

### Game Manager Integration

#### Power Validation

```typescript
public canUseFrenzyPower(roomId: string, playerId: string, powerType: string): boolean {
  const room = this.getRoom(roomId);
  if (!room || room.gameState.gamePhase !== "playing") {
    return false;
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player) return false;

  const powerState = room.gameState.frenzyPowers?.[playerId]?.[powerType];
  if (!powerState) return true; // First time using this power

  // Check usage limits and cooldowns
  const powerDefinition = this.getPowerDefinition(powerType);
  const isOnCooldown = powerDefinition.cooldown > 0 && 
    (Date.now() - powerState.lastUsed) < powerDefinition.cooldown;
  const isAtLimit = powerDefinition.usageLimit > 0 && 
    powerState.usageCount >= powerDefinition.usageLimit;

  return !isOnCooldown && !isAtLimit;
}
```

#### Power Execution

```typescript
public useFrenzyPower(
  roomId: string, 
  playerId: string, 
  powerType: string, 
  targetData?: any
): boolean {
  if (!this.canUseFrenzyPower(roomId, playerId, powerType)) {
    return false;
  }

  const room = this.getRoom(roomId);
  if (!room) return false;

  // Update power usage tracking
  if (!room.gameState.frenzyPowers) {
    room.gameState.frenzyPowers = {};
  }
  if (!room.gameState.frenzyPowers[playerId]) {
    room.gameState.frenzyPowers[playerId] = {};
  }
  if (!room.gameState.frenzyPowers[playerId][powerType]) {
    room.gameState.frenzyPowers[playerId][powerType] = {
      used: false,
      lastUsed: 0,
      usageCount: 0
    };
  }

  const powerState = room.gameState.frenzyPowers[playerId][powerType];
  powerState.used = true;
  powerState.lastUsed = Date.now();
  powerState.usageCount++;

  // Execute power-specific logic
  switch (powerType) {
    case "peek_card":
      this.handlePeekCardPower(room, playerId, targetData);
      break;
    case "out_of_turn":
      this.handleOutOfTurnPower(room, playerId);
      break;
    // Passive powers (hearts, spades) are handled during trick resolution
  }

  return true;
}
```

## UI/UX Design

### Power Card Design

- **Visual Hierarchy**: Clear power name, description, and status
- **Color Coding**: Suit-specific colors (red for hearts/diamonds, black for spades/clubs)
- **Status Indicators**: Visual feedback for active, cooldown, and used states
- **Animations**: Smooth transitions and hover effects
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Modal Interactions

#### Peek Card Modal

```typescript
const PeekCardModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  targetPlayer: string;
  revealedCard: any;
}> = ({ isOpen, onClose, targetPlayer, revealedCard }) => {
  // Modal implementation with card reveal animation
}
```

### Power Usage Feedback

- **Toast Notifications**: Success/failure feedback
- **Visual Effects**: Special animations for power activation
- **Sound Effects**: Audio feedback for power usage
- **Status Messages**: Clear communication of power effects

## Gameplay Balance

### Power Balancing

#### Passive Powers (Hearts, Spades)
- **Advantage**: Consistent benefit throughout the game
- **Limitation**: Cannot be controlled or timed strategically
- **Balance**: Provides steady advantage without overwhelming impact

#### Active Powers (Diamonds, Clubs)
- **Advantage**: Strategic control over timing
- **Limitation**: Limited uses and cooldown periods
- **Balance**: High impact but restricted availability

### Strategic Considerations

1. **Trump Selection**: Players must consider not just card strength but power utility
2. **Power Timing**: Active powers require strategic timing for maximum effect
3. **Opponent Awareness**: Players must account for opponent's potential powers
4. **Resource Management**: Limited-use powers require careful resource allocation

## Testing and Validation

### Unit Tests

```typescript
describe('Frenzy Powers', () => {
  test('should validate power usage limits', () => {
    // Test power usage validation
  });
  
  test('should enforce cooldown periods', () => {
    // Test cooldown enforcement
  });
  
  test('should track power usage statistics', () => {
    // Test usage tracking
  });
});
```

### Integration Tests

- **Power Activation**: End-to-end power usage flow
- **Realtime Sync**: Power state synchronization between players
- **Database Persistence**: Power usage data storage and retrieval
- **UI Responsiveness**: Power interface interactions

## Performance Considerations

### Optimization Strategies

1. **State Management**: Efficient power state updates
2. **Animation Performance**: Optimized animations with `framer-motion`
3. **Database Queries**: Indexed queries for power usage tracking
4. **Realtime Efficiency**: Minimized message payloads for power events

### Memory Management

- **Power State Cleanup**: Automatic cleanup of expired power effects
- **Component Unmounting**: Proper cleanup of power-related subscriptions
- **Cache Management**: Efficient caching of power definitions and states

## Future Enhancements

### Planned Features

1. **Custom Powers**: Player-created power combinations
2. **Power Synergies**: Interactions between different power types
3. **Advanced Analytics**: Detailed power usage statistics
4. **Tournament Mode**: Competitive Frenzy Mode tournaments
5. **Power Skins**: Visual customization for power effects

### Technical Improvements

1. **Power Scripting**: Lua-based power definition system
2. **AI Integration**: Smart bot power usage strategies
3. **Performance Monitoring**: Real-time power system performance tracking
4. **A/B Testing**: Power balance testing framework

## Troubleshooting

### Common Issues

1. **Power Not Activating**: Check cooldown status and usage limits
2. **Sync Issues**: Verify realtime connection and message handling
3. **UI Unresponsive**: Check for component re-render issues
4. **Database Errors**: Validate power usage data integrity

### Debug Tools

- **Power State Inspector**: Development tool for power state debugging
- **Realtime Message Logger**: Message flow tracking for power events
- **Performance Profiler**: Power system performance analysis
- **Database Query Analyzer**: Power-related query optimization 