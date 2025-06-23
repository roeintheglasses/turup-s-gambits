# Turup's Gambit - Enhanced Game Flow Documentation

## Game Modes Overview

Turup's Gambit now supports two distinct game modes:

### Classic Mode (Court Piece Style)
Traditional gameplay with standard rules, bidding phases, and strategic trump selection.

### Frenzy Mode ✨ NEW
Enhanced gameplay with special powers, accelerated pacing, and dynamic abilities based on trump suit.

---

## Classic Mode Flow

### Overview

This is a detailed game flow for Turup's Gambit Classic Mode, based on the traditional Court Piece (also known as Court Piece, Hokm, or Rung). The game is played by four players in teams of two, using a standard 52-card deck.

### 1. Players and Teams

- **Total Players**: 4
- **Team Formation**: 2 teams of 2 players each
  - **Royals Team**: First and third players
  - **Rebels Team**: Second and fourth players
- **Seating Arrangement**: Teammates sit opposite each other in a cross setup

### 2. Deck

- Standard **52-card deck** (no jokers)
- Card ranks from high to low: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2

### 3. Objective

- **Primary Goal**: Win more tricks than the opposing team
- **Win Conditions**:
  - Win **7 tricks first** to claim a **baazi**
  - Win **all 13 tricks** to claim a **kot** (or **grand baazi**) for bonus points

### 4. Game Setup and Flow

#### 4.1 Waiting Room Phase
- Players join the game room
- Host can start the game when 4 players have joined
- Bots can be added to fill empty slots
- Teams are automatically assigned (Royals vs Rebels)
- Game mode selection (Classic or Frenzy)

#### 4.2 Initial Deal Phase
- Dealer deals **5 cards** to each player in a clockwise direction
- Players review their initial hand
- Shuffle animation and card dealing effects
- Phase transition to trump selection

#### 4.3 Trump Selection Phase
- All players vote for their preferred trump suit based on their initial 5 cards
- Players can see the number of cards they have in each suit
- Visual suit analysis and recommendation system
- The system tallies votes and determines the final trump suit
- If tied, a random selection is made from the tied suits
- The host can force bots to vote
- **Enhanced Features**:
  - Real-time voting display
  - Card count visualization by suit
  - Strategic recommendations

#### 4.4 Bidding Phase
- Players place bids on how many tricks they think their team will win
- Minimum bid is 7 (required to win)
- Maximum bid is 13 (all tricks)
- Players can see other players' bids in real-time
- Bidding proceeds in a clockwise direction
- Turn timer enforcement

#### 4.5 Final Deal Phase
- After bidding is complete, the remaining **8 cards** are dealt to each player
- Each player now has **13 cards total**
- Hand reorganization and sorting
- Phase transition animation

#### 4.6 Playing Phase
- The highest bidder leads the first trick
- Play proceeds clockwise
- Players must follow the suit of the leading card if possible
- If a player cannot follow suit, they may play any card including trumps
- Trump cards beat all non-trump cards
- The highest card of the led suit wins unless a trump is played
- The winner of a trick leads the next trick
- **Enhanced Features**:
  - Card play validation
  - Trick winner animation
  - Real-time score updates
  - Turn timer with visual countdown

#### 4.7 Game End Phase
- Game ends when one team wins 7 tricks or all 13 tricks have been played
- Winning 7+ tricks grants a baazi to that team
- Winning all 13 tricks grants a kot (grand baazi)
- Score is calculated based on the number of tricks won
- Players can view a comprehensive game summary and replay
- **Enhanced Features**:
  - Detailed statistics display
  - Replay system with move-by-move analysis
  - Performance metrics

---

## Frenzy Mode Flow ✨ NEW

### Overview

Frenzy Mode introduces special powers and accelerated gameplay while maintaining the core card game mechanics. Each trump suit grants unique abilities that can dramatically alter game strategy.

### 1. Key Differences from Classic Mode

- **No Bidding Phase**: Streamlined gameplay
- **Enhanced Powers**: Trump suit determines special abilities
- **Faster Pacing**: Reduced turn timers
- **Strategic Depth**: Power management adds new layer

### 2. Frenzy Mode Phases

#### 2.1 Waiting Room Phase (Enhanced)
- Game mode selection with Frenzy Mode explanation
- Power preview based on potential trump suits
- Bot difficulty settings for Frenzy Mode

