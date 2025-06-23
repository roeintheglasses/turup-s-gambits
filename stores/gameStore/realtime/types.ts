import type { GameStoreState } from "../types";
import { Player, Card, Suit } from "@/app/types/game";

// Re-export GameStoreState for use in other realtime modules
export type { GameStoreState };

// Core message types
export interface RealtimeMessage {
  type: string;
  payload: any;
}

export interface EnhancedMessage extends RealtimeMessage {
  timestamp?: number;
  messageId?: string;
  retryCount?: number;
}

// Handler function type
export type MessageHandler = (
  message: RealtimeMessage,
  get: () => GameStoreState,
  set: SetStateFn
) => void | Promise<void>;

// State update function type
export type SetStateFn = (
  partial:
    | Partial<GameStoreState>
    | ((state: GameStoreState) => Partial<GameStoreState>),
  replace?: boolean
) => void;

// Presence tracking types
export interface PresenceState {
  userId: string;
  username: string;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  lastSeen: number;
  timestamp?: number;
}

// Connection state
export interface ConnectionState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastReconnectTime: number;
  connectionId?: string;
}

// Message sending options
export interface SendMessageOptions {
  requiresServerProcessing?: boolean;
  retryCount?: number;
  timeout?: number;
  priority?: 'high' | 'normal' | 'low';
}

// Enhanced payload interfaces
export interface PlayerJoinedPayload {
  player: Player;
  roomId: string;
  playerName?: string;
  playerId?: string;
  isHost?: boolean;
  isBot?: boolean;
  preservedState?: any;
  currentGameStatus?: string;
}

export interface CardPlayedPayload {
  card: Card;
  playerId: string;
  playerName: string;
  roomId: string;
  timestamp?: number;
}

export interface BidPlacedPayload {
  playerId: string;
  playerName: string;
  bid: number;
  roomId: string;
  timestamp?: number;
}

export interface TrickCompletePayload {
  trickCards: Card[];
  winner: string;
  winnerTeam: string;
  trickCount: number;
  roomId: string;
}

export interface TrumpSelectionPayload {
  suit: Suit;
  playerId: string;
  playerName: string;
  roomId: string;
}

export interface EmotePayload {
  emoji: string;
  playerId: string;
  playerName: string;
  roomId: string;
  timestamp?: number;
}

export interface ForceBotVotesPayload {
  roomId: string;
  hostId: string;
  timestamp?: number;
}

export interface FrenzyPowerPayload {
  powerType: "extra_points" | "free_lead" | "peek_card" | "out_of_turn";
  playerId: string;
  playerName: string;
  roomId: string;
  data?: any;
  timestamp?: number;
}

export interface FrenzyPowerEffectPayload {
  effectType: "reveal_card" | "extra_points_scored" | "out_of_turn_granted" | "free_lead_granted";
  targetPlayer?: string;
  sourcePlayer: string;
  roomId: string;
  data?: any;
  timestamp?: number;
}

// Game state update payload
export interface GameStateUpdatePayload {
  gameState: any;
  roomId: string;
  timestamp?: number;
  source?: string;
}

// Error types
export interface RealtimeError {
  code: string;
  message: string;
  timestamp: number;
  context?: any;
}

// Channel configuration
export interface ChannelConfig {
  broadcast?: { self: boolean };
  presence?: { key: string };
}

// Subscription status
export type SubscriptionStatus = 
  | "SUBSCRIBED" 
  | "CHANNEL_ERROR" 
  | "CLOSED" 
  | "TIMED_OUT" 
  | "SUBSCRIBING";

// Toast notification types
export type ToastType = "error" | "info" | "success" | "warning";

// Retry strategy
export interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
} 