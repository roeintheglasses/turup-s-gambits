// Authentication constants
export const AUTH_STORAGE_KEY = "auth-storage";

// Log prefixes for debugging
export const LOG_PREFIX = "[AuthStore]";

// Error messages
export const ERROR_MESSAGES = {
  ALREADY_AUTHENTICATED: "Already authenticated, cannot login anonymously.",
  ANONYMOUS_USER_CREATION_FAILED: "Failed to create anonymous user",
  AUTH_REFRESH_FAILED: "Error refreshing user",
  LOGIN_FAILED: "Error during anonymous login",
  LOGOUT_FAILED: "Error during logout",
  NO_USER_FOUND: "No authenticated user found",
} as const; 