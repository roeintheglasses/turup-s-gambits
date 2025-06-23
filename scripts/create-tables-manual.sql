-- Enhanced Turup's Gambits Database Schema
-- This schema supports the complete game functionality including:
-- - Classic and Frenzy game modes
-- - Trump voting system with bot support
-- - Advanced replay system with detailed move tracking
-- - Frenzy powers and special effects
-- - Enhanced game state management

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (enhanced for authentication and stats)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Player statistics
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_tricks_won INTEGER DEFAULT 0,
  frenzy_powers_used INTEGER DEFAULT 0,
  preferred_game_mode TEXT CHECK (preferred_game_mode IN ('classic', 'frenzy')) DEFAULT 'classic'
);

-- Game rooms table (enhanced with mode support)
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id TEXT PRIMARY KEY,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  game_mode TEXT CHECK (game_mode IN ('classic', 'frenzy')) DEFAULT 'classic',
  status TEXT CHECK (status IN ('waiting', 'in_progress', 'finished')) DEFAULT 'waiting',
  max_players INTEGER DEFAULT 4,
  is_private BOOLEAN DEFAULT false,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Game settings
  turn_timer_seconds INTEGER DEFAULT 30,
  allow_bots BOOLEAN DEFAULT true,
  auto_fill_bots BOOLEAN DEFAULT false
);

-- Enhanced games table
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT REFERENCES game_rooms(id) ON DELETE CASCADE,
  game_mode TEXT CHECK (game_mode IN ('classic', 'frenzy')) NOT NULL,
  status TEXT CHECK (status IN ('waiting', 'initial_deal', 'bidding', 'final_deal', 'playing', 'finished', 'ended')) DEFAULT 'waiting',
  trump_suit TEXT CHECK (trump_suit IN ('hearts', 'spades', 'diamonds', 'clubs')),
  winner_team TEXT CHECK (winner_team IN ('royals', 'rebels')),
  total_tricks INTEGER DEFAULT 0,
  game_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Score tracking
  royals_score INTEGER DEFAULT 0,
  rebels_score INTEGER DEFAULT 0,
  
  -- Game metadata
  dealer_position INTEGER DEFAULT 0,
  current_round INTEGER DEFAULT 0,
  current_trick_leader UUID REFERENCES users(id),
  
  -- Frenzy mode specific
  frenzy_power_type TEXT,
  special_effects JSONB DEFAULT '{}',
  revealed_cards JSONB DEFAULT '{}'
);

-- Enhanced players table
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_id TEXT REFERENCES game_rooms(id) ON DELETE CASCADE,
  
  -- Player info
  player_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  is_bot BOOLEAN DEFAULT false,
  bot_difficulty TEXT CHECK (bot_difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  
  -- Game position
  seat_position INTEGER CHECK (seat_position BETWEEN 0 AND 3),
  team TEXT CHECK (team IN ('royals', 'rebels')),
  
  -- Game state
  current_hand JSONB DEFAULT '[]',
  cards_played JSONB DEFAULT '[]',
  is_ready BOOLEAN DEFAULT false,
  is_connected BOOLEAN DEFAULT true,
  
  -- Trump voting
  trump_vote TEXT CHECK (trump_vote IN ('hearts', 'spades', 'diamonds', 'clubs')),
  voted_at TIMESTAMPTZ,
  
  -- Bidding
  current_bid INTEGER CHECK (current_bid BETWEEN 0 AND 13),
  bid_at TIMESTAMPTZ,
  
  -- Stats for this game
  tricks_won INTEGER DEFAULT 0,
  cards_played_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(game_id, seat_position),
  UNIQUE(room_id, user_id)
);

-- Game cards table (track individual cards)
CREATE TABLE IF NOT EXISTS public.game_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  card_suit TEXT CHECK (card_suit IN ('hearts', 'spades', 'diamonds', 'clubs')) NOT NULL,
  card_rank TEXT CHECK (card_rank IN ('2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A')) NOT NULL,
  
  -- Card ownership and status
  owned_by UUID REFERENCES users(id),
  played_by UUID REFERENCES users(id),
  played_in_trick INTEGER,
  played_at TIMESTAMPTZ,
  
  -- Card position
  position_in_hand INTEGER,
  is_trump BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game tricks table
