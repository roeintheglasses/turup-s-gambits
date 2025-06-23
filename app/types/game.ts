export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  isReady: boolean;
  isHost: boolean;
  isBot?: boolean;
}

export interface GameState {
  currentTurn: string | null; // playerId
  trumpSuit: Suit | null;
  currentBid: number;
  currentBidder: string | null; // playerId
  trickCards: { [playerId: string]: Card };
  roundNumber: number;
  gamePhase:
    | "waiting"
    | "initial_deal"
    | "bidding"
    | "final_deal"
    | "playing"
    | "finished"
    | "ended";
  leadSuit?: Suit | null; // The suit that was led in the current trick
  teams: {
    royals: string[]; // Array of player IDs for the Royals team (formerly team1)
    rebels: string[]; // Array of player IDs for the Rebels team (formerly team2)
  };
  scores: {
    royals: number; // Number of tricks won by the Royals team
    rebels: number; // Number of tricks won by the Rebels team
  };
  consecutiveTricks: {
    royals: number; // Number of consecutive tricks won by the Royals team
    rebels: number; // Number of consecutive tricks won by the Rebels team
  };
  lastTrickWinner: string | null; // ID of the player who won the last trick
  dealerIndex: number; // Index of the dealer in the players array
  trumpCaller: string | null; // ID of the player who called trump
  trumpVotes?: { [playerId: string]: Suit }; // Track votes for trump suit
  playersVoted?: string[]; // Track which players have voted
  remainingDeck?: Card[]; // Store the remaining cards to be dealt after trump selection
  
  // Frenzy mode properties
  frenzyPowers?: Record<string, Record<string, {
    used: boolean;
    lastUsed: number;
    usageCount: number;
  }>>;
  
  // Special effects tracking
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
    revealedTo?: string;
  }>;
}

export interface GameRoom {
  id: string;
  players: Player[];
  gameState: GameState;
  createdAt: number;
  lastActivity: number;
  deck?: Card[]; // Store the deck for dealing remaining cards
}

export interface ServerToClientEvents {
  "room:joined": (room: GameRoom) => void;
  "room:updated": (room: GameRoom) => void;
  "game:started": (room: GameRoom) => void;
  "game:state-updated": (gameState: GameState) => void;
  "player:joined": (player: Player) => void;
  "player:left": (playerId: string) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  "room:join": (roomId: string, playerName: string) => void;
  "room:leave": (roomId: string) => void;
  "game:ready": (roomId: string) => void;
  "game:bid": (roomId: string, bid: number) => void;
  "game:play-card": (roomId: string, card: Card) => void;
  "game:select-trump": (roomId: string, suit: Suit) => void;
}

export interface BroadcastMessage {
  type: string;
  event: string;
  payload: any;
}
