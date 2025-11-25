import { useMemo, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { useColyseus, usePlayers, usePlayerHand, useCurrentPlayer } from "@/hooks/useColyseus";
import type { User } from "@/stores/authStore";

/**
 * Test version of useGameRoom that bypasses authentication
 * Uses a mock test user instead of requiring real auth
 *
 * ONLY USE FOR LOCAL TESTING/DEVELOPMENT
 */
export function useTestGameRoom(roomId: string, testUserId: string) {
  const router = useRouter();

  // Create a mock test user
  const testUser: User = useMemo(() => ({
    id: testUserId,
    username: `TestUser-${testUserId.slice(-4)}`,
    name: `Test User ${testUserId.slice(-4)}`,
    email: `${testUserId}@test.local`,
  }), [testUserId]);

  // Get UI state
  const {
    showLoginModal,
    showTrumpPopup,
    setShowLoginModal,
    setShowTrumpPopup,
  } = useUIStore();

  // Initialize Colyseus connection with test user
  const {
    room,
    gameState,
    isConnected,
    error,
    joinRoom,
    leaveRoom,
    startGame,
    addBots,
    voteTrump,
    playCard,
    markReady,
    stateVersion,
  } = useColyseus({
    userId: testUser.id,
    userName: testUser.username,
    roomId,
    autoConnect: !!testUser && !!roomId, // Auto-connect if test user and roomId are available
  });

  // Local UI state
  const [isAddingBots, setIsAddingBots] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);

  // Get players array from Colyseus state
  const players = usePlayers(gameState, stateVersion);

  // Get current player
  const currentPlayer = useCurrentPlayer(gameState, room?.sessionId);

  // Get player's hand
  const playerHand = usePlayerHand(gameState, room?.sessionId);

  // Check if current user is host
  const isCurrentUserHost = useMemo(() => {
    if (!currentPlayer || !gameState) return false;
    return currentPlayer.isHost;
  }, [currentPlayer, gameState]);

  // Map Colyseus phase to old game status for compatibility
  const gameStatus = gameState?.phase || "waiting";

  // Calculate loading state
  const isLoading = !isConnected && !error;

  // Auto-open trump popup when phase changes to trump_selection
  useEffect(() => {
    if (gameStatus === "trump_selection") {
      setShowTrumpPopup(true);
    }
  }, [gameStatus, setShowTrumpPopup]);

  // Handle start game
  const handleStartGame = useCallback(() => {
    if (!isCurrentUserHost || players.length < 4) {
      console.warn("Cannot start game: not host or not enough players");
      return;
    }
    setIsStartingGame(true);
    startGame();
  }, [isCurrentUserHost, players.length, startGame]);

  // Handle add bots
  const handleAddBots = useCallback(() => {
    setIsAddingBots(true);
    addBots();
  }, [addBots]);

  // Handle play card
  const handlePlayCard = useCallback(
    (card: any) => {
      // The card ID from Colyseus is in the format "suit-value-counter" (e.g., "hearts-A-0")
      // We need to send this actual card.id, not the array index
      const cardId = card?.id || card?.apiId;

      if (!cardId) {
        console.error("[TestGameRoom] Cannot play card: No card ID provided", card);
        return;
      }

      try {
        playCard(cardId);
      } catch (error) {
        console.error("[TestGameRoom] Error playing card:", error);
        useUIStore.getState().showToast("Error playing card. Please try again.", "error");
      }
    },
    [playCard]
  );

  // Handle trump vote
  const handleTrumpVote = useCallback(
    (suit: string) => {
      voteTrump(suit);
    },
    [voteTrump]
  );

  // Get trump votes for display - convert from playerId->suit to suit->count
  const trumpVotes = useMemo(() => {
    if (!gameState?.trumpVotes) return {};

    // Count votes per suit
    const voteCounts: Record<string, number> = {
      hearts: 0,
      diamonds: 0,
      clubs: 0,
      spades: 0,
    };

    // Iterate through the MapSchema using forEach (proper way for Colyseus)
    gameState.trumpVotes.forEach((suit: string, playerId: string) => {
      if (suit && suit in voteCounts) {
        voteCounts[suit]++;
      }
    });

    console.log("[use-test-game-room] Trump vote counts:", voteCounts, "raw votes:", Array.from(gameState.trumpVotes.entries()));

    return voteCounts;
  }, [gameState?.trumpVotes, stateVersion]); // Add stateVersion to ensure updates

  // Check if voting is complete (all players voted)
  const votingComplete = useMemo(() => {
    if (!gameState) return false;
    return players.every(p => p.hasVoted);
  }, [gameState, players]);

  // Get user's vote
  const userVote = useMemo(() => {
    if (!currentPlayer) return null;
    return currentPlayer.trumpVote || null;
  }, [currentPlayer]);

  // Scores in old format for compatibility
  const scores = useMemo(() => ({
    royals: gameState?.royalsScore || 0,
    rebels: gameState?.rebelsScore || 0,
  }), [gameState]);

  // Winner data for end-game
  const winner = gameState?.winner || "";
  const isKot = gameState?.isKot || false;
  const royalsTricks = gameState?.royalsTricks || 0;
  const rebelsTricks = gameState?.rebelsTricks || 0;

  // Current trick for display - return both cards and playedBy arrays
  const currentTrick = useMemo(() => {
    if (!gameState?.currentTrick) {
      return { cards: [], playedBy: [] };
    }

    const cards = Array.from(gameState.currentTrick.cards || []);
    const playedBy = Array.from(gameState.currentTrick.playedBy || []);

    return {
      cards,
      playedBy,
    };
  }, [gameState?.currentTrick, stateVersion]);

  // Status messages based on game state
  const statusMessage = useMemo(() => {
    if (error) return `Error: ${error}`;
    if (!isConnected) return "Connecting...";
    if (gameStatus === "waiting") return `Waiting for players (${players.length}/4)`;
    // Trump selection status is now handled within the TrumpSelectionPopup UI itself
    // if (gameStatus === "trump_selection") return "Vote for trump suit";
    if (gameStatus === "playing") {
      const currentTurnPlayer = players.find(p => p.id === gameState?.currentTurn);
      if (currentTurnPlayer) {
        return currentTurnPlayer.id === currentPlayer?.id
          ? "Your turn!"
          : `${currentTurnPlayer.name}'s turn`;
      }
    }
    return null;
  }, [error, isConnected, gameStatus, players, gameState, currentPlayer]);

  return {
    // Core state - use test user instead of auth store
    user: testUser,
    room,
    gameState,
    isConnected,
    error,

    // Game state (mapped for compatibility)
    players,
    currentPlayer,
    currentPlayerId: room?.sessionId || "", // Session ID is the current player's ID
    playerHand,
    gameStatus,
    isLoading,
    isCurrentUserHost,
    isAddingBots,
    isStartingGame,
    scores,
    currentTrick,
    trumpSuit: gameState?.trumpSuit || null,

    // Trump voting
    trumpVotes,
    userVote,
    votingComplete,
    handleTrumpVote,

    // Turn tracking
    currentTurn: gameState?.currentTurn || "",

    // End-game data
    winner,
    isKot,
    royalsTricks,
    rebelsTricks,

    // Actions
    joinRoom,
    leaveRoom,
    handleStartGame,
    handleAddBots,
    handlePlayCard,
    markReady,

    // UI state
    showLoginModal,
    showTrumpPopup,
    setShowLoginModal,
    setShowTrumpPopup,
    statusMessage,

    // Utils
    router,
    stateVersion, // For forcing re-renders when needed
  };
}
