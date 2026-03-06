import * as Colyseus from "colyseus.js";
import type { Room } from "colyseus.js";
import type { GameState } from "../../server/schema/GameState";

export type GameRoom = Room<GameState>;

// Keys for localStorage reconnection data
const RECONNECT_ROOM_ID_KEY = "colyseus_room_id";
const RECONNECT_USER_ID_KEY = "colyseus_user_id";

class ColyseusClientService {
  private client: Colyseus.Client | null = null;
  private currentRoom: GameRoom | null = null;
  private pendingPingResolve: ((latency: number) => void) | null = null;
  private pendingPingReject: ((error: Error) => void) | null = null;
  private pendingPingTimeout: ReturnType<typeof setTimeout> | null = null;
  private pongListenerRegistered: boolean = false;

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
      // If a specific roomId is provided, try to join that room first
      if (options?.roomId) {
        try {
          this.currentRoom = await this.client!.joinById<GameState>(options.roomId, {
            userId,
            name: userName,
          });
          console.log("✅ Joined existing room:", this.currentRoom.roomId);
          this.storeReconnectionData(this.currentRoom.roomId, userId);
          this.registerPongListener();
          return this.currentRoom;
        } catch (joinError: any) {
          // If room doesn't exist or is full, fall through to create
          console.log("⚠️ Could not join room, will create new:", joinError?.message);
        }
      }

      // Create a new room or join any available
      this.currentRoom = await this.client!.joinOrCreate<GameState>("game_room", {
        userId,
        name: userName,
        isPublic: options?.isPublic ?? true,
        gameMode: "classic",
      });
      console.log("✅ Joined/Created room:", this.currentRoom.roomId);

      // Store reconnection info
      this.storeReconnectionData(this.currentRoom.roomId, userId);
      this.registerPongListener();

      return this.currentRoom;
    } catch (error) {
      console.error("❌ Failed to join/create room:", error);
      throw error;
    }
  }

  /**
   * Store reconnection data in localStorage
   */
  private storeReconnectionData(roomId: string, userId: string) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(RECONNECT_ROOM_ID_KEY, roomId);
        localStorage.setItem(RECONNECT_USER_ID_KEY, userId);
      }
    } catch (e) {
      console.warn("Could not store reconnection data:", e);
    }
  }

  /**
   * Get stored reconnection data
   */
  getStoredReconnectionData(): { roomId: string; userId: string } | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const roomId = localStorage.getItem(RECONNECT_ROOM_ID_KEY);
        const userId = localStorage.getItem(RECONNECT_USER_ID_KEY);
        if (roomId && userId) {
          return { roomId, userId };
        }
      }
    } catch (e) {
      console.warn("Could not get reconnection data:", e);
    }
    return null;
  }

  /**
   * Clear stored reconnection data (call when game ends or player leaves intentionally)
   */
  clearReconnectionData() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(RECONNECT_ROOM_ID_KEY);
        localStorage.removeItem(RECONNECT_USER_ID_KEY);
      }
    } catch (e) {
      console.warn("Could not clear reconnection data:", e);
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

      // Store reconnection info
      this.storeReconnectionData(roomId, userId);
      this.registerPongListener();

      return this.currentRoom;
    } catch (error) {
      console.error("❌ Failed to join room:", error);
      throw error;
    }
  }

  /**
   * Leave current room
   * @param clearReconnect - If true, clears reconnection data (default: true for intentional leaves)
   */
  async leaveRoom(clearReconnect: boolean = true) {
    if (this.currentRoom) {
      try {
        this.resetPongListener();
        await this.currentRoom.leave();
        console.log("👋 Left room");
        this.currentRoom = null;
        if (clearReconnect) {
          this.clearReconnectionData();
        }
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
   * Request a rematch after game ends
   */
  requestRematch() {
    this.send("request_rematch");
  }

  /**
   * Register a single persistent pong listener on the current room.
   * Idempotent — safe to call multiple times.
   */
  private registerPongListener() {
    if (this.pongListenerRegistered || !this.currentRoom) return;

    this.currentRoom.onMessage("pong", (message: { timestamp: number }) => {
      if (this.pendingPingResolve) {
        if (this.pendingPingTimeout) {
          clearTimeout(this.pendingPingTimeout);
          this.pendingPingTimeout = null;
        }
        const latency = Date.now() - message.timestamp;
        this.pendingPingResolve(latency);
        this.pendingPingResolve = null;
        this.pendingPingReject = null;
      }
    });
    this.pongListenerRegistered = true;
  }

  /**
   * Reset pong listener state (call when room changes or is left).
   */
  private resetPongListener() {
    if (this.pendingPingTimeout) {
      clearTimeout(this.pendingPingTimeout);
      this.pendingPingTimeout = null;
    }
    if (this.pendingPingReject) {
      this.pendingPingReject(new Error("Room changed"));
    }
    this.pendingPingResolve = null;
    this.pendingPingReject = null;
    this.pongListenerRegistered = false;
  }

  /**
   * Send ping to measure latency
   * Returns a promise that resolves with the latency in ms
   */
  sendPing(): Promise<number> {
    if (!this.currentRoom) {
      return Promise.reject(new Error("No active room"));
    }

    // Reject any in-flight ping
    if (this.pendingPingReject) {
      this.pendingPingReject(new Error("New ping started"));
      this.pendingPingResolve = null;
      this.pendingPingReject = null;
    }
    if (this.pendingPingTimeout) {
      clearTimeout(this.pendingPingTimeout);
      this.pendingPingTimeout = null;
    }

    this.registerPongListener();

    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      this.pendingPingResolve = resolve;
      this.pendingPingReject = reject;
      this.pendingPingTimeout = setTimeout(() => {
        this.pendingPingResolve = null;
        this.pendingPingReject = null;
        this.pendingPingTimeout = null;
        reject(new Error("Ping timeout"));
      }, 5000);

      this.send("ping", { timestamp });
    });
  }

  /**
   * Get available rooms
   * Note: This uses the matchmaking API which may require server configuration
   */
  async getAvailableRooms(): Promise<any[]> {
    if (!this.client) {
      this.initialize();
    }

    try {
      // Cast to any to handle different Colyseus versions
      const client = this.client as any;
      if (typeof client.getAvailableRooms !== "function") {
        console.warn("getAvailableRooms not available in this Colyseus version");
        return [];
      }
      const rooms = await client.getAvailableRooms("game_room");
      return rooms.filter((room: any) => room.metadata?.isPublic !== false);
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
      // Cast to any to handle different Colyseus versions
      const client = this.client as any;
      this.resetPongListener();
      this.currentRoom = await client.reconnect(roomId, sessionId);
      console.log("✅ Reconnected to room:", roomId);
      this.registerPongListener();
      return this.currentRoom!;
    } catch (error) {
      console.error("❌ Failed to reconnect:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const colyseusClient = new ColyseusClientService();
