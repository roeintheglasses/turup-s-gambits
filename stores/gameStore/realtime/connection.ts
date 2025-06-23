import { 
  GameStoreState, 
  SetStateFn, 
  EnhancedMessage, 
  ConnectionState, 
  ChannelConfig,
  SendMessageOptions,
  PresenceState,
  RealtimeError,
  SubscriptionStatus,
  RetryStrategy
} from "./types";
import { getCurrentUser, createEnhancedMessage, withRetry, withTimeout, logger } from "./utils";
import { CHANNELS, CONNECTION, TIMING, MESSAGE_TYPES } from "./constants";
import { messageHandlers } from "./handlers";

// Retry strategy configuration
const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxAttempts: CONNECTION.MAX_RECONNECT_ATTEMPTS,
  baseDelay: CONNECTION.RECONNECT_DELAY,
  maxDelay: CONNECTION.MAX_RETRY_DELAY,
  backoffMultiplier: CONNECTION.RETRY_BACKOFF_MULTIPLIER,
};

// Messages that require server processing
const SERVER_PROCESSING_TYPES = new Set([
  MESSAGE_TYPES.ROOM_JOINED,
  MESSAGE_TYPES.GAME_OVER,
  MESSAGE_TYPES.GAME_BID,
  MESSAGE_TYPES.GAME_START,
]);

// Channel manager for handling multiple channels
class ChannelManager {
  private channels = new Map<string, any>();
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  getOrCreateChannel(name: string, config?: ChannelConfig): any {
    if (this.channels.has(name)) {
      return this.channels.get(name);
    }

    const channel = this.supabase.channel(name, { config });
    this.channels.set(name, channel);
    return channel;
  }

  removeChannel(name: string): void {
    const channel = this.channels.get(name);
    if (channel) {
      try {
        channel.unsubscribe();
      } catch (error) {
        logger.error(`Error unsubscribing from channel ${name}:`, error);
      }
      this.channels.delete(name);
    }
  }

  cleanup(): void {
    this.channels.forEach((channel, name) => {
      this.removeChannel(name);
    });
  }

  getChannel(name: string): any {
    return this.channels.get(name);
  }
}

// Message sender with fallback strategies
class MessageSender {
  private supabase: any;
  private channelManager: ChannelManager;

  constructor(supabase: any, channelManager: ChannelManager) {
    this.supabase = supabase;
    this.channelManager = channelManager;
  }

  async sendMessage(
    message: any,
    roomId: string,
    options: SendMessageOptions = {}
  ): Promise<boolean> {
    const enhancedMessage = createEnhancedMessage(message, roomId, getCurrentUser());
    
    if (this.requiresServerProcessing(enhancedMessage.type) || options.requiresServerProcessing) {
      return this.sendViaAPI(enhancedMessage, options);
    }

    // Try Supabase Realtime first, fallback to API
    try {
      const success = await this.sendViaRealtime(enhancedMessage, roomId, options);
      if (success) return true;
    } catch (error) {
      logger.error("Realtime send failed:", error);
    }

    return this.sendViaAPI(enhancedMessage, options);
  }

  private requiresServerProcessing(messageType: string): boolean {
    return SERVER_PROCESSING_TYPES.has(messageType as any) || messageType.includes("auth:");
  }

  private async sendViaRealtime(
    message: EnhancedMessage,
    roomId: string,
    options: SendMessageOptions
  ): Promise<boolean> {
    const channelName = CHANNELS.ROOM(roomId);
    const channel = this.channelManager.getOrCreateChannel(channelName);

    const result = await withTimeout(
      channel.send({
        type: "broadcast",
        event: "message",
        payload: message,
      }),
      options.timeout || 5000,
      "Realtime send timeout"
    );

    return result === "ok";
  }

  private async sendViaAPI(
    message: EnhancedMessage,
    options: SendMessageOptions
  ): Promise<boolean> {
    try {
      const response = await withTimeout(
        fetch("/api/realtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        }),
        options.timeout || 10000,
        "API request timeout"
      );

      if (response.ok) {
        logger.info("Message sent successfully via API");
        return true;
      }

      logger.error("API error:", await response.text());
      return false;
    } catch (error) {
      logger.error("API request failed:", error);
      return false;
    }
  }
}

// Presence tracker for user status
class PresenceTracker {
  private supabase: any;
  private channelManager: ChannelManager;
  private presenceStates = new Map<string, PresenceState>();

  constructor(supabase: any, channelManager: ChannelManager) {
    this.supabase = supabase;
    this.channelManager = channelManager;
  }

  async setupPresenceTracking(
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): Promise<void> {
    const user = getCurrentUser();
    if (!user) return;

    const channelName = CHANNELS.PRESENCE(roomId);
    const channel = this.channelManager.getOrCreateChannel(channelName, {
      presence: { key: user.id },
    });

    this.setupPresenceHandlers(channel, get, set);
    await this.trackUserPresence(channel, user);
    
    channel.subscribe();
  }

