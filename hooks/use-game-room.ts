import { useMemo, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useColyseus, usePlayers, usePlayerHand, useCurrentPlayer } from "@/hooks/useColyseus";

/**
 * Main hook for game room functionality using Colyseus
 */
export function useGameRoom(roomId: string) {
  const router = useRouter();
  const { user } = useAuthStore();

  // Get UI state
  const {
    showLoginModal,
    showTrumpPopup,
    setShowLoginModal,
    setShowTrumpPopup,
  } = useUIStore();

  // Initialize Colyseus connection
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
    placeBid,
    playCard,
    markReady,
    stateVersion,
  } = useColyseus({
    userId: user?.id || "",
    userName: user?.username || "",
    roomId,
    autoConnect: !!user && !!roomId, // Auto-connect if user and roomId are available
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
      console.log("[useGameRoom] Trump selection phase detected, opening popup");
      setShowTrumpPopup(true);
    }
  }, [gameStatus, setShowTrumpPopup]);

  // Handle start game
  const handleStartGame = useCallback(() => {
    if (!isCurrentUserHost || players.length < 4) {
      console.warn("Cannot start game: not host or not enough players");
      return;
    }
    console.log("[GameRoom] Starting game");
    setIsStartingGame(true);
    startGame();
  }, [isCurrentUserHost, players.length, startGame]);

  // Handle add bots
  const handleAddBots = useCallback(() => {
    console.log("[GameRoom] Adding bots");
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
        console.error("[GameRoom] Cannot play card: No card ID provided", card);
        return;
      }

      try {
        console.log("[GameRoom] Playing card:", card, "with ID:", cardId);
        playCard(cardId);
      } catch (error) {
        console.error("[GameRoom] Error playing card:", error);
        useUIStore.getState().showToast("Error playing card. Please try again.", "error");
      }
    },
    [playCard]
  );

  // Handle bid
  const handleBid = useCallback(
    (bid: number) => {
      console.log("[GameRoom] Placing bid:", bid);
      placeBid(bid);
    },
    [placeBid]
  );

  // Handle trump vote
  const handleTrumpVote = useCallback(
    (suit: string) => {
      console.log("[GameRoom] Voting for trump:", suit);
      voteTrump(suit);
    },
    [voteTrump]
  );

  // Get trump votes for display
  const trumpVotes = useMemo(() => {
    if (!gameState?.trumpVotes) return new Map();
    return new Map(Object.entries(gameState.trumpVotes));
  }, [gameState?.trumpVotes]);

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
    console.log("[use-game-room] gameState.currentTrick:", gameState?.currentTrick);
    if (!gameState?.currentTrick) {
      console.log("[use-game-room] No currentTrick in gameState");
      return { cards: [], playedBy: [] };
    }

    const cards = Array.from(gameState.currentTrick.cards || []);
    const playedBy = Array.from(gameState.currentTrick.playedBy || []);
    console.log("[use-game-room] currentTrick cards:", cards, "playedBy:", playedBy);
    console.log("[use-game-room] Raw cards ArraySchema:", gameState.currentTrick.cards);
    console.log("[use-game-room] Raw playedBy ArraySchema:", gameState.currentTrick.playedBy);

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
    if (gameStatus === "trump_selection") return "Vote for trump suit";
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
    // Core state
    user,
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

    // Bidding
    currentTurn: gameState?.currentTurn || "",
    highestBid: gameState?.highestBid || 0,
    highestBidder: gameState?.highestBidder || "",

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
    handleBid,
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
