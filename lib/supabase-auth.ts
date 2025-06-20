import { type Provider } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Use the same Supabase instance for authentication
export const supabaseAuth = supabase;

export type OAuthProvider = "discord";

export const signInWithOAuth = async (provider: OAuthProvider) => {
  console.log(`[Auth] Starting OAuth sign in with ${provider}`);

  try {
    const { data, error } = await supabaseAuth.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(`[Auth] OAuth sign in error with ${provider}:`, error);
      throw error;
    }

    console.log(`[Auth] OAuth sign in initiated with ${provider}`);
    return data;
  } catch (err) {
    console.error(`[Auth] Unexpected error during ${provider} sign in:`, err);
    throw err;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Email sign in error:", error);
    throw error;
  }

  return data;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  username: string
) => {
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("Email sign up error:", error);
    throw error;
  }

  return data;
};

export const signInAnonymously = async (username: string) => {
  console.log("[Auth] Starting anonymous sign in");

  try {
    // First check if the username already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("username")
      .eq("username", username)
      .single();

    if (existingUser) {
      console.error("[Auth] Username already exists:", username);
      throw new Error("Username already exists. Please choose another one.");
    }

    // Username is available, proceed with anonymous sign up
    const { data, error } = await supabaseAuth.auth.signInAnonymously();

    if (error) {
      console.error("[Auth] Anonymous sign in error:", error);
      throw error;
    }

    // Update the user's metadata to include the provided username
    if (data.user) {
      await supabaseAuth.auth.updateUser({
        data: {
          username,
          name: username,
        },
      });

      // Add the username directly to the returned user object so it's immediately available
      // This ensures the UI has the username from the beginning
      if (data.user.user_metadata) {
        data.user.user_metadata.username = username;
        data.user.user_metadata.name = username;
      } else {
        data.user.user_metadata = { username, name: username };
      }
    }

    console.log("[Auth] Anonymous sign in successful");
    return data;
  } catch (err) {
    console.error("[Auth] Unexpected error during anonymous sign in:", err);
    throw err;
  }
};

export const signOut = async () => {
  const { error } = await supabaseAuth.auth.signOut();

  if (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  const { data, error } = await supabaseAuth.auth.getUser();

  if (error || !data.user) {
    console.log("[Auth] No authenticated user found");
    return null;
  }

  return data.user;
};

export const resetPassword = async (email: string) => {
  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    console.error("Reset password error:", error);
    throw error;
  }
};

export const updatePassword = async (newPassword: string) => {
  const { error } = await supabaseAuth.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error("Update password error:", error);
    throw error;
  }
};

export const updateUserProfile = async (userData: {
  username?: string;
  avatar?: string;
}) => {
  const { error } = await supabaseAuth.auth.updateUser({
    data: userData,
  });

  if (error) {
    console.error("Update user profile error:", error);
    throw error;
  }
};
