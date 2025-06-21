import { User } from "@/app/types/user";
import {
  supabaseAuth,
  signOut as supabaseSignOut,
  signInAnonymously,
} from "@/lib/services/supabase-auth";
import { convertSupabaseUserToUser } from "@/lib/utils/user-converter";
import { LOG_PREFIX, ERROR_MESSAGES } from "./constants";

// Anonymous login handler
export async function handleAnonymousLogin(
  username: string,
  currentUser: User | null
): Promise<User> {
  if (currentUser && !currentUser.isAnonymous) {
    console.warn(LOG_PREFIX, ERROR_MESSAGES.ALREADY_AUTHENTICATED);
    throw new Error(ERROR_MESSAGES.ALREADY_AUTHENTICATED);
  }

  const { user: supabaseUser } = await signInAnonymously(username);
  if (!supabaseUser) {
    throw new Error(ERROR_MESSAGES.ANONYMOUS_USER_CREATION_FAILED);
  }

  console.log(LOG_PREFIX, "Anonymous user created:", supabaseUser);

  const authUser = convertSupabaseUserToUser(supabaseUser);
  // Force anonymous flag to be true even if detection fails
  authUser.isAnonymous = true;

  console.log(LOG_PREFIX, "Converted anonymous user:", authUser);

  return authUser;
}

// Logout handler
export async function handleLogout(currentUser: User | null): Promise<void> {
  // If it's an anonymous user, no need to sign out from Supabase
  if (currentUser?.isAnonymous) {
    return;
  }

  // Otherwise, sign out from auth providers
  await supabaseSignOut();
}

// User refresh handler
export async function handleUserRefresh(): Promise<User | null> {
  const { data, error } = await supabaseAuth.auth.getUser();

  if (error) {
    console.log(LOG_PREFIX, ERROR_MESSAGES.NO_USER_FOUND, error.message);
    return null;
  }

  if (!data.user) {
    return null;
  }

  return convertSupabaseUserToUser(data.user);
} 