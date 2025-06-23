import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useReplay } from "@/hooks/use-replay";
import { useGameStore } from "@/stores";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useSupabaseTrumpVoting } from "@/hooks/use-supabase-trump-voting";
import { useShallow } from "zustand/react/shallow";

// Custom hooks for specific game room functionality
const useGameRoomState = () => {
  return useGameStore(
    useShallow((state) => ({
      currentRoom: state.currentRoom,
      players: state.players,
      isLoading: state.isLoading,
      gameStatus: state.gameStatus,
      statusMessage: state.statusMessage,
      isAddingBots: state.isAddingBots,
      isGameBoardReady: state.isGameBoardReady,
      isPhaseTransitioning: state.isPhaseTransitioning,
      showShuffleAnimation: state.showShuffleAnimation,
      initialCardsDeal: state.initialCardsDeal,
      phaseTransitionMessage: state.phaseTransitionMessage,
    }))
  );
};

const useGameRoomActions = () => {
  return useGameStore(
    useShallow((state) => ({
      startGame: state.startGame,
      playCard: state.playCard,
      placeBid: state.placeBid,
      addBots: state.addBots,
      setShowShuffleAnimation: state.setShowShuffleAnimation,
      setIsGameBoardReady: state.setIsGameBoardReady,
      setStatusMessage: state.setStatusMessage,
      setGameStatus: state.setGameStatus,
      setIsPhaseTransitioning: state.setIsPhaseTransitioning,
      setPhaseTransitionMessage: state.setPhaseTransitionMessage,
      setInitialCardsDeal: state.setInitialCardsDeal,
      setPlayers: state.setPlayers,
      sendMessage: state.sendMessage,
    }))
  );
};

const useUIState = () => {
  return useUIStore(
    useShallow((state) => ({
      showLoginModal: state.showLoginModal,
      showTrumpPopup: state.showTrumpPopup,
      setShowLoginModal: state.setShowLoginModal,
      setShowTrumpPopup: state.setShowTrumpPopup,
    }))
  );
};

// Game handlers hook
const useGameHandlers = (gameActions: ReturnType<typeof useGameRoomActions>) => {
  const { user } = useAuthStore();
  const { recordMove } = useReplay();
  const [isStartingGame, setIsStartingGame] = useState(false);

  const handleStartGame = useCallback(
    (isCurrentUserHost: boolean, playerCount: number) => {
      if (isStartingGame || !isCurrentUserHost || playerCount < 4) return;

      setIsStartingGame(true);
      gameActions.setStatusMessage("Starting game...");
      gameActions.startGame();

      setTimeout(() => {
        setIsStartingGame(false);
        gameActions.setStatusMessage(null);
      }, 2000);
    },
    [isStartingGame, gameActions]
  );

  const handleAddBots = useCallback(
    (isAddingBots: boolean, isCurrentUserHost: boolean) => {
      if (isAddingBots || !isCurrentUserHost) return;
      gameActions.setStatusMessage("Adding bots...");
      gameActions.addBots();
    },
    [gameActions]
  );

  const handlePlayCard = useCallback(
    (card: any) => {
      if (!card) {
        console.error("[GameRoom] Cannot play card: No card provided");
        return;
      }

      try {
        gameActions.playCard(card);
        recordMove({
          type: "card_played",
          player: user?.username || "Player",
          data: { card },
        });
      } catch (error) {
        console.error("[GameRoom] Error playing card:", error);
        useUIStore.getState().showToast("Error playing card. Please try again.", "error");
        useUIStore.getState().setCardPlayLoading(false);
        useUIStore.getState().setPlayingCardId(null);
      }
    },
    [gameActions, recordMove, user?.username]
  );

  const handleBid = useCallback(
    (bid: number) => {
      gameActions.setStatusMessage(`Placing bid: ${bid}`);
      gameActions.placeBid(bid);
      setTimeout(() => gameActions.setStatusMessage(null), 1500);
    },
    [gameActions]
  );

  return {
    isStartingGame,
    handleStartGame,
    handleAddBots,
    handlePlayCard,
    handleBid,
    recordMove,
  };
};

// Animation handlers hook
const useAnimationHandlers = (gameActions: ReturnType<typeof useGameRoomActions>, roomId: string) => {
  const { setShowTrumpPopup } = useUIState();

  const handleShuffleComplete = useCallback(() => {
    gameActions.setShowShuffleAnimation(false);
    gameActions.setStatusMessage("Initial deal completed. Select trump suit.");
    gameActions.setGameStatus("bidding");
    setShowTrumpPopup(true);
  }, [gameActions, setShowTrumpPopup]);

  const handleFinalShuffleDrawComplete = useCallback(() => {
    gameActions.setStatusMessage("All cards dealt! Starting game...");
    gameActions.setIsPhaseTransitioning(true);
    gameActions.setPhaseTransitionMessage("Game Starting...");
    gameActions.setInitialCardsDeal(false);
    gameActions.setIsGameBoardReady(false);

    setTimeout(() => {
      gameActions.setStatusMessage(null);
      gameActions.setGameStatus("playing");
      gameActions.setIsPhaseTransitioning(false);
      gameActions.setPhaseTransitionMessage("");
      gameActions.setIsGameBoardReady(true);

      window.dispatchEvent(
        new CustomEvent("game:refreshState", {
          detail: { phase: "playing", initialCardsDeal: false },
        })
      );

      gameActions.sendMessage({
        type: "game:playing-started",
        payload: {
          roomId,
          gamePhase: "playing",
          initialCardsDeal: false,
        },
      });
    }, 2000);
  }, [gameActions, roomId]);

  return {
    handleShuffleComplete,
    handleFinalShuffleDrawComplete,
  };
};

