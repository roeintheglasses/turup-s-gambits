import { Card, Suit } from "@/app/types/game";
import { GameStatus, GameStoreState } from "./types";

export const createGameStateUpdates = (
  get: () => GameStoreState,
  set: (
    partial:
      | Partial<GameStoreState>
      | ((state: GameStoreState) => Partial<GameStoreState>),
    replace?: boolean
  ) => void
) => ({
  updateGameState: (newState: any) => {
    set((state) => {
      // Create an updated room with the new game state
      const updatedRoom = state.currentRoom
        ? {
            ...state.currentRoom,
            gameState: {
              ...state.currentRoom.gameState,
              ...newState,
            },
          }
        : null;

      // Update all the relevant direct state properties
      // to keep the state synchronized
      const updatedState: Partial<GameStoreState> = {
        currentRoom: updatedRoom,
      };

      // Process special update fields
      if (newState.updateField === "game_end") {
        console.log(
          "[GameStore] Game end signal received, updating game status to ended"
        );
        updatedState.gameStatus = "ended" as GameStatus;
        // Also set it in gamePhase for consistency
        if (updatedRoom) {
          updatedRoom.gameState.gamePhase = "ended";
        }
      }

      // Map fields from newState to the top-level state
      if (newState.trumpSuit !== undefined) {
        updatedState.trumpSuit = newState.trumpSuit;
      }

      if (newState.gamePhase !== undefined) {
        updatedState.gameStatus = newState.gamePhase as GameStatus;
      }

      if (newState.scores !== undefined) {
        updatedState.scores = newState.scores;
      }

      if (newState.currentTurn !== undefined) {
        updatedState.currentPlayer = newState.currentTurn;
      }

      return updatedState;
    });
  },

  setStatusMessage: (message: string | null) => set({ statusMessage: message }),

  setIsAddingBots: (isAddingBots: boolean) => set({ isAddingBots }),

  setCurrentTrick: (trick: Card[]) => {
    set({ currentTrick: trick });

    // Also update in the room gameState
    const currentRoom = get().currentRoom;
    if (currentRoom) {
      // Update the gameState with the current trick
      set({
        currentRoom: {
          ...currentRoom,
          gameState: {
            ...currentRoom.gameState,
            trickCards: Object.fromEntries(
              trick.map((card, index) => [index.toString(), card])
            ), // Convert array to object for Supabase
          },
        },
      });
    }
  },

  setCurrentPlayer: (currentPlayer: string) => {
    set({ currentPlayer });

    // Also update in the room gameState
    const currentRoom = get().currentRoom;
    if (currentRoom) {
      set({
        currentRoom: {
          ...currentRoom,
          gameState: {
            ...currentRoom.gameState,
            currentTurn: currentPlayer,
          },
        },
      });
    }
  },

  updateScores: (scores: { royals: number; rebels: number }) => {
    set({ scores });

    // Also update in the room gameState
    const currentRoom = get().currentRoom;
    if (currentRoom) {
      set({
        currentRoom: {
          ...currentRoom,
          gameState: {
            ...currentRoom.gameState,
            scores,
          },
        },
      });
    }
  },

  // Game flow helpers
  setShowShuffleAnimation: (showShuffleAnimation: boolean) =>
    set({ showShuffleAnimation }),

  setInitialCardsDeal: (initialCardsDeal: boolean) => set({ initialCardsDeal }),

  setIsPhaseTransitioning: (isPhaseTransitioning: boolean) =>
    set({ isPhaseTransitioning }),

  setPhaseTransitionMessage: (phaseTransitionMessage: string) =>
    set({ phaseTransitionMessage }),

  setIsGameBoardReady: (isGameBoardReady: boolean) => set({ isGameBoardReady }),

  setVotingComplete: (votingComplete: boolean) => set({ votingComplete }),

  // Add setter for team assignments
  setTeamAssignments: (teams: Record<string, "royals" | "rebels">) =>
    set({ teamAssignments: teams }),

  // Add the action to update played cards
  updatePlayedCards: (playerId: string, cardId: string) => {
    set((state) => {
      // Get current played cards for this player or initialize empty array
      const currentPlayedCards = state.playedCards[playerId] || [];

      // Add the new card if it's not already in the array
      if (!currentPlayedCards.includes(cardId)) {
        return {
          playedCards: {
            ...state.playedCards,
            [playerId]: [...currentPlayedCards, cardId],
          },
        };
      }
      return state; // No change if card was already played
    });
  },
});
