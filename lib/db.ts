// Database client and utilities for Neon PostgreSQL
import { neon, neonConfig } from '@neondatabase/serverless';

// Enable connection pooling for better performance
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// Create SQL client
export const sql = neon(process.env.DATABASE_URL);

// ============================================================================
// TYPES
// ============================================================================

export type GameMode = 'classic' | 'frenzy';
export type GameStatus = 'active' | 'completed' | 'abandoned';
export type TeamType = 'royals' | 'rebels';
export type PlayerPosition = 'north' | 'south' | 'east' | 'west';

export interface Player {
  id: string; // Clerk user ID
  username: string;
  display_name?: string;
  avatar_url?: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
  elo_rating: number;
  total_tricks_won: number;
  total_kots: number;
  total_baazis: number;
  is_guest: boolean;
  last_seen_at: Date;
  created_at: Date;
}

export interface Game {
  id: string;
  colyseus_room_id?: string;
  game_mode: GameMode;
  status: GameStatus;
  player_north_id?: string;
  player_south_id?: string;
  player_east_id?: string;
  player_west_id?: string;
  winning_team?: TeamType;
  royals_tricks: number;
  rebels_tricks: number;
  is_kot: boolean;
  trump_suit?: string;
  highest_bid?: number;
  bidding_team?: TeamType;
  started_at: Date;
  completed_at?: Date;
  duration_seconds?: number;
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
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
  elo_rating: number;
  total_kots: number;
  rank: number;
  position: number;
}

// ============================================================================
// PLAYER OPERATIONS
// ============================================================================

/**
 * Create or update player from Clerk user data
 */
export async function upsertPlayer(data: {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isGuest?: boolean;
}) {
  const result = await sql`
    INSERT INTO players (
      id,
      username,
      display_name,
      avatar_url,
      is_guest
    ) VALUES (
      ${data.id},
      ${data.username},
      ${data.displayName || data.username},
      ${data.avatarUrl || null},
      ${data.isGuest || false}
    )
    ON CONFLICT (id)
    DO UPDATE SET
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      last_seen_at = NOW()
    RETURNING *
  `;

  return result[0] as Player;
}

/**
 * Get player by ID
 */
export async function getPlayer(playerId: string) {
  const result = await sql`
    SELECT * FROM players WHERE id = ${playerId}
  `;

  return result[0] as Player | undefined;
}

/**
 * Get player stats
 */
export async function getPlayerStats(playerId: string) {
  const result = await sql`
    SELECT
      p.*,
      (SELECT COUNT(*) FROM game_participants gp WHERE gp.player_id = p.id AND gp.won = true) as wins,
      (SELECT COUNT(*) FROM game_participants gp WHERE gp.player_id = p.id AND gp.won = false) as losses,
      COALESCE(lr.rank, -1) as global_rank
    FROM players p
    LEFT JOIN leaderboard lr ON lr.id = p.id
    WHERE p.id = ${playerId}
  `;

  return result[0];
}

/**
 * Update player last seen
 */
export async function updatePlayerLastSeen(playerId: string) {
  await sql`
    UPDATE players
    SET last_seen_at = NOW()
    WHERE id = ${playerId}
  `;
}

// ============================================================================
// GAME OPERATIONS
// ============================================================================

/**
 * Create a new game record when Colyseus room is created
 */
export async function createGame(data: {
  colyseusRoomId: string;
  gameMode?: GameMode;
  playerNorthId: string;
  playerSouthId: string;
  playerEastId: string;
  playerWestId: string;
}) {
  const result = await sql`
    INSERT INTO games (
      colyseus_room_id,
      game_mode,
      player_north_id,
      player_south_id,
      player_east_id,
      player_west_id,
      status
    ) VALUES (
      ${data.colyseusRoomId},
      ${data.gameMode || 'classic'},
      ${data.playerNorthId},
      ${data.playerSouthId},
      ${data.playerEastId},
      ${data.playerWestId},
      'active'
    )
    RETURNING *
  `;

  // Create participants
  const gameId = result[0].id;
  const participants = [
    { playerId: data.playerNorthId, team: 'royals', position: 'north' },
    { playerId: data.playerSouthId, team: 'royals', position: 'south' },
    { playerId: data.playerEastId, team: 'rebels', position: 'east' },
    { playerId: data.playerWestId, team: 'rebels', position: 'west' },
  ];

  for (const p of participants) {
    await sql`
      INSERT INTO game_participants (game_id, player_id, team, position)
      VALUES (${gameId}, ${p.playerId}, ${p.team}, ${p.position})
    `;
  }

  return result[0] as Game;
}

