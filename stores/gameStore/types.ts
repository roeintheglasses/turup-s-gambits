import { GameRoom, Player, Card, Suit, FrenzyPower, GameTrick, BotPlayer } from "@/app/types/game";

export type GameMode = "classic" | "frenzy";
export type GameStatus =
  | "waiting"
  | "initial_deal"
  | "bidding"
  | "final_deal"
  | "playing"
  | "finished"
  | "ended";

export interface GameStoreState {
  // Room and players data
  roomId: string | null;
  currentRoom: GameRoom | null;
  players: Player[];
  isLoading: boolean;
  isConnected: boolean;
  userId: string | null;

  // Game configuration
  gameMode: GameMode;

  // Core game state
  gameStatus: GameStatus;
  trumpSuit: Suit | null;
  currentTrick: Card[];
  scores: { royals: number; rebels: number };
  currentPlayer: string;

  // Team assignments
  teamAssignments: Record<string, "royals" | "rebels">;

  // Additional game state
  specialPowers?: Record<string, boolean>;
  remainingDeck?: Card[];
  
  // Enhanced game tracking
  gameId?: string | null;
  currentTrickNumber?: number;
  totalTricks?: number;
  gameDurationSeconds?: number;
  
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

  // Enhanced player statistics
  playerStats?: Record<string, {
    games_played: number;
    games_won: number;
    total_tricks_won: number;
    frenzy_powers_used: number;
    win_rate: number;
    avg_tricks_per_game: number;
  }>;

  // Bot management
  bots?: BotPlayer[];
  botDifficulty?: 'easy' | 'medium' | 'hard';

  // Game history and analytics
  tricks?: GameTrick[];
  usedPowers?: FrenzyPower[];
  gameAnalytics?: {
    longest_streak: Record<string, number>;
    cards_played: number;
    total_power_uses: number;
    trump_selection_time: number;
  };

  // UI state flags
  showShuffleAnimation: boolean;
  initialCardsDeal: boolean;
  statusMessage: string | null;
  isAddingBots: boolean;
  isPhaseTransitioning: boolean;
  phaseTransitionMessage: string;
  isGameBoardReady: boolean;
  votingComplete: boolean;
  trumpSelectionInProgress: boolean;

  // Enhanced UI state
  showFrenzyPowers?: boolean;
  showGameAnalytics?: boolean;
  showPlayerStats?: boolean;

  // Track played cards per player
  playedCards: Record<string, string[]>; // playerId -> array of card IDs played

  // Enhanced room settings
  roomSettings?: {
    max_players: number;
    turn_timer_seconds: number;
    allow_bots: boolean;
    auto_fill_bots: boolean;
    is_private: boolean;
    password?: string;
  };

  // Actions
  setRoom: (room: GameRoom | null) => void;
  setPlayers: (players: Player[]) => void;
  setGameMode: (mode: GameMode) => void;
  setGameStatus: (status: GameStatus) => void;
  setRoomId: (roomId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setConnected: (isConnected: boolean) => void;

  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  leaveRoom: () => void;
  startGame: () => void;
  playCard: (card: Card) => Promise<void>;
  placeBid: (bid: number) => void;
  selectTrump: (suit: Suit) => void;
  addBots: () => Promise<void>;

  // Enhanced actions
  createRoom: (gameMode: GameMode, settings?: any) => Promise<string | null>;
  updateRoomSettings: (settings: any) => Promise<boolean>;
  kickPlayer: (playerId: string) => Promise<boolean>;
  
  // Game state update helpers
  updateGameState: (newState: any) => void;
  setStatusMessage: (message: string | null) => void;
  setIsAddingBots: (value: boolean) => void;
  setTrumpSuit: (suit: Suit) => void;
  setCurrentTrick: (trick: Card[]) => void;
  setCurrentPlayer: (player: string) => void;
  updateScores: (newScores: { royals: number; rebels: number }) => void;

  // Game flow helpers
  setShowShuffleAnimation: (show: boolean) => void;
  setInitialCardsDeal: (value: boolean) => void;
  setIsPhaseTransitioning: (value: boolean) => void;
  setPhaseTransitionMessage: (message: string) => void;
  setIsGameBoardReady: (value: boolean) => void;
  setVotingComplete: (value: boolean) => void;

  // Enhanced game flow
  setGameId: (gameId: string | null) => void;
  updateGameAnalytics: (analytics: any) => void;
  recordTrick: (trick: GameTrick) => void;

  // Frenzy mode actions
  useFrenzyPower: (powerType: string, targetData?: any) => Promise<boolean>;
  canUseFrenzyPower: (powerType: string) => boolean;
  updateFrenzyPowers: (powers: any) => void;
  setShowFrenzyPowers: (show: boolean) => void;

  // Player statistics
  updatePlayerStats: (playerId: string, stats: any) => void;
  getPlayerStats: (playerId: string) => any;
  setShowPlayerStats: (show: boolean) => void;

  // Bot management
  addBot: (difficulty: 'easy' | 'medium' | 'hard') => Promise<boolean>;
  removeBot: (botId: string) => Promise<boolean>;
  updateBotDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;

  // Real-time communication
  sendMessage: (message: any) => Promise<boolean>;
  subscribeToRealtime: () => Promise<void>;
  syncGameStateToDatabase: () => Promise<boolean>;

  // Enhanced realtime
  subscribeToGameEvents: () => Promise<void>;
  unsubscribeFromGameEvents: () => void;
  broadcastFrenzyPower: (power: FrenzyPower) => Promise<boolean>;
  broadcastTrickCompleted: (trick: GameTrick) => Promise<boolean>;

  // Team assignments
  setTeamAssignments: (teams: Record<string, "royals" | "rebels">) => void;

  // Update played cards
  updatePlayedCards: (playerId: string, cardId: string) => void;

  // Analytics and reporting
  generateGameReport: () => any;
  exportGameData: () => Promise<string>;
  getLeaderboard: (gameMode?: GameMode) => Promise<any[]>;

  // Database operations
  syncWithDatabase: () => Promise<boolean>;
  saveGameState: () => Promise<boolean>;
  loadGameHistory: (limit?: number) => Promise<any[]>;
}
