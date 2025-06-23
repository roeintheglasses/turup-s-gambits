// Game status priority for state management
export const GAME_STATUS_PRIORITY: Record<string, number> = {
  waiting: 0,
  initial_deal: 1,
  bidding: 2,
  final_deal: 3,
  playing: 4,
  finished: 5,
  ended: 6,
} as const;

// Timing constants
export const TIMING = {
  TRICK_RESOLUTION_DELAY: 1500,
  STATUS_MESSAGE_CLEAR_DELAY: 2000,
  FINAL_DEAL_TRANSITION_DELAY: 5000,
  BID_TIMEOUT_DELAY: 30000,
  EMOTE_DISPLAY_DURATION: 3000,
  RECONNECT_DELAY: 2000,
  DEBOUNCE_DELAY: 300,
} as const;

// Connection constants
export const CONNECTION = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RETRY_BACKOFF_MULTIPLIER: 2,
  MAX_RETRY_DELAY: 30000,
  RECONNECT_DELAY: 2000,
} as const;

// Message types
export const MESSAGE_TYPES = {
  // Player management
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  
  // Room management
  ROOM_JOINED: 'room:joined',
  ROOM_UPDATED: 'room:updated',
  ROOM_FULL_STATE: 'room:full-state',
  
  // Game flow
  GAME_START: 'game:start',
  GAME_STARTED: 'game:started',
  GAME_UPDATED: 'game:updated',
  GAME_OVER: 'game:over',
  
  // Bidding phase
  GAME_BID: 'game:bid',
  GAME_BID_PLACED: 'game:bid-placed',
  GAME_BIDDING_COMPLETE: 'game:bidding-complete',
  
  // Card play
  GAME_PLAY_CARD: 'game:play-card',
  GAME_CARD_PLAYED: 'game:card-played',
  
  // Trick management
  GAME_TRICK_COMPLETE: 'game:trick-complete',
  GAME_TRICK_WINNER: 'game:trick-winner',
  
  // Trump selection
  GAME_SELECT_TRUMP: 'game:select-trump',
  GAME_TRUMP_VOTE: 'game:trump-vote',
  GAME_TRUMP_SELECTED: 'game:trump-selected',
  GAME_FORCE_BOT_VOTES: 'game:force-bot-votes',
  
  // Game phases
  GAME_FINAL_DEAL: 'game:final-deal',
  GAME_PLAYING_STARTED: 'game:playing-started',
  
  // Game state updates
  GAME_UPDATE: 'game:update',
  GAME_STATE_UPDATED: 'game:state-updated',
  
  // Social features
  GAME_EMOTE: 'game:emote',
  
  // Frenzy mode powers
  GAME_FRENZY_POWER: 'game:frenzy-power',
  GAME_FRENZY_EFFECT: 'game:frenzy-effect',
  
  // Presence tracking
  PRESENCE_SYNC: 'presence:sync',
  PRESENCE_JOIN: 'presence:join',
  PRESENCE_LEAVE: 'presence:leave',
  
  // Replay system
  GAME_REPLAY_AVAILABLE: 'game:replay-available',
} as const;

// Channel names
export const CHANNELS = {
  ROOM: (roomId: string) => `room:${roomId}`,
  GAME_ROOM: (roomId: string) => `game_room:${roomId}`,
  PRESENCE: (roomId: string) => `presence:${roomId}`,
} as const; 