import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { GameStoreState } from "./types";

// ⚠️ IMPORTANT: This store is being migrated to use Colyseus
// Most game logic has been moved to the Colyseus server
// This store now only handles local UI state
// See: Documentation/COLYSEUS_MIGRATION.md

export const useGameStore = create<GameStoreState>()(
  devtools(
    persist(
      (set, get) => {
        return {
          // Default state - minimal UI state only
          roomId: null,
          currentRoom: null,
          players: [],
          gameMode: "classic",
          gameStatus: "waiting",
          isLoading: true,
          isConnected: false,
          userId: null,

          trumpSuit: null,
          currentTrick: [],
          scores: { royals: 0, rebels: 0 },
          currentPlayer: "",
          teamAssignments: {},
          specialPowers: undefined,
          remainingDeck: undefined,
          // playedCards removed - now handled server-side by Colyseus

          showShuffleAnimation: false,
          initialCardsDeal: false,
          statusMessage: null,
          isAddingBots: false,
          isPhaseTransitioning: false,
          phaseTransitionMessage: "",
          isGameBoardReady: false,
          votingComplete: false,
          trumpSelectionInProgress: false,

          // Basic setters for UI state
          setRoom: (room) => set({ currentRoom: room }),
          setPlayers: (players) => set({ players }),
          setGameMode: (mode) => set({ gameMode: mode }),
          setGameStatus: (status) => set({ gameStatus: status }),
          setRoomId: (roomId) => set({ roomId }),
          setLoading: (isLoading) => set({ isLoading }),
          setConnected: (isConnected) => set({ isConnected }),

          setTrumpSuit: (suit) => set({ trumpSuit: suit }),
          setCurrentTrick: (trick) => set({ currentTrick: trick }),
          setCurrentPlayer: (player) => set({ currentPlayer: player }),
          updateScores: (scores) => set({ scores }),
          setTeamAssignments: (teams) => set({ teamAssignments: teams }),

          setShowShuffleAnimation: (show) => set({ showShuffleAnimation: show }),
          setInitialCardsDeal: (value) => set({ initialCardsDeal: value }),
          setStatusMessage: (message) => set({ statusMessage: message }),
          setIsAddingBots: (value) => set({ isAddingBots: value }),
          setIsPhaseTransitioning: (value) => set({ isPhaseTransitioning: value }),
          setPhaseTransitionMessage: (message) => set({ phaseTransitionMessage: message }),
          setIsGameBoardReady: (value) => set({ isGameBoardReady: value }),
          setVotingComplete: (value) => set({ votingComplete: value }),

          updateGameState: (newState) => set(newState),
          // updatePlayedCards removed - now handled server-side by Colyseus

          // ⚠️ DEPRECATED: These methods are no longer used with Colyseus
          // Use the useColyseus hook instead (see hooks/useColyseus.ts)
          joinRoom: async () => {
            console.warn("joinRoom: Use useColyseus hook instead");
          },
          leaveRoom: () => {
            console.warn("leaveRoom: Use useColyseus hook instead");
          },
          startGame: () => {
            console.warn("startGame: Use useColyseus hook instead");
          },
          playCard: async () => {
            console.warn("playCard: Use useColyseus hook instead");
          },
          placeBid: () => {
            console.warn("placeBid: Use useColyseus hook instead");
          },
          selectTrump: () => {
            console.warn("selectTrump: Use useColyseus hook instead");
          },
          addBots: async () => {
            console.warn("addBots: Not yet implemented in Colyseus");
          },
          createRoom: async () => {
            console.warn("createRoom: Use useColyseus hook instead");
            return null;
          },
          updateRoomSettings: async () => {
            console.warn("updateRoomSettings: Not yet implemented");
            return false;
          },
          kickPlayer: async () => {
            console.warn("kickPlayer: Not yet implemented");
            return false;
          },
          setGameId: () => {
            console.warn("setGameId: Not yet implemented");
          },
          updateGameAnalytics: () => {
            console.warn("updateGameAnalytics: Not yet implemented");
          },
          recordTrick: () => {
            console.warn("recordTrick: Not yet implemented");
          },
          useFrenzyPower: async () => {
            console.warn("useFrenzyPower: Not yet implemented (Classic mode only)");
            return false;
          },
          canUseFrenzyPower: () => {
            console.warn("canUseFrenzyPower: Not yet implemented (Classic mode only)");
            return false;
          },
          updateFrenzyPowers: () => {
            console.warn("updateFrenzyPowers: Not yet implemented (Classic mode only)");
          },
          setShowFrenzyPowers: () => {
            console.warn("setShowFrenzyPowers: Not yet implemented (Classic mode only)");
          },
          updatePlayerStats: () => {
            console.warn("updatePlayerStats: Not yet implemented");
          },
          getPlayerStats: () => {
            console.warn("getPlayerStats: Not yet implemented");
            return null;
          },
          setShowPlayerStats: () => {
            console.warn("setShowPlayerStats: Not yet implemented");
          },
          addBot: async () => {
            console.warn("addBot: Not yet implemented");
            return false;
          },
          removeBot: async () => {
            console.warn("removeBot: Not yet implemented");
            return false;
          },
          updateBotDifficulty: () => {
            console.warn("updateBotDifficulty: Not yet implemented");
          },
          sendMessage: async () => {
            console.warn("sendMessage: Use useColyseus hook instead");
            return false;
          },
          subscribeToRealtime: async () => {
            console.warn("subscribeToRealtime: Use useColyseus hook instead");
          },
          syncGameStateToDatabase: async () => {
            console.warn("syncGameStateToDatabase: Not yet implemented");
            return false;
          },
          subscribeToGameEvents: async () => {
            console.warn("subscribeToGameEvents: Use useColyseus hook instead");
          },
          unsubscribeFromGameEvents: () => {
            console.warn("unsubscribeFromGameEvents: Use useColyseus hook instead");
          },
          broadcastFrenzyPower: async () => {
            console.warn("broadcastFrenzyPower: Not yet implemented");
            return false;
          },
          broadcastTrickCompleted: async () => {
            console.warn("broadcastTrickCompleted: Not yet implemented");
            return false;
          },
          generateGameReport: () => {
            console.warn("generateGameReport: Not yet implemented");
            return null;
          },
          exportGameData: async () => {
            console.warn("exportGameData: Not yet implemented");
            return "";
          },
          getLeaderboard: async () => {
            console.warn("getLeaderboard: Not yet implemented");
            return [];
          },
          syncWithDatabase: async () => {
            console.warn("syncWithDatabase: Not yet implemented");
            return false;
          },
          saveGameState: async () => {
            console.warn("saveGameState: Not yet implemented");
            return false;
          },
          loadGameHistory: async () => {
            console.warn("loadGameHistory: Not yet implemented");
            return [];
          },
        };
      },
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
