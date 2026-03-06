/**
 * Game Results Store
 * Persists game results to Neon PostgreSQL after game ends.
 * Falls back gracefully if DATABASE_URL is not configured.
 */
import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

let sqlClient: ReturnType<typeof neon> | null = null;

function getSql() {
  if (sqlClient) return sqlClient;
  if (!process.env.DATABASE_URL) {
    return null;
  }
  sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

export interface GameResultPlayer {
  userId: string;
  name: string;
  team: "royals" | "rebels";
  position: number;
  isBot: boolean;
}

export interface GameResult {
  roomId: string;
  gameMode: string;
  winner: "royals" | "rebels" | "";
  royalsTricks: number;
  rebelsTricks: number;
  isKot: boolean;
  trumpSuit: string;
  players: GameResultPlayer[];
  durationSeconds: number;
  endedAt: number;
  endReason: "completed" | "disconnection";
}

/**
 * Save a completed game result to the database.
 * Aligns with the schema in lib/db.ts (games + game_participants + players tables).
 */
export async function saveGameResult(result: GameResult): Promise<void> {
  const sql = getSql();
  if (!sql) {
    console.warn("DATABASE_URL not configured, skipping game result persistence");
    console.log("Game result (not saved):", JSON.stringify({
      roomId: result.roomId,
      winner: result.winner,
      royalsTricks: result.royalsTricks,
      rebelsTricks: result.rebelsTricks,
      isKot: result.isKot,
      endReason: result.endReason,
    }));
    return;
  }

  try {
    const status = result.endReason === "completed" ? "completed" : "abandoned";
    const startedAt = new Date(result.endedAt - result.durationSeconds * 1000).toISOString();
    const completedAt = new Date(result.endedAt).toISOString();

    // Map players by position
    const sortedPlayers = [...result.players].sort((a, b) => a.position - b.position);
    const playerNorthId = sortedPlayers[0]?.userId || null;
    const playerEastId = sortedPlayers[1]?.userId || null;
    const playerSouthId = sortedPlayers[2]?.userId || null;
    const playerWestId = sortedPlayers[3]?.userId || null;

    // Insert the game record (matches lib/db.ts schema)
    const gameRows = await sql`
      INSERT INTO games (
        colyseus_room_id,
        game_mode,
        status,
        player_north_id,
        player_south_id,
        player_east_id,
        player_west_id,
        winning_team,
        royals_tricks,
        rebels_tricks,
        is_kot,
        trump_suit,
        started_at,
        completed_at,
        duration_seconds
      ) VALUES (
        ${result.roomId},
        ${result.gameMode},
        ${status},
        ${playerNorthId},
        ${playerSouthId},
        ${playerEastId},
        ${playerWestId},
        ${result.winner || null},
        ${result.royalsTricks},
        ${result.rebelsTricks},
        ${result.isKot},
        ${result.trumpSuit || null},
        ${startedAt},
        ${completedAt},
        ${result.durationSeconds}
      )
      RETURNING id
    `;

    const gameId = (gameRows as Record<string, unknown>[])[0]?.id;
    if (!gameId) {
      console.error("Failed to insert game record - no ID returned");
      return;
    }

    // Insert game participants (matches lib/db.ts schema)
    for (const player of result.players) {
      const won = result.winner === player.team;
      const tricksWon = player.team === "royals" ? result.royalsTricks : result.rebelsTricks;

      await sql`
        INSERT INTO game_participants (
          game_id,
          player_id,
          team,
          position,
          tricks_won,
          won
        ) VALUES (
          ${gameId},
          ${player.userId},
          ${player.team},
          ${positionName(player.position)},
          ${tricksWon},
          ${won}
        )
      `;
    }

    // Update player stats for human players (matches lib/db.ts players table schema)
    for (const player of result.players) {
      if (player.isBot) continue;

      const won = result.winner === player.team;
      const tricksWon = player.team === "royals" ? result.royalsTricks : result.rebelsTricks;
      const isKotForPlayer = result.isKot && won;

      await sql`
        UPDATE players SET
          games_played = games_played + 1,
          games_won = games_won + ${won ? 1 : 0},
          games_lost = games_lost + ${won ? 0 : 1},
          win_rate = CASE
            WHEN games_played + 1 > 0
            THEN ROUND((games_won + ${won ? 1 : 0})::numeric / (games_played + 1) * 100, 1)
            ELSE 0
          END,
          total_tricks_won = total_tricks_won + ${tricksWon},
          total_kots = total_kots + ${isKotForPlayer ? 1 : 0},
          last_seen_at = NOW()
        WHERE id = ${player.userId}
      `;
    }

    console.log(`Game result saved: room=${result.roomId}, winner=${result.winner}, kot=${result.isKot}`);
  } catch (error) {
    console.error("Failed to save game result:", error);
  }
}

function positionName(pos: number): string {
  switch (pos) {
    case 0: return "north";
    case 1: return "east";
    case 2: return "south";
    case 3: return "west";
    default: return "north";
  }
}
