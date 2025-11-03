# Game Rules Reference for Colyseus Implementation

## Classic Mode - Court Piece Card Game

### Overview
- **Players**: 4 players in 2 teams
- **Teams**:
  - Royals Team (Players 1 & 3)
  - Rebels Team (Players 2 & 4)
- **Deck**: Standard 52 cards (no jokers)
- **Objective**: Win 7 tricks (baazi) or all 13 tricks (kot)

### Card Rankings
From highest to lowest: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2

### Game Phases

#### 1. Waiting Room
- Wait for 4 players to join
- Host can start game
- Teams auto-assigned

#### 2. Initial Deal
- Deal 5 cards to each player
- Clockwise distribution

#### 3. Trump Selection
- Each player votes for trump suit based on their 5 cards
- Majority wins (random if tied)
- Trump suit applies for entire game

#### 4. Bidding
- Players bid on tricks they'll win (7-13)
- Minimum bid: 7 tricks
- Maximum bid: 13 tricks (all)
- Highest bidder leads first trick

#### 5. Final Deal
- Deal remaining 8 cards to each player
- Each player now has 13 cards total

#### 6. Playing Phase
- Highest bidder leads first trick
- Play proceeds clockwise
- **Must follow suit if able**
- If cannot follow suit, may play any card (including trump)
- Trump cards beat all non-trump cards
- Highest card of led suit wins (unless trumped)
- Winner of trick leads next trick

#### 7. Scoring
- **Baazi**: Win 7+ tricks
- **Kot**: Win all 13 tricks (bonus)

### Card Play Rules (Server Validation Required)
1. Must follow the led suit if player has cards of that suit
2. Can only play trump or other suits if no cards of led suit
3. Trump always beats non-trump
4. Within same suit, higher rank wins
5. First trump played wins if multiple trumps

### UI Components to Preserve
- Card component with suit symbols and 3D effects
- Game board layout
- Trump selection popup with voting
- Player positions (4-player cross layout)
- Score display
- Trick winner animations
- Turn indicators
- Hand of cards display
- Center play area
- Emotes system
- Visual effects

### State to Track in Colyseus
- Current game phase
- Players in room (4 max)
- Team assignments
- Current trump suit
- Each player's hand (private)
- Cards in current trick
- Current turn/player
- Led suit for current trick
- Tricks won by each team
- Bids placed
- Scores
- Game history for replay