  private setupPresenceHandlers(
    channel: any,
    get: () => GameStoreState,
    set: SetStateFn
  ): void {
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      this.updatePresenceStates(state);
      this.updatePlayerConnectionStatus(get, set);
    });

    channel.on("presence", { event: "join" }, ({ key, newPresences }: any) => {
      newPresences.forEach((presence: any) => {
        this.handlePresenceJoin(key, presence, get, set);
      });
    });

    channel.on("presence", { event: "leave" }, ({ key, leftPresences }: any) => {
      leftPresences.forEach((presence: any) => {
        this.handlePresenceLeave(key, presence, get, set);
      });
    });
  }

  private async trackUserPresence(channel: any, user: any): Promise<void> {
    await channel.track({
      userId: user.id,
      username: user.username || "Unknown",
      connectionStatus: "connected",
      timestamp: Date.now(),
    });
  }

  private updatePresenceStates(state: any): void {
    this.presenceStates.clear();
    Object.entries(state).forEach(([userId, presences]: [string, any]) => {
      if (Array.isArray(presences) && presences.length > 0) {
        const presence = presences[0];
        this.presenceStates.set(userId, {
          userId,
          username: presence.username || "Unknown",
          connectionStatus: presence.connectionStatus || "connected",
          lastSeen: presence.timestamp || Date.now(),
        });
      }
    });
  }

  private updatePlayerConnectionStatus(get: () => GameStoreState, set: SetStateFn): void {
    set((gameState) => ({
      players: gameState.players.map(player => ({
        ...player,
        isConnected: this.presenceStates.has(player.id),
      })),
    }));
  }

  private handlePresenceJoin(
    key: string,
    presence: any,
    get: () => GameStoreState,
    set: SetStateFn
  ): void {
    const handler = messageHandlers[MESSAGE_TYPES.PRESENCE_JOIN];
    if (handler) {
      handler(
        {
          type: MESSAGE_TYPES.PRESENCE_JOIN,
          payload: { userId: key, username: presence.username || "Unknown" },
        },
        get,
        set
      );
    }
  }

  private handlePresenceLeave(
    key: string,
    presence: any,
    get: () => GameStoreState,
    set: SetStateFn
  ): void {
    const handler = messageHandlers[MESSAGE_TYPES.PRESENCE_LEAVE];
    if (handler) {
      handler(
        {
          type: MESSAGE_TYPES.PRESENCE_LEAVE,
          payload: { userId: key, username: presence.username || "Unknown" },
        },
        get,
        set
      );
    }
  }
}

// Subscription manager for database and realtime subscriptions
class SubscriptionManager {
  private supabase: any;
  private channelManager: ChannelManager;
  private presenceTracker: PresenceTracker;

  constructor(
    supabase: any,
    channelManager: ChannelManager,
    presenceTracker: PresenceTracker
  ) {
    this.supabase = supabase;
    this.channelManager = channelManager;
    this.presenceTracker = presenceTracker;
  }

  async setupSubscriptions(
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): Promise<void> {
    await Promise.allSettled([
      this.setupRealtimeSubscription(roomId, get, set),
      this.setupDatabaseSubscription(roomId, set),
      this.presenceTracker.setupPresenceTracking(roomId, get, set),
    ]);
  }

