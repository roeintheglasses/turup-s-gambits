import { supabase } from "./supabase";

class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async createUser({
    username,
    email,
    password,
    avatar,
    isAnonymous = false,
    discordId,
    discordUsername,
    discordAvatar,
  }: {
    username: string;
    email?: string;
    password?: string;
    avatar: string;
    isAnonymous?: boolean;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
  }) {
    // For anonymous users, we don't need to check for existing users
    if (!isAnonymous) {
      // Check if user with email already exists
      if (email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        if (existingUser) {
          return existingUser; // Return existing user instead of throwing error
        }
      }

      // Check if user with Discord ID already exists
      if (discordId) {
        const { data: existingDiscordUser } = await supabase
          .from('users')
          .select('*')
          .eq('discord_id', discordId)
          .single();
        if (existingDiscordUser) {
          return existingDiscordUser; // Return existing user instead of throwing error
        }
      }
    }

    // Ensure username is unique by adding a random suffix if needed
    let finalUsername = username;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        // Try to create the user with the current username
        const { data: user, error } = await supabase
          .from('users')
          .insert({
            username: finalUsername,
            email,
            password,
            avatar,
            is_anonymous: isAnonymous,
            discord_id: discordId,
            discord_username: discordUsername,
            discord_avatar: discordAvatar,
          })
          .select()
          .single();

        if (error) throw error;
        return user;
      } catch (error: any) {
        // If the error is about duplicate username, try again with a modified username
        if (
          error.message &&
          error.message.includes(
            "Unique constraint failed on the fields: (`username`)"
          )
        ) {
          finalUsername = `${username}_${Math.floor(Math.random() * 10000)}`;
          attempts++;
        } else {
          // For other errors, rethrow
          throw error;
        }
      }
    }

    // If we've exhausted our attempts, throw an error
    throw new Error(
      `Failed to create user with unique username after ${maxAttempts} attempts`
    );
  }

  async getUserById(id: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !user) throw new Error("User not found");
    return user;
  }

  async getUserByEmail(email: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error || !user) throw new Error("User not found");
    return user;
  }

  async getUserByDiscordId(discordId: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', discordId)
      .single();
    if (error || !user) throw new Error("User not found");
    return user;
  }

  async getUserGames(userId: string) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*, games_created:games(*)')
      .eq('id', userId)
      .single();
    if (error || !user) throw new Error("User not found");
    return user.games_created;
  }

  async createAnonymousUser(username: string) {
    // Ensure we have a valid username
    const sanitizedUsername =
      username?.trim() || `Guest_${Math.floor(Math.random() * 10000)}`;

    // Generate a placeholder avatar if needed
    const firstLetter = sanitizedUsername.charAt(0).toUpperCase();
    const avatar = `/placeholder.svg?height=200&width=200&text=${firstLetter}`;

    return this.createUser({
      username: sanitizedUsername,
      avatar: avatar,
      isAnonymous: true,
    });
  }
}

export const userService = UserService.getInstance();