CREATE TABLE IF NOT EXISTS public.game_tricks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  trick_number INTEGER NOT NULL,
  
  -- Trick details
  lead_suit TEXT CHECK (lead_suit IN ('hearts', 'spades', 'diamonds', 'clubs')),
  trump_suit TEXT CHECK (trump_suit IN ('hearts', 'spades', 'diamonds', 'clubs')),
  winner_player UUID REFERENCES users(id),
  winner_team TEXT CHECK (winner_team IN ('royals', 'rebels')),
  
  -- Cards in trick
  cards_played JSONB NOT NULL DEFAULT '[]',
  trick_points INTEGER DEFAULT 1,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  UNIQUE(game_id, trick_number)
);

-- Enhanced game replays table
CREATE TABLE IF NOT EXISTS public.game_replays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  room_id TEXT REFERENCES game_rooms(id) ON DELETE CASCADE,
  
  -- Replay metadata
  replay_name TEXT,
  game_mode TEXT CHECK (game_mode IN ('classic', 'frenzy')) NOT NULL,
  total_moves INTEGER DEFAULT 0,
  game_duration_seconds INTEGER,
  
  -- Player info
  players JSONB NOT NULL DEFAULT '[]',
  winner_team TEXT CHECK (winner_team IN ('royals', 'rebels')),
  final_scores JSONB DEFAULT '{}',
  
  -- Detailed moves and metadata
  moves JSONB NOT NULL DEFAULT '[]',
  game_metadata JSONB DEFAULT '{}',
  
  -- Statistics
  total_tricks INTEGER DEFAULT 0,
  longest_streak JSONB DEFAULT '{}',
  cards_played INTEGER DEFAULT 0,
  frenzy_powers_used INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Frenzy powers table
CREATE TABLE IF NOT EXISTS public.frenzy_powers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Power details
  power_type TEXT CHECK (power_type IN ('extra_points', 'free_lead', 'peek_card', 'out_of_turn')) NOT NULL,
  power_suit TEXT CHECK (power_suit IN ('hearts', 'spades', 'diamonds', 'clubs')),
  
  -- Usage tracking
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Power effects
  target_player UUID REFERENCES users(id),
  effect_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot players table
CREATE TABLE IF NOT EXISTS public.bot_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT REFERENCES game_rooms(id) ON DELETE CASCADE,
  
  -- Bot configuration
  bot_name TEXT NOT NULL,
  bot_difficulty TEXT CHECK (bot_difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  bot_personality TEXT CHECK (bot_personality IN ('aggressive', 'conservative', 'balanced')) DEFAULT 'balanced',
  
  -- Bot state
  is_active BOOLEAN DEFAULT true,
  seat_position INTEGER CHECK (seat_position BETWEEN 0 AND 3),
  
  -- Bot AI settings
  decision_delay_ms INTEGER DEFAULT 2000,
  error_rate DECIMAL(3,2) DEFAULT 0.05,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
CREATE INDEX IF NOT EXISTS idx_game_rooms_created_at ON game_rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_game_id ON game_cards(game_id);
CREATE INDEX IF NOT EXISTS idx_game_cards_owned_by ON game_cards(owned_by);
CREATE INDEX IF NOT EXISTS idx_game_tricks_game_id ON game_tricks(game_id);
CREATE INDEX IF NOT EXISTS idx_game_tricks_trick_number ON game_tricks(trick_number);
CREATE INDEX IF NOT EXISTS idx_game_replays_game_id ON game_replays(game_id);
CREATE INDEX IF NOT EXISTS idx_game_replays_room_id ON game_replays(room_id);
CREATE INDEX IF NOT EXISTS idx_frenzy_powers_game_id ON frenzy_powers(game_id);
CREATE INDEX IF NOT EXISTS idx_frenzy_powers_player_id ON frenzy_powers(player_id);
CREATE INDEX IF NOT EXISTS idx_bot_players_room_id ON bot_players(room_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_tricks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frenzy_powers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_players ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Anyone can view public user info" ON users FOR SELECT USING (true);

-- Game rooms policies  
CREATE POLICY "Anyone can view game rooms" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON game_rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Room creator can update room" ON game_rooms FOR UPDATE USING (created_by = auth.uid());

-- Games policies
CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create games" ON games FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Players policies
CREATE POLICY "Anyone can view players" ON players FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join games" ON players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Players can update own player record" ON players FOR UPDATE USING (user_id = auth.uid());

-- Game cards policies
CREATE POLICY "Players can view cards in their games" ON game_cards FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM players p 
    WHERE p.game_id = game_cards.game_id 
    AND p.user_id = auth.uid()
  )
);

