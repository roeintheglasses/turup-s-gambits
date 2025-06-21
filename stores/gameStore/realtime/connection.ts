import { GameStoreState, SetStateFn, EnhancedMessage, ConnectionState, ChannelConfig } from "./types";
import { getCurrentUser, createEnhancedMessage, withRetry, withTimeout, logger } from "./utils";
import { CHANNELS, CONNECTION, TIMING } from "./constants";
import { messageHandlers } from "./handlers";

// Connection manager class for better state management
export class ConnectionManager {
  private connectionState: ConnectionState = {
    isConnected: false,
    reconnectAttempts: 0,
    lastReconnectTime: 0,
  };

  private channels: Map<string, any> = new Map();
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  // Enhanced message sending with better error handling and retry logic
  async sendMessage(
    message: any,
    get: () => GameStoreState,
    set: SetStateFn
  ): Promise<boolean> {
    try {
      logger.info("Sending message:", message);

      const { roomId } = get();
      const user = getCurrentUser();

      if (!roomId) {
        logger.error("Cannot send message: No active room ID");
        this.showConnectionError("Cannot send message: No active room", set);
        return false;
      }

      if (!user?.id) {
        logger.error("Cannot send message: No authenticated user or missing user ID");
        this.showConnectionError("Cannot send message: Authentication issue", set);
        return false;
      }

      const enhancedMessage = createEnhancedMessage(message, roomId, user);
      const success = await this.sendMessageWithFallback(enhancedMessage, roomId);
      
      this.updateConnectionStatus(success, set);
      return success;
    } catch (error) {
      logger.error("Error sending message:", error);
      this.showConnectionError("Error sending message. Please try again.", set);
      return false;
    }
  }

  private async sendMessageWithFallback(
    enhancedMessage: EnhancedMessage, 
    roomId: string
  ): Promise<boolean> {
    const requiresServerProcessing = this.requiresServerProcessing(enhancedMessage.type);

    if (requiresServerProcessing) {
      return await this.sendViaAPI(enhancedMessage);
    }

    // Try Supabase Realtime first
    try {
      const result = await withTimeout(
        this.sendViaSupabaseRealtime(enhancedMessage, roomId),
        5000,
        "Realtime send timeout"
      );
      if (result) return true;
    } catch (error) {
      logger.error("Error with Supabase Realtime:", error);
    }

    // Fallback to API
    return await this.sendViaAPI(enhancedMessage);
  }

  private requiresServerProcessing(messageType: string): boolean {
    return [
      "room:create",
      "game:end",
      "game:bid",
      "game:start"
    ].some(type => messageType.includes(type)) || messageType.includes("auth:");
  }

