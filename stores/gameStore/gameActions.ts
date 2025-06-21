import { Card, GameRoom, Player, Suit } from "@/app/types/game";
import { useAuthStore } from "../authStore";
import { useUIStore } from "../uiStore";
import { toast } from "sonner";
import { createDeck, shuffleDeck } from "./cardUtils";
import { GameStatus, GameStoreState } from "./types";

// Constants
const GAME_CONSTANTS = {
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 4,
  BOT_NAMES: ["Merlin", "Lancelot", "Galahad", "Guinevere", "Arthur", "Morgana"],
  STATUS_MESSAGE_DELAY: 3000,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;

const ERROR_MESSAGES = {
  NO_USER: "Cannot perform action, no user is logged in",
  NO_ROOM: "Cannot perform action, no active room",
  NOT_HOST: "Only the host can perform this action",
  ROOM_FULL: "Room is already full",
  INVALID_PHASE: "Cannot perform action in current game phase",
  NOT_YOUR_TURN: "Not your turn to play",
  CARD_ALREADY_PLAYED: "Card already played in current trick",
  INSUFFICIENT_PLAYERS: "Not enough players to start game",
} as const;

const PHASE_MESSAGES = {
  initial_deal: "Please wait for the initial 5 cards to be dealt and select a trump suit first.",
  bidding: "Trump suit has been selected. Please wait for the remaining 8 cards to be dealt.",
  final_deal: "Dealing remaining 8 cards. Please wait for the game to start.",
  finished: "Game has finished. Please start a new game.",
} as const;

// Logging service
class Logger {
  private static prefix = "[GameStore]";

  static log(message: string, ...args: any[]) {
    console.log(`${this.prefix} ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`${this.prefix} ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`${this.prefix} ${message}`, ...args);
  }
}

// Validation helpers
const validateUser = (user: any): boolean => {
  if (!user) {
    Logger.error(ERROR_MESSAGES.NO_USER);
    return false;
  }
  return true;
};

const validateRoom = (room: GameRoom | null): boolean => {
  if (!room) {
    Logger.error(ERROR_MESSAGES.NO_ROOM);
    return false;
  }
  return true;
};

const validateGamePhase = (currentPhase: GameStatus, expectedPhase: GameStatus | GameStatus[]): boolean => {
  const expected = Array.isArray(expectedPhase) ? expectedPhase : [expectedPhase];
  return expected.includes(currentPhase);
};

const validateUserTurn = (currentPlayer: string, user: any): boolean => {
  if (currentPlayer && currentPlayer !== user?.username) {
    Logger.error(`${ERROR_MESSAGES.NOT_YOUR_TURN}. Current player: ${currentPlayer}`);
    return false;
  }
  return true;
};

// State update helpers
const createStateUpdater = (set: Function) => ({
  batch: (updates: Record<string, any>) => {
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
});

// Database operations wrapper
const createDatabaseOperations = () => ({
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      Logger.error(errorMessage, error);
      return null;
    }
  },

  async getSupabaseDatabase() {
    const { SupabaseDatabase } = await import("@/lib/services/supabase-database");
    return SupabaseDatabase;
  },
});

// Player management helpers
const createPlayerHelpers = () => ({
  createPlayer: (user: any, isHost: boolean = false): Player => ({
    id: user.id,
    name: user.username,
    isHost,
    isBot: false,
    isReady: true,
    hand: [],
    score: 0,
  }),

  createBotPlayer: (name: string, index: number): Player => {
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
  },

  generateTeamAssignments: (players: Player[]): Record<string, "royals" | "rebels"> => {
    const teams: Record<string, "royals" | "rebels"> = {};
    players.forEach((player, index) => {
      // Even indices (0, 2) are Royals, odd indices (1, 3) are Rebels
      teams[player.name] = index % 2 === 0 ? "royals" : "rebels";
    });
    return teams;
  },
});