/**
 * Complete a game and update stats
 */
export async function completeGame(data: {
  colyseusRoomId: string;
  winningTeam: TeamType;
  royalsTricks: number;
  rebelsTricks: number;
  trumpSuit: string;
  highestBid?: number;
  biddingTeam?: TeamType;
  durationSeconds: number;
  replayData?: any;
}) {
  const isKot = data.royalsTricks === 13 || data.rebelsTricks === 13;

  // Update game
  const gameResult = await sql`
    UPDATE games
    SET
      status = 'completed',
      winning_team = ${data.winningTeam},
      royals_tricks = ${data.royalsTricks},
      rebels_tricks = ${data.rebelsTricks},
      is_kot = ${isKot},
      trump_suit = ${data.trumpSuit},
      highest_bid = ${data.highestBid || null},
      bidding_team = ${data.biddingTeam || null},
      completed_at = NOW(),
      duration_seconds = ${data.durationSeconds},
      replay_data = ${data.replayData ? JSON.stringify(data.replayData) : null}
    WHERE colyseus_room_id = ${data.colyseusRoomId}
    RETURNING *
  `;

  const game = gameResult[0];

  // Calculate ELO changes for each player
  const participants = await sql`
    SELECT * FROM game_participants WHERE game_id = ${game.id}
  `;

  const royalsPlayers = participants.filter((p: any) => p.team === 'royals');
  const rebelsPlayers = participants.filter((p: any) => p.team === 'rebels');

  const royalsAvgElo = await getTeamAvgElo(royalsPlayers.map((p: any) => p.player_id));
  const rebelsAvgElo = await getTeamAvgElo(rebelsPlayers.map((p: any) => p.player_id));

  // Update participants with win/loss and ELO
  for (const participant of participants as any[]) {
    const won = participant.team === data.winningTeam;
    const playerElo = await getPlayerElo(participant.player_id);
    const opponentAvgElo = participant.team === 'royals' ? rebelsAvgElo : royalsAvgElo;

    const eloChange = calculateEloChange(playerElo, opponentAvgElo, won);

    await sql`
      UPDATE game_participants
      SET
        won = ${won},
        elo_change = ${eloChange},
        tricks_won = ${participant.team === 'royals' ? data.royalsTricks : data.rebelsTricks}
      WHERE id = ${participant.id}
    `;
  }

  // Trigger will auto-update player stats

  return game;
}

/**
 * Get game by Colyseus room ID
 */
export async function getGameByRoomId(roomId: string) {
  const result = await sql`
    SELECT * FROM games WHERE colyseus_room_id = ${roomId}
  `;

  return result[0] as Game | undefined;
}

/**
 * Get recent games for a player
 */
export async function getPlayerRecentGames(playerId: string, limit = 10) {
  const result = await sql`
    SELECT * FROM player_recent_games
    WHERE player_id = ${playerId}
    ORDER BY completed_at DESC
    LIMIT ${limit}
  `;

  return result;
}

// ============================================================================
// LEADERBOARD OPERATIONS
// ============================================================================

/**
 * Get global leaderboard
 */
