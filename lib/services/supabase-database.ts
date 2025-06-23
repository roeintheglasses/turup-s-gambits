import { supabase } from "@/lib/services/supabase";
import { GameRoom, GameState, Player, Suit } from "@/app/types/game";

/**
 * Service for interacting with the Supabase database
 * Handles CRUD operations for game rooms, trump votes, and player actions
 */
export class SupabaseDatabase {
  /**
   * Create a new game room
   * @param roomId Unique identifier for the room
   * @param hostId User ID of the host
   * @param gameMode Game mode (classic or frenzy)
   * @returns The created game room or null if creation failed
   */
  static async createGameRoom(
    roomId: string,
    hostId: string,
    gameMode: string = "classic"
  ): Promise<GameRoom | null> {
    // Check if supabase client is initialized
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
      };

      // First check if the room already exists
      const { data: existingRoom, error: checkError } = await supabase
        .from("game_rooms")
        .select("id")
        .eq("id", roomId)
        .maybeSingle();

      if (checkError) {
        console.error(
          "[SupabaseDatabase] Error checking if room exists:",
          JSON.stringify(checkError)
        );
        return null;
      }

      // If room already exists, return it
      if (existingRoom) {
        console.log(
          `[SupabaseDatabase] Room ${roomId} already exists, fetching it`
        );
        return this.getGameRoom(roomId);
      }

      // Prepare room data - handle potential host_id issues
      const roomData: any = {
        id: roomId,
        game_state: initialGameState,
        game_mode: gameMode,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      };