#### 2.2 Initial Deal Phase
- Same as Classic Mode: 5 cards dealt to each player
- Enhanced visual effects for Frenzy Mode

#### 2.3 Trump Selection Phase (Power Preview)
- Players vote for their preferred trump suit
- **Power Preview System**: Shows what power each suit would grant
  - **Hearts**: Extra Points power preview
  - **Spades**: Free Lead power preview
  - **Diamonds**: Peek Card power preview
  - **Clubs**: Out of Turn power preview
- Strategic consideration includes both card strength and power utility

#### 2.4 Power Activation Phase ✨ NEW
- Trump suit is determined based on votes
- Corresponding Frenzy Power is activated for all players
- Power interface becomes available
- Power usage rules and limits are displayed

#### 2.5 Final Deal Phase
- Remaining 8 cards are dealt (13 cards total per player)
- Power system fully activated
- Strategic planning with powers in mind

#### 2.6 Enhanced Playing Phase
- Standard card play rules apply
- **Power System Active**:
  - **Passive Powers** (Hearts/Spades): Automatically triggered
  - **Active Powers** (Diamonds/Clubs): Manual activation required
- Power usage tracking and cooldown management
- Enhanced visual effects for power usage
- Real-time power state synchronization

### 3. Power System Details

#### 3.1 Hearts Power: Extra Points
- **Type**: Passive
- **Effect**: Gain bonus points for winning tricks containing heart cards
- **Activation**: Automatic when winning qualifying tricks
- **Strategy**: Encourages collection of heart cards

#### 3.2 Spades Power: Free Lead
- **Type**: Passive
- **Effect**: Lead with any card after winning a trick (breaks suit following rules)
- **Activation**: Automatic after winning any trick
- **Strategy**: Provides tactical flexibility in card play

#### 3.3 Diamonds Power: Peek Card
- **Type**: Active
- **Effect**: Reveal one opponent's card
- **Usage Limit**: 2 uses per game
- **Cooldown**: 30 seconds
- **Strategy**: Information gathering for tactical advantage

#### 3.4 Clubs Power: Out of Turn Play
- **Type**: Active
- **Effect**: Play one card outside normal turn order
- **Usage Limit**: 1 use per game
- **Cooldown**: 45 seconds
- **Strategy**: Disrupt opponent plans or save critical situations

### 4. Power Management Interface

#### 4.1 Power Display
- Suit-specific power card with visual status
- Cooldown timers with countdown display
- Usage counters for limited-use powers
- Active/inactive state indicators

#### 4.2 Power Activation
- Click-to-activate for active powers
- Confirmation dialogs for critical powers
- Target selection for powers requiring targets
- Visual feedback for successful activation

#### 4.3 Power Effects
- Special animations for power usage
- Toast notifications for power activation
- Game state updates reflecting power effects
- Opponent notification of power usage

---

## Enhanced UI/UX Flow

### 1. Game Board Layout (Improved)

- **Central Play Area**: Cards in play with enhanced animations
- **Player Positions**: Clear team identification (Royals vs Rebels)
- **Trump Indicator**: Prominent trump suit display with power information
- **Score Display**: Real-time trick counts and team scores
- **Turn Timer**: Visual countdown with urgency indicators
- **Power Interface**: Frenzy Mode power controls and status
- **Game Phase Indicator**: Clear current phase display

### 2. Enhanced Interactive Elements

#### 2.1 Card Interaction
- **Hover Effects**: Card highlighting on hover
- **Click Feedback**: Visual confirmation of card selection
- **Drag & Drop**: Optional card play method
- **Valid Card Highlighting**: Shows playable cards
- **Trump Card Emphasis**: Special styling for trump cards

#### 2.2 Power Interface (Frenzy Mode)
- **Power Cards**: Interactive power displays
- **Usage Tracking**: Visual usage counters
- **Cooldown Display**: Real-time cooldown timers
- **Effect Animation**: Special effects for power activation

#### 2.3 Game Controls
- **Settings Panel**: Game preferences and audio controls
- **Chat Interface**: Real-time messaging with emotes
- **Replay Controls**: Post-game replay navigation
- **Statistics Panel**: Detailed performance metrics

### 3. Animation and Visual Effects

