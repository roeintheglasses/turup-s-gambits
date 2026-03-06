import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/game-history?userId=<userId>&limit=<limit>
 *
 * Returns aggregated stats and recent game history for the given user.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // Get player stats
    const playerRows = await sql`
      SELECT
        games_played,
        games_won,
        games_lost,
        win_rate,
        total_tricks_won,
        total_kots
      FROM players
      WHERE id = ${userId}
    `;

    const player = playerRows[0];

    const stats = player
      ? {
          gamesPlayed: player.games_played ?? 0,
          wins: player.games_won ?? 0,
          losses: player.games_lost ?? 0,
          winRate: player.win_rate ?? 0,
          tricksWon: player.total_tricks_won ?? 0,
          kotsAchieved: player.total_kots ?? 0,
        }
      : {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          tricksWon: 0,
          kotsAchieved: 0,
        };

    // Get recent games with participant info
    const recentGames = await sql`
      SELECT
        g.id,
        g.colyseus_room_id,
        g.game_mode,
        g.winning_team,
        g.royals_tricks,
        g.rebels_tricks,
        g.is_kot,
        g.trump_suit,
        g.duration_seconds,
        g.completed_at,
        g.status,
        gp.team,
        gp.won,
        gp.position
      FROM games g
      JOIN game_participants gp ON gp.game_id = g.id
      WHERE gp.player_id = ${userId}
        AND g.status IN ('completed', 'abandoned')
      ORDER BY g.completed_at DESC
      LIMIT ${limit}
    `;

    const history = recentGames.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      date: row.completed_at
        ? new Date(row.completed_at as string).toISOString().split('T')[0]
        : null,
      result: row.won ? 'win' : 'loss',
      team: row.team as string,
      mode: row.game_mode as string,
      royalsTricks: row.royals_tricks as number,
      rebelsTricks: row.rebels_tricks as number,
      tricks: row.team === 'royals'
        ? (row.royals_tricks as number)
        : (row.rebels_tricks as number),
      isKot: row.is_kot as boolean,
      trumpSuit: row.trump_suit as string,
      durationSeconds: row.duration_seconds as number,
      status: row.status as string,
    }));

    return NextResponse.json({ stats, history });
  } catch (error) {
    console.error('Failed to fetch game history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game history' },
      { status: 500 }
    );
  }
}