  private async sendViaAPI(message: EnhancedMessage): Promise<boolean> {
    try {
      const response = await withTimeout(
        fetch("/api/realtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        }),
        10000,
        "API request timeout"
      );

      if (response.ok) {
        logger.info("Message sent successfully via API");
        return true;
      } else {
        logger.error("API error:", await response.text());
        return false;
      }
    } catch (error) {
      logger.error("API request failed:", error);
      return false;
    }
  }

  private async sendViaSupabaseRealtime(
    message: EnhancedMessage, 
    roomId: string
  ): Promise<boolean> {
    const channelName = CHANNELS.ROOM(roomId);
    let channel = this.channels.get(channelName);

    if (!channel) {
      channel = this.supabase.channel(channelName);
      this.channels.set(channelName, channel);
    }

    const result = await channel.send({
      type: "broadcast",
      event: "message",
      payload: message,
    });

    if (result === "ok") {
      logger.info("Message sent successfully via Supabase Realtime");
      return true;
    }

    return false;
  }

  // Enhanced subscription with better error handling and reconnection
  async subscribeToRealtime(
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): Promise<void> {
    if (!roomId) {
      logger.error("Cannot subscribe: No active room ID");
      return;
    }

    try {
      await Promise.all([
        this.setupRealtimeSubscription(roomId, get, set),
        this.setupDatabaseSubscription(roomId, set),
        this.setupPresenceTracking(roomId, get, set)
      ]);
    } catch (error) {
      logger.error("Error subscribing to realtime:", error);
      set({ isConnected: false });
      this.scheduleReconnection(roomId, get, set);
    }
  }

  private async setupRealtimeSubscription(
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): Promise<void> {
    const channelName = CHANNELS.ROOM(roomId);
    const channel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: getCurrentUser()?.id || "anonymous" },
      } as ChannelConfig,
    });

    channel.on("broadcast", { event: "message" }, (payload: any) => {
      this.handleRealtimeMessage(payload, get, set);
    });

    this.setupPresenceHandlers(channel, get, set);

    channel.subscribe((status: string) => {
      logger.info("Channel subscription status:", status);
      this.handleSubscriptionStatus(status, roomId, get, set);
    });

    this.channels.set(channelName, channel);
  }

  private setupPresenceHandlers(channel: any, get: () => GameStoreState, set: SetStateFn): void {
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      logger.info("Presence state updated:", state);
      
      this.handleRealtimeMessage(
        { 
          payload: { 
            type: "presence:sync", 
            payload: state 
          } 
        }, 
        get, 
        set
      );
    });

    channel.on("presence", { event: "join" }, ({ key, newPresences }: { key: string, newPresences: any[] }) => {
      logger.info("User joined:", key, newPresences);
      
      newPresences.forEach((presence: any) => {
        this.handleRealtimeMessage(
          { 
            payload: { 
              type: "presence:join", 
              payload: { 
                userId: key, 
                username: presence.username || "Unknown" 
              } 
            } 
          }, 
          get, 
          set
        );
      });
    });

    channel.on("presence", { event: "leave" }, ({ key, leftPresences }: { key: string, leftPresences: any[] }) => {
      logger.info("User left:", key, leftPresences);
      
      leftPresences.forEach((presence: any) => {
        this.handleRealtimeMessage(
          { 
            payload: { 
              type: "presence:leave", 
              payload: { 
                userId: key, 
                username: presence.username || "Unknown" 
              } 
            } 
          }, 
          get, 
          set
        );
      });
    });
  }

  private async setupDatabaseSubscription(roomId: string, set: SetStateFn): Promise<void> {
    this.supabase
      .channel(CHANNELS.GAME_ROOM(roomId))
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload: any) => {
          logger.info("Received game room update:", payload);
          
          const newGameState = payload.new?.game_state;
          if (newGameState) {
            logger.info("Updating game state from database:", newGameState);
            
            set((state) => ({
              ...state,
              gameStatus: newGameState.gamePhase || state.gameStatus,
              trumpSuit: newGameState.trumpSuit || state.trumpSuit,
              currentTrick: newGameState.currentTrick || state.currentTrick,
              scores: newGameState.scores || state.scores,
              currentPlayer: newGameState.currentTurn || state.currentPlayer,
              players: newGameState.players || state.players,
              teamAssignments: newGameState.teamAssignments || state.teamAssignments,
            }));
          }
        }
      )
      .subscribe();
  }

  private async setupPresenceTracking(
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): Promise<void> {
    const user = getCurrentUser();
    if (!user) return;

    const channelName = CHANNELS.PRESENCE(roomId);
    const channel = this.supabase.channel(channelName, {
      config: {
        presence: { key: user.id },
      } as ChannelConfig,
    });

    // Track user presence
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      logger.info("Presence sync:", state);
      
      // Update player connection status
      set((gameState) => ({
        players: gameState.players.map(player => ({
          ...player,
          isConnected: state[player.id] ? true : false,
        })),
      }));
    });

    // Send presence data
    await channel.track({
      userId: user.id,
      username: user.username || "Unknown",
      connectionStatus: "connected",
      timestamp: Date.now(),
    });

    channel.subscribe();
    this.channels.set(channelName, channel);
  }

  private handleSubscriptionStatus(
    status: string,
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): void {
    const isConnected = status === "SUBSCRIBED";
    const isDisconnected = ["CHANNEL_ERROR", "CLOSED", "TIMED_OUT"].includes(status);
    
    if (isConnected) {
      set({ isConnected: true });
      this.connectionState.isConnected = true;
      this.connectionState.reconnectAttempts = 0;
    } else if (isDisconnected) {
      set({ isConnected: false });
      this.connectionState.isConnected = false;
      this.scheduleReconnection(roomId, get, set);
    }
  }

  private scheduleReconnection(
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): void {
    if (this.connectionState.reconnectAttempts >= CONNECTION.MAX_RECONNECT_ATTEMPTS) {
      logger.error("Max reconnection attempts reached");
      this.showConnectionError("Connection lost. Please refresh the page.", set);
      return;
    }

    const delay = Math.min(
      CONNECTION.RECONNECT_DELAY * Math.pow(CONNECTION.RETRY_BACKOFF_MULTIPLIER, this.connectionState.reconnectAttempts),
      CONNECTION.MAX_RETRY_DELAY
    );

    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.connectionState.reconnectAttempts + 1})`);

    setTimeout(() => {
      this.connectionState.reconnectAttempts++;
      this.connectionState.lastReconnectTime = Date.now();
      this.subscribeToRealtime(roomId, get, set);
    }, delay);
  }

  private handleRealtimeMessage(payload: any, get: () => GameStoreState, set: SetStateFn): void {
    try {
      if (!payload?.payload) {
        logger.warn("Received empty broadcast payload");
        return;
      }

      const message = payload.payload;
      logger.info("Received realtime message:", message);

      if (!this.validateMessagePayload(message)) {
        return;
      }

      set({ isConnected: true });

      const handler = messageHandlers[message.type];
      if (handler) {
        handler(message, get, set);
      } else {
        logger.info("Unhandled message type:", message.type);
      }
    } catch (error) {
      logger.error("Error processing realtime message:", error);
    }
  }

  private validateMessagePayload(message: any): boolean {
    if (!message || typeof message !== "object") {
      logger.warn("Received empty or invalid message payload:", message);
      return false;
    }

    if (!message.type || typeof message.type !== "string") {
      logger.warn("Message missing type property:", message);
      return false;
    }

    return true;
  }

  private updateConnectionStatus(success: boolean, set: SetStateFn): void {
    if (!success) {
      set({ isConnected: false });
      this.connectionState.isConnected = false;
    } else {
      set({ isConnected: true });
      this.connectionState.isConnected = true;
    }
  }

  private showConnectionError(message: string, set: SetStateFn): void {
    // Import here to avoid circular dependency
    import("./utils").then(({ showToast }) => {
      showToast(message, "error");
    });
  }

  // Cleanup method
  disconnect(): void {
    logger.info("Disconnecting from all channels");
    
    this.channels.forEach((channel, channelName) => {
      try {
        channel.unsubscribe();
        logger.info(`Unsubscribed from channel: ${channelName}`);
      } catch (error) {
        logger.error(`Error unsubscribing from channel ${channelName}:`, error);
      }
    });
    
    this.channels.clear();
    this.connectionState.isConnected = false;
  }

  // Get connection status
  getConnectionStatus(): ConnectionState {
    return { ...this.connectionState };
  }
}

// Database sync function with better error handling
export const createSyncGameStateToDatabase = (get: () => GameStoreState) => {
  return async (): Promise<boolean> => {
    const { 
      roomId, 
      gameStatus, 
      trumpSuit, 
      currentTrick, 
      scores, 
      currentPlayer, 
      players, 
      teamAssignments 
    } = get();

    if (!roomId) {
      logger.error("Cannot sync game state: No active room ID");
      return false;
    }

    try {
      const { SupabaseDatabase } = await import("@/lib/services/supabase-database");

      const gameState = {
        gamePhase: gameStatus,
        trumpSuit,
        currentTurn: currentPlayer,
        currentBid: 0,
        currentBidder: null,
        trickCards: {},
        roundNumber: 0,
        teams: { royals: [], rebels: [] },
        scores,
        consecutiveTricks: { royals: 0, rebels: 0 },
        lastTrickWinner: null,
        dealerIndex: 0,
        trumpCaller: null,
        remainingDeck: currentTrick,
        trumpVotes: teamAssignments as any,
        playersVoted: [],
      };

      logger.info("Syncing game state to database:", gameState);

      const success = await withRetry(
        () => SupabaseDatabase.updateGameState(roomId, gameState),
        3,
        1000,
        2
      );
      
      if (success) {
        logger.info("Game state synced to database successfully");
      } else {
        logger.error("Error syncing game state to database");
      }

      return success;
    } catch (error) {
      logger.error("Error syncing game state to database:", error);
      return false;
    }
  };
}; 