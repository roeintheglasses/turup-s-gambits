import { GameRoom, Player, GameState, Card, Suit, Rank, GameTrick, FrenzyPower, BotPlayer } from "../app/types/game";
import { SupabaseDatabase } from "./services/supabase-database";

/**
 * Enhanced GameManager - Singleton class responsible for managing game rooms and game logic
 * Handles room creation, player management, game flow, card dealing, frenzy powers, and database synchronization
 */
export class GameManager {
  private rooms: Map<string, GameRoom>;
  private static instance: GameManager;
  private gameAnalytics: Map<string, any>;
  private activePowers: Map<string, FrenzyPower[]>;

  private constructor() {
    this.rooms = new Map();
    this.gameAnalytics = new Map();
    this.activePowers = new Map();
  }

  /**
   * Get singleton instance of GameManager
   */
  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * Get all active rooms
   */
  public getRooms(): Map<string, GameRoom> {
    return this.rooms;
  }

  /**
   * Generate a unique room ID
   */
  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Create a new game room with enhanced settings
   */
  public async createNewRoom(
    hostId?: string,
    gameMode: 'classic' | 'frenzy' = 'classic',
    settings?: any
  ): Promise<GameRoom> {
    const roomId = this.generateRoomId();
    
    // Create room in database first
    const dbRoom = await SupabaseDatabase.createGameRoom(roomId, hostId || '', gameMode);
    
    if (!dbRoom) {
      throw new Error("Failed to create room in database");
    }

    const newRoom: GameRoom = {
      id: roomId,
      players: [],
      gameState: {
        currentTurn: null,
        trumpSuit: null,
        currentBid: 0,
        currentBidder: null,
        trickCards: {},
        roundNumber: 0,
        gamePhase: "waiting",
        leadSuit: null,
        teams: {
          royals: [],
          rebels: [],
        },
        scores: {
          royals: 0,
          rebels: 0,
        },
        consecutiveTricks: {
          royals: 0,
          rebels: 0,
        },
        lastTrickWinner: null,
        dealerIndex: 0,
        trumpCaller: null,
        game_mode: gameMode,
        status: 'waiting',
        current_trick_number: 0,
        total_tricks: 0,
        tricks: [],
        cards: [],
        activePowers: [],
      },
      createdAt: Date.now(),
      lastActivity: Date.now(),
      game_mode: gameMode,
      status: 'waiting',
      max_players: settings?.max_players || 4,
      current_players: 0,
      is_private: settings?.is_private || false,
      allow_bots: settings?.allow_bots !== false,
      turn_timer_seconds: settings?.turn_timer_seconds || 30,
      created_by: hostId,
    };

    this.rooms.set(roomId, newRoom);
    this.gameAnalytics.set(roomId, {
      startTime: Date.now(),
      moves: [],
      powerUsages: [],
    });

    return newRoom;
  }

  /**
   * Find an available room or create a new one with enhanced matching
   */
  public async findOrCreateRoom(gameMode: 'classic' | 'frenzy' = 'classic'): Promise<GameRoom> {
    // Try to get available rooms from database first
    const availableRooms = await SupabaseDatabase.getAvailableRooms(gameMode, 5);
    
    if (availableRooms && availableRooms.length > 0) {
      const room = availableRooms[0];
      if (room.current_players < room.max_players) {
        // Load room into memory if not already there
        if (!this.rooms.has(room.room_id)) {
          const gameRoom = await SupabaseDatabase.getGameRoomWithPlayers(room.room_id);
          if (gameRoom) {
            this.rooms.set(room.room_id, gameRoom);
            return gameRoom;
          }
        } else {
          return this.rooms.get(room.room_id)!;
        }
      }
    }

    // Find a room with less than 4 players in waiting state
    for (const room of this.rooms.values()) {
      if (room.players.length < (room.max_players || 4) && 
          room.gameState.gamePhase === "waiting" &&
          room.game_mode === gameMode) {
        return room;
      }
    }

    // If no suitable room found, create a new one
    return this.createNewRoom(undefined, gameMode);
  }

