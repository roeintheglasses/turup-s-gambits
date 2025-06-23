import { Card, GameRoom, Player, Suit } from "@/app/types/game";
import { useAuthStore } from "../authStore";
import { useUIStore } from "../uiStore";
import { toast } from "sonner";
import { createDeck, shuffleDeck } from "./cardUtils";
import { GameStatus, GameStoreState } from "./types";

// Configuration constants
const CONFIG = {
  GAME: {
    MIN_PLAYERS: 4,
    MAX_PLAYERS: 4,
    STATUS_MESSAGE_DELAY: 3000,
  },
  BOT: {
    NAMES: ["Merlin", "Lancelot", "Galahad", "Guinevere", "Arthur", "Morgana"],
  },
  VALIDATION: {
    UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  },
} as const;

const MESSAGES = {
  ERROR: {
    NO_USER: "Cannot perform action, no user is logged in",
    NO_ROOM: "Cannot perform action, no active room",
    NOT_HOST: "Only the host can perform this action",
    ROOM_FULL: "Room is already full",
    INVALID_PHASE: "Cannot perform action in current game phase",
    NOT_YOUR_TURN: "Not your turn to play",
    CARD_ALREADY_PLAYED: "Card already played in current trick",
    INSUFFICIENT_PLAYERS: "Not enough players to start game",
  },
  PHASE: {
    initial_deal: "Please wait for the initial 5 cards to be dealt and select a trump suit first.",
    bidding: "Trump suit has been selected. Please wait for the remaining 8 cards to be dealt.",
    final_deal: "Dealing remaining 8 cards. Please wait for the game to start.",
    finished: "Game has finished. Please start a new game.",
  },
} as const;

// Enhanced logging service
class GameLogger {
  private static prefix = "[GameStore]";

  static log(message: string, data?: any) {
    console.log(`${this.prefix} ${message}`, data || "");
  }

  static error(message: string, error?: any) {
    console.error(`${this.prefix} ${message}`, error || "");
  }

  static warn(message: string, data?: any) {
    console.warn(`${this.prefix} ${message}`, data || "");
  }
}

// Centralized validation service
class GameValidator {
  static validateUser(user: any): boolean {
    if (!user) {
      GameLogger.error(MESSAGES.ERROR.NO_USER);
      return false;
    }
    return true;
  }

  static validateRoom(room: GameRoom | null): boolean {
    if (!room) {
      GameLogger.error(MESSAGES.ERROR.NO_ROOM);
      return false;
    }
    return true;
  }

  static validateGamePhase(currentPhase: GameStatus, expectedPhases: GameStatus[]): boolean {
    return expectedPhases.includes(currentPhase);
  }

  static validateUserTurn(currentPlayer: string, user: any): boolean {
    if (currentPlayer && currentPlayer !== user?.username) {
      GameLogger.error(`${MESSAGES.ERROR.NOT_YOUR_TURN}. Current player: ${currentPlayer}`);
      return false;
    }
    return true;
  }

  static validateHostPermission(room: GameRoom, user: any): boolean {
    const isHost = room.players?.some(p => p.id === user?.id && p.isHost);
    if (!isHost) {
      GameLogger.error(MESSAGES.ERROR.NOT_HOST);
      return false;
    }
    return true;
  }
}

// State management helpers
class StateManager {
  static create(set: Function) {
    return {
      batchUpdate: (updates: Partial<GameStoreState>) => {
        set(updates);
      },
      
      updateRoomAndPlayers: (room: GameRoom) => {
        set({
          currentRoom: room,
          players: room.players || [],
          isLoading: false,
          isConnected: true,
        });
      },

      resetGameState: () => {
        set({
          currentRoom: null,
          players: [],
          roomId: null,
          isConnected: false,
          gameStatus: "waiting" as GameStatus,
          trumpSuit: null,
          currentTrick: [],
          scores: { royals: 0, rebels: 0 },
          currentPlayer: "",
          showShuffleAnimation: false,
          initialCardsDeal: false,
          statusMessage: null,
        });
      },

      showStatusMessage: (message: string, duration = CONFIG.GAME.STATUS_MESSAGE_DELAY) => {
        set({ statusMessage: message });
        setTimeout(() => set({ statusMessage: null }), duration);
      },
    };
  }
}

