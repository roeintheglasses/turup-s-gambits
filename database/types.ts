/**
 * Database Type Definitions
 * Auto-generated types that match the PostgreSQL schema
 */

// ============================================================================
// ENUMS
// ============================================================================

export type GameMode = 'classic' | 'frenzy';
export type GameStatus = 'active' | 'completed' | 'abandoned';
export type TeamType = 'royals' | 'rebels';
export type PlayerPosition = 'north' | 'south' | 'east' | 'west';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

// ============================================================================
// TABLE TYPES
// ============================================================================

export interface Player {
  id: string; // Clerk user ID
  username: string;
  display_name: string | null;
  avatar_url: string | null;

  // Stats
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number; // Computed
  elo_rating: number;

  // Achievements
  total_tricks_won: number;
  total_kots: number;
  total_baazis: number;

  // Preferences
  preferred_team: TeamType;
  sound_enabled: boolean;
  music_enabled: boolean;

  // Metadata
  is_guest: boolean;
  last_seen_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Game {
  id: string; // UUID
  colyseus_room_id: string | null;

  game_mode: GameMode;
  status: GameStatus;

  // Players
  player_north_id: string | null;
  player_south_id: string | null;
  player_east_id: string | null;
  player_west_id: string | null;

  // Outcome
  winning_team: TeamType | null;
  royals_tricks: number;
  rebels_tricks: number;
  is_kot: boolean;

  // Details
  trump_suit: string | null;
  highest_bid: number | null;
  bidding_team: TeamType | null;

  // Timestamps
  started_at: Date;
  completed_at: Date | null;
  duration_seconds: number | null;

  // Replay
  replay_data: any | null;

  created_at: Date;
  updated_at: Date;
}

export interface GameParticipant {
  id: number;
  game_id: string;
  player_id: string;

  team: TeamType;
  position: PlayerPosition;

  tricks_won: number;
  cards_played: number;

  won: boolean;
  elo_change: number;

  created_at: Date;
}

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: string;
  points: number;
  created_at: Date;
}

export interface PlayerAchievement {
  id: number;
  player_id: string;
  achievement_id: number;
  unlocked_at: Date;
}

export interface Replay {
  id: string;
  game_id: string;
  moves: any; // JSONB
  initial_state: any; // JSONB
  total_moves: number;
  duration_seconds: number;
  created_at: Date;
}

export interface Friendship {
  id: number;
  player_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: Date;
  accepted_at: Date | null;
}

// ============================================================================
// VIEW TYPES
// ============================================================================

export interface LeaderboardEntry {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
  elo_rating: number;
  total_kots: number;
  rank: number;
  position: number;
}

export interface WeeklyLeaderboardEntry {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  games_this_week: number;
  wins_this_week: number;
  win_rate_this_week: number;
  rank: number;
}

export interface PlayerRecentGame {
  id: string;
  game_mode: GameMode;
  status: GameStatus;
  completed_at: Date;
  winning_team: TeamType | null;
  royals_tricks: number;
  rebels_tricks: number;
  is_kot: boolean;
  player_id: string;
  team: TeamType;
  position: PlayerPosition;
  won: boolean;
  tricks_won: number;
  elo_change: number;
}

export interface HeadToHeadStats {
  player1_id: string;
  player2_id: string;
  total_games: number;
  player1_wins: number;
  player2_wins: number;
}

// ============================================================================
// API TYPES (for requests/responses)
// ============================================================================

export interface CreateGameRequest {
  colyseusRoomId: string;
  gameMode?: GameMode;
  playerNorthId: string;
  playerSouthId: string;
  playerEastId: string;
  playerWestId: string;
}

export interface CompleteGameRequest {
  colyseusRoomId: string;
  winningTeam: TeamType;
  royalsTricks: number;
  rebelsTricks: number;
  trumpSuit: string;
  highestBid?: number;
  biddingTeam?: TeamType;
  durationSeconds: number;
  replayData?: any;
}

export interface PlayerStatsResponse extends Player {
  global_rank: number;
  recent_games: PlayerRecentGame[];
  achievements: (PlayerAchievement & { achievement: Achievement })[];
}

// ============================================================================
// CARD GAME TYPES (for replay data)
// ============================================================================

export interface Card {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
}

export interface GameMove {
  type: 'deal' | 'vote_trump' | 'bid' | 'play_card';
  playerId: string;
  timestamp: number;
  data: any;
}

export interface ReplayData {
  moves: GameMove[];
  initialState: {
    players: Array<{
      id: string;
      name: string;
      position: PlayerPosition;
      team: TeamType;
    }>;
    dealer: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type PlayerWithStats = Player & {
  rank: number;
  recentGames: PlayerRecentGame[];
};

export type GameWithParticipants = Game & {
  participants: (GameParticipant & {
    player: Pick<Player, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  })[];
};

export type AchievementWithProgress = Achievement & {
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number; // 0-100
  progressText?: string;
};