  private async setupRealtimeSubscription(
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): Promise<void> {
    const channelName = CHANNELS.ROOM(roomId);
    const channel = this.channelManager.getOrCreateChannel(channelName, {
      broadcast: { self: false },
      presence: { key: getCurrentUser()?.id || "anonymous" },
    });

    channel.on("broadcast", { event: "message" }, (payload: any) => {
      this.handleRealtimeMessage(payload, get, set);
    });

    channel.subscribe((status: string) => {
      logger.info("Channel subscription status:", status);
      this.handleSubscriptionStatus(status as SubscriptionStatus, roomId, get, set);
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
        (payload: any) => this.handleDatabaseUpdate(payload, set)
      )
      .subscribe();
  }

  private handleRealtimeMessage(
    payload: any,
    get: () => GameStoreState,
    set: SetStateFn
  ): void {
    try {
      if (!this.validateMessagePayload(payload?.payload)) return;

      const message = payload.payload;
      logger.info("Received realtime message:", message);

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

  private handleDatabaseUpdate(payload: any, set: SetStateFn): void {
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

  private handleSubscriptionStatus(
    status: SubscriptionStatus,
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): void {
    const isConnected = status === "SUBSCRIBED";
    const isDisconnected = ["CHANNEL_ERROR", "CLOSED", "TIMED_OUT"].includes(status);

    if (isConnected) {
      set({ isConnected: true });
    } else if (isDisconnected) {
      set({ isConnected: false });
      // Trigger reconnection logic if needed
    }
  }
}

// Main connection manager with cleaner architecture
export class ConnectionManager {
  private connectionState: ConnectionState = {
    isConnected: false,
    reconnectAttempts: 0,
    lastReconnectTime: 0,
  };

  private channelManager: ChannelManager;
  private messageSender: MessageSender;
  private presenceTracker: PresenceTracker;
  private subscriptionManager: SubscriptionManager;
  private retryStrategy: RetryStrategy;

  constructor(supabase: any, retryStrategy: RetryStrategy = DEFAULT_RETRY_STRATEGY) {
    this.channelManager = new ChannelManager(supabase);
    this.messageSender = new MessageSender(supabase, this.channelManager);
    this.presenceTracker = new PresenceTracker(supabase, this.channelManager);
    this.subscriptionManager = new SubscriptionManager(
      supabase,
      this.channelManager,
      this.presenceTracker
    );
    this.retryStrategy = retryStrategy;
  }

  async sendMessage(
    message: any,
    get: () => GameStoreState,
    set: SetStateFn,
    options: SendMessageOptions = {}
  ): Promise<boolean> {
    try {
      logger.info("Sending message:", message);

      const { roomId } = get();
      const user = getCurrentUser();

      if (!this.validateSendConditions(roomId, user, set)) {
        return false;
      }

      const success = await this.messageSender.sendMessage(message, roomId!, options);
      this.updateConnectionStatus(success, set);
      
      return success;
    } catch (error) {
      logger.error("Error sending message:", error);
      this.showConnectionError("Error sending message. Please try again.", set);
      return false;
    }
  }

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
      await this.subscriptionManager.setupSubscriptions(roomId, get, set);
      set({ isConnected: true });
      this.connectionState.isConnected = true;
      this.connectionState.reconnectAttempts = 0;
    } catch (error) {
      logger.error("Error subscribing to realtime:", error);
      set({ isConnected: false });
      this.connectionState.isConnected = false;
      this.scheduleReconnection(roomId, get, set);
    }
  }

  disconnect(): void {
    logger.info("Disconnecting from all channels");
    this.channelManager.cleanup();
    this.connectionState.isConnected = false;
  }

  getConnectionStatus(): ConnectionState {
    return { ...this.connectionState };
  }

  // Private helper methods
  private validateSendConditions(roomId: string | null, user: any, set: SetStateFn): boolean {
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

    return true;
  }

  private scheduleReconnection(
    roomId: string,
    get: () => GameStoreState,
    set: SetStateFn
  ): void {
    if (this.connectionState.reconnectAttempts >= this.retryStrategy.maxAttempts) {
      logger.error("Max reconnection attempts reached");
      this.showConnectionError("Connection lost. Please refresh the page.", set);
      return;
    }

    const delay = Math.min(
      this.retryStrategy.baseDelay * 
      Math.pow(this.retryStrategy.backoffMultiplier, this.connectionState.reconnectAttempts),
      this.retryStrategy.maxDelay
    );

    logger.info(`Reconnecting in ${delay}ms (attempt ${this.connectionState.reconnectAttempts + 1})`);

    setTimeout(() => {
      this.connectionState.reconnectAttempts++;
      this.connectionState.lastReconnectTime = Date.now();
      this.subscribeToRealtime(roomId, get, set);
    }, delay);
  }

  private updateConnectionStatus(success: boolean, set: SetStateFn): void {
    const isConnected = success;
    set({ isConnected });
    this.connectionState.isConnected = isConnected;
  }

  private showConnectionError(message: string, set: SetStateFn): void {
    import("./utils").then(({ showToast }) => {
      showToast(message, "error");
    });
  }
}

// Database sync function with improved error handling
export const createSyncGameStateToDatabase = (get: () => GameStoreState) => {
  return async (): Promise<boolean> => {
    const state = get();
    
    if (!state.roomId) {
      logger.error("Cannot sync game state: No active room ID");
      return false;
    }

    try {
      const { SupabaseDatabase } = await import("@/lib/services/supabase-database");

      const gameState = {
        gamePhase: state.gameStatus,
        trumpSuit: state.trumpSuit,
        currentTurn: state.currentPlayer,
        currentBid: 0,
        currentBidder: null,
        trickCards: {},
        roundNumber: 0,
        teams: { royals: [], rebels: [] },
        scores: state.scores,
        consecutiveTricks: { royals: 0, rebels: 0 },
        lastTrickWinner: null,
        dealerIndex: 0,
        trumpCaller: null,
        remainingDeck: state.currentTrick,
        trumpVotes: state.teamAssignments as any,
        playersVoted: [],
      };

      logger.info("Syncing game state to database:", gameState);

      const success = await withRetry(
        () => SupabaseDatabase.updateGameState(state.roomId!, gameState),
        DEFAULT_RETRY_STRATEGY.maxAttempts,
        DEFAULT_RETRY_STRATEGY.baseDelay,
        DEFAULT_RETRY_STRATEGY.backoffMultiplier
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