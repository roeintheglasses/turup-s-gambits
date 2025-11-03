import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Simplified User interface for Clerk
 */
export interface User {
  id: string;
  username: string;
  name?: string;
  email?: string;
  avatar?: string;
  imageUrl?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearUser: () => void;
}

/**
 * Auth store for syncing Clerk user data
 *
 * NOTE: This store is now a simple data holder for Clerk authentication.
 * The actual authentication is handled by Clerk.
 * Use Clerk's hooks (useUser, useAuth) for authentication state in components.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
