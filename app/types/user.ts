export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  isAnonymous: boolean;
  name?: string;
  image?: string;
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  
  // Enhanced user statistics
  games_played?: number;
  games_won?: number;
  total_tricks_won?: number;
  frenzy_powers_used?: number;
  preferred_game_mode?: 'classic' | 'frenzy';
  avatar_url?: string;
  
  // Computed fields
  win_rate?: number;
  avg_tricks_per_game?: number;
  recent_games_count?: number;
  favorite_team?: 'royals' | 'rebels';
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
}
