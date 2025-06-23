import { GameRoom, Player, Card, Suit } from "@/app/types/game";

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

  // Track played cards per player
  playedCards: Record<string, string[]>; // playerId -> array of card IDs played

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

  // Real-time communication
  sendMessage: (message: any) => Promise<boolean>;
  subscribeToRealtime: () => Promise<void>;
  syncGameStateToDatabase: () => Promise<boolean>;

  // Team assignments
  setTeamAssignments: (teams: Record<string, "royals" | "rebels">) => void;

  // Update played cards
  updatePlayedCards: (playerId: string, cardId: string) => void;
}
