-- Turup's Gambit Database Schema
-- PostgreSQL (Neon)
-- Uses Clerk for authentication

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE game_mode AS ENUM ('classic', 'frenzy');
CREATE TYPE game_status AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE team_type AS ENUM ('royals', 'rebels');
CREATE TYPE player_position AS ENUM ('north', 'south', 'east', 'west');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Players table (synced with Clerk)
-- This stores game-specific data; Clerk handles auth
CREATE TABLE players (
  id TEXT PRIMARY KEY, -- Clerk user ID
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,

  -- Stats
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN games_played > 0 THEN (games_won::DECIMAL / games_played * 100)
      ELSE 0
    END
  ) STORED,

  -- ELO Rating (for matchmaking)
  elo_rating INTEGER DEFAULT 1200,

  -- Achievements
  total_tricks_won INTEGER DEFAULT 0,
  total_kots INTEGER DEFAULT 0, -- 13-0 wins
  total_baazis INTEGER DEFAULT 0, -- 7-6 wins

  -- Preferences
  preferred_team team_type DEFAULT 'royals',
  sound_enabled BOOLEAN DEFAULT true,
  music_enabled BOOLEAN DEFAULT true,

  -- Metadata
  is_guest BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Games table (completed and active games)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  colyseus_room_id TEXT UNIQUE, -- Link to Colyseus room

  -- Game info
  game_mode game_mode DEFAULT 'classic',
  status game_status DEFAULT 'active',

  -- Players (4 players required)
  player_north_id TEXT REFERENCES players(id),
  player_south_id TEXT REFERENCES players(id),
  player_east_id TEXT REFERENCES players(id),
  player_west_id TEXT REFERENCES players(id),

  -- Game outcome
  winning_team team_type,
  royals_tricks INTEGER DEFAULT 0,
  rebels_tricks INTEGER DEFAULT 0,
  is_kot BOOLEAN DEFAULT false, -- 13-0 victory

  -- Game details
  trump_suit TEXT, -- hearts, diamonds, clubs, spades
  highest_bid INTEGER,
  bidding_team team_type,

  -- Metadata
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_seconds INTEGER,

  -- Full game state for replays (JSONB)
  replay_data JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Game participants (for easy querying)
-- Denormalized for performance
CREATE TABLE game_participants (
  id SERIAL PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES players(id),

  team team_type NOT NULL,
  position player_position NOT NULL,

  -- Player stats for this game
  tricks_won INTEGER DEFAULT 0,
  cards_played INTEGER DEFAULT 0,

  -- Did they win?
  won BOOLEAN,
  elo_change INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(game_id, player_id)
);

-- ============================================================================
-- LEADERBOARDS
-- ============================================================================

-- Global leaderboard (materialized view for performance)
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.games_played,
  p.games_won,
  p.games_lost,
  p.win_rate,
  p.elo_rating,
  p.total_kots,
  RANK() OVER (ORDER BY p.elo_rating DESC) as rank,
  ROW_NUMBER() OVER (ORDER BY p.elo_rating DESC) as position
FROM players p
WHERE p.games_played >= 5 -- Minimum games for leaderboard
  AND p.is_guest = false
ORDER BY p.elo_rating DESC;

-- Refresh function
CREATE INDEX idx_leaderboard_refresh ON players(elo_rating DESC, games_played);

-- Weekly leaderboard
CREATE MATERIALIZED VIEW weekly_leaderboard AS
SELECT
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  COUNT(gp.game_id) as games_this_week,
  SUM(CASE WHEN gp.won THEN 1 ELSE 0 END) as wins_this_week,
  ROUND(AVG(CASE WHEN gp.won THEN 100.0 ELSE 0.0 END), 2) as win_rate_this_week,
  RANK() OVER (ORDER BY SUM(CASE WHEN gp.won THEN 1 ELSE 0 END) DESC) as rank
FROM players p
JOIN game_participants gp ON gp.player_id = p.id
JOIN games g ON g.id = gp.game_id
WHERE g.completed_at >= NOW() - INTERVAL '7 days'
  AND p.is_guest = false
GROUP BY p.id, p.username, p.display_name, p.avatar_url
HAVING COUNT(gp.game_id) >= 3
ORDER BY wins_this_week DESC;

-- ============================================================================
-- ACHIEVEMENTS
-- ============================================================================

CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT, -- URL or emoji
  rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
  points INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE player_achievements (
  id SERIAL PRIMARY KEY,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id),

  unlocked_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(player_id, achievement_id)
);

-- ============================================================================
-- GAME REPLAYS
-- ============================================================================

-- Separate table for replays to keep games table lean
CREATE TABLE replays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,

  -- Full replay data
  moves JSONB NOT NULL, -- Array of all moves with timestamps
  initial_state JSONB NOT NULL,

  -- Metadata
  total_moves INTEGER,
  duration_seconds INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- FRIENDS & SOCIAL (Future)
-- ============================================================================