// Development helper hook
const useDevHelpers = () => {
  const { user } = useAuthStore();
  const { currentRoom } = useGameRoomState();
  const { setPlayers } = useGameRoomActions();

  const handleForceHostStatus = useCallback(() => {
    if (process.env.NODE_ENV !== "development") return;

    console.log("[useGameRoom] Forcing host status for debugging");

    if (!user || !currentRoom) {
      console.log("Cannot force host status: missing user or room");
      return;
    }

    const updatedPlayers = currentRoom.players.map((player) => ({
      ...player,
      isHost: player.id === user.id,
    }));

    const updatedRoom = {
      ...currentRoom,
      players: updatedPlayers,
      gameState: {
        ...currentRoom.gameState,
        players: updatedPlayers,
      },
    };

    setPlayers(updatedPlayers);
    useGameStore.setState({ currentRoom: updatedRoom });

    console.log("Debug: User is now host", {
      userId: user.id,
      username: user.username,
      updatedPlayers: updatedPlayers.map((p) => ({ name: p.name, isHost: p.isHost })),
    });
  }, [user, currentRoom, setPlayers]);

  return {
    handleForceHostStatus,
  };
};

export function useGameRoom(roomId: string) {
  const router = useRouter();
  const { user } = useAuthStore();

  // Get state and actions from custom hooks
  const gameState = useGameRoomState();
  const gameActions = useGameRoomActions();
  const uiState = useUIState();

  // Trump voting functionality
  const {
    trumpVotes,
    userVote,
    votingComplete,
    handleVote: handleTrumpVote,
    handleForceBotVotes: forceBotVotes,
    loading: trumpVotingLoading,
  } = useSupabaseTrumpVoting(roomId);

  // Custom hook handlers
  const gameHandlers = useGameHandlers(gameActions);
  const animationHandlers = useAnimationHandlers(gameActions, roomId);
  const devHelpers = useDevHelpers();

  // Computed values
  const isCurrentUserHost = useMemo(() => {
    return gameState.currentRoom?.players?.some((p) => p.id === user?.id && p.isHost) || false;
  }, [gameState.currentRoom?.players, user?.id]);

  // Mock hand for testing - ONLY 5 CARDS for initial deal
  const playerHand = useMemo(() => [
    { id: 1, suit: "hearts", value: "A" },
    { id: 2, suit: "spades", value: "K" },
    { id: 3, suit: "diamonds", value: "Q" },
    { id: 4, suit: "clubs", value: "J" },
    { id: 5, suit: "hearts", value: "10" },
  ], []);

  // Enhanced handlers with dependencies
  const handleStartGameEnhanced = useCallback(() => {
    gameHandlers.handleStartGame(isCurrentUserHost, gameState.players.length);
  }, [gameHandlers.handleStartGame, isCurrentUserHost, gameState.players.length]);

  const handleAddBotsEnhanced = useCallback(() => {
    gameHandlers.handleAddBots(gameState.isAddingBots, isCurrentUserHost);
  }, [gameHandlers.handleAddBots, gameState.isAddingBots, isCurrentUserHost]);

  const handleTrumpVoteEnhanced = useCallback(
    (suit: string) => {
      if (votingComplete) return;
      gameActions.setStatusMessage(`Voting for ${suit}...`);
      handleTrumpVote(suit as any);
      setTimeout(() => gameActions.setStatusMessage(null), 1500);
    },
    [votingComplete, gameActions, handleTrumpVote]
  );

  // Effects for UI state management
  useEffect(() => {
    if (gameState.gameStatus === "bidding" && !userVote && !uiState.showTrumpPopup) {
      uiState.setShowTrumpPopup(true);
    }
  }, [gameState.gameStatus, userVote, uiState.showTrumpPopup, uiState.setShowTrumpPopup]);

  useEffect(() => {
    if (gameState.gameStatus === "final_deal") {
      gameActions.setIsGameBoardReady(false);
    }
  }, [gameState.gameStatus, gameActions]);

  useEffect(() => {
    if (gameState.gameStatus === "playing") {
      gameActions.setIsGameBoardReady(true);
      gameActions.setInitialCardsDeal(false);
      window.dispatchEvent(
        new CustomEvent("game:refreshState", {
          detail: { gameStatus: "playing", initialCardsDeal: false },
        })
      );
    }
  }, [gameState.gameStatus, gameActions]);

  return {
    // Core game state
    user,
    ...gameState,
    isCurrentUserHost,
    playerHand,
    
    // Trump voting
    trumpVotes,
    userVote,
    votingComplete,
    forceBotVotes,
    trumpVotingLoading,
    
    // UI state
    ...uiState,
    
    // Enhanced handlers
    handleStartGame: handleStartGameEnhanced,
    handleAddBots: handleAddBotsEnhanced,
    handleTrumpVote: handleTrumpVoteEnhanced,
    
    // Direct handlers from gameHandlers
    handlePlayCard: gameHandlers.handlePlayCard,
    handleBid: gameHandlers.handleBid,
    recordMove: gameHandlers.recordMove,
    isStartingGame: gameHandlers.isStartingGame,
    
    // Animation handlers
    ...animationHandlers,
    
    // Dev helpers
    ...devHelpers,
    
    // Utils
    router,
  };
} 