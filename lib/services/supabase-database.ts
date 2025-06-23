import { supabase } from "@/lib/services/supabase";
import { GameRoom, GameState, Player, Suit, GameCard, GameTrick, FrenzyPower, BotPlayer, DatabaseResult } from "@/app/types/game";

/**
 * Enhanced service for interacting with the Supabase database
 * Handles CRUD operations for game rooms, players, trump votes, game cards, tricks, and frenzy powers
 * Uses optimized database functions for better performance
 */
export class SupabaseDatabase {
  /**
   * Create a new game room using the enhanced schema
   */
  static async createGameRoom(
    roomId: string,
    hostId: string,
    gameMode: string = "classic"
  ): Promise<GameRoom | null> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      const initialGameState: GameState = {
        currentTurn: null,
        trumpSuit: null,
        currentBid: 0,
        currentBidder: null,
        trickCards: {},
        roundNumber: 0,
        gamePhase: "waiting",
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
        game_mode: gameMode as 'classic' | 'frenzy',
        status: 'waiting',
        current_trick_number: 0,
        total_tricks: 0
      };

      // Check if room already exists
      const { data: existingRoom, error: checkError } = await supabase
        .from("game_rooms")
        .select("id")
        .eq("id", roomId)
        .maybeSingle();

      if (checkError) {
        console.error("[SupabaseDatabase] Error checking if room exists:", checkError);
        return null;
      }

      if (existingRoom) {
        console.log(`[SupabaseDatabase] Room ${roomId} already exists, fetching it`);
        return this.getGameRoomWithPlayers(roomId);
      }

      // Prepare enhanced room data
      const roomData: any = {
        id: roomId,
        host_id: hostId, // Set the host_id field properly
        game_state: initialGameState,
        game_mode: gameMode,
        status: 'waiting',
        max_players: 4,
        current_players: 0,
        is_private: false,
        allow_bots: true,
        auto_fill_bots: false,
        turn_timer_seconds: 30,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      };

