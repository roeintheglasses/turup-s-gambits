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
  
  // Enhanced player properties
  user_id?: string;
  game_id?: string;
  room_id?: string;
  player_name?: string;
  bot_difficulty?: 'easy' | 'medium' | 'hard';
  seat_position?: number;
  team_name?: 'royals' | 'rebels';
  current_hand?: Card[];
  cards_played?: Card[];
  is_connected?: boolean;
  trump_vote?: Suit;
  trump_vote_cast_at?: string;
  total_tricks_won?: number;
  total_points_scored?: number;
  join_order?: number;
  
  // Timestamps
  joined_at?: string;
  last_activity?: string;
}

// Enhanced game card interface for detailed tracking
export interface GameCard {
  id: string;
  game_id: string;
  card_suit: Suit;
  card_rank: Rank;
  owned_by?: string;
  played_by?: string;
  played_in_trick?: number;
  played_at?: string;
  position_in_hand?: number;
  is_trump: boolean;
  created_at: string;
}

// Game trick interface for trick-by-trick tracking
export interface GameTrick {
  id: string;
  game_id: string;
  trick_number: number;
  lead_suit?: Suit;
  trump_suit?: Suit;
  winner_player?: string;
  winner_team?: 'royals' | 'rebels';
  points_awarded: number;
  cards_played: Record<string, GameCard>;
  completed_at?: string;
  created_at: string;
}

// Frenzy power interface
export interface FrenzyPower {
  id: string;
  game_id: string;
  player_id: string;
  power_type: 'extra_points' | 'free_lead' | 'peek_card' | 'out_of_turn';
  trump_suit: Suit;
  used_at?: string;
  target_player?: string;
  power_data?: any;
  was_successful: boolean;
  effect_duration?: number;
  created_at: string;
}

// Bot player interface
export interface BotPlayer {
  id: string;
  room_id: string;
  bot_name: string;
  bot_difficulty: 'easy' | 'medium' | 'hard';
  is_active: boolean;
  bot_personality?: any;
  performance_stats?: any;
  created_at: string;
  updated_at: string;
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
  
  // Enhanced game state properties
  game_id?: string;
  room_id?: string;
  game_mode?: 'classic' | 'frenzy';
  status?: 'waiting' | 'initial_deal' | 'bidding' | 'final_deal' | 'playing' | 'finished';
  winner_team?: 'royals' | 'rebels';
  current_trick_number?: number;
  total_tricks?: number;
  game_duration_seconds?: number;
  started_at?: string;
  ended_at?: string;
  
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
  
  // Enhanced tracking
  tricks?: GameTrick[];
  cards?: GameCard[];
  activePowers?: FrenzyPower[];
}

export interface GameRoom {
  id: string;
  players: Player[];
  gameState: GameState;
  createdAt: number;
  lastActivity: number;
  deck?: Card[]; // Store the deck for dealing remaining cards
  
  // Enhanced room properties
  game_mode?: 'classic' | 'frenzy';
  status?: 'waiting' | 'in_progress' | 'finished';
  max_players?: number;
  current_players?: number;
  is_private?: boolean;
  password?: string;
  created_by?: string;
  host_id?: string;
  turn_timer_seconds?: number;
  allow_bots?: boolean;
  auto_fill_bots?: boolean;
  last_updated?: string;
  
  // Game tracking
  games?: any[];
  bots?: BotPlayer[];
}

// Enhanced server-client event interfaces
export interface ServerToClientEvents {
  "room:joined": (room: GameRoom) => void;
  "room:updated": (room: GameRoom) => void;
  "game:started": (room: GameRoom) => void;
  "game:state-updated": (gameState: GameState) => void;
  "player:joined": (player: Player) => void;
  "player:left": (playerId: string) => void;
  "trump:voted": (vote: { playerId: string; suit: Suit }) => void;
  "frenzy:power-used": (power: FrenzyPower) => void;
  "game:trick-completed": (trick: GameTrick) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  "room:join": (roomId: string, playerName: string) => void;
  "room:leave": (roomId: string) => void;
  "game:ready": (roomId: string) => void;
  "game:bid": (roomId: string, bid: number) => void;
  "game:play-card": (roomId: string, card: Card) => void;
  "game:select-trump": (roomId: string, suit: Suit) => void;
  "frenzy:use-power": (roomId: string, powerType: string, targetData?: any) => void;
  "bot:add": (roomId: string, difficulty: 'easy' | 'medium' | 'hard') => void;
}

export interface BroadcastMessage {
  type: string;
  event: string;
  payload: any;
}

// Database operation response types
export interface DatabaseResult<T> {
  data?: T;
  error?: string;
  success: boolean;
}
