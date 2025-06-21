import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/app/types/user";
import { supabaseAuth } from "@/lib/services/supabase-auth";
import { 
  convertSupabaseUserToUser,
  handleAnonymousLogin, 
  handleLogout, 
  handleUserRefresh,
  AUTH_STORAGE_KEY, 
  LOG_PREFIX, 
  ERROR_MESSAGES 
} from "./auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  loginAnonymously: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      loginAnonymously: async (username) => {
        try {
          const { user } = get();
          set({ isLoading: true });

          const authUser = await handleAnonymousLogin(username, user);

          set({
            user: authUser,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          console.error(LOG_PREFIX, ERROR_MESSAGES.LOGIN_FAILED, error);
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { user } = get();

        try {
          await handleLogout(user);

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error(LOG_PREFIX, ERROR_MESSAGES.LOGOUT_FAILED, error);
          // Still clear the user state even if there was an error
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      refreshUser: async () => {
        set({ isLoading: true });

        try {
          const authUser = await handleUserRefresh();

          if (authUser) {
            set({
              user: authUser,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }

          // Check for anonymous user in localStorage (will be handled by persist)
          const { user } = get();
          if (user?.isAnonymous) {
            set({
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }

          // No authenticated user found
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error(LOG_PREFIX, ERROR_MESSAGES.AUTH_REFRESH_FAILED, error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Initialize authentication state
if (typeof window !== "undefined") {
  // Run on client-side only
  useAuthStore.getState().refreshUser();

  // Subscribe to Supabase auth changes
  supabaseAuth.auth.onAuthStateChange(async (event, session) => {
    const store = useAuthStore.getState();

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session?.user) {
        const authUser = convertSupabaseUserToUser(session.user);
        store.setUser(authUser);
      }
    } else if (event === "SIGNED_OUT") {
      store.setUser(null);
    } else if (event === "USER_UPDATED") {
      if (session?.user) {
        const currentUser = store.user;
        const authUser = convertSupabaseUserToUser(session.user);

        // Preserve the isAnonymous flag when updating an existing user
        if (currentUser?.isAnonymous) {
          authUser.isAnonymous = true;
        }

        store.setUser(authUser);
      }
    }
  });
}
