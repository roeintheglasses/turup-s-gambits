import { User } from "@/app/types/user";

// Type definitions for Supabase user data structures
interface SupabaseUserMetadata {
  username?: string;
  preferred_username?: string;
  name?: string;
  full_name?: string;
  avatar_url?: string;
  picture?: string;
  custom_claims?: {
    global_name?: string;
    username?: string;
    sub?: string;
    avatar?: string;
  };
}

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata: SupabaseUserMetadata;
  app_metadata?: {
    provider?: string;
  };
  provider_id?: string;
  sub?: string;
}

// Constants
const DEFAULT_USERNAME = "User";
const DEFAULT_GUEST_USERNAME = "Guest";
const DISCORD_CDN_BASE = "https://cdn.discordapp.com/avatars";
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=200&width=200&text=";

// Provider type detection
function getUserProvider(user: SupabaseUser) {
  const provider = user.app_metadata?.provider;
  return {
    isDiscord: provider === "discord",
    isAnonymous: !provider && !user.email,
    provider,
  };
}

// Discord-specific data extraction
function extractDiscordUserData(userData: SupabaseUserMetadata, userId: string) {
  const username = userData.custom_claims?.global_name ||
    userData.custom_claims?.username ||
    userData.full_name ||
    userData.name ||
    userData.username ||
    userData.preferred_username ||
    DEFAULT_USERNAME;

  const name = userData.custom_claims?.global_name ||
    userData.full_name ||
    userData.name ||
    username;

  let avatar = "";
  if (userData.custom_claims?.avatar) {
    const discordId = userData.custom_claims?.sub || userId;
    avatar = `${DISCORD_CDN_BASE}/${discordId}/${userData.custom_claims.avatar}.png`;
  } else {
    avatar = userData.avatar_url || userData.picture || "";
  }

  return {
    username,
    name,
    avatar,
    discordId: userData.custom_claims?.sub || userId,
    discordUsername: userData.custom_claims?.username || userData.custom_claims?.global_name,
  };
}

// Anonymous user data extraction
function extractAnonymousUserData(userData: SupabaseUserMetadata) {
  const username = userData.username || DEFAULT_GUEST_USERNAME;
  const name = userData.name || username;
  const avatar = userData.avatar_url || userData.picture || "";

  return { username, name, avatar };
}

// Default user data extraction
function extractDefaultUserData(userData: SupabaseUserMetadata, email?: string) {
  const username = userData.username ||
    userData.preferred_username ||
    userData.name ||
    userData.full_name ||
    (email ? email.split("@")[0] : DEFAULT_USERNAME);

  const name = userData.full_name || userData.name || username;
  const avatar = userData.avatar_url || userData.picture || "";

  return { username, name, avatar };
}

// Generate placeholder avatar
function generatePlaceholderAvatar(username: string): string {
  const initial = (username.charAt(0) || "U").toUpperCase();
  return `${AVATAR_PLACEHOLDER}${initial}`;
}

// Main conversion function
export function convertSupabaseUserToUser(supabaseUser: SupabaseUser): User {
  const userData = supabaseUser.user_metadata || {};
  const { isDiscord, isAnonymous, provider } = getUserProvider(supabaseUser);

  let username: string;
  let name: string;
  let avatar: string;
  let discordData: { discordId?: string; discordUsername?: string; discordAvatar?: string } = {};

  if (isDiscord) {
    const discordUserData = extractDiscordUserData(userData, supabaseUser.id);
    username = discordUserData.username;
    name = discordUserData.name;
    avatar = discordUserData.avatar;
    discordData = {
      discordId: discordUserData.discordId,
      discordUsername: discordUserData.discordUsername,
      discordAvatar: avatar,
    };
  } else if (isAnonymous) {
    const anonymousUserData = extractAnonymousUserData(userData);
    username = anonymousUserData.username;
    name = anonymousUserData.name;
    avatar = anonymousUserData.avatar;
  } else {
    const defaultUserData = extractDefaultUserData(userData, supabaseUser.email);
    username = defaultUserData.username;
    name = defaultUserData.name;
    avatar = defaultUserData.avatar;
  }

  // Generate placeholder avatar if none exists
  if (!avatar) {
    avatar = generatePlaceholderAvatar(username);
  }

  // Create the base user object
  const user: User = {
    id: supabaseUser.id,
    username,
    email: supabaseUser.email,
    avatar,
    isAnonymous,
    name,
    image: avatar,
    ...discordData,
  };

  return user;
} 