// Database operations service
class DatabaseService {
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      GameLogger.error(errorMessage, error);
      return null;
    }
  }

  static async getSupabaseDatabase() {
    const { SupabaseDatabase } = await import("@/lib/services/supabase-database");
    return SupabaseDatabase;
  }
}

// Player management service
class PlayerService {
  static createPlayer(user: any, isHost: boolean = false): Player {
    return {
      id: user.id,
      name: user.username,
      isHost,
      isBot: false,
      isReady: true,
      hand: [],
      score: 0,
    };
  }

  static createBotPlayer(name: string, index: number): Player {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const botId = `bot_${timestamp}_${random}_${index}`;

    return {
      id: botId,
      name,
      isHost: false,
      isBot: true,
      isReady: true,
      hand: [],
      score: 0,
    };
  }

  static generateTeamAssignments(players: Player[]): Record<string, "royals" | "rebels"> {
    const teams: Record<string, "royals" | "rebels"> = {};
    players.forEach((player, index) => {
      // Even indices (0, 2) are Royals, odd indices (1, 3) are Rebels
      teams[player.name] = index % 2 === 0 ? "royals" : "rebels";
    });
    return teams;
  }
}

// Notification service
class NotificationService {
  static showError(message: string) {
    toast.error(message);
  }

  static showSuccess(message: string) {
    toast.success(message);
  }

  static showInfo(message: string) {
    toast.info(message);
  }

  static showWarning(message: string) {
    toast.warning(message);
  }

  static getPhaseErrorMessage(phase: GameStatus): string {
    return MESSAGES.PHASE[phase as keyof typeof MESSAGES.PHASE] || 
           `Cannot perform action yet. Current phase: ${phase}`;
  }
}