      // Only add host_id if it's a valid UUID to avoid foreign key constraint issues
      if (
        hostId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          hostId
        )
      ) {
        roomData.host_id = hostId;
      } else {
        console.warn(
          "[SupabaseDatabase] Invalid host_id format, omitting from room creation"
        );
      }

      // Create the room
      const { data, error } = await supabase
        .from("game_rooms")
        .insert(roomData)
        .select()
        .single();

      if (error) {
        console.error(
          "[SupabaseDatabase] Error creating game room:",
          JSON.stringify(error)
        );
        return null;
      }

      // Check if data exists and has required fields
      if (!data) {
        console.error("[SupabaseDatabase] No data returned after creating room:", roomId);
        return null;
      }

      // Ensure game_state exists with default structure
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
        players: []
      };

      // Convert database record to GameRoom type with safe date parsing
      try {
        return {
          id: data.id,
          players: gameState.players || [],
          gameState: gameState,
          createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
          lastActivity: data.last_updated ? new Date(data.last_updated).getTime() : Date.now(),
        };
      } catch (dateError) {
        console.error("[SupabaseDatabase] Error parsing dates in createGameRoom:", dateError);
        return {
          id: data.id,
          players: gameState.players || [],
          gameState: gameState,
          createdAt: Date.now(),
          lastActivity: Date.now(),
        };
      }
    } catch (error) {
      console.error("[SupabaseDatabase] Error creating game room:", error);
      return null;
    }
  }

  /**
   * Get a game room by ID
   * @param roomId Room ID to fetch
   * @returns The game room or null if not found
   */
  static async getGameRoom(roomId: string): Promise<GameRoom | null> {
    // Check if supabase client is initialized
    if (!supabase) {
      console.error("[SupabaseDatabase] Supabase client not initialized");
      return null;
    }

    try {
      // Try to get the room
      const { data, error } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error) {
        console.error(
          "[SupabaseDatabase] Error fetching game room:",
          JSON.stringify(error)
        );
        return null;
      }

      // Check if data exists and has required fields
      if (!data) {
        console.error("[SupabaseDatabase] No data returned for room:", roomId);
        return null;
      }

      // Ensure game_state exists, create default if not 
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
        players: []
      };

      // Convert database record to GameRoom type with safe date parsing
      try {
        return {
          id: data.id,
          players: gameState.players || [],
          gameState: gameState,
          createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
          lastActivity: data.last_updated ? new Date(data.last_updated).getTime() : Date.now(),
        };
      } catch (dateError) {
        console.error("[SupabaseDatabase] Error parsing dates in getGameRoom:", dateError);
        return {
          id: data.id,
          players: gameState.players || [],
          gameState: gameState,
          createdAt: Date.now(),
          lastActivity: Date.now(),
        };
      }
    } catch (error) {
      console.error("[SupabaseDatabase] Error fetching game room:", error);
      return null;
    }
  }

  /**
   * Update game state in the database
   * @param roomId Room ID to update
   * @param gameState New game state
   * @returns True if update was successful, false otherwise
   */
  static async updateGameState(
    roomId: string,
    gameState: GameState
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("game_rooms")
        .update({
          game_state: gameState,
          last_updated: new Date().toISOString(),
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
   * Add a player to a game room
   * @param roomId Room ID to update
   * @param player Player to add
   * @returns True if update was successful, false otherwise
   */
  static async addPlayerToRoom(
    roomId: string,
    player: Player
  ): Promise<boolean> {
    try {
      // First get the current game state
      const { data, error } = await supabase
        .from("game_rooms")
        .select("game_state")
        .eq("id", roomId)
        .single();

      if (error) {
        console.error("[SupabaseDatabase] Error fetching game state:", error);
        return false;
      }

      // Check if data exists
      if (!data) {
        console.error("[SupabaseDatabase] No data returned when adding player to room:", roomId);
        return false;
      }

      // Ensure game_state exists with default structure
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
        players: []
      };

      // Add player to the game state
      const players = gameState.players || [];

      // Check if player already exists
      const playerExists = players.some((p: Player) => p.id === player.id);
      if (!playerExists) {
        players.push(player);
      }

      gameState.players = players;

      // Update the game state
      const { error: updateError } = await supabase
        .from("game_rooms")
        .update({
          game_state: gameState,
          current_players: players.length,
          last_updated: new Date().toISOString(),
        })
        .eq("id", roomId);

      if (updateError) {
        console.error(
          "[SupabaseDatabase] Error updating game state:",
          updateError
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Error adding player to room:", error);
      return false;
    }
  }

  /**
   * Remove a player from a game room
   * @param roomId Room ID to update
   * @param playerId ID of player to remove
   * @returns True if update was successful, false otherwise
   */
  static async removePlayerFromRoom(
    roomId: string,
    playerId: string
  ): Promise<boolean> {
    try {
      // First get the current game state
      const { data, error } = await supabase
        .from("game_rooms")
        .select("game_state")
        .eq("id", roomId)
        .single();

      if (error) {
        console.error("[SupabaseDatabase] Error fetching game state:", error);
        return false;
      }

      // Check if data exists
      if (!data) {
        console.error("[SupabaseDatabase] No data returned when removing player from room:", roomId);
        return false;
      }

      // Ensure game_state exists with default structure
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
        players: []
      };

      // Remove player from the game state
      const players = gameState.players || [];
      gameState.players = players.filter((p: Player) => p.id !== playerId);

      // Update the game state
      const { error: updateError } = await supabase
        .from("game_rooms")
        .update({
          game_state: gameState,
          current_players: gameState.players.length,
          last_updated: new Date().toISOString(),
        })
        .eq("id", roomId);

      if (updateError) {
        console.error(
          "[SupabaseDatabase] Error updating game state:",
          updateError
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[SupabaseDatabase] Error removing player from room:",
        error
      );
      return false;
    }
  }

  /**
   * Record a trump vote
   * @param roomId Room ID
   * @param playerId Player ID
   * @param suit Trump suit voted for
   * @returns True if vote was recorded, false otherwise
   */
  static async recordTrumpVote(
    roomId: string,
    playerId: string,
    suit: Suit
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from("trump_votes").upsert({
        room_id: roomId,
        player_id: playerId,
        suit: suit,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("[SupabaseDatabase] Error recording trump vote:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[SupabaseDatabase] Error recording trump vote:", error);
      return false;
    }
  }

  /**
   * Get trump votes for a room
   * @param roomId Room ID
   * @returns Map of player IDs to their votes, or null if error
   */
  static async getTrumpVotes(
    roomId: string
  ): Promise<Map<string, Suit> | null> {
    try {
      const { data, error } = await supabase
        .from("trump_votes")
        .select("player_id, suit")
        .eq("room_id", roomId);

      if (error) {
        console.error("[SupabaseDatabase] Error fetching trump votes:", error);
        return null;
      }

      // Convert to Map
      const votes = new Map<string, Suit>();
      data.forEach((vote) => {
        votes.set(vote.player_id, vote.suit as Suit);
      });

      return votes;
    } catch (error) {
      console.error("[SupabaseDatabase] Error fetching trump votes:", error);
      return null;
    }
  }

  /**
   * Record a player action
   * @param roomId Room ID
   * @param playerId Player ID
   * @param actionType Type of action
   * @param actionData Additional data for the action
   * @returns True if action was recorded, false otherwise
   */
  static async recordPlayerAction(
    roomId: string,
    playerId: string,
    actionType: string,
    actionData: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from("player_actions").insert({
        room_id: roomId,
        player_id: playerId,
        action_type: actionType,
        action_data: actionData,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error(
          "[SupabaseDatabase] Error recording player action:",
          error
        );
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
   * @param roomId Room ID
   * @returns Array of player actions, or null if error
   */
  static async getPlayerActions(roomId: string): Promise<any[] | null> {
    try {
      const { data, error } = await supabase
        .from("player_actions")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(
          "[SupabaseDatabase] Error fetching player actions:",
          error
        );
        return null;
      }

      return data;
    } catch (error) {
      console.error("[SupabaseDatabase] Error fetching player actions:", error);
      return null;
    }
  }
}