      // Add creator if valid UUID
      if (hostId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hostId)) {
        roomData.created_by = hostId;
      }

      const { data, error } = await supabase
        .from("game_rooms")
        .insert(roomData)
        .select()
        .single();

      if (error) {
        console.error("[SupabaseDatabase] Error creating game room:", error);
        return null;
      }

      if (!data) {
        console.error("[SupabaseDatabase] No data returned after creating room:", roomId);
        return null;
      }

      console.log("[SupabaseDatabase] Room created successfully:", data);
      return this.convertDatabaseRoomToGameRoom(data);
    } catch (error) {
      console.error("[SupabaseDatabase] Error creating game room:", error);
      return null;
    }
  }

  /**
   * Get a game room with players using optimized function
   */
  static async getGameRoomWithPlayers(roomId: string): Promise<GameRoom | null> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      // Use our optimized function
      const { data, error } = await supabase.rpc('get_game_room_with_players', {
        room_id_param: roomId
      });

      if (error) {
        console.error("[SupabaseDatabase] Error fetching room with players:", error);
        return null;
      }

      if (!data || data.length === 0) {
        console.error("[SupabaseDatabase] No data returned for room:", roomId);
        return null;
      }

      const roomData = data[0];
      return this.convertOptimizedRoomData(roomData);
    } catch (error) {
      console.error("[SupabaseDatabase] Error fetching room with players:", error);
      return null;
    }
  }

  /**
   * Get a game room by ID (fallback method)
   */
  static async getGameRoom(roomId: string): Promise<GameRoom | null> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error) {
        console.error("[SupabaseDatabase] Error fetching game room:", error);
        return null;
      }

      if (!data) {
        console.error("[SupabaseDatabase] No data returned for room:", roomId);
        return null;
      }

      return this.convertDatabaseRoomToGameRoom(data);
    } catch (error) {
      console.error("[SupabaseDatabase] Error fetching game room:", error);
      return null;
    }
  }

  /**
   * Update game state with enhanced tracking
   */
  static async updateGameState(
    roomId: string,
    gameState: GameState
  ): Promise<boolean> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return false;
    }

    try {
      const { error } = await supabase
        .from("game_rooms")
        .update({
          game_state: gameState,
          last_updated: new Date().toISOString(),
          current_players: gameState.teams.royals.length + gameState.teams.rebels.length,
          status: gameState.gamePhase === 'waiting' ? 'waiting' : 'in_progress'
        })
        .eq("id", roomId);

      if (error) {
        console.error("[SupabaseDatabase] Error updating game state:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Error updating game state:", error);
      return false;
    }
  }

  /**
   * Add a player to room with enhanced player properties
   */
  static async addPlayerToRoom(
    roomId: string,
    player: Player
  ): Promise<boolean> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return false;
    }

    try {
      // Insert into players table with enhanced schema
      const playerData = {
        room_id: roomId,
        user_id: player.isBot ? null : (player.user_id || player.id),
        player_name: player.name,
        is_host: player.isHost || false,
        is_bot: player.isBot || false,
        is_connected: true,
        is_ready: player.isReady || false,
        seat_position: player.seat_position || null,
        team_name: player.team_name || null,
        bot_difficulty: player.bot_difficulty || 'medium',
        // Don't set join_order - it will be set by database trigger
        joined_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      };

      console.log("[SupabaseDatabase] Adding player with data:", playerData);

      const { data, error: playerError } = await supabase
        .from("players")
        .insert(playerData)
        .select('*')
        .single();

      if (playerError) {
        console.error("[SupabaseDatabase] Error adding player:", playerError);
        return false;
      }

      console.log("[SupabaseDatabase] Player added successfully:", data);

      // Update room player count
      await this.updateRoomPlayerCount(roomId);

      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Error adding player to room:", error);
      return false;
    }
  }

  /**
   * Remove player from room with enhanced cleanup
   */
  static async removePlayerFromRoom(
    roomId: string,
    playerId: string
  ): Promise<boolean> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return false;
    }

    try {
      // Remove player
      const { error: removeError } = await supabase
        .from("players")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", playerId);

      if (removeError) {
        console.error("[SupabaseDatabase] Error removing player:", removeError);
        return false;
      }

      // Update room player count
      await this.updateRoomPlayerCount(roomId);

      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Error removing player from room:", error);
      return false;
    }
  }

  /**
   * Record trump vote with enhanced tracking
   */
  static async recordTrumpVote(
    roomId: string,
    playerId: string,
    suit: Suit
  ): Promise<boolean> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return false;
    }

    try {
      // Insert trump vote
      const { error: voteError } = await supabase
        .from("trump_votes")
        .insert({
          room_id: roomId,
          player_id: playerId,
          suit: suit,
          created_at: new Date().toISOString(),
        });

      if (voteError) {
        console.error("[SupabaseDatabase] Error recording trump vote:", voteError);
        return false;
      }

      // Update player's trump vote
      const { error: playerError } = await supabase
        .from("players")
        .update({
          trump_vote: suit,
          trump_vote_cast_at: new Date().toISOString(),
        })
        .eq("room_id", roomId)
        .eq("user_id", playerId);

      if (playerError) {
        console.error("[SupabaseDatabase] Error updating player trump vote:", playerError);
      }

      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Error recording trump vote:", error);
      return false;
    }
  }

  /**
   * Get trump voting status using optimized function
   */
  static async getTrumpVotingStatus(roomId: string): Promise<any> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_trump_voting_status', {
        room_id_param: roomId
      });

      if (error) {
        console.error("[SupabaseDatabase] Error getting trump voting status:", error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error("[SupabaseDatabase] Error getting trump voting status:", error);
      return null;
    }
  }

  /**
   * Get trump votes (legacy method for compatibility)
   */
  static async getTrumpVotes(roomId: string): Promise<Map<string, Suit> | null> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("trump_votes")
        .select("player_id, suit")
        .eq("room_id", roomId);

      if (error) {
        console.error("[SupabaseDatabase] Error fetching trump votes:", error);
        return null;
      }

      const voteMap = new Map<string, Suit>();
      data?.forEach(vote => {
        if (vote.player_id && vote.suit) {
          voteMap.set(vote.player_id, vote.suit as Suit);
        }
      });

      return voteMap;
    } catch (error) {
      console.error("[SupabaseDatabase] Error fetching trump votes:", error);
      return null;
    }
  }

  /**
   * Record player action with enhanced tracking
   */
  static async recordPlayerAction(
    roomId: string,
    playerId: string,
    actionType: string,
    actionData: any
  ): Promise<boolean> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return false;
    }

    try {
      const { error } = await supabase
        .from("player_actions")
        .insert({
          room_id: roomId,
          player_id: playerId,
          action_type: actionType,
          action_data: actionData,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error("[SupabaseDatabase] Error recording player action:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Error recording player action:", error);
      return false;
    }
  }

  /**
   * Get player actions for a room
   */
  static async getPlayerActions(roomId: string): Promise<any[] | null> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("player_actions")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[SupabaseDatabase] Error fetching player actions:", error);
        return null;
      }

      return data || [];
    } catch (error) {
      console.error("[SupabaseDatabase] Error fetching player actions:", error);
      return null;
    }
  }

  /**
   * Get available rooms using optimized function
   */
  static async getAvailableRooms(
    gameMode?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[] | null> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_available_rooms', {
        game_mode_filter: gameMode || null,
        limit_count: limit,
        offset_count: offset
      });

      if (error) {
        console.error("[SupabaseDatabase] Error fetching available rooms:", error);
        return null;
      }

      return data || [];
    } catch (error) {
      console.error("[SupabaseDatabase] Error fetching available rooms:", error);
      return null;
    }
  }

  /**
   * Get user game statistics using optimized function
   */
  static async getUserGameStats(userId: string): Promise<any | null> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_game_stats', {
        user_id_param: userId
      });

      if (error) {
        console.error("[SupabaseDatabase] Error fetching user stats:", error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error("[SupabaseDatabase] Error fetching user stats:", error);
      return null;
    }
  }

  /**
   * Create a game record when game starts
   */
  static async createGame(roomId: string, gameMode: string): Promise<string | null> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("games")
        .insert({
          room_id: roomId,
          game_mode: gameMode,
          status: 'initial_deal',
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error("[SupabaseDatabase] Error creating game:", error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error("[SupabaseDatabase] Error creating game:", error);
      return null;
    }
  }

  /**
   * Record a frenzy power usage
   */
  static async recordFrenzyPower(
    gameId: string,
    playerId: string,
    powerType: string,
    trumpSuit: Suit,
    targetPlayer?: string,
    powerData?: any
  ): Promise<boolean> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return false;
    }

    try {
      const { error } = await supabase
        .from("frenzy_powers")
        .insert({
          game_id: gameId,
          player_id: playerId,
          power_type: powerType,
          trump_suit: trumpSuit,
          target_player: targetPlayer,
          power_data: powerData,
          used_at: new Date().toISOString(),
          was_successful: true,
        });

      if (error) {
        console.error("[SupabaseDatabase] Error recording frenzy power:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Error recording frenzy power:", error);
      return false;
    }
  }

  /**
   * Run database maintenance
   */
  static async runMaintenance(): Promise<any | null> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('run_maintenance');

      if (error) {
        console.error("[SupabaseDatabase] Error running maintenance:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("[SupabaseDatabase] Error running maintenance:", error);
      return null;
    }
  }

  /**
   * Test database connectivity and schema
   */
  static async testConnection(): Promise<boolean> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return false;
    }

    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from("game_rooms")
        .select("id")
        .limit(1);

      if (error) {
        console.error("[SupabaseDatabase] Connection test failed:", error);
        return false;
      }

      console.log("[SupabaseDatabase] Connection test successful");
      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Connection test error:", error);
      return false;
    }
  }

  /**
   * Test bot creation specifically
   */
  static async testBotCreation(roomId: string): Promise<boolean> {
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return false;
    }

    try {
      // Create a simple test bot
      const testBot = {
        room_id: roomId,
        user_id: null, // Bots don't have user IDs
        player_name: "Test Bot",
        is_host: false,
        is_bot: true,
        is_connected: true,
        is_ready: true,
        seat_position: null,
        team_name: null,
        bot_difficulty: 'medium',
        joined_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      };

      console.log("[SupabaseDatabase] Testing bot creation with data:", testBot);

      const { data, error } = await supabase
        .from("players")
        .insert(testBot)
        .select('*')
        .single();

      if (error) {
        console.error("[SupabaseDatabase] Bot creation test failed:", error);
        return false;
      }

      console.log("[SupabaseDatabase] Bot creation test successful:", data);

      // Clean up test bot
      await supabase
        .from("players")
        .delete()
        .eq("id", data.id);

      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Bot creation test error:", error);
      return false;
    }
  }

  // Helper methods for data conversion
  private static convertDatabaseRoomToGameRoom(data: any): GameRoom {
    const gameState = data.game_state || {
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
    };

    return {
      id: data.id,
      players: [],
      gameState,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
      lastActivity: data.last_updated ? new Date(data.last_updated).getTime() : Date.now(),
      game_mode: data.game_mode,
      status: data.status,
      max_players: data.max_players,
      current_players: data.current_players,
      is_private: data.is_private,
      allow_bots: data.allow_bots,
      turn_timer_seconds: data.turn_timer_seconds,
    };
  }

  private static convertOptimizedRoomData(data: any): GameRoom {
    let players = [];
    
    // Handle both cases: players as JSON string or already parsed array
    if (data.players) {
      if (typeof data.players === 'string') {
        try {
          players = data.players.trim() ? JSON.parse(data.players) : [];
        } catch (error) {
          console.warn("[SupabaseDatabase] Failed to parse players JSON, using empty array:", error);
          players = [];
        }
      } else if (Array.isArray(data.players)) {
        players = data.players;
      }
    }
    
    return {
      id: data.room_id,
      players: players.map((p: any) => ({
        id: p.user_id || p.id,
        name: p.player_name || p.name,
        isHost: p.is_host,
        isBot: p.is_bot,
        isReady: p.is_ready,
        hand: [],
        score: 0,
        team_name: p.team_name,
        is_connected: p.is_connected,
        seat_position: p.seat_position,
      })),
      gameState: {
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
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
      lastActivity: data.last_updated ? new Date(data.last_updated).getTime() : Date.now(),
      game_mode: data.game_mode,
      status: data.room_status,
      max_players: data.max_players,
      current_players: data.player_count,
      allow_bots: data.allow_bots,
      turn_timer_seconds: data.turn_timer_seconds,
      created_by: data.created_by,
      host_id: data.host_id || data.created_by,
    };
  }

  private static async updateRoomPlayerCount(roomId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("id")
        .eq("room_id", roomId)
        .eq("is_connected", true);

      if (!error && data) {
        await supabase
          .from("game_rooms")
          .update({ 
            current_players: data.length,
            last_updated: new Date().toISOString()
          })
          .eq("id", roomId);
      }
    } catch (error) {
      console.error("[SupabaseDatabase] Error updating room player count:", error);
    }
  }
}
