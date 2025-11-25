import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { GameStoreState } from "./types";

// This store handles local UI state only.
// All game logic is handled by the Colyseus server.
// See: Documentation/COLYSEUS_MIGRATION.md

export const useGameStore = create<GameStoreState>()(
  devtools(
    persist(
      (set) => ({
        // Room and player state
        roomId: null,
        currentRoom: null,
        players: [],
        isLoading: true,
        isConnected: false,
        userId: null,

        // Game configuration
        gameMode: "classic",

        // Core game state (synced from Colyseus)
        gameStatus: "waiting",
        trumpSuit: null,
        currentTrick: [],
        scores: { royals: 0, rebels: 0 },
        currentPlayer: "",
        teamAssignments: {},

        // UI state flags
        showShuffleAnimation: false,
        initialCardsDeal: false,
        statusMessage: null,
        isAddingBots: false,
        isPhaseTransitioning: false,
        phaseTransitionMessage: "",
        isGameBoardReady: false,
        votingComplete: false,
        trumpSelectionInProgress: false,

        // Setters for room/player state
        setRoom: (room) => set({ currentRoom: room }),
        setPlayers: (players) => set({ players }),
        setRoomId: (roomId) => set({ roomId }),
        setLoading: (isLoading) => set({ isLoading }),
        setConnected: (isConnected) => set({ isConnected }),

        // Setters for game configuration
        setGameMode: (mode) => set({ gameMode: mode }),

        // Setters for game state
        setGameStatus: (status) => set({ gameStatus: status }),
        setTrumpSuit: (suit) => set({ trumpSuit: suit }),
        setCurrentTrick: (trick) => set({ currentTrick: trick }),
        setCurrentPlayer: (player) => set({ currentPlayer: player }),
        updateScores: (scores) => set({ scores }),
        setTeamAssignments: (teams) => set({ teamAssignments: teams }),
        updateGameState: (newState) => set(newState),

        // Setters for UI state
        setShowShuffleAnimation: (show) => set({ showShuffleAnimation: show }),
        setInitialCardsDeal: (value) => set({ initialCardsDeal: value }),
        setStatusMessage: (message) => set({ statusMessage: message }),
        setIsAddingBots: (value) => set({ isAddingBots: value }),
        setIsPhaseTransitioning: (value) => set({ isPhaseTransitioning: value }),
        setPhaseTransitionMessage: (message) => set({ phaseTransitionMessage: message }),
        setIsGameBoardReady: (value) => set({ isGameBoardReady: value }),
        setVotingComplete: (value) => set({ votingComplete: value }),

        // Legacy methods - these are deprecated, use useColyseus hook instead
        // Kept for backwards compatibility with existing components
        leaveRoom: () => {
          set({ roomId: null, currentRoom: null, players: [], gameStatus: "waiting" });
        },

        // Frenzy mode method (not yet implemented - Classic mode only)
        sendMessage: async () => {
          console.warn("sendMessage: Frenzy mode not yet implemented");
          return false;
        },
      }),
      {
        name: "turup-game-store",
        storage: createJSONStorage(() => localStorage),
        // Only persist minimal UI state
        partialize: (state) => ({
          roomId: state.roomId,
          gameMode: state.gameMode,
          teamAssignments: state.teamAssignments,
        }),
      }
    )
  )
);