// UI notification helpers
const createNotificationHelpers = () => ({
  showError: (message: string) => toast.error(message),
  showSuccess: (message: string) => toast.success(message),
  showInfo: (message: string) => toast.info(message),
  showWarning: (message: string) => toast.warning(message),

  getPhaseErrorMessage: (phase: GameStatus): string => {
    return PHASE_MESSAGES[phase as keyof typeof PHASE_MESSAGES] || 
           `Cannot perform action yet. Current phase: ${phase}`;
  },
});

export const createGameActions = (
  get: () => GameStoreState,
  set: (
    partial:
      | Partial<GameStoreState>
      | ((state: GameStoreState) => Partial<GameStoreState>),
    replace?: boolean
  ) => void
) => {
  const stateUpdater = createStateUpdater(set);
  const dbOps = createDatabaseOperations();
  const playerHelpers = createPlayerHelpers();
  const notifications = createNotificationHelpers();

  // Helper methods
  const handleRoomSetup = async (roomId: string, user: any): Promise<GameRoom | null> => {
    if (!user?.id) return null;
    
    return dbOps.withErrorHandling(async () => {
      const SupabaseDatabase = await dbOps.getSupabaseDatabase();
      let gameRoom = await SupabaseDatabase.getGameRoom(roomId);

      if (!gameRoom) {
        Logger.log(`Room ${roomId} doesn't exist, creating it`);
        gameRoom = await SupabaseDatabase.createGameRoom(roomId, user.id, get().gameMode);
        
        if (!gameRoom) {
          notifications.showError("Failed to create game room. Please try again.");
          return null;
        }
      }

      return gameRoom;
    }, "Error checking/creating game room");
  };

  const addPlayerToDatabase = async (roomId: string, player: Player): Promise<boolean> => {
    const result = await dbOps.withErrorHandling(async () => {
      const SupabaseDatabase = await dbOps.getSupabaseDatabase();
      const success = await SupabaseDatabase.addPlayerToRoom(roomId, player);
      
      if (!success) {
        notifications.showError("Failed to join game room. Please try again.");
        return false;
      }
      
      return true;
    }, "Error adding player to room");
    
    return result ?? false;
  };

  const getUpdatedRoomState = async (roomId: string): Promise<GameRoom | null> => {
    return dbOps.withErrorHandling(async () => {
      const SupabaseDatabase = await dbOps.getSupabaseDatabase();
      const updatedRoom = await SupabaseDatabase.getGameRoom(roomId);
      
      if (!updatedRoom) {
        notifications.showError("Failed to retrieve game room data. Please try again.");
        return null;
      }
      
      return updatedRoom;
    }, "Error getting updated room state");
  };

  const updateStateAfterJoin = (
    updatedRoom: GameRoom, 
    updatedPlayers: Player[], 
    preserveGameStatus: boolean, 
    currentGameStatus: GameStatus
  ) => {
    stateUpdater.batch({
      currentRoom: updatedRoom,
      players: updatedRoom.players || updatedPlayers,
      isLoading: false,
      isConnected: true,
      gameStatus: preserveGameStatus 
        ? currentGameStatus 
        : (updatedRoom.gameState.gamePhase || "waiting"),
    });
  };

  const sendJoinMessage = async (
    roomId: string, 
    user: any, 
    currentUserPlayer: Player, 
    preserveGameStatus: boolean
  ) => {
    if (!user?.username || !user?.id) return;
    
    const joinSuccess = await get().sendMessage({
      type: "room:join",
      payload: {
        roomId,
        player: currentUserPlayer,
        playerName: user.username,
        playerId: user.id,
        currentGameStatus: get().gameStatus,
        preservedState: preserveGameStatus,
      },
    });

    if (!joinSuccess) {
      Logger.error("Failed to send join message to server");
    }
  };

  const updateStateAfterBotsAdded = (roomId: string, newPlayers: Player[]) => {
    const currentRoomState = get().currentRoom;
    stateUpdater.batch({
      players: newPlayers,
      currentRoom: {
        id: roomId,
        gameState: currentRoomState?.gameState || {
          currentTurn: null,
          trumpSuit: null,
          currentBid: 0,
          currentBidder: null,
          trickCards: {},
          roundNumber: 0,
          gamePhase: "waiting",
          teams: { royals: [], rebels: [] },
          scores: { royals: 0, rebels: 0 },
          consecutiveTricks: { royals: 0, rebels: 0 },
          lastTrickWinner: null,
          dealerIndex: 0,
          trumpCaller: null,
        },
        createdAt: currentRoomState?.createdAt || Date.now(),
        lastActivity: Date.now(),
        players: newPlayers,
      },
    });

    // Show completion message if room is full
    if (newPlayers.length === GAME_CONSTANTS.MAX_PLAYERS) {
      set({ statusMessage: "Room is full. Start the game when ready." });
      setTimeout(() => set({ statusMessage: null }), GAME_CONSTANTS.STATUS_MESSAGE_DELAY);
    }
  };

  const updateStateAfterCardPlay = (card: Card, user: any) => {
    const { currentTrick } = get();
    const updatedTrick = [...currentTrick, card];

    set((state) => ({
      currentTrick: updatedTrick,
      players: state.players.map((p) => {
        if (p.id === user.id) {
          return {
            ...p,
            hand: p.hand.filter((c) => c.id !== card.id),
          };
        }
        return p;
      }),
    }));
  };

  return {
    // Basic setters (optimized with batch updates where beneficial)
    setRoom: (room: GameRoom | null) => set({ currentRoom: room }),

    setPlayers: (players: Player[]) => set({ players }),

    setGameMode: (gameMode: "classic" | "frenzy") => {
      stateUpdater.batch({
        gameMode,
        specialPowers:
          gameMode === "frenzy"
            ? { doubleTrump: true, swapCard: true }
            : undefined,
      });
    },

    setGameStatus: (gameStatus: GameStatus) => {
      Logger.log(`Setting game status to ${gameStatus}`);
      
      const currentRoom = get().currentRoom;
      const updates: Partial<GameStoreState> = { gameStatus };

      // Update gameState in currentRoom to keep it in sync
      if (currentRoom?.gameState) {
        updates.currentRoom = {
          ...currentRoom,
          gameState: {
            ...currentRoom.gameState,
            gamePhase: gameStatus,
          },
        };
      }

      stateUpdater.batch(updates);
      Logger.log("Game status set to:", gameStatus);
    },

    setRoomId: (roomId: string | null) => set({ roomId }),
    setLoading: (isLoading: boolean) => set({ isLoading }),
    setConnected: (isConnected: boolean) => set({ isConnected }),

    // Core game actions (refactored for better maintainability)
    joinRoom: async (roomId: string, playerName: string) => {
      const user = useAuthStore.getState().user;
      if (!validateUser(user)) return;

      const { currentRoom, players, gameStatus } = get();

      // Early return if already in room
      if (currentRoom?.id === roomId && players.some((p) => p.id === user!.id)) {
        Logger.log(`Already joined room ${roomId}, not joining again`);
        return;
      }

      Logger.log(`Joining room ${roomId} as ${user!.username}`);
      
      set({ roomId, isLoading: true });

      // Preserve current gameStatus if not waiting (state restoration)
      const preserveGameStatus = gameStatus !== "waiting";
      const existingPlayers = players.length > 0 ? [...players] : [];
      const userExists = existingPlayers.some((p) => p.id === user!.id);

      const currentUserPlayer = playerHelpers.createPlayer(user, existingPlayers.length === 0);
      
      // Add user to players list if not already present
      if (existingPlayers.length > 0 && !userExists) {
        existingPlayers.push(currentUserPlayer);
      }

      const updatedPlayers = existingPlayers.length > 0 ? existingPlayers : [currentUserPlayer];
      Logger.log("Updated players list:", updatedPlayers);

              try {
          // Handle room creation/retrieval
          const gameRoom = await handleRoomSetup(roomId, user);
          if (!gameRoom) {
            set({ isLoading: false });
            return;
          }

          // Add player to room
          const success = await addPlayerToDatabase(roomId, currentUserPlayer);
          if (!success) {
            set({ isLoading: false });
            return;
          }

          // Get updated room state
          const updatedRoom = await getUpdatedRoomState(roomId);
          if (!updatedRoom) {
            set({ isLoading: false });
            return;
          }

          // Update local state
          updateStateAfterJoin(updatedRoom, updatedPlayers, preserveGameStatus, gameStatus);

          // Send join message and subscribe to realtime
          await sendJoinMessage(roomId, user, currentUserPlayer, preserveGameStatus);
          await get().subscribeToRealtime();

        } catch (error) {
          Logger.error("Error in joinRoom:", error);
          notifications.showError("Error joining game. Please try again.");
          set({ isLoading: false });
        }
    },

    // Helper method to handle room setup
    async handleRoomSetup(roomId: string, user: any): Promise<GameRoom | null> {
      if (!user?.id) return null;
      
      return dbOps.withErrorHandling(async () => {
        const SupabaseDatabase = await dbOps.getSupabaseDatabase();
        let gameRoom = await SupabaseDatabase.getGameRoom(roomId);

        if (!gameRoom) {
          Logger.log(`Room ${roomId} doesn't exist, creating it`);
          gameRoom = await SupabaseDatabase.createGameRoom(roomId, user.id, get().gameMode);
          
          if (!gameRoom) {
            notifications.showError("Failed to create game room. Please try again.");
            return null;
          }
        }

        return gameRoom;
      }, "Error checking/creating game room");
    },

    // Helper method to add player to database
    async addPlayerToDatabase(roomId: string, player: Player): Promise<boolean> {
      const result = await dbOps.withErrorHandling(async () => {
        const SupabaseDatabase = await dbOps.getSupabaseDatabase();
        const success = await SupabaseDatabase.addPlayerToRoom(roomId, player);
        
        if (!success) {
          notifications.showError("Failed to join game room. Please try again.");
          return false;
        }
        
        return true;
      }, "Error adding player to room");
      
      return result ?? false;
    },

    // Helper method to get updated room state
    async getUpdatedRoomState(roomId: string): Promise<GameRoom | null> {
      return dbOps.withErrorHandling(async () => {
        const SupabaseDatabase = await dbOps.getSupabaseDatabase();
        const updatedRoom = await SupabaseDatabase.getGameRoom(roomId);
        
        if (!updatedRoom) {
          notifications.showError("Failed to retrieve game room data. Please try again.");
          return null;
        }
        
        return updatedRoom;
      }, "Error getting updated room state");
    },

    // Helper method to update state after successful join
    updateStateAfterJoin(
      updatedRoom: GameRoom, 
      updatedPlayers: Player[], 
      preserveGameStatus: boolean, 
      currentGameStatus: GameStatus
    ) {
      stateUpdater.batch({
        currentRoom: updatedRoom,
        players: updatedRoom.players || updatedPlayers,
        isLoading: false,
        isConnected: true,
        gameStatus: preserveGameStatus 
          ? currentGameStatus 
          : (updatedRoom.gameState.gamePhase || "waiting"),
      });
    },

    // Helper method to send join message
    async sendJoinMessage(
      roomId: string, 
      user: any, 
      currentUserPlayer: Player, 
      preserveGameStatus: boolean
    ) {
      if (!user?.username || !user?.id) return;
      
      const joinSuccess = await get().sendMessage({
        type: "room:join",
        payload: {
          roomId,
          player: currentUserPlayer,
          playerName: user.username,
          playerId: user.id,
          currentGameStatus: get().gameStatus,
          preservedState: preserveGameStatus,
        },
      });

      if (!joinSuccess) {
        Logger.error("Failed to send join message to server");
      }
    },

    leaveRoom: async () => {
      const { roomId, currentRoom } = get();
      const user = useAuthStore.getState().user;

      if (roomId && currentRoom && user) {
        // Send leave message
        get().sendMessage({
          type: "room:leave",
          payload: { roomId, playerId: user.id },
        });

        // Remove from database
        await dbOps.withErrorHandling(async () => {
          const SupabaseDatabase = await dbOps.getSupabaseDatabase();
          await SupabaseDatabase.removePlayerFromRoom(roomId, user.id);
          Logger.log(`Player ${user.username} removed from room ${roomId}`);
        }, "Error removing player from room");
      }

      stateUpdater.resetGameState();
    },

    startGame: async () => {
      const { currentRoom, players } = get();

      if (!validateRoom(currentRoom)) return;

      if (players.length < GAME_CONSTANTS.MIN_PLAYERS) {
        Logger.error(`Not enough players to start (${players.length}/${GAME_CONSTANTS.MIN_PLAYERS})`);
        return;
      }

      Logger.log("Starting game...");

      // Initialize team assignments if they don't exist
      const currentTeams = get().teamAssignments;
      let teamAssignments = currentTeams;
      
      if (Object.keys(currentTeams).length === 0) {
        teamAssignments = playerHelpers.generateTeamAssignments(players);
        set({ teamAssignments });
        Logger.log("Created initial team assignments:", teamAssignments);
      }

      // Update game state
      stateUpdater.batch({
        gameStatus: "initial_deal" as GameStatus,
        initialCardsDeal: true,
        showShuffleAnimation: true,
      });

      Logger.log("Game status set to initial_deal, initialCardsDeal=true");

      // Broadcast game start
      get().sendMessage({
        type: "game:start",
        payload: {
          roomId: currentRoom!.id,
          gamePhase: "initial_deal",
          initialCardsDeal: true,
          teamAssignments,
        },
      });
    },

    addBots: async () => {
      const { roomId, currentRoom, players } = get();
      const user = useAuthStore.getState().user;

      if (!validateRoom(currentRoom) || !validateUser(user)) return;

      // Check if user is the host
      const isHost = currentRoom!.players.some(
        (player) => player.id === user!.id && player.isHost
      );

      if (!isHost) {
        Logger.error(ERROR_MESSAGES.NOT_HOST);
        return;
      }

      set({ isAddingBots: true });

      try {
        const currentPlayerCount = players.length;
        const botsNeeded = Math.min(
          GAME_CONSTANTS.MAX_PLAYERS - currentPlayerCount, 
          GAME_CONSTANTS.BOT_NAMES.length
        );
        const newPlayers = [...players];

        // Add bots with delay between each
        for (let i = 0; i < botsNeeded; i++) {
          const botName = GAME_CONSTANTS.BOT_NAMES[i];
          const botPlayer = playerHelpers.createBotPlayer(botName, i);

          Logger.log(`Adding bot ${botName} with ID ${botPlayer.id} to room ${roomId}`);

          newPlayers.push(botPlayer);

          const result = await get().sendMessage({
            type: "player:joined",
            payload: {
              ...botPlayer,
              roomId,
            },
          });

          Logger.log(`Bot ${botName} add message result: ${result ? "success" : "failed"}`);
        }

        // Update state
        updateStateAfterBotsAdded(roomId!, newPlayers);

      } catch (error) {
        Logger.error("Error adding bots:", error);
      } finally {
        set({ isAddingBots: false });
      }
    },

    // Helper method to update state after bots are added
    updateStateAfterBotsAdded(roomId: string, newPlayers: Player[]) {
      stateUpdater.batch({
        players: newPlayers,
        currentRoom: {
          id: roomId,
          gameState: get().currentRoom?.gameState || {
            currentTurn: null,
            trumpSuit: null,
            currentBid: 0,
            currentBidder: null,
            trickCards: {},
            roundNumber: 0,
            gamePhase: "waiting",
            teams: { royals: [], rebels: [] },
            scores: { royals: 0, rebels: 0 },
            consecutiveTricks: { royals: 0, rebels: 0 },
            lastTrickWinner: null,
            dealerIndex: 0,
            trumpCaller: null,
          },
          createdAt: get().currentRoom?.createdAt || Date.now(),
          lastActivity: Date.now(),
          players: newPlayers,
        },
      });

      // Show completion message if room is full
      if (newPlayers.length === GAME_CONSTANTS.MAX_PLAYERS) {
        set({ statusMessage: "Room is full. Start the game when ready." });
        setTimeout(() => set({ statusMessage: null }), GAME_CONSTANTS.STATUS_MESSAGE_DELAY);
      }
    },

    playCard: async (card: Card) => {
      const { roomId, currentRoom, currentPlayer, gameStatus, currentTrick } = get();
      const user = useAuthStore.getState().user;
      const uiStore = useUIStore.getState();

      // Validation chain
      if (!validateRoom(currentRoom) || !validateUser(user)) return;

      if (!validateGamePhase(gameStatus, "playing")) {
        const errorMessage = notifications.getPhaseErrorMessage(gameStatus);
        notifications.showWarning(errorMessage);
        return;
      }

      if (!validateUserTurn(currentPlayer, user)) {
        notifications.showWarning(`${ERROR_MESSAGES.NOT_YOUR_TURN}. Current player: ${currentPlayer}`);
        return;
      }

      // Check for duplicate card play
      const isCardAlreadyInTrick = currentTrick.some(
        (c) => c.id === card.id && c.suit === card.suit && c.rank === card.rank
      );

      if (isCardAlreadyInTrick) {
        Logger.log("Card already in current trick, ignoring duplicate play");
        return;
      }

      // Set loading state
      uiStore.setCardPlayLoading(true);
      const numericCardId = typeof card.id === "string" 
        ? parseInt(card.id.replace(/\D/g, ""), 10) || 0 
        : 0;
      uiStore.setPlayingCardId(numericCardId);

      // Update played cards tracking
      if (user?.id && card.id) {
        get().updatePlayedCards(user.id, card.id);
      }

      try {
        // Record action in database
        await dbOps.withErrorHandling(async () => {
          const SupabaseDatabase = await dbOps.getSupabaseDatabase();
          await SupabaseDatabase.recordPlayerAction(roomId!, user!.id, "play-card", {
            card,
            gamePhase: gameStatus,
            timestamp: new Date().toISOString(),
          });
        }, "Error recording player action");

        // Send play card message
        get().sendMessage({
          type: "game:play-card",
          payload: {
            roomId,
            playerId: user!.id,
            playerName: user!.username,
            card,
            gamePhase: gameStatus,
          },
        });

        // Update local state
        updateStateAfterCardPlay(card, user!);

      } catch (error) {
        Logger.error("Error in playCard:", error);
        notifications.showError("Error playing card. Please try again.");
      }
    },

    // Helper method to update state after card play
    updateStateAfterCardPlay(card: Card, user: any) {
      const { currentTrick } = get();
      const updatedTrick = [...currentTrick, card];

      set((state) => ({
        currentTrick: updatedTrick,
        players: state.players.map((p) => {
          if (p.id === user.id) {
            return {
              ...p,
              hand: p.hand.filter((c) => c.id !== card.id),
            };
          }
          return p;
        }),
      }));
    },

    placeBid: (bid: number) => {
      const { roomId, currentRoom } = get();
      const user = useAuthStore.getState().user;

      if (!validateRoom(currentRoom) || !validateUser(user)) return;

      get().sendMessage({
        type: "game:bid",
        payload: { roomId, playerId: user!.id, bid },
      });
    },

    selectTrump: (suit: Suit) => {
      const { currentRoom, userId } = get();
      
      if (!validateRoom(currentRoom) || !userId) {
        Logger.error("Cannot start trump selection: no active room or user");
        return;
      }

      notifications.showInfo("Trump selection started! Vote for your preferred suit.");
      set({ trumpSelectionInProgress: true });
    },

    setTrumpSuit: (suit: Suit) => {
      const { currentRoom } = get();
      
      if (!validateRoom(currentRoom)) return;

      stateUpdater.batch({
        trumpSuit: suit,
        trumpSelectionInProgress: false,
        gameStatus: "bidding" as GameStatus,
      });

      Logger.log(`Trump suit set to ${suit}`);
      notifications.showSuccess(`Trump suit selected: ${suit}`);
    },
  };
};