export async function getLeaderboard(limit = 100, offset = 0) {
  const result = await sql`
    SELECT * FROM leaderboard
    ORDER BY position ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result as LeaderboardEntry[];
}

/**
 * Get weekly leaderboard
 */
export async function getWeeklyLeaderboard(limit = 50) {
  const result = await sql`
    SELECT * FROM weekly_leaderboard
    ORDER BY rank ASC
    LIMIT ${limit}
  `;

  return result;
}

/**
 * Refresh leaderboards (call after batch of games complete)
 */
export async function refreshLeaderboards() {
  await sql`SELECT refresh_leaderboards()`;
}

/**
 * Get player's rank
 */
export async function getPlayerRank(playerId: string) {
  const result = await sql`
    SELECT get_player_rank(${playerId}) as rank
  `;

  return result[0].rank;
}

// ============================================================================
// ACHIEVEMENT OPERATIONS
// ============================================================================

/**
 * Get all achievements
 */
export async function getAchievements() {
  const result = await sql`
    SELECT * FROM achievements ORDER BY points ASC
  `;

  return result;
}

/**
 * Get player achievements
 */
export async function getPlayerAchievements(playerId: string) {
  const result = await sql`
    SELECT
      a.*,
      pa.unlocked_at
    FROM player_achievements pa
    JOIN achievements a ON a.id = pa.achievement_id
    WHERE pa.player_id = ${playerId}
    ORDER BY pa.unlocked_at DESC
  `;

  return result;
}

/**
 * Unlock achievement for player
 */
export async function unlockAchievement(playerId: string, achievementCode: string) {
  try {
    const result = await sql`
      INSERT INTO player_achievements (player_id, achievement_id)
      SELECT ${playerId}, id FROM achievements WHERE code = ${achievementCode}
      ON CONFLICT (player_id, achievement_id) DO NOTHING
      RETURNING *
    `;

    return result[0];
  } catch (error) {
    console.error('Failed to unlock achievement:', error);
    return null;
  }
}

/**
 * Check and award achievements after game
 */
export async function checkAchievements(playerId: string) {
  const player = await getPlayer(playerId);
  if (!player) return;

  // First win
  if (player.games_won === 1) {
    await unlockAchievement(playerId, 'first_win');
  }

  // Win milestones
  if (player.games_won === 10) await unlockAchievement(playerId, 'win_10');
  if (player.games_won === 50) await unlockAchievement(playerId, 'win_50');
  if (player.games_won === 100) await unlockAchievement(playerId, 'win_100');

  // Kot milestones
  if (player.total_kots === 1) await unlockAchievement(playerId, 'first_kot');
  if (player.total_kots === 5) await unlockAchievement(playerId, 'kot_5');

  // Games played milestones
  if (player.games_played === 100) await unlockAchievement(playerId, 'play_100');
  if (player.games_played === 500) await unlockAchievement(playerId, 'play_500');
}

// ============================================================================
// REPLAY OPERATIONS
// ============================================================================

/**
 * Save full replay data
 */
export async function saveReplay(gameId: string, replayData: {
  moves: any[];
  initialState: any;
}) {
  const result = await sql`
    INSERT INTO replays (game_id, moves, initial_state, total_moves, duration_seconds)
    VALUES (
      ${gameId},
      ${JSON.stringify(replayData.moves)},
      ${JSON.stringify(replayData.initialState)},
      ${replayData.moves.length},
      ${replayData.moves.length > 0 ? replayData.moves[replayData.moves.length - 1].timestamp : 0}
    )
    RETURNING *
  `;

  return result[0];
}

/**
 * Get replay data
 */
export async function getReplay(gameId: string) {
  const result = await sql`
    SELECT * FROM replays WHERE game_id = ${gameId}
  `;

  return result[0];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getPlayerElo(playerId: string): Promise<number> {
  const result = await sql`
    SELECT elo_rating FROM players WHERE id = ${playerId}
  `;
  return result[0]?.elo_rating || 1200;
}

async function getTeamAvgElo(playerIds: string[]): Promise<number> {
  const result = await sql`
    SELECT AVG(elo_rating) as avg_elo
    FROM players
    WHERE id = ANY(${playerIds})
  `;
  return Math.round(result[0]?.avg_elo || 1200);
}

function calculateEloChange(playerElo: number, opponentAvgElo: number, won: boolean): number {
  const K = 32; // K-factor
  const expectedScore = 1 / (1 + Math.pow(10, (opponentAvgElo - playerElo) / 400));
  const actualScore = won ? 1 : 0;
  return Math.round(K * (actualScore - expectedScore));
}

// ============================================================================
// GUEST PLAYER UTILITIES
// ============================================================================

/**
 * Create a guest player (no Clerk account)
 */
export async function createGuestPlayer(username: string) {
  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return await upsertPlayer({
    id: guestId,
    username,
    isGuest: true,
  });
}

/**
 * Clean up old guest players (older than 30 days, no games)
 */
export async function cleanupGuestPlayers() {
  await sql`
    DELETE FROM players
    WHERE is_guest = true
      AND games_played = 0
      AND created_at < NOW() - INTERVAL '30 days'
  `;
}
