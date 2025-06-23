import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface UIState {
  // Modal states
  showLoginModal: boolean;
  showTrumpPopup: boolean;
  showReplay: boolean;

  // Loading states
  isLoading: boolean;
  cardPlayLoading: boolean;
  playingCardId: number | null;

  // Selected card
  selectedCard: number | null;

  // UI messages
  statusMessage: string | null;
  toastMessage: string | null;
  toastType: "success" | "error" | "info" | "warning" | null;

  // Actions
  setShowLoginModal: (show: boolean) => void;
  setShowTrumpPopup: (show: boolean) => void;
  setShowReplay: (show: boolean) => void;

  setIsLoading: (isLoading: boolean) => void;
  setCardPlayLoading: (isLoading: boolean) => void;
  setPlayingCardId: (cardId: number | null) => void;

  setSelectedCard: (cardId: number | null) => void;

  setStatusMessage: (message: string | null) => void;
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning"
  ) => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>()(
  devtools((set) => ({
    // Default state
    showLoginModal: false,
    showTrumpPopup: false,
    showReplay: false,

    isLoading: false,
    cardPlayLoading: false,
    playingCardId: null,

    selectedCard: null,

    statusMessage: null,
    toastMessage: null,
    toastType: null,

    // Action implementations
    setShowLoginModal: (showLoginModal) => set({ showLoginModal }),

    setShowTrumpPopup: (showTrumpPopup) => set({ showTrumpPopup }),

    setShowReplay: (showReplay) => set({ showReplay }),

    setIsLoading: (isLoading) => set({ isLoading }),

    setCardPlayLoading: (cardPlayLoading) => set({ cardPlayLoading }),

    setPlayingCardId: (playingCardId) => set({ playingCardId }),

    setSelectedCard: (selectedCard) => set({ selectedCard }),

    setStatusMessage: (statusMessage) => set({ statusMessage }),

    showToast: (message, type) => {
      set({
        toastMessage: message,
        toastType: type,
      });

      // Auto-clear the toast after 5 seconds
      setTimeout(() => {
        set((state) => {
          // Only clear this specific toast (in case another one was set)
          if (state.toastMessage === message) {
            return { toastMessage: null, toastType: null };
          }
          return state;
        });
      }, 5000);
    },

    clearToast: () => set({ toastMessage: null, toastType: null }),
  }))
);
