import { useAuthStore } from "../../authStore";
import { useUIStore } from "../../uiStore";
import { RealtimeMessage, ToastType, EnhancedMessage } from "./types";
import { Player, Card } from "@/app/types/game";
import { GAME_STATUS_PRIORITY, TIMING } from "./constants";

// Utility functions for common operations
export const showToast = (message: string, type: ToastType = "info") => {
  try {
    useUIStore.getState().showToast(message, type);
  } catch (error) {
    console.error("[GameStore] Error showing toast:", error);
  }
};

export const getCurrentUser = () => {
  try {
    return useAuthStore.getState().user;
  } catch (error) {
    console.error("[GameStore] Error getting current user:", error);
    return null;
  }
};

// Message validation
export const validateMessagePayload = (message: RealtimeMessage): boolean => {
  if (!message || typeof message !== "object") {
    console.warn("[GameStore] Received empty or invalid message payload:", message);
    return false;
  }

  if (!message.type || typeof message.type !== "string") {
    console.warn("[GameStore] Message missing type property:", message);
    return false;
  }

  return true;
};

// Enhanced message creation with better structure
export const createEnhancedMessage = (
  message: RealtimeMessage,
  roomId: string,
  user: any
): EnhancedMessage => {
  const timestamp = Date.now();
  const messageId = `${message.type}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  
  let enhancedPayload = {
    ...message.payload,
    roomId: message.payload?.roomId || roomId,
    timestamp,
  };

  // Add user info if not a bot message
  if (!message.payload?.isBot && user) {
    enhancedPayload.playerName = message.payload?.playerName || user.username || "Player";
    enhancedPayload.playerId = message.payload?.playerId || user.id;
  }

  // Special handling for player joined messages
  if (message.type === "player:joined" && !message.payload?.isBot) {
    enhancedPayload = createPlayerJoinedPayload(enhancedPayload, user);
  }

  return {
    type: message.type,
    payload: enhancedPayload,
    timestamp,
    messageId,
    retryCount: 0,
  };
};

const createPlayerJoinedPayload = (payload: any, user: any) => {
  const playerId = payload.playerId || user.id;
  const playerName = payload.playerName || user.username || "Player";

  if (!playerId) {
    throw new Error("Cannot create player object: Missing player ID");
  }

  if (!payload.player || typeof payload.player !== "object") {
    payload.player = {
      id: playerId,
      name: playerName,
      isHost: payload.isHost || false,
      isBot: payload.isBot || false,
      isReady: true,
      hand: [],
      score: 0,
      isConnected: true,
    };
  }

  return payload;
};

// Player utility functions
export const extractPlayerObject = (payload: any): Player | null => {
  if (payload.player && typeof payload.player === "object") {
    return payload.player;
  }
  if (payload.id && payload.name) {
    return payload as Player;
  }
  return null;
};

export const isCardAlreadyPlayed = (playedCard: Card, currentTrick: Card[]): boolean => {
  return currentTrick.some(
    (c) =>
      c.id === playedCard.id &&
      c.suit === playedCard.suit &&
      c.rank === playedCard.rank
  );
};

// Game state utilities
export const shouldUpdateGameStatus = (
  currentStatus: string,
  incomingStatus: string
): boolean => {
  const currentPriority = GAME_STATUS_PRIORITY[currentStatus] || 0;
  const incomingPriority = GAME_STATUS_PRIORITY[incomingStatus] || 0;
  return incomingPriority > currentPriority;
};

// Event dispatching
export const dispatchGameRefreshEvent = (phase: string) => {
  try {
    if (typeof window !== "undefined") {
      console.log(`[GameStore] Dispatching force refresh event for ${phase} state`);
      window.dispatchEvent(
        new CustomEvent("game:refreshState", {
          detail: { source: "realtime", phase },
        })
      );
    }
  } catch (error) {
    console.error("[GameStore] Error dispatching refresh event:", error);
  }
};

// Debounced function creator
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number = TIMING.DEBOUNCE_DELAY
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Timeout wrapper for promises
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out"
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};

// Retry logic with exponential backoff
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  backoffMultiplier: number = 2
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
      console.warn(`[GameStore] Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};

// Safe JSON operations
export const safeJSONParse = <T>(jsonString: string, fallback: T): T => {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
};

export const safeJSONStringify = (obj: any, fallback: string = "{}"): string => {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
};

// Team assignment utility
export const determineTeamForPlayer = (
  playerName: string,
  existingAssignments: Record<string, string>
): "royals" | "rebels" => {
  const royalPlayers = Object.values(existingAssignments).filter(team => team === "royals").length;
  const rebelPlayers = Object.values(existingAssignments).filter(team => team === "rebels").length;
  
  if (royalPlayers < rebelPlayers) {
    return "royals";
  } else if (royalPlayers > rebelPlayers) {
    return "rebels";
  } else {
    // Equal teams, alternate based on total players
    return Object.keys(existingAssignments).length % 2 === 0 ? "royals" : "rebels";
  }
};

// Logging utility with levels
export const createLogger = (prefix: string) => ({
  info: (message: string, ...args: any[]) => 
    console.log(`[${prefix}] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => 
    console.warn(`[${prefix}] ${message}`, ...args),
  error: (message: string, ...args: any[]) => 
    console.error(`[${prefix}] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => 
    console.debug(`[${prefix}] ${message}`, ...args),
});

export const logger = createLogger("GameStore"); 