-- Game tricks policies
CREATE POLICY "Players can view tricks in their games" ON game_tricks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM players p 
    WHERE p.game_id = game_tricks.game_id 
    AND p.user_id = auth.uid()
  )
);

-- Game replays policies
CREATE POLICY "Anyone can view completed game replays" ON game_replays FOR SELECT USING (true);
CREATE POLICY "Players can create replays for their games" ON game_replays FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM players p 
    WHERE p.game_id = game_replays.game_id 
    AND p.user_id = auth.uid()
  )
);

-- Frenzy powers policies
CREATE POLICY "Players can view frenzy powers in their games" ON frenzy_powers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM players p 
    WHERE p.game_id = frenzy_powers.game_id 
    AND p.user_id = auth.uid()
  )
);
CREATE POLICY "Players can use their own frenzy powers" ON frenzy_powers FOR UPDATE USING (player_id = auth.uid());

-- Bot players policies
CREATE POLICY "Anyone can view bot players" ON bot_players FOR SELECT USING (true);
CREATE POLICY "Room members can manage bots" ON bot_players FOR ALL USING (
  EXISTS (
    SELECT 1 FROM players p 
    WHERE p.room_id = bot_players.room_id 
    AND p.user_id = auth.uid()
  )
);

-- Database functions and triggers

-- Function to update user stats after game completion
CREATE OR REPLACE FUNCTION update_user_stats_after_game()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    -- Update games played for all players
    UPDATE users 
    SET games_played = games_played + 1,
        updated_at = NOW()
    WHERE id IN (
      SELECT user_id FROM players WHERE game_id = NEW.id
    );
    
    -- Update games won for winning team
    IF NEW.winner_team IS NOT NULL THEN
      UPDATE users 
      SET games_won = games_won + 1,
          updated_at = NOW()
      WHERE id IN (
        SELECT user_id FROM players 
        WHERE game_id = NEW.id AND team = NEW.winner_team
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create replay data
CREATE OR REPLACE FUNCTION create_game_replay()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    INSERT INTO game_replays (
      game_id, 
      room_id, 
      game_mode, 
      total_moves,
      game_duration_seconds,
      players,
      winner_team,
      final_scores,
      total_tricks
    ) VALUES (
      NEW.id,
      NEW.room_id,
      NEW.game_mode,
      NEW.current_round,
      NEW.game_duration_seconds,
      (SELECT json_agg(json_build_object('id', user_id, 'name', player_name, 'team', team)) 
       FROM players WHERE game_id = NEW.id),
      NEW.winner_team,
      json_build_object('royals', NEW.royals_score, 'rebels', NEW.rebels_score),
      NEW.total_tricks
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle trump voting completion
CREATE OR REPLACE FUNCTION check_trump_voting_complete()
RETURNS TRIGGER AS $$
DECLARE
  total_players INTEGER;
  votes_cast INTEGER;
  winning_suit TEXT;
BEGIN
  -- Count total players and votes in the game
  SELECT COUNT(*) INTO total_players 
  FROM players 
  WHERE game_id = NEW.game_id AND is_bot = false;
  
  SELECT COUNT(*) INTO votes_cast 
  FROM players 
  WHERE game_id = NEW.game_id AND trump_vote IS NOT NULL;
  
  -- If all players have voted, determine winning suit
  IF votes_cast >= total_players THEN
    SELECT trump_vote INTO winning_suit
    FROM players 
    WHERE game_id = NEW.game_id AND trump_vote IS NOT NULL
    GROUP BY trump_vote 
    ORDER BY COUNT(*) DESC, random() 
    LIMIT 1;
    
    -- Update game with winning trump suit
    UPDATE games 
    SET trump_suit = winning_suit,
        status = 'bidding'
    WHERE id = NEW.game_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_user_stats_trigger ON games;
CREATE TRIGGER update_user_stats_trigger
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_after_game();

DROP TRIGGER IF EXISTS create_replay_trigger ON games;
CREATE TRIGGER create_replay_trigger
  AFTER UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION create_game_replay();

DROP TRIGGER IF EXISTS trump_voting_trigger ON players;
CREATE TRIGGER trump_voting_trigger
  AFTER UPDATE ON players
  FOR EACH ROW
  WHEN (NEW.trump_vote IS NOT NULL AND OLD.trump_vote IS NULL)
  EXECUTE FUNCTION check_trump_voting_complete();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_replays_updated_at BEFORE UPDATE ON game_replays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();