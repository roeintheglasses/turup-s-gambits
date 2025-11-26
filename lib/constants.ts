/**
 * Game Constants and Enums
 * Centralized configuration for the game
 */

// ==================== ENUMS ====================

export enum Suit {
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs',
  SPADES = 'spades',
}

export enum Team {
  ROYALS = 0,
  REBELS = 1,
}

export enum Position {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
}

export enum GamePhase {
  WAITING = 'waiting',
  INITIAL_DEAL = 'initial_deal',
  TRUMP_SELECTION = 'trump_selection',
  FINAL_DEAL = 'final_deal',
  PLAYING = 'playing',
  ENDED = 'ended',
}

export enum GameMode {
  CLASSIC = 'classic',
  FRENZY = 'frenzy',
}

// ==================== GAME CONFIGURATION ====================

export const GAME_CONFIG = {
  /** Maximum players per room */
  MAX_PLAYERS: 4,

  /** Cards dealt in initial deal */
  INITIAL_DEAL_CARDS: 5,

  /** Cards dealt in final deal */
  FINAL_DEAL_CARDS: 8,

  /** Total cards per player */
  TOTAL_CARDS_PER_PLAYER: 13,

  /** Tricks needed to win */
  TRICKS_TO_WIN: 7,

  /** Total tricks in a game */
  TOTAL_TRICKS: 13,

  /** Turn timeout in milliseconds */
  TURN_TIMEOUT_MS: 30000,

  /** Turn timer check interval in milliseconds */
  TURN_CHECK_INTERVAL_MS: 5000,

  /** Delay after trick completion in milliseconds */
  TRICK_COMPLETE_DELAY_MS: 3000,

  /** Delay between phase transitions in milliseconds */
  PHASE_TRANSITION_DELAY_MS: 2000,

  /** Room disposal delay after game end in milliseconds */
  ROOM_DISPOSAL_DELAY_MS: 30000,

  /** Bot action delay range in milliseconds [min, max] */
  BOT_ACTION_DELAY_MS: [1000, 2500] as const,

  /** Bot vote delay range in milliseconds [min, max] */
  BOT_VOTE_DELAY_MS: [100, 500] as const,
} as const;

// ==================== CARD CONFIGURATION ====================

export const CARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export const CARD_SUITS = [Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.SPADES] as const;

export const VALUE_RANKINGS: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

// ==================== UI CONFIGURATION ====================

export const SUIT_CONFIG = {
  [Suit.HEARTS]: { name: 'Hearts', symbol: '♥', color: 'text-red-500' },
  [Suit.DIAMONDS]: { name: 'Diamonds', symbol: '♦', color: 'text-red-500' },
  [Suit.CLUBS]: { name: 'Clubs', symbol: '♣', color: 'text-slate-900 dark:text-slate-100' },
  [Suit.SPADES]: { name: 'Spades', symbol: '♠', color: 'text-slate-900 dark:text-slate-100' },
} as const;

export const TEAM_CONFIG = {
  [Team.ROYALS]: { name: 'Royals', color: 'text-amber-500' },
  [Team.REBELS]: { name: 'Rebels', color: 'text-purple-500' },
} as const;

// ==================== BOT NAMES ====================

export const MEDIEVAL_BOT_NAMES = [
  'Sir Aldric', 'Lady Isolde', 'Lord Cedric', 'Dame Guinevere',
  'Sir Percival', 'Lady Rosalind', 'Lord Tristan', 'Dame Eleanor',
  'Sir Gawain', 'Lady Beatrice', 'Lord Roland', 'Dame Morgana',
  'Sir Lancelot', 'Lady Evangeline', 'Lord Arthur', 'Dame Vivienne',
  'Sir Galahad', 'Lady Rowena', 'Lord Edmund', 'Dame Cordelia',
] as const;

// ==================== FRENZY MODE POWERS ====================

export const FRENZY_POWERS = {
  [Suit.HEARTS]: {
    name: 'Extra Points',
    description: 'Gain bonus points for winning tricks with heart cards',
    type: 'Passive',
    icon: '💝',
  },
  [Suit.SPADES]: {
    name: 'Free Lead',
    description: 'Lead with any card after winning a trick',
    type: 'Passive',
    icon: '🗡️',
  },
  [Suit.DIAMONDS]: {
    name: 'Peek Card',
    description: "See one opponent's card (2 uses per game)",
    type: 'Active',
    icon: '👁️',
  },
  [Suit.CLUBS]: {
    name: 'Out of Turn',
    description: 'Play one card out of turn (1 use per game)',
    type: 'Active',
    icon: '⚡',
  },
} as const;

// ==================== HELPER FUNCTIONS ====================

export function getSuitSymbol(suit: string): string {
  return SUIT_CONFIG[suit as Suit]?.symbol ?? suit;
}

export function getSuitColor(suit: string): string {
  return SUIT_CONFIG[suit as Suit]?.color ?? '';
}

export function getTeamName(team: number): string {
  return TEAM_CONFIG[team as Team]?.name ?? 'Unknown';
}

export function getTeamFromPosition(position: number): Team {
  return position % 2 === 0 ? Team.ROYALS : Team.REBELS;
}
