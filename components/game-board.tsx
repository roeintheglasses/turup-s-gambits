"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/card";
import { InGameEmotes } from "@/components/in-game-emotes";
import { type Card as CardType, type Player } from "@/app/types/game";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { persist, createJSONStorage } from "zustand/middleware";
import { useReplay } from "@/hooks/use-replay";
import { ReplaySummary } from "./replay-summary";
import { BarChart3, Eye } from "lucide-react";
import { TrumpSelectionPopup } from "@/components/trump-selection-popup";
import { VisualEffects } from "@/components/visual-effects";
import { CardShuffleAnimation } from "@/components/card-shuffle-animation";
import { FrenzyPowers } from "@/components/frenzy-powers";

interface CenterCard {
  id: number;
  suit: string;
  value: string;
  playedBy: string;
}

interface Emote {
  id: number;
  emoji: string;
  player: string;
  timestamp: number;
}

interface PlayerInterface {
  id: string;
  name: string;
  isHost?: boolean;
  isBot?: boolean;
  isReady?: boolean;
  hand?: any[];
  score?: number;
}

interface TrickResult {
  winningPlayer: string;
  winningTeam: "royals" | "rebels";
  cards: CenterCard[];
  timestamp: number;
}

interface GameBoardProps {
  roomId: string;
  gameMode: "classic" | "frenzy";
  players: string[];
  gameState: any;
  gameStatus: string;
  initialCardsDeal: boolean;
  currentTrick: { cards: any[]; playedBy: string[] };
  onUpdateGameState: (newState: any) => void;
  onRecordMove: (move: any) => void;
  onPlayCard: (card: any) => void;
  onBid: (bid: number) => void;
  sendMessage: (message: any) => Promise<boolean>;
  playerHand?: any[]; // Optional prop for Colyseus player hand
  currentTurn?: string; // ID of player whose turn it is (from Colyseus)
  currentPlayerId?: string; // Current user's player ID (from Colyseus session)
}

// Define a type for card to avoid implicit any
type HandCard = {
  id: number;
  apiId: string;
  suit: string;
  value: string;
};