export const createGameActions = (
  get: () => GameStoreState,
  set: (
    partial:
      | Partial<GameStoreState>
      | ((state: GameStoreState) => Partial<GameStoreState>),
    replace?: boolean
  ) => void
) => {
  const stateManager = StateManager.create(set);

  // Core game action implementations
  const gameActions = {
    // Room management
    async joinRoom(roomId: string, playerName: string): Promise<void> {
      const user = useAuthStore.getState().user;
      if (!GameValidator.validateUser(user)) return;

      const state = get();
      
      // Prevent duplicate joins
      if (state.currentRoom && state.players.some(p => p.id === user!.id)) {
        GameLogger.warn("User already in room, skipping join");
        return;
      }

      try {
        set({ isLoading: true });
        
        const db = await DatabaseService.getSupabaseDatabase();
        const roomState = await db.getGameRoom(roomId);
        
        if (!roomState) {
          throw new Error("Room not found");
        }

        const currentUserPlayer = PlayerService.createPlayer(user!, false);
        const updatedPlayers = [...(roomState.players || []), currentUserPlayer];
        
        if (updatedPlayers.length > CONFIG.GAME.MAX_PLAYERS) {
          throw new Error(MESSAGES.ERROR.ROOM_FULL);
        }

        await db.addPlayerToRoom(roomId, currentUserPlayer);
        
        const updatedRoom = { ...roomState, players: updatedPlayers };
        stateManager.updateRoomAndPlayers(updatedRoom);
        
        GameLogger.log(`User ${playerName} joined room ${roomId}`);
        NotificationService.showSuccess(`Joined room ${roomId}`);
        
      } catch (error) {
        GameLogger.error("Failed to join room", error);
        NotificationService.showError("Failed to join room. Please try again.");
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    // Game flow
    async startGame(): Promise<void> {
      const user = useAuthStore.getState().user;
      const state = get();
      
      if (!GameValidator.validateUser(user) || !GameValidator.validateRoom(state.currentRoom)) {
        return;
      }

      if (!GameValidator.validateHostPermission(state.currentRoom!, user!)) {
        NotificationService.showError(MESSAGES.ERROR.NOT_HOST);
        return;
      }

      if (state.players.length < CONFIG.GAME.MIN_PLAYERS) {
        NotificationService.showError(MESSAGES.ERROR.INSUFFICIENT_PLAYERS);
        return;
      }

      try {
        const teamAssignments = PlayerService.generateTeamAssignments(state.players);
        
        set({
          gameStatus: "initial_deal",
          teamAssignments,
          showShuffleAnimation: true,
          initialCardsDeal: true,
        });

        stateManager.showStatusMessage("Game starting...");
        
        // Broadcast game start to all players
        await this.sendMessage({
          type: "game:start",
          payload: {
            roomId: state.roomId,
            teamAssignments,
            gameState: { status: "initial_deal" },
          },
        });

        GameLogger.log("Game started successfully");
        
      } catch (error) {
        GameLogger.error("Failed to start game", error);
        NotificationService.showError("Failed to start game. Please try again.");
      }
    },

    // Card play
    async playCard(card: Card): Promise<void> {
      const user = useAuthStore.getState().user;
      const state = get();
      
      if (!GameValidator.validateUser(user) || !GameValidator.validateRoom(state.currentRoom)) {
        return;
      }

      if (!GameValidator.validateGamePhase(state.gameStatus, ["playing"])) {
        NotificationService.showError(NotificationService.getPhaseErrorMessage(state.gameStatus));
        return;
      }

      if (!GameValidator.validateUserTurn(state.currentPlayer, user!)) {
        NotificationService.showError(MESSAGES.ERROR.NOT_YOUR_TURN);
        return;
      }

      try {
        const cardWithPlayer = { ...card, playedBy: user!.username };
        const updatedTrick = [...state.currentTrick, cardWithPlayer];
        
        set({
          currentTrick: updatedTrick,
          statusMessage: `${user!.username} played ${card.rank} of ${card.suit}`,
        });

        await this.sendMessage({
          type: "card:played",
          payload: {
            roomId: state.roomId,
            card: cardWithPlayer,
            playedBy: user!.username,
            currentTrick: updatedTrick,
          },
        });

        GameLogger.log(`Card played: ${card.rank} of ${card.suit}`);
        
      } catch (error) {
        GameLogger.error("Failed to play card", error);
        NotificationService.showError("Failed to play card. Please try again.");
      }
    },

    // Bidding
    placeBid(bid: number): void {
      const user = useAuthStore.getState().user;
      const state = get();
      
      if (!GameValidator.validateUser(user) || !GameValidator.validateRoom(state.currentRoom)) {
        return;
      }

      if (!GameValidator.validateGamePhase(state.gameStatus, ["bidding"])) {
        NotificationService.showError(NotificationService.getPhaseErrorMessage(state.gameStatus));
        return;
      }

      if (bid < 7 || bid > 13) {
        NotificationService.showError("Bid must be between 7 and 13");
        return;
      }

      try {
        stateManager.showStatusMessage(`${user!.username} bid ${bid}`);
        
        this.sendMessage({
          type: "bid:placed",
          payload: {
            roomId: state.roomId,
            playerId: user!.id,
            playerName: user!.username,
            bid,
          },
        });

        GameLogger.log(`Bid placed: ${bid}`);
        
      } catch (error) {
        GameLogger.error("Failed to place bid", error);
        NotificationService.showError("Failed to place bid. Please try again.");
      }
    },

    // Bot management
    async addBots(): Promise<void> {
      const user = useAuthStore.getState().user;
      const state = get();
      
      if (!GameValidator.validateUser(user) || !GameValidator.validateRoom(state.currentRoom)) {
        return;
      }

      if (!GameValidator.validateHostPermission(state.currentRoom!, user)) {
        NotificationService.showError(MESSAGES.ERROR.NOT_HOST);
        return;
      }

      try {
        set({ isAddingBots: true });
        
        const currentPlayers = state.players.length;
        const botsNeeded = CONFIG.GAME.MAX_PLAYERS - currentPlayers;
        
        if (botsNeeded <= 0) {
          NotificationService.showWarning("Room is already full");
          return;
        }

        const availableBotNames = CONFIG.BOT.NAMES.filter(
          name => !state.players.some(p => p.name === name)
        );

        const newBots = availableBotNames
          .slice(0, botsNeeded)
          .map((name, index) => PlayerService.createBotPlayer(name, index));

        const updatedPlayers = [...state.players, ...newBots];
        
        set({ players: updatedPlayers });
        
        // Update database
        const db = await DatabaseService.getSupabaseDatabase();
        for (const bot of newBots) {
          await db.addPlayerToRoom(state.roomId!, bot);
        }

        stateManager.showStatusMessage(`Added ${newBots.length} bot(s)`);
        
        // Broadcast update
        await this.sendMessage({
          type: "bots:added",
          payload: {
            roomId: state.roomId,
            newBots,
            allPlayers: updatedPlayers,
          },
        });

        GameLogger.log(`Added ${newBots.length} bots`);
        
      } catch (error) {
        GameLogger.error("Failed to add bots", error);
        NotificationService.showError("Failed to add bots. Please try again.");
      } finally {
        set({ isAddingBots: false });
      }
    },

    // Real-time communication
    async sendMessage(message: any): Promise<boolean> {
      try {
        const { subscribeToRealtime } = get();
        // Implementation depends on your realtime service
        return true;
      } catch (error) {
        GameLogger.error("Failed to send message", error);
        return false;
      }
    },

    // State management helpers
    setRoomId: (roomId: string | null) => set({ roomId }),
    setPlayers: (players: Player[]) => set({ players }),
    setGameMode: (gameMode: "classic" | "frenzy") => set({ gameMode }),
    setGameStatus: (gameStatus: GameStatus) => set({ gameStatus }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
    setConnected: (isConnected: boolean) => set({ isConnected }),
    setStatusMessage: (message: string | null) => set({ statusMessage: message }),
    setIsAddingBots: (value: boolean) => set({ isAddingBots: value }),
    setTrumpSuit: (suit: Suit) => set({ trumpSuit: suit }),
    setCurrentTrick: (trick: Card[]) => set({ currentTrick: trick }),
    setCurrentPlayer: (player: string) => set({ currentPlayer: player }),
    updateScores: (newScores: { royals: number; rebels: number }) => set({ scores: newScores }),
    setShowShuffleAnimation: (show: boolean) => set({ showShuffleAnimation: show }),
    setInitialCardsDeal: (value: boolean) => set({ initialCardsDeal: value }),
    setIsPhaseTransitioning: (value: boolean) => set({ isPhaseTransitioning: value }),
    setPhaseTransitionMessage: (message: string) => set({ phaseTransitionMessage: message }),
    setIsGameBoardReady: (value: boolean) => set({ isGameBoardReady: value }),
    setVotingComplete: (value: boolean) => set({ votingComplete: value }),
    setTeamAssignments: (teams: Record<string, "royals" | "rebels">) => set({ teamAssignments: teams }),
    updatePlayedCards: (playerId: string, cardId: string) => set((state) => ({
      playedCards: {
        ...state.playedCards,
        [playerId]: [...(state.playedCards[playerId] || []), cardId],
      },
    })),

    // Advanced state management
    updateGameState: (newState: any) => {
      set((state) => ({
        ...state,
        ...newState,
      }));
    },

    leaveRoom: () => {
      stateManager.resetGameState();
      GameLogger.log("Left room");
    },

    selectTrump: (suit: Suit) => {
      set({ trumpSuit: suit });
      GameLogger.log(`Trump suit selected: ${suit}`);
    },

    // Realtime placeholder
    subscribeToRealtime: async () => {
      // Implementation depends on your realtime service
      GameLogger.log("Subscribed to realtime updates");
    },

    syncGameStateToDatabase: async () => {
      // Implementation depends on your database service
      return true;
    },
  };

  return gameActions;
};