#### 3.1 Card Animations
- **Deal Animation**: Smooth card distribution
- **Play Animation**: Card movement to center
- **Trick Collection**: Winner collection animation
- **Shuffle Effects**: Deck shuffling visualization

#### 3.2 Power Effects (Frenzy Mode)
- **Power Activation**: Special effect on power use
- **Peek Card**: Card reveal animation with spotlight
- **Out of Turn**: Breaking turn order visual effect
- **Extra Points**: Bonus point celebration animation

#### 3.3 Transition Effects
- **Phase Transitions**: Smooth phase change animations
- **Team Assignment**: Visual team formation
- **Game End**: Victory/defeat animations
- **Score Updates**: Animated score changes

---

## Strategic Elements

### Classic Mode Strategy

- **Trump Management**: Strategic use of trump cards
- **Card Counting**: Tracking played cards
- **Team Signaling**: Implicit communication through card play
- **Trick Planning**: Multi-trick strategy
- **Trump Conservation**: Saving trump cards for critical moments
- **Suit Control**: Maintaining control of non-trump suits

### Frenzy Mode Strategy ✨ NEW

#### Power-Based Strategy
- **Power Selection**: Choosing trump based on both cards and desired power
- **Timing Mastery**: Optimal timing for active power usage
- **Resource Management**: Managing limited-use powers
- **Counter-Strategy**: Anticipating and countering opponent powers

#### Advanced Tactics
- **Power Synergy**: Combining card play with power effects
- **Information Warfare**: Using Peek Card for maximum advantage
- **Disruption Tactics**: Strategic use of Out of Turn power
- **Passive Power Maximization**: Optimizing Hearts/Spades power benefits

### Team Coordination (Both Modes)

- **Communication**: Non-verbal signaling through card selection
- **Role Assignment**: Dynamic role distribution based on hands
- **Sacrifice Plays**: Team member sacrificing for team benefit
- **Endgame Coordination**: Collaborative final trick strategy

---

## Game Progression Sequence

### Classic Mode Sequence
1. **Pre-Game**: Room creation, player joining, team assignment
2. **Game Start**: Initial deal of 5 cards
3. **Trump Selection**: All players vote on trump suit
4. **Bidding**: Players bid on number of tricks
5. **Final Deal**: Remaining 8 cards dealt
6. **Gameplay**: 13 tricks played in sequence
7. **Scoring**: Points calculated based on tricks won
8. **End Game**: Results displayed, option to play again

### Frenzy Mode Sequence ✨ NEW
1. **Pre-Game**: Room creation, mode selection, player joining
2. **Game Start**: Initial deal of 5 cards
3. **Trump Selection**: Voting with power preview
4. **Power Activation**: Trump suit determines active power
5. **Final Deal**: Remaining 8 cards dealt
6. **Enhanced Gameplay**: 13 tricks with power system active
7. **Advanced Scoring**: Points with power bonuses
8. **Detailed End Game**: Results with power usage statistics

---

## Performance and Technical Considerations

### Real-time Synchronization
- **Game State Sync**: Real-time game state updates
- **Power State Sync**: Frenzy Mode power state synchronization
- **Animation Coordination**: Synchronized animations across clients
- **Error Recovery**: Graceful handling of connection issues

### Data Persistence
- **Game Replay**: Complete game state recording
- **Statistics**: Player performance tracking
- **Power Analytics**: Frenzy Mode power usage statistics
- **Achievement System**: Progress tracking and rewards

### Scalability
- **Room Management**: Efficient game room handling
- **Bot Integration**: Seamless bot player management
- **Performance Optimization**: Optimized rendering and updates
- **Mobile Compatibility**: Responsive design for mobile devices

---

## Summary

Turup's Gambit provides an engaging digital implementation of the classic Court Piece card game with significant enhancements:

- **Dual Game Modes**: Classic and Frenzy Mode options
- **Enhanced Visual Experience**: Rich animations and effects
- **Strategic Depth**: Power system adds new tactical layers
- **Social Features**: Chat, emotes, and team coordination
- **Advanced Analytics**: Comprehensive replay and statistics system
- **Modern Technology**: Real-time multiplayer with robust synchronization

The game successfully balances traditional card game mechanics with innovative digital features, creating an optimal gaming experience for both casual and competitive players.