  /**
   * Add a player to a specific room with enhanced tracking
   */
  public async addPlayerToRoom(
    roomId: string,
    playerName: string,
    playerId?: string,
    isBot: boolean = false
  ): Promise<Player> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.players.length >= (room.max_players || 4)) {
      throw new Error("Room is full");
    }

    // Check if player already exists in the room
    const existingPlayer = room.players.find((p) => {
      if (isBot && playerId) {
        return p.id === playerId;
      }
      return p.name === playerName;
    });

    if (existingPlayer) {
      console.log(`Player ${playerName} (${playerId}) already exists in room ${roomId}`);
      return existingPlayer;
    }

    const id = playerId || `player_${playerName.replace(/\s+/g, "_").toLowerCase()}_${Math.random().toString(36).substring(2, 6)}`;
    const isFirstPlayer = room.players.length === 0;

    const newPlayer: Player = {
      id,
      name: playerName,
      hand: [],
      score: 0,
      isReady: false,
      isHost: isFirstPlayer,
      isBot,
      user_id: isBot ? undefined : id,
      room_id: roomId,
      player_name: playerName,
      bot_difficulty: isBot ? 'medium' : undefined,
      seat_position: room.players.length,
      is_connected: true,
      joined_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    };

    console.log(`Adding player ${playerName} to room ${room.id}, isHost: ${isFirstPlayer}, isBot: ${isBot}`);

    room.players.push(newPlayer);
    room.lastActivity = Date.now();
    room.current_players = room.players.length;

    // Add to database
    await SupabaseDatabase.addPlayerToRoom(roomId, newPlayer);

    return newPlayer;
  }

  /**
   * Remove a player from a room with enhanced cleanup
   */
  public async removePlayerFromRoom(roomId: string, playerId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    room.lastActivity = Date.now();
    room.current_players = room.players.length;

    // Remove from database
    await SupabaseDatabase.removePlayerFromRoom(roomId, playerId);

    // If room is empty, remove it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.gameAnalytics.delete(roomId);
      this.activePowers.delete(roomId);
      return;
    }

    // Assign new host if needed
    const hasHost = room.players.some((p) => p.isHost);
    if (!hasHost && room.players.length > 0) {
      room.players[0].isHost = true;
    }
  }

  /**
   * Get a specific room by ID with database sync
   */
  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Load a room from database if not in memory
   */
  public async loadRoomFromDatabase(roomId: string): Promise<GameRoom | undefined> {
    const dbRoom = await SupabaseDatabase.getGameRoomWithPlayers(roomId);
    if (dbRoom) {
      this.rooms.set(roomId, dbRoom);
      return dbRoom;
    }
    return undefined;
  }

  /**
   * Update the game state of a room with database sync
   */
  public async updateGameState(roomId: string, gameState: Partial<GameState>): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.gameState = { ...room.gameState, ...gameState };
    room.lastActivity = Date.now();

    // Sync to database
    await SupabaseDatabase.updateGameState(roomId, room.gameState);
  }

  /**
   * Start game with enhanced tracking and database integration
   */
  public async startGame(roomId: string): Promise<void> {
    // First try to get room from memory
    let room = this.rooms.get(roomId);
    
    // If not in memory, try to load from database
    if (!room) {
      console.log(`[GameManager] Room ${roomId} not in memory, loading from database...`);
      room = await this.loadRoomFromDatabase(roomId);
    }
    
    if (!room) {
      console.error(`[GameManager] Room ${roomId} not found in memory or database`);
      throw new Error("Room not found");
    }

    if (room.players.length < 2) {
      throw new Error("Not enough players to start game");
    }

    // Create game record in database
    const gameId = await SupabaseDatabase.createGame(roomId, room.game_mode || 'classic');
    if (gameId) {
      room.gameState.game_id = gameId;
    }

    // Auto-fill with bots if needed and enabled
    if (room.allow_bots && room.players.length < (room.max_players || 4)) {
      await this.autoFillWithBots(room);
    }

    this.resetGameState(room);
    this.assignTeams(room);

    const deck = this.generateDeck();
    const shuffledDeck = this.shuffleDeck(deck);

    this.dealInitialCards(room, shuffledDeck);

    room.gameState.gamePhase = "initial_deal";
    room.gameState.status = "initial_deal";
    room.gameState.started_at = new Date().toISOString();

    // Initialize game analytics
    const analytics = this.gameAnalytics.get(roomId) || {};
    analytics.gameStarted = Date.now();
    analytics.gameMode = room.game_mode;
    analytics.playerCount = room.players.length;
    this.gameAnalytics.set(roomId, analytics);

    await this.updateGameState(roomId, room.gameState);

    console.log(`Game started in room ${roomId} with ${room.players.length} players`);
  }

  /**
   * Auto-fill room with bots
   */
  private async autoFillWithBots(room: GameRoom): Promise<void> {
    const botNames = ["Merlin", "Lancelot", "Galahad", "Guinevere", "Arthur", "Morgana"];
    const neededBots = (room.max_players || 4) - room.players.length;

    for (let i = 0; i < neededBots; i++) {
      const availableBotNames = botNames.filter(name => 
        !room.players.some(p => p.name === name)
      );
      
      if (availableBotNames.length === 0) break;

      const botName = availableBotNames[Math.floor(Math.random() * availableBotNames.length)];
      await this.addPlayerToRoom(room.id, botName, undefined, true);
    }
  }

  /**
   * Use frenzy power with enhanced tracking
   */
  public async useFrenzyPower(
    roomId: string, 
    playerId: string, 
    powerType: string, 
    targetData?: any
  ): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room || room.game_mode !== 'frenzy') {
      return false;
    }

    // Check if power can be used
    if (!this.canUseFrenzyPower(roomId, playerId, powerType)) {
      return false;
    }

    const trumpSuit = room.gameState.trumpSuit;
    if (!trumpSuit) {
      return false;
    }

    // Record power usage in database
    if (room.gameState.game_id) {
      await SupabaseDatabase.recordFrenzyPower(
        room.gameState.game_id,
        playerId,
        powerType,
        trumpSuit,
        targetData?.targetPlayer,
        targetData
      );
    }

    // Apply power effect
    const success = this.applyFrenzyPowerEffect(room, playerId, powerType, targetData);

    // Update game analytics
    const analytics = this.gameAnalytics.get(roomId) || {};
    if (!analytics.powerUsages) analytics.powerUsages = [];
    analytics.powerUsages.push({
      playerId,
      powerType,
      timestamp: Date.now(),
      success,
    });
    this.gameAnalytics.set(roomId, analytics);

    // Update frenzy powers state
    if (!room.gameState.frenzyPowers) {
      room.gameState.frenzyPowers = {};
    }
    if (!room.gameState.frenzyPowers[playerId]) {
      room.gameState.frenzyPowers[playerId] = {};
    }
    if (!room.gameState.frenzyPowers[playerId][powerType]) {
      room.gameState.frenzyPowers[playerId][powerType] = {
        used: false,
        lastUsed: 0,
        usageCount: 0,
      };
    }

    room.gameState.frenzyPowers[playerId][powerType].used = true;
    room.gameState.frenzyPowers[playerId][powerType].lastUsed = Date.now();
    room.gameState.frenzyPowers[playerId][powerType].usageCount += 1;

    await this.updateGameState(roomId, room.gameState);

    return success;
  }

  /**
   * Check if a frenzy power can be used
   */
  public canUseFrenzyPower(roomId: string, playerId: string, powerType: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.game_mode !== 'frenzy') {
      return false;
    }

    const gameState = room.gameState;
    const trumpSuit = gameState.trumpSuit;
    
    if (!trumpSuit || gameState.gamePhase !== 'playing') {
      return false;
    }

    // Check if power is associated with current trump suit
    const suitPowers = this.getFrenzyPowersForSuit(trumpSuit);
    if (!suitPowers.includes(powerType)) {
      return false;
    }

    // Check if power has been used already
    const playerPowers = gameState.frenzyPowers?.[playerId];
    if (playerPowers?.[powerType]?.used) {
      return false;
    }

    return true;
  }

  /**
   * Apply frenzy power effect
   */
  private applyFrenzyPowerEffect(
    room: GameRoom, 
    playerId: string, 
    powerType: string, 
    targetData?: any
  ): boolean {
    switch (powerType) {
      case 'extra_points':
        return this.handleExtraPointsPower(room, playerId);
      case 'free_lead':
        return this.handleFreeLeadPower(room, playerId);
      case 'peek_card':
        return this.handlePeekCardPower(room, playerId, targetData);
      case 'out_of_turn':
        return this.handleOutOfTurnPower(room, playerId);
      default:
        return false;
    }
  }

  /**
   * Handle extra points power
   */
  private handleExtraPointsPower(room: GameRoom, playerId: string): boolean {
    const player = room.players.find(p => p.id === playerId);
    if (!player) return false;

    const team = this.getPlayerTeam(playerId, room.gameState.teams);
    if (!team) return false;

    // Add extra point to team
    room.gameState.scores[team] += 1;
    
    return true;
  }

  /**
   * Handle free lead power
   */
  private handleFreeLeadPower(room: GameRoom, playerId: string): boolean {
    // Set current turn to this player
    room.gameState.currentTurn = playerId;
    return true;
  }

  /**
   * Handle peek card power
   */
  private handlePeekCardPower(room: GameRoom, playerId: string, targetData: any): boolean {
    const targetPlayer = room.players.find(p => p.id === targetData?.targetPlayer);
    if (!targetPlayer || targetPlayer.hand.length === 0) {
      return false;
    }

    // Reveal a random card from target player's hand
    const randomCard = targetPlayer.hand[Math.floor(Math.random() * targetPlayer.hand.length)];
    
    if (!room.gameState.revealedCards) {
      room.gameState.revealedCards = {};
    }
    
    const revealId = `${playerId}_${Date.now()}`;
    room.gameState.revealedCards[revealId] = {
      playerId: targetData.targetPlayer,
      card: randomCard,
      revealedAt: Date.now(),
      revealedTo: playerId,
    };

    return true;
  }

  /**
   * Handle out of turn power
   */
  private handleOutOfTurnPower(room: GameRoom, playerId: string): boolean {
    // Allow player to play out of turn once
    if (!room.gameState.specialEffects) {
      room.gameState.specialEffects = {};
    }
    
    room.gameState.specialEffects[playerId] = {
      type: 'out_of_turn',
      active: true,
      data: { usesRemaining: 1 },
    };

    return true;
  }

  /**
   * Get frenzy powers for a trump suit
   */
  private getFrenzyPowersForSuit(suit: Suit): string[] {
    switch (suit) {
      case 'hearts':
        return ['extra_points'];
      case 'spades':
        return ['free_lead'];
      case 'diamonds':
        return ['peek_card'];
      case 'clubs':
        return ['out_of_turn'];
      default:
        return [];
    }
  }

  /**
   * Get game analytics for a room
   */
  public getGameAnalytics(roomId: string): any {
    return this.gameAnalytics.get(roomId) || {};
  }

  /**
   * Generate comprehensive game report
   */
  public generateGameReport(roomId: string): any {
    const room = this.rooms.get(roomId);
    const analytics = this.gameAnalytics.get(roomId);
    
    if (!room || !analytics) {
      return null;
    }

    const report = {
      roomId,
      gameMode: room.game_mode,
      playerCount: room.players.length,
      gamePhase: room.gameState.gamePhase,
      scores: room.gameState.scores,
      totalTricks: room.gameState.total_tricks || 0,
      gameDuration: analytics.gameStarted ? Date.now() - analytics.gameStarted : 0,
      powerUsages: analytics.powerUsages || [],
      winner: room.gameState.winner_team,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        team: p.team_name,
        tricksWon: p.total_tricks_won || 0,
      })),
    };

    return report;
  }

  /**
   * Sync room data with database
   */
  public async syncRoomWithDatabase(roomId: string): Promise<boolean> {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    try {
      await SupabaseDatabase.updateGameState(roomId, room.gameState);
      return true;
    } catch (error) {
      console.error("Error syncing room with database:", error);
      return false;
    }
  }

  /**
   * Run database maintenance
   */
  public async runMaintenance(): Promise<void> {
    try {
      await SupabaseDatabase.runMaintenance();
      console.log("Database maintenance completed successfully");
    } catch (error) {
      console.error("Error running database maintenance:", error);
    }
  }

  /**
   * Generate a standard deck of cards
   */
  private generateDeck(): Card[] {
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    
    const deck: Card[] = [];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          suit,
          rank,
          id: `${suit}_${rank}`,
        });
      }
    }
    
    return deck;
  }

  /**
   * Shuffle deck using Fisher-Yates algorithm
   */
  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Reset game state for a new game
   */
  private resetGameState(room: GameRoom): void {
    room.gameState.currentTurn = null;
    room.gameState.trumpSuit = null;
    room.gameState.currentBid = 0;
    room.gameState.currentBidder = null;
    room.gameState.trickCards = {};
    room.gameState.roundNumber = 0;
    room.gameState.gamePhase = "initial_deal";
    room.gameState.leadSuit = null;
    room.gameState.scores = { royals: 0, rebels: 0 };
    room.gameState.consecutiveTricks = { royals: 0, rebels: 0 };
    room.gameState.lastTrickWinner = null;
    room.gameState.dealerIndex = 0;
    room.gameState.trumpCaller = null;
    room.gameState.current_trick_number = 0;
    room.gameState.total_tricks = 0;
    
    // Clear player hands
    room.players.forEach(player => {
      player.hand = [];
      player.score = 0;
      player.isReady = true;
    });
  }

  private assignTeams(room: GameRoom): void {
    const players = room.players;
    room.gameState.teams.royals = [];
    room.gameState.teams.rebels = [];

    players.forEach((player, index) => {
      if (index % 2 === 0) {
        room.gameState.teams.royals.push(player.id);
        player.team_name = 'royals';
      } else {
        room.gameState.teams.rebels.push(player.id);
        player.team_name = 'rebels';
      }
    });
  }

  private dealInitialCards(room: GameRoom, deck: Card[]): void {
    const players = room.players;
    const cardsPerPlayer = 5;
    
    for (let cardIndex = 0; cardIndex < cardsPerPlayer; cardIndex++) {
      for (const player of players) {
        if (deck.length > 0) {
          const card = deck.pop()!;
          player.hand.push(card);
        }
      }
    }
    
    // Store remaining deck for later dealing
    room.deck = deck;
    
    // Sort each player's hand
    room.players.forEach(player => {
      this.sortPlayerHand(player);
    });
  }

  private sortPlayerHand(player: Player): void {
    player.hand.sort((a, b) => {
      const suitOrder = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
      const rankOrder = { "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14 };
      
      if (suitOrder[a.suit] !== suitOrder[b.suit]) {
        return suitOrder[a.suit] - suitOrder[b.suit];
      }
      
      return rankOrder[a.rank] - rankOrder[b.rank];
    });
  }

  private getPlayerTeam(playerId: string, teams: GameState['teams']): "royals" | "rebels" | null {
    if (teams.royals.includes(playerId)) return "royals";
    if (teams.rebels.includes(playerId)) return "rebels";
    return null;
  }
}
