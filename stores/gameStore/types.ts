import { GameRoom, Player, Card, Suit } from "@/app/types/game";

export type GameMode = "classic" | "frenzy";
export type GameStatus =
  | "waiting"
  | "initial_deal"
  | "trump_selection"
  | "bidding"
  | "final_deal"
  | "playing"
  | "finished"
  | "ended";

// Frenzy mode power state (not yet implemented)
export interface FrenzyPowerState {
  used: boolean;
  lastUsed: number;
  usageCount: number;
}

export interface SpecialEffect {
  type: string;
  active: boolean;
  targetPlayer?: string;
  data?: unknown;
}

export interface RevealedCardInfo {
  playerId: string;
  card: Card;
  revealedAt: number;
}

export interface GameStoreState {
  // Room and player state
  roomId: string | null;
  currentRoom: GameRoom | null;
  players: Player[];
  isLoading: boolean;
  isConnected: boolean;
  userId: string | null;

  // Game configuration
  gameMode: GameMode;

  // Core game state (synced from Colyseus)
  gameStatus: GameStatus;
  trumpSuit: Suit | null;
  currentTrick: Card[];
  scores: { royals: number; rebels: number };
  currentPlayer: string;
  teamAssignments: Record<string, "royals" | "rebels">;

  // Frenzy mode state (not yet implemented - Classic mode only)
  frenzyPowers?: Record<string, Record<string, FrenzyPowerState>>;
  specialEffects?: Record<string, SpecialEffect>;
  revealedCards?: Record<string, RevealedCardInfo>;

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

  // Setters for room/player state
  setRoom: (room: GameRoom | null) => void;
  setPlayers: (players: Player[]) => void;
  setRoomId: (roomId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setConnected: (isConnected: boolean) => void;

  // Setters for game configuration
  setGameMode: (mode: GameMode) => void;

  // Setters for game state
  setGameStatus: (status: GameStatus) => void;
  setTrumpSuit: (suit: Suit | null) => void;
  setCurrentTrick: (trick: Card[]) => void;
  setCurrentPlayer: (player: string) => void;
  updateScores: (scores: { royals: number; rebels: number }) => void;
  setTeamAssignments: (teams: Record<string, "royals" | "rebels">) => void;
  updateGameState: (newState: Partial<GameStoreState>) => void;

  // Setters for UI state
  setShowShuffleAnimation: (show: boolean) => void;
  setInitialCardsDeal: (value: boolean) => void;
  setStatusMessage: (message: string | null) => void;
  setIsAddingBots: (value: boolean) => void;
  setIsPhaseTransitioning: (value: boolean) => void;
  setPhaseTransitionMessage: (message: string) => void;
  setIsGameBoardReady: (value: boolean) => void;
  setVotingComplete: (value: boolean) => void;

  // Legacy methods - use useColyseus hook instead
  leaveRoom: () => void;

  // Frenzy mode method (not yet implemented)
  sendMessage: (message: unknown) => Promise<boolean>;
}
