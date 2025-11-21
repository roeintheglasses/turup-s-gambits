import * as Colyseus from "colyseus.js";
import type { Room } from "colyseus.js";
import type { GameState } from "../../server/schema/GameState";

export type GameRoom = Room<GameState>;

class ColyseusClientService {
  private client: Colyseus.Client | null = null;
  private currentRoom: GameRoom | null = null;

  /**
   * Initialize the Colyseus client
   */
  initialize() {
    if (this.client) return this.client;

    const wsUrl = process.env.NEXT_PUBLIC_COLYSEUS_URL || "ws://localhost:2567";
    this.client = new Colyseus.Client(wsUrl);
    console.log("🎮 Colyseus client initialized:", wsUrl);

    return this.client;
  }

  /**
   * Create or join a game room
   */
  async joinOrCreateRoom(
    userId: string,
    userName: string,
    options?: { roomId?: string; isPublic?: boolean }
  ): Promise<GameRoom> {
    if (!this.client) {
      this.initialize();
    }

    try {
      // Always use joinOrCreate which handles both cases
      this.currentRoom = await this.client!.joinOrCreate<GameState>("game_room", {
        userId,
        name: userName,
        isPublic: options?.isPublic ?? true,
        gameMode: "classic",
      });
      console.log("✅ Joined/Created room:", this.currentRoom.id);

      return this.currentRoom;
    } catch (error) {
      console.error("❌ Failed to join/create room:", error);
      throw error;
    }
  }

  /**
   * Join a specific room by ID
   */
  async joinRoom(roomId: string, userId: string, userName: string): Promise<GameRoom> {
    if (!this.client) {
      this.initialize();
    }

    try {
      this.currentRoom = await this.client!.joinById<GameState>(roomId, {
        userId,
        name: userName,
      });
      console.log("✅ Joined room:", roomId);
      return this.currentRoom;
    } catch (error) {
      console.error("❌ Failed to join room:", error);
      throw error;
    }
  }

  /**
   * Leave current room
   */
  async leaveRoom() {
    if (this.currentRoom) {
      try {
        await this.currentRoom.leave();
        console.log("👋 Left room");
        this.currentRoom = null;
      } catch (error) {
        console.error("❌ Error leaving room:", error);
      }
    }
  }

  /**
   * Get current room
   */
  getCurrentRoom(): GameRoom | null {
    return this.currentRoom;
  }

  /**
   * Send a message to the server
   */
  send(messageType: string, data?: any) {
    if (!this.currentRoom) {
      console.error("❌ No active room");
      return;
    }

    try {
      this.currentRoom.send(messageType, data);
    } catch (error) {
      console.error(`❌ Error sending message ${messageType}:`, error);
    }
  }

  /**
   * Start the game (host only)
   */
  startGame() {
    this.send("start_game");
  }

  /**
   * Vote for trump suit
   */
  voteTrump(suit: string) {
    this.send("vote_trump", { suit });
  }

  /**
   * Play a card
   */
  playCard(cardId: string) {
    this.send("play_card", { cardId });
  }

  /**
   * Mark player as ready
   */
  markReady() {
    this.send("ready");
  }

  /**
   * Add bots to fill empty slots
   */
  addBots() {
    this.send("add_bots");
  }

  /**
   * Get available rooms
   */
  async getAvailableRooms() {
    if (!this.client) {
      this.initialize();
    }

    try {
      const rooms = await this.client!.getAvailableRooms("game_room");
      return rooms.filter((room) => room.metadata?.isPublic !== false);
    } catch (error) {
      console.error("❌ Error fetching rooms:", error);
      return [];
    }
  }

  /**
   * Reconnect to a room (useful for disconnections)
   */
  async reconnect(roomId: string, sessionId: string): Promise<GameRoom> {
    if (!this.client) {
      this.initialize();
    }

    try {
      this.currentRoom = await this.client!.reconnect<GameState>(roomId, sessionId);
      console.log("✅ Reconnected to room:", roomId);
      return this.currentRoom;
    } catch (error) {
      console.error("❌ Failed to reconnect:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const colyseusClient = new ColyseusClientService();