CREATE TABLE friendships (
  id SERIAL PRIMARY KEY,
  player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
  friend_id TEXT REFERENCES players(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pending', -- pending, accepted, blocked

  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,

  UNIQUE(player_id, friend_id),
  CHECK (player_id != friend_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Players
CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_players_elo ON players(elo_rating DESC);
CREATE INDEX idx_players_games_played ON players(games_played DESC);
CREATE INDEX idx_players_last_seen ON players(last_seen_at DESC);

-- Games
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_mode ON games(game_mode);
CREATE INDEX idx_games_completed ON games(completed_at DESC);
CREATE INDEX idx_games_colyseus_room ON games(colyseus_room_id);
CREATE INDEX idx_games_players ON games(player_north_id, player_south_id, player_east_id, player_west_id);

-- Game participants
CREATE INDEX idx_participants_player ON game_participants(player_id);
CREATE INDEX idx_participants_game ON game_participants(game_id);
CREATE INDEX idx_participants_won ON game_participants(won);

-- Achievements
CREATE INDEX idx_player_achievements_player ON player_achievements(player_id);
CREATE INDEX idx_player_achievements_unlocked ON player_achievements(unlocked_at DESC);

-- Friendships
CREATE INDEX idx_friendships_player ON friendships(player_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update player stats when game completes
CREATE OR REPLACE FUNCTION update_player_stats_on_game_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when game status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN

    -- Update all participants
    UPDATE players p
    SET
      games_played = games_played + 1,
      games_won = games_won + CASE WHEN gp.won THEN 1 ELSE 0 END,
      games_lost = games_lost + CASE WHEN gp.won THEN 0 ELSE 1 END,
      total_tricks_won = total_tricks_won + gp.tricks_won,
      total_kots = total_kots + CASE WHEN NEW.is_kot AND gp.won THEN 1 ELSE 0 END,
      elo_rating = elo_rating + gp.elo_change,
      last_seen_at = NOW()
    FROM game_participants gp
    WHERE gp.game_id = NEW.id AND gp.player_id = p.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stats_on_game_complete
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_on_game_complete();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Recent games for a player
CREATE VIEW player_recent_games AS
SELECT
  g.id,
  g.game_mode,
  g.status,
  g.completed_at,
  g.winning_team,
  g.royals_tricks,
  g.rebels_tricks,
  g.is_kot,
  gp.player_id,
  gp.team,
  gp.position,
  gp.won,
  gp.tricks_won,
  gp.elo_change
FROM games g
JOIN game_participants gp ON gp.game_id = g.id
WHERE g.status = 'completed'
ORDER BY g.completed_at DESC;

-- Head-to-head stats
CREATE VIEW head_to_head_stats AS
SELECT
  gp1.player_id as player1_id,
  gp2.player_id as player2_id,
  COUNT(*) as total_games,
  SUM(CASE WHEN gp1.won THEN 1 ELSE 0 END) as player1_wins,
  SUM(CASE WHEN gp2.won THEN 1 ELSE 0 END) as player2_wins
FROM game_participants gp1
JOIN game_participants gp2 ON gp1.game_id = gp2.game_id
WHERE gp1.player_id < gp2.player_id -- Avoid duplicates
GROUP BY gp1.player_id, gp2.player_id;

-- ============================================================================
-- SEED DATA - ACHIEVEMENTS
-- ============================================================================

INSERT INTO achievements (code, name, description, icon, rarity, points) VALUES
('first_win', 'First Victory', 'Win your first game', '🏆', 'common', 10),
('win_10', 'Veteran', 'Win 10 games', '⭐', 'common', 20),
('win_50', 'Master', 'Win 50 games', '💎', 'rare', 50),
('win_100', 'Legend', 'Win 100 games', '👑', 'epic', 100),
('first_kot', 'Perfect Game', 'Win 13-0 (Kot)', '💯', 'rare', 50),
('kot_5', 'Dominator', 'Win 5 Kot games', '🔥', 'epic', 100),
('win_streak_5', 'Hot Streak', 'Win 5 games in a row', '🌟', 'rare', 50),
('win_streak_10', 'Unstoppable', 'Win 10 games in a row', '⚡', 'legendary', 200),
('play_100', 'Dedicated', 'Play 100 games', '🎮', 'common', 30),
('play_500', 'Obsessed', 'Play 500 games', '🎯', 'epic', 100),
('trump_master', 'Trump Master', 'Win trump voting 50 times', '♠️', 'rare', 40);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate ELO change
CREATE OR REPLACE FUNCTION calculate_elo_change(
  player_elo INTEGER,
  opponent_avg_elo INTEGER,
  won BOOLEAN,
  k_factor INTEGER DEFAULT 32
)
RETURNS INTEGER AS $$
DECLARE
  expected_score DECIMAL;
  actual_score INTEGER;
  elo_change INTEGER;
BEGIN
  expected_score := 1.0 / (1.0 + POWER(10, (opponent_avg_elo - player_elo) / 400.0));
  actual_score := CASE WHEN won THEN 1 ELSE 0 END;
  elo_change := ROUND(k_factor * (actual_score - expected_score));

  RETURN elo_change;
END;
$$ LANGUAGE plpgsql;

-- Get player rank
CREATE OR REPLACE FUNCTION get_player_rank(player_id_input TEXT)
RETURNS INTEGER AS $$
DECLARE
  player_rank INTEGER;
BEGIN
  SELECT position INTO player_rank
  FROM leaderboard
  WHERE id = player_id_input;

  RETURN COALESCE(player_rank, -1);
END;
$$ LANGUAGE plpgsql;

-- Refresh materialized views
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW leaderboard;
  REFRESH MATERIALIZED VIEW weekly_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE players IS 'Game-specific player data; auth handled by Clerk';
COMMENT ON TABLE games IS 'All games (active and completed) with outcome data';
COMMENT ON TABLE game_participants IS 'Denormalized participants for fast queries';
COMMENT ON TABLE replays IS 'Full replay data separated for performance';
COMMENT ON COLUMN games.replay_data IS 'Lightweight summary; full replay in replays table';
COMMENT ON MATERIALIZED VIEW leaderboard IS 'Global rankings; refresh after batch of games complete';
COMMENT ON MATERIALIZED VIEW weekly_leaderboard IS 'Weekly rankings; refresh daily';