export function GameBoard({
  roomId,
  gameMode,
  players,
  gameState,
  gameStatus,
  initialCardsDeal,
  currentTrick,
  onUpdateGameState,
  onRecordMove,
  onPlayCard,
  sendMessage,
  playerHand: colyseusPlayerHand,
  currentTurn,
  currentPlayerId,
}: GameBoardProps) {
  // Use primitive selectors instead of object selectors to prevent reference instability
  const trumpSuit = useGameStore((state) => state.trumpSuit);
  const scores = useGameStore((state) => state.scores);
  const playCardAction = useGameStore((state) => state.playCard);
  const storedTeamAssignments = useGameStore((state) => state.teamAssignments);
  const setTeamAssignments = useGameStore((state) => state.setTeamAssignments);

  const {
    selectedCard,
    setSelectedCard,
    cardPlayLoading,
    setCardPlayLoading,
    playingCardId,
    setPlayingCardId,
    showTrumpPopup,
    setShowTrumpPopup,
  } = useUIStore();

  const { user } = useAuthStore();

  // Calculate if it's the current user's turn using Colyseus state
  const isMyTurn = currentTurn && currentPlayerId && currentTurn === currentPlayerId;

  const [centerCards, setCenterCards] = useState<CenterCard[]>([]);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [lastTrickResult, setLastTrickResult] = useState<TrickResult | null>(
    null
  );
  const [showTrickWinnerMessage, setShowTrickWinnerMessage] = useState(false);

  // Add state for player hand to ensure it updates properly
  const [playerHandCards, setPlayerHandCards] = useState<any[]>([]);
  // Add a flag to track if we have a local hand already
  const [handInitialized, setHandInitialized] = useState(false);
  // Track processed trick IDs to prevent double-counting
  const [processedTrickIds, setProcessedTrickIds] = useState<Set<string>>(
    new Set()
  );

  // Use playerHandCards directly
  const playerHand = playerHandCards;

  // Add refs to track state for effects
  const playerHandRef = useRef<any[]>([]);
  const centerCardsRef = useRef<any[]>([]);
  const gameStatusRef = useRef<string>("");

  // Get player hand from game state or use mock data if not available
  const getPlayerHand = useCallback(() => {
    // If Colyseus player hand is provided, use it directly
    // Check for undefined (not just length) to avoid fallback during state transitions
    if (colyseusPlayerHand !== undefined) {
      // During state transitions, the hand might temporarily be empty
      if (colyseusPlayerHand.length === 0) {
        return [];
      }

      const cards = colyseusPlayerHand.map((card: any, index: number) => ({
        id: card.id, // Use the actual Colyseus card ID (e.g., "hearts-A-0")
        suit: card.suit,
        value: card.rank || card.value,
        apiId: card.id, // Keep the actual card ID for backward compat
      }));

      return cards;
    }

    if (gameState && user) {
      const player = gameState.players?.find(
        (p: PlayerInterface) => p.id === user.id
      );
      if (player && player.hand && player.hand.length > 0) {
        const cards = player.hand.map((card: any, index: number) => ({
          id: index,
          suit: card.suit,
          value: card.rank || card.value,
          apiId: `${card.suit}-${card.rank || card.value}`, // Add API ID for backward compat
        }));

        // In playing state, always return all cards regardless of initialCardsDeal flag
        if (gameStatus === "playing") {
          return cards;
        }

        // For other states, respect the initialCardsDeal flag
        const finalHand = initialCardsDeal ? cards.slice(0, 5) : cards;
        return finalHand;
      }
    }

    // Fallback to mock data if no hand is found (should not happen with Colyseus)
    const mockHand = [
      { id: 1, suit: "hearts", value: "A", apiId: "hearts-A" },
      { id: 2, suit: "spades", value: "K", apiId: "spades-K" },
      { id: 3, suit: "diamonds", value: "Q", apiId: "diamonds-Q" },
      { id: 4, suit: "clubs", value: "J", apiId: "clubs-J" },
      { id: 5, suit: "hearts", value: "10", apiId: "hearts-10" },
      { id: 6, suit: "spades", value: "9", apiId: "spades-9" },
      { id: 7, suit: "diamonds", value: "8", apiId: "diamonds-8" },
      { id: 8, suit: "clubs", value: "7", apiId: "clubs-7" },
      { id: 9, suit: "hearts", value: "6", apiId: "hearts-6" },
      { id: 10, suit: "spades", value: "5", apiId: "spades-5" },
      { id: 11, suit: "diamonds", value: "4", apiId: "diamonds-4" },
      { id: 12, suit: "clubs", value: "3", apiId: "clubs-3" },
      { id: 13, suit: "hearts", value: "2", apiId: "hearts-2" },
    ];

    // Return appropriate number of cards (no filtering - this is just mock data)
    if (gameStatus === "playing") {
      return mockHand;
    } else if (initialCardsDeal) {
      return mockHand.slice(0, 5);
    } else {
      return mockHand;
    }
  }, [gameState, user, gameStatus, initialCardsDeal, colyseusPlayerHand]);

  // Ref to prevent double-click/double-execution
  const isPlayingCardRef = useRef(false);

  // Memoize card click handler to prevent infinite rerenders
  const handleCardClick = useCallback(
    (cardId: number) => {
      // Get a fresh reference to UIStore to avoid stale state
      const { showToast } = useUIStore.getState();

      // CRITICAL: Check if a card play is already in progress using ref
      if (isPlayingCardRef.current) {
        return;
      }

      // Check if we're in the playing phase
      if (gameStatus !== "playing") {
        showToast(
          `Cannot play card yet. Current phase: ${gameStatus}`,
          "warning"
        );
        return;
      }

      // Check if it's the player's turn using Colyseus state
      if (!isMyTurn) {
        showToast("Not your turn to play", "warning");
        return;
      }

      // Check if a card is already being played
      if (cardPlayLoading) {
        return;
      }

      // Set the ref immediately to prevent double-execution
      isPlayingCardRef.current = true;

      setSelectedCard(cardId);
      setPlayingCardId(cardId);
      setCardPlayLoading(true);

      // Find the card in player's hand
      const card = playerHand.find((c: any) => c.id === cardId);
      if (!card) {
        console.error("[GameBoard] Card not found in player hand:", cardId);
        isPlayingCardRef.current = false; // Reset ref on error
        setCardPlayLoading(false);
        setPlayingCardId(null);
        return;
      }

      // Convert the card to the proper format for the API
      const apiCard = {
        id: card.apiId || `${card.suit}-${card.value}`,
        suit: card.suit as any,
        rank: card.value as any,
      };

      // First add the card to center immediately for better UX
      const playerName = user?.username || "You";
      const uiCard: CenterCard = {
        id: cardId,
        suit: card.suit,
        value: card.value,
        playedBy: playerName,
      };

      // Optimistically update UI (will be confirmed by the server event)
      setCenterCards((prev) => {
        if (prev.some((c) => c.playedBy === playerName)) {
          return prev;
        }
        return [...prev, uiCard];
      });

      // Remove card from player's hand
      setPlayerHandCards((prevHand) => prevHand.filter((c) => c.id !== cardId));

      // Use the provided onPlayCard function
      try {
        onPlayCard(apiCard);
        // Reset the ref after successful card play (will be set again on next click)
        // We use a short timeout to allow the server to process
        setTimeout(() => {
          isPlayingCardRef.current = false;
        }, 500);
      } catch (error) {
        console.error("[GameBoard] Error playing card:", error);
        // Revert the optimistic updates
        setCenterCards((prev) => prev.filter((c) => c.playedBy !== playerName));

        // Restore the card to the player's hand
        setPlayerHandCards((prevHand) => [...prevHand, card]);

        isPlayingCardRef.current = false; // Reset ref on error
        setCardPlayLoading(false);
        setPlayingCardId(null);
        showToast("Failed to play card. Please try again.", "error");
      }
    },
    [
      gameStatus,
      isMyTurn,
      cardPlayLoading,
      playerHand,
      setSelectedCard,
      setPlayingCardId,
      setCardPlayLoading,
      onPlayCard,
      user,
      setCenterCards,
      setPlayerHandCards,
    ]
  );

  // Update refs when their values change
  useEffect(() => {
    playerHandRef.current = playerHand;
  }, [playerHand]);

  useEffect(() => {
    centerCardsRef.current = centerCards;
  }, [centerCards]);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  // Use the provided onRecordMove function
  const recordMove = (move: any) => {
    onRecordMove(move);
  };

  // Update the player hand initialization effect
  useEffect(() => {
    // Always get a fresh hand when initializing or when game state changes
    const hand = getPlayerHand();

    // Set the hand directly without checking handInitialized flag
    // This ensures we always have the correct hand after refresh or state change
    setPlayerHandCards(hand || []);

    // If we're in playing state, we need to ensure handInitialized is true
    // This prevents the hand from being reset during trick completions
    if (gameStatus === "playing") {
      if (!handInitialized) {
        setHandInitialized(true);
      }
    } else {
      // For other states, reset handInitialized flag to ensure we'll reload cards when state changes
      if (handInitialized) {
        setHandInitialized(false);
      }
    }
  }, [gameState, gameStatus, initialCardsDeal, getPlayerHand]);

  // Fix the force refresh handler to actually update the state properly
  useEffect(() => {
    const handleRefreshState = (event: any) => {
      // Force a re-evaluation of the player's hand
      const refreshedHand = getPlayerHand();

      // Always update the state with the refreshed hand
      setPlayerHandCards(refreshedHand);

      // Ensure handInitialized is true for playing state
      if (gameStatus === "playing" && !handInitialized) {
        setHandInitialized(true);
      }
    };

    window.addEventListener("game:refreshState", handleRefreshState);

    return () => {
      window.removeEventListener("game:refreshState", handleRefreshState);
    };
  }, [getPlayerHand, gameStatus, handInitialized]);

  // Turn management is now handled by Colyseus server state

  // Add a new debug function to help track team assignments
  const logTeamAssignments = useCallback(() => {
    // Reserved for debugging when needed
  }, [storedTeamAssignments, players]);

  // Replace the team assignment useEffect with one that respects stored assignments
  useEffect(() => {
    // Check if we already have team assignments in the store
    const hasExistingAssignments =
      Object.keys(storedTeamAssignments).length > 0;

    if (hasExistingAssignments) {
      // Check if all current players have team assignments
      const allPlayersHaveTeams = players.every(
        (playerName) => !!storedTeamAssignments[playerName]
      );

      if (!allPlayersHaveTeams) {
        const updatedTeams = { ...storedTeamAssignments };

        players.forEach((playerName, index) => {
          if (!updatedTeams[playerName]) {
            // Assign new players based on their position
            updatedTeams[playerName] = index % 2 === 0 ? "royals" : "rebels";
          }
        });

        // Update the store with complete team assignments
        setTeamAssignments(updatedTeams);
      }
    } else {
      // Create new team assignments
      const teams: Record<string, "royals" | "rebels"> = {};

      players.forEach((playerName, index) => {
        // Even indices (0, 2) are Royals, odd indices (1, 3) are Rebels
        teams[playerName] = index % 2 === 0 ? "royals" : "rebels";
      });

      // Set store state
      setTeamAssignments(teams);
    }

    // Log the final team assignments for debugging
    logTeamAssignments();
  }, [players, storedTeamAssignments, setTeamAssignments, logTeamAssignments]);

  // When we have team assignments, update the local state
  useEffect(() => {
    if (Object.keys(storedTeamAssignments).length > 0) {
      setTeamAssignments(storedTeamAssignments);
    }
  }, [storedTeamAssignments, setTeamAssignments]);

  // Sync center cards with Colyseus current trick
  useEffect(() => {
    if (!currentTrick || typeof currentTrick !== 'object') {
      return;
    }

    const { cards, playedBy } = currentTrick;

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      setCenterCards([]);
      return;
    }

    // Convert Colyseus Card objects to CenterCard format
    const convertedCards: CenterCard[] = cards.map((card: any, index: number) => {
      // Get the player ID from playedBy array
      const playerId = playedBy?.[index];

      // Find the player in the gameState to get their name
      let playerName = `Player ${index + 1}`;
      if (gameState?.players) {
        const player = gameState.players.find((p: any) => p.id === playerId);
        if (player) {
          playerName = player.name || player.id;
        }
      }

      return {
        id: index,
        suit: card.suit || "hearts",
        value: card.value || "A",
        playedBy: playerName,
      };
    });

    setCenterCards(convertedCards);
  }, [currentTrick, players, gameState]);

  // Enhance the trick completion handler to show which team won
  const handleTrickCompletion = useCallback(() => {
    if (centerCards.length !== 4) return;

    // Generate a trick ID based on the cards to detect duplicates
    const trickId = centerCards
      .map((card) => `${card.suit}-${card.value}-${card.playedBy}`)
      .sort()
      .join("|");

    // Check if this exact trick has been processed already
    if (processedTrickIds.has(trickId)) {
      return;
    }

    const currentCenterCards = [...centerCards];

    // Proper trick winning logic implementation
    // 1. Determine the lead suit (suit of the first card played)
    let leadSuit: string | null = null;
    if (centerCards.length > 0) {
      leadSuit = centerCards[0].suit;
    }

    // Card rank order (2 is lowest, Ace is highest)
    const cardRanks: { [key: string]: number } = {
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 11,
      Q: 12,
      K: 13,
      A: 14,
    };

    // Initial winning card is the first card
    let winningCardIndex = 0;
    let winningCard = currentCenterCards[0];

    // Check each card in the trick
    for (let i = 1; i < currentCenterCards.length; i++) {
      const currentCard = currentCenterCards[i];

      // Case 1: Current card is a trump and winning card is not
      if (currentCard.suit === trumpSuit && winningCard.suit !== trumpSuit) {
        winningCardIndex = i;
        winningCard = currentCard;
      }
      // Case 2: Both cards are trump, compare ranks
      else if (
        currentCard.suit === trumpSuit &&
        winningCard.suit === trumpSuit
      ) {
        if (cardRanks[currentCard.value] > cardRanks[winningCard.value]) {
          winningCardIndex = i;
          winningCard = currentCard;
        }
      }
      // Case 3: Current card follows lead suit and winning card is not a trump
      else if (
        currentCard.suit === leadSuit &&
        winningCard.suit !== trumpSuit
      ) {
        if (
          winningCard.suit !== leadSuit ||
          cardRanks[currentCard.value] > cardRanks[winningCard.value]
        ) {
          winningCardIndex = i;
          winningCard = currentCard;
        }
      }
      // All other cases: Current card cannot win (different suit, not trump)
    }

    const winningPlayerName = winningCard.playedBy;

    // Determine which team won (based on player name)
    const winningTeam = storedTeamAssignments[winningPlayerName] || "royals";

    console.log(`Trick complete - Winner: ${winningPlayerName} (${winningTeam})`);

    // Create trick result
    const trickResult: TrickResult = {
      winningPlayer: winningPlayerName,
      winningTeam: winningTeam,
      cards: currentCenterCards,
      timestamp: Date.now(),
    };

    // Set the last trick result to show in UI
    setLastTrickResult(trickResult);
    setShowTrickWinnerMessage(true);

    // Record the move
    recordMove({
      type: "trickComplete",
      winner: winningPlayerName,
      team: winningTeam,
      cards: currentCenterCards,
    });

    // Update scores for the winning team with a non-destructive update
    const newScores = {
      ...scores,
      [winningTeam]: (scores[winningTeam] || 0) + 1,
    };

    // Mark this trick as processed to prevent double counting
    setProcessedTrickIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(trickId);
      return newSet;
    });

    // Check if game has ended (a team has reached 7 tricks)
    const gameEnded = newScores.royals >= 7 || newScores.rebels >= 7;

    if (gameEnded) {
      console.log(`Game ended - ${newScores.royals >= 7 ? "Royals" : "Rebels"} win!`);
      // Use a targeted update to update scores and game status
      onUpdateGameState({
        scores: newScores,
        gameStatus: "ended",
        updateField: "game_end", // Signal that game has ended
      });
    } else {
      // Use a targeted update that won't cause a full state refresh
      onUpdateGameState({
        scores: newScores,
        updateField: "scores", // Signal field to indicate this is a targeted update
      });
    }

    // Show the trick winner message for 1 second
    setTimeout(() => {
      setShowTrickWinnerMessage(false);

      // If game has ended, don't start a new round
      if (!gameEnded) {
        // Reset the center area and start the next round immediately
        setCenterCards([]);

        // Reset card play loading states to allow new card plays
        setCardPlayLoading(false);
        setPlayingCardId(null);
      }
    }, 500);
  }, [
    centerCards,
    scores,
    recordMove,
    onUpdateGameState,
    storedTeamAssignments,
    trumpSuit,
    processedTrickIds,
  ]);

  // Use the memoized handler in the effect
  useEffect(() => {
    if (centerCards.length === 4) {
      // Wait 2 seconds to let players see all 4 cards and process the trick
      const timer = setTimeout(() => {
        handleTrickCompletion();
      }, 2000); // Increased pause to let players see the completed trick

      return () => clearTimeout(timer);
    }
  }, [centerCards.length, handleTrickCompletion]);

  // Memoize emote handler to prevent unnecessary rerenders
  const handleEmote = useCallback(
    (emoji: string) => {
      if (!user) return;

      const newEmote: Emote = {
        id: Date.now(),
        emoji,
        player: user.username,
        timestamp: Date.now(),
      };

      setEmotes((prev) => [...prev, newEmote]);

      // Send emote to other players
      if (sendMessage) {
        sendMessage({
          type: "game:emote",
          payload: {
            roomId,
            playerId: user.id,
            emoji,
          },
        });
      }

      // Auto-remove emote after 3 seconds
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.id !== newEmote.id));
      }, 3000);
    },
    [user, roomId, sendMessage, setEmotes]
  );

  // Memoize card playing function to prevent infinite loops
  const handlePlayCard = useCallback(
    (card: any) => {
      // Disable clicking if a card is already being played
      if (cardPlayLoading || playingCardId) {
        return;
      }

      // Set loading state to prevent clicking multiple cards
      setCardPlayLoading(true);
      setPlayingCardId(card.id);

      // Create a UI card
      const playerName = user?.username || "You";
      const uiCard: CenterCard = {
        id:
          typeof card.id === "string"
            ? parseInt(card.id.split("-")[1])
            : card.id,
        suit: card.suit,
        value: card.rank || card.value,
        playedBy: playerName,
      };

      // Optimistically update UI (will be confirmed by the server event)
      setCenterCards((prev) => {
        if (prev.some((c) => c.playedBy === playerName)) {
          return prev;
        }
        return [...prev, uiCard];
      });

      // Delay to show animation
      setTimeout(() => {
        // Call the onPlayCard callback to actually play the card
        if (onPlayCard) {
          try {
            onPlayCard(card);
          } catch (error) {
            console.error("[GameBoard] Error playing card:", error);
            // Revert the optimistic updates
            setCenterCards((prev) =>
              prev.filter((c) => c.playedBy !== playerName)
            );
            setCardPlayLoading(false);
            setPlayingCardId(null);

            // Show error toast
            const { showToast } = useUIStore.getState();
            showToast("Failed to play card. Please try again.", "error");
          }
        } else {
          console.error("[GameBoard] No onPlayCard handler provided");
          // Reset state if no handler
          setCardPlayLoading(false);
          setPlayingCardId(null);
        }
      }, 500);
    },
    [
      cardPlayLoading,
      playingCardId,
      setCardPlayLoading,
      setPlayingCardId,
      onPlayCard,
      user,
      setCenterCards,
    ]
  );

  // Note: Bot logic is now handled server-side by Colyseus GameRoom

  // Helper function to get team color classes
  const getTeamColorClasses = (team: "royals" | "rebels" | undefined) => {
    if (!team) return "text-gray-400"; // Default color for unknown team
    return team === "royals" ? "text-amber-500" : "text-indigo-500";
  };

  // Helper function to get team icon
  const getTeamIcon = (team: "royals" | "rebels" | undefined) => {
    if (!team) return "👤"; // Default icon for unknown team
    return team === "royals" ? "👑" : "⚔️";
  };

  // Helper function to get suit color
  const getSuitColor = (suit: string) => {
    switch (suit) {
      case "hearts":
      case "diamonds":
        return "text-red-500";
      case "clubs":
      case "spades":
        return "text-slate-900 dark:text-slate-100";
      default:
        return "text-muted-foreground";
    }
  };

  // Helper function to get suit symbol
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "hearts":
        return "♥";
      case "diamonds":
        return "♦";
      case "clubs":
        return "♣";
      case "spades":
        return "♠";
      default:
        return suit;
    }
  };

  const [showReplaySummary, setShowReplaySummary] = useState(false);
  const [gameStartTime] = useState(Date.now());

  // Add replay hook
  const { getReplayData } = useReplay();

  // Generate game stats when game ends
  const generateGameStats = useMemo(() => {
    if (gameStatus !== "ended") return undefined;

    const winningTeam = scores.royals >= 7 ? "royals" : "rebels";
    const replayData = getReplayData();
    
    return {
      gameId: roomId,
      players: players,
      winner: winningTeam === "royals" ? "Royals" : "Rebels",
      gameMode: gameMode as "classic" | "frenzy",
      trumpSuit: (trumpSuit || "hearts") as string,
      finalScores: scores,
      duration: Math.floor((Date.now() - gameStartTime) / 1000), // Approximate duration
      totalTricks: scores.royals + scores.rebels,
    };
  }, [gameStatus, scores, roomId, players, gameMode, trumpSuit, getReplayData, gameStartTime]);

  // Add frenzy power handler
  const handleUseFrenzyPower = useCallback((powerType: string, data?: any) => {
    if (!user?.id) {
      console.error("[GameBoard] Cannot use frenzy power: No user ID");
      return;
    }

    // Send frenzy power message through the game store
    sendMessage({
      type: "game:frenzy-power",
      payload: {
        powerType,
        playerId: user.id,
        playerName: user.username || "Player",
        roomId,
        data,
        timestamp: Date.now(),
      },
    });
  }, [user, roomId, sendMessage]);

  // Render the game board
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-green-800/20 to-green-900/30">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-700/10 via-transparent to-transparent" />

      {/* Game table surface */}
      <div className="absolute inset-2 sm:inset-3 md:inset-4 rounded-lg md:rounded-xl bg-gradient-to-br from-green-800/30 to-green-900/40 border border-green-700/50 md:border-2 shadow-2xl" />

      {/* Main game area */}
      <div className="relative z-10 h-full p-2 sm:p-3 md:p-4 lg:p-6 flex flex-col">
        {/* Frenzy Mode Power Display - Keep this as it's unique to frenzy mode */}
        {gameMode === "frenzy" && trumpSuit && gameStatus === "playing" && (
          <div className="mb-2 sm:mb-3 md:mb-4 flex justify-center">
            <div className="bg-card/80 backdrop-blur-sm px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md md:rounded-lg border border-purple-500/30">
              <FrenzyPowers
                trumpSuit={trumpSuit}
                gameMode={gameMode}
                currentPlayer={user?.username || "You"}
                isCurrentUserTurn={isMyTurn || false}
                onUsePower={handleUseFrenzyPower}
              />
            </div>
          </div>
        )}

        {/* Game Summary Screen - Show when game has ended */}
        {gameStatus === "ended" ? (
          <div className="bg-gradient-to-b from-primary/10 to-primary/20 rounded-lg border border-primary/30 shadow-lg p-4 sm:p-6 md:p-8 flex flex-col items-center">
            <div className="mb-4 sm:mb-6 md:mb-8 text-center">
              <h2 className="text-2xl sm:text-3xl font-medieval mb-2">Game Over!</h2>
              <div className="text-lg sm:text-xl">
                {scores.royals >= 7 ? (
                  <span className="text-amber-500 font-bold flex items-center justify-center gap-2">
                    <span className="text-xl sm:text-2xl">👑</span> Royals Win!{" "}
                    <span className="text-xl sm:text-2xl">👑</span>
                  </span>
                ) : (
                  <span className="text-indigo-500 font-bold flex items-center justify-center gap-2">
                    <span className="text-xl sm:text-2xl">⚔️</span> Rebels Win!{" "}
                    <span className="text-xl sm:text-2xl">⚔️</span>
                  </span>
                )}
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-lg border border-primary/30 shadow-lg mb-4 sm:mb-6 md:mb-8 w-full max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-center">
                Final Score
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div
                  className={`p-3 sm:p-4 rounded-lg ${
                    scores.royals >= 7
                      ? "bg-amber-900/40 border border-amber-500/50"
                      : "bg-card/50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <span className="text-xl sm:text-2xl">👑</span>
                    <span className="text-base sm:text-lg font-medium">Royals</span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-center">
                    {scores.royals}
                  </div>
                </div>

                <div
                  className={`p-3 sm:p-4 rounded-lg ${
                    scores.rebels >= 7
                      ? "bg-indigo-900/40 border border-indigo-500/50"
                      : "bg-card/50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <span className="text-xl sm:text-2xl">⚔️</span>
                    <span className="text-base sm:text-lg font-medium">Rebels</span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-center">
                    {scores.rebels}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="text-md font-medium mb-2 text-center">
                  Team Members
                </h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <ul className="space-y-1">
                      {players
                        .filter(
                          (player) => storedTeamAssignments[player] === "royals"
                        )
                        .map((player) => (
                          <li key={player} className="text-amber-400">
                            {player}
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <ul className="space-y-1">
                      {players
                        .filter(
                          (player) => storedTeamAssignments[player] === "rebels"
                        )
                        .map((player) => (
                          <li key={player} className="text-indigo-400">
                            {player}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Statistics */}
            <div className="bg-card/80 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-lg border border-primary/30 shadow-lg mb-4 sm:mb-5 md:mb-6 w-full max-w-2xl">
              <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-center flex items-center justify-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                Game Statistics
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-center">
                <div className="bg-card/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{scores.royals + scores.rebels}</div>
                  <div className="text-sm text-muted-foreground">Total Tricks</div>
                </div>
                
                <div className="bg-card/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {trumpSuit === "hearts" ? "♥️" :
                     trumpSuit === "diamonds" ? "♦️" :
                     trumpSuit === "clubs" ? "♣️" : "♠️"}
                  </div>
                  <div className="text-sm text-muted-foreground">Trump Suit</div>
                </div>
                
                <div className="bg-card/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{players.length}</div>
                  <div className="text-sm text-muted-foreground">Players</div>
                </div>
                
                <div className="bg-card/50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{gameMode.charAt(0).toUpperCase() + gameMode.slice(1)}</div>
                  <div className="text-sm text-muted-foreground">Game Mode</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-5 md:mb-6 w-full max-w-2xl">
              <button
                onClick={() => setShowReplaySummary(true)}
                className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg shadow transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                View Replay
              </button>

              <button
                onClick={() => (window.location.href = "/")}
                className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg shadow transition-colors text-sm sm:text-base"
              >
                New Game
              </button>

              <button
                onClick={() => (window.location.href = "/")}
                className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg shadow transition-colors text-sm sm:text-base"
              >
                Return to Home
              </button>
            </div>

            <div className="mt-4 text-center text-muted-foreground text-sm">
              <p>Thanks for playing Turup's Gambit!</p>
              <p className="mt-1">A team wins by securing 7 out of 13 tricks.</p>
            </div>
          </div>
        ) : (
          /* Rest of the original game board UI for active game */
          <>
            {/* Card Play Area */}
            <div className="relative flex-1 min-h-0 bg-gradient-to-b from-primary/5 to-primary/10 rounded-md md:rounded-lg border border-primary/30 shadow-inner overflow-hidden">
              <div className="absolute inset-0 bg-card-pattern opacity-20" />

              {/* Top player */}
              <div className="absolute top-2 sm:top-4 md:top-6 lg:top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="flex flex-col items-center mb-0.5 sm:mb-1">
                  <div className="flex items-center">
                    <div className="font-medieval text-primary text-xs sm:text-sm md:text-base">
                      {players.length > 2 ? players[2] || "Player 3" : "Player 3"}
                    </div>
                    {/* Team indicator - make more robust with optional chaining */}
                    <span
                      className={`ml-0.5 sm:ml-1 text-xs sm:text-sm ${getTeamColorClasses(
                        players[2] ? storedTeamAssignments[players[2]] : undefined
                      )}`}
                    >
                      {getTeamIcon(
                        players[2] ? storedTeamAssignments[players[2]] : undefined
                      )}
                    </span>
                  </div>
                </div>
                {/* Vertical cards display */}
                <div className="flex space-x-0.5 sm:space-x-1">
                  {Array.from({
                    length:
                      gameStatus === "playing" ? 13 : initialCardsDeal ? 5 : 13,
                  }).map((_, i) => (
                    <div
                      key={`top-card-${i}`}
                      className="w-2 h-12 sm:w-3 sm:h-16 md:w-4 md:h-20 bg-card rounded-sm border border-primary/30 shadow-md"
                    />
                  ))}
                </div>
              </div>

              {/* Left player */}
              <div className="absolute left-2 sm:left-4 md:left-6 lg:left-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="flex flex-col items-center mb-0.5 sm:mb-1">
                  <div className="flex items-center">
                    <div className="font-medieval text-primary text-xs sm:text-sm md:text-base">
                      {players.length > 1 ? players[1] || "Player 2" : "Player 2"}
                    </div>
                    {/* Team indicator - make more robust */}
                    <span
                      className={`ml-0.5 sm:ml-1 text-xs sm:text-sm ${getTeamColorClasses(
                        players[1] ? storedTeamAssignments[players[1]] : undefined
                      )}`}
                    >
                      {getTeamIcon(
                        players[1] ? storedTeamAssignments[players[1]] : undefined
                      )}
                    </span>
                  </div>
                </div>
                {/* Vertical cards display */}
                <div className="flex flex-col space-y-0.5 sm:space-y-1">
                  {Array.from({
                    length:
                      gameStatus === "playing" ? 13 : initialCardsDeal ? 5 : 13,
                  }).map((_, i) => (
                    <div
                      key={`left-card-${i}`}
                      className="w-12 h-2 sm:w-16 sm:h-3 md:w-20 md:h-4 bg-card rounded-sm border border-primary/30 shadow-md"
                    />
                  ))}
                </div>
              </div>

              {/* Right player */}
              <div className="absolute right-2 sm:right-4 md:right-6 lg:right-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="flex flex-col items-center mb-0.5 sm:mb-1">
                  <div className="flex items-center">
                    <div className="font-medieval text-primary text-xs sm:text-sm md:text-base">
                      {players.length > 3 ? players[3] || "Player 4" : "Player 4"}
                    </div>
                    {/* Team indicator - make more robust */}
                    <span
                      className={`ml-0.5 sm:ml-1 text-xs sm:text-sm ${getTeamColorClasses(
                        players[3] ? storedTeamAssignments[players[3]] : undefined
                      )}`}
                    >
                      {getTeamIcon(
                        players[3] ? storedTeamAssignments[players[3]] : undefined
                      )}
                    </span>
                  </div>
                </div>
                {/* Vertical cards display */}
                <div className="flex flex-col space-y-0.5 sm:space-y-1">
                  {Array.from({
                    length:
                      gameStatus === "playing" ? 13 : initialCardsDeal ? 5 : 13,
                  }).map((_, i) => (
                    <div
                      key={`right-card-${i}`}
                      className="w-12 h-2 sm:w-16 sm:h-3 md:w-20 md:h-4 bg-card rounded-sm border border-primary/30 shadow-md"
                    />
                  ))}
                </div>
              </div>

              {/* Current trick - center cards */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
                  {centerCards.map((card, index) => (
                    <motion.div
                      key={`center-card-${card.id}-${index}`}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        damping: 12,
                        stiffness: 200,
                      }}
                      className="flex flex-col items-center"
                    >
                      <div className="flex flex-col items-center">
                        <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-0.5 sm:mb-1">
                          {card.playedBy}
                        </div>
                        {/* Team indicator with better undefined handling */}
                        <div
                          className={`text-[10px] sm:text-xs ${getTeamColorClasses(
                            storedTeamAssignments[card.playedBy]
                          )} mb-0.5 sm:mb-1`}
                        >
                          {getTeamIcon(storedTeamAssignments[card.playedBy])}
                        </div>
                      </div>
                      <Card
                        suit={card.suit}
                        value={card.value}
                        onClick={() => {}} // No action when clicking played cards
                        disabled={true}
                        is3D={true}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Trick Winner Message */}
              <AnimatePresence>
                {showTrickWinnerMessage && lastTrickResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                                ${
                                  lastTrickResult.winningTeam === "royals"
                                    ? "bg-amber-900/90 border-amber-500"
                                    : "bg-indigo-900/90 border-indigo-500"
                                }
                                backdrop-blur-sm p-3 px-6 rounded-lg border-2 shadow-lg z-30`}
                  >
                    <div className="text-center">
                      <div className="text-xl font-bold mb-1">
                        {lastTrickResult.winningTeam === "royals"
                          ? "👑 Royals Win! 👑"
                          : "⚔️ Rebels Win! ⚔️"}
                      </div>
                      <div className="text-sm">
                        {lastTrickResult.winningPlayer} won the trick
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emotes */}
              <AnimatePresence>
                {emotes.map((emote) => (
                  <motion.div
                    key={emote.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm p-2 rounded-full shadow-lg"
                  >
                    <div className="text-4xl md:text-5xl">{emote.emoji}</div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Bottom player (user) */}
              <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                {/* Game status message or turn indicator */}
                {gameStatus !== "playing" && (
                  <div className="mb-1 sm:mb-1.5 md:mb-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-card/80 backdrop-blur-sm rounded-md md:rounded-lg border border-primary/30 shadow text-xs sm:text-sm">
                    {gameStatus === "initial_deal" &&
                      "Waiting for initial deal to complete..."}
                    {gameStatus === "bidding" &&
                      "Trump selected. Waiting for final deal..."}
                    {gameStatus === "final_deal" && "Dealing remaining cards..."}
                  </div>
                )}
                {gameStatus === "playing" && !isMyTurn && (
                  <div className="mb-1 sm:mb-1.5 md:mb-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-card/80 backdrop-blur-sm rounded-md md:rounded-lg border border-primary/30 shadow text-xs sm:text-sm">
                    Waiting for your turn...
                  </div>
                )}
                {gameStatus === "playing" && isMyTurn && (
                  <div className="mb-1 sm:mb-1.5 md:mb-2 px-2 sm:px-4 py-1 sm:py-2 bg-green-800/80 backdrop-blur-sm rounded-md md:rounded-lg border border-green-500/50 shadow text-xs sm:text-sm animate-pulse">
                    Your turn to play!
                  </div>
                )}

                {/* Player hand cards */}
                <div className="flex justify-center gap-0.5 sm:gap-1 md:gap-1.5 lg:gap-2 mb-1 sm:mb-1.5 md:mb-2">
                  {playerHand.map((card: any) => (
                    <motion.div
                      key={`player-card-${card.id}`}
                      whileHover={{
                        y: (gameStatus === "playing" && isMyTurn) ? -10 : 0,
                        transition: { duration: 0.2 },
                      }}
                      onClick={() => handleCardClick(card.id)}
                      className={`cursor-pointer ${
                        selectedCard === card.id ? "transform -translate-y-4" : ""
                      } ${
                        playingCardId === card.id
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      } ${
                        gameStatus !== "playing" || !isMyTurn
                          ? "opacity-70 filter grayscale-[30%] cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <Card
                        suit={card.suit}
                        value={card.value}
                        onClick={() => handleCardClick(card.id)}
                        disabled={
                          playingCardId === card.id || gameStatus !== "playing"
                        }
                        is3D={true}
                      />
                      {playingCardId === card.id && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <LoadingSpinner size="sm" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Player name and team - improved with better undefined handling */}
                <div className="flex items-center justify-center mb-1 sm:mb-1.5 md:mb-2">
                  <div className="font-medieval text-primary text-sm sm:text-base md:text-lg">
                    {user?.username || "You"}
                  </div>
                  {/* Current player team indicator - make more robust */}
                  {user?.username && (
                    <span
                      className={`ml-0.5 sm:ml-1 text-sm sm:text-base md:text-lg ${getTeamColorClasses(
                        storedTeamAssignments[user.username]
                      )}`}
                    >
                      {getTeamIcon(storedTeamAssignments[user.username])}
                    </span>
                  )}
                </div>

                {/* Emote controls */}
                <InGameEmotes onEmote={handleEmote} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Replay Summary Modal */}
      <ReplaySummary
        isOpen={showReplaySummary}
        onClose={() => setShowReplaySummary(false)}
        gameData={generateGameStats}
      />
    </div>
  );
}
