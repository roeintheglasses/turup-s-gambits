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
  onUpdateGameState: (newState: any) => void;
  onRecordMove: (move: any) => void;
  onPlayCard: (card: any) => void;
  onBid: (bid: number) => void;
  sendMessage: (message: any) => Promise<boolean>;
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
  onUpdateGameState,
  onRecordMove,
  onPlayCard,
  sendMessage,
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

  const [centerCards, setCenterCards] = useState<CenterCard[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
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

  // Add refs to track player hand and current player index for bot logic
  const playerHandRef = useRef<any[]>([]);
  const centerCardsRef = useRef<any[]>([]);
  const currentPlayerIndexRef = useRef<number>(0);
  const gameStatusRef = useRef<string>("");

  // Get player hand from game state or use mock data if not available
  const getPlayerHand = useCallback(() => {
    // Get played cards from the store for this user
    const playedCardIds = user
      ? useGameStore.getState().playedCards[user.id] || []
      : [];

    if (gameState && user) {
      // Try to find the player in the game state
      console.log("[GameBoard] Debug GameState:", gameState);
      console.log(
        `[GameBoard] Current game status: ${gameStatus}, initialCardsDeal: ${initialCardsDeal}`
      );
      console.log("[GameBoard] Previously played cards:", playedCardIds);

      const player = gameState.players?.find(
        (p: PlayerInterface) => p.id === user.id
      );
      if (player && player.hand && player.hand.length > 0) {
        console.log(
          `[GameBoard] Player ${user.username} hand has ${player.hand.length} cards`
        );

        const cards = player.hand.map((card: any, index: number) => ({
          id: index,
          suit: card.suit,
          value: card.rank || card.value,
          apiId: `${card.suit}-${card.rank || card.value}`, // Add API ID for filtering
        }));

        // In playing state, always return all cards regardless of initialCardsDeal flag
        // But filter out cards that have been played
        if (gameStatus === "playing") {
          const filteredCards = cards.filter(
            (card: { apiId: string; suit: string; value: string }) =>
              !playedCardIds.includes(card.apiId) &&
              !playedCardIds.includes(`${card.suit}-${card.value}`)
          );

          console.log(
            `[GameBoard] In playing state - returning ${filteredCards.length} cards (filtered from ${cards.length})`
          );
          return filteredCards;
        }

        // For other states, respect the initialCardsDeal flag
        const finalHand = initialCardsDeal ? cards.slice(0, 5) : cards;
        console.log(
          `[GameBoard] Returning ${finalHand.length} cards for display (initialCardsDeal: ${initialCardsDeal})`
        );
        return finalHand;
      }
    }

    // Fallback to mock data if no hand is found
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

    // Filter mock hand by played cards too
    const filteredMockHand = mockHand.filter(
      (card: HandCard) =>
        !playedCardIds.includes(card.apiId) &&
        !playedCardIds.includes(`${card.suit}-${card.value}`)
    );

    // Return appropriate number of cards, but filtered by played cards
    if (gameStatus === "playing") {
      console.log(
        `[GameBoard] Using mock hand in playing state: ${filteredMockHand.length} cards (filtered from ${mockHand.length})`
      );
      return filteredMockHand;
    } else if (initialCardsDeal) {
      return filteredMockHand.slice(0, 5);
    } else {
      return filteredMockHand;
    }
  }, [gameState, user, gameStatus, initialCardsDeal]);

  // Memoize card click handler to prevent infinite rerenders
  const handleCardClick = useCallback(
    (cardId: number) => {
      // Get a fresh reference to UIStore to avoid stale state
      const { showToast } = useUIStore.getState();

      // Check if we're in the playing phase
      if (gameStatus !== "playing") {
        console.log(`[GameBoard] Cannot play card in ${gameStatus} phase`);
        showToast(
          `Cannot play card yet. Current phase: ${gameStatus}`,
          "warning"
        );
        return;
      }

      // Check if it's the player's turn
      if (currentPlayerIndex !== 0) {
        showToast("Not your turn to play", "warning");
        return;
      }

      // Check if a card is already being played
      if (cardPlayLoading) {
        console.log("[GameBoard] Card already being played");
        return;
      }

      setSelectedCard(cardId);
      setPlayingCardId(cardId);
      setCardPlayLoading(true);

      // Find the card in player's hand
      const card = playerHand.find((c: any) => c.id === cardId);
      if (!card) {
        console.error("[GameBoard] Card not found in player hand:", cardId);
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

      console.log("[GameBoard] Playing card:", apiCard);

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

      // Update the current player index optimistically
      setCurrentPlayerIndex(1); // Move to next player

      // Manually record this card as played in the game store
      if (user && user.id) {
        useGameStore.getState().updatePlayedCards(user.id, apiCard.id);
      }

      // Use the provided onPlayCard function
      try {
        onPlayCard(apiCard);
      } catch (error) {
        console.error("[GameBoard] Error playing card:", error);
        // Revert the optimistic updates
        setCenterCards((prev) => prev.filter((c) => c.playedBy !== playerName));

        // Restore the card to the player's hand
        setPlayerHandCards((prevHand) => [...prevHand, card]);

        setCurrentPlayerIndex(0);
        setCardPlayLoading(false);
        setPlayingCardId(null);
        showToast("Failed to play card. Please try again.", "error");
      }
    },
    [
      gameStatus,
      currentPlayerIndex,
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
    currentPlayerIndexRef.current = currentPlayerIndex;
  }, [currentPlayerIndex]);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  // Use the provided onRecordMove function
  const recordMove = (move: any) => {
    console.log("[GameBoard] Recording move:", move);
    onRecordMove(move);
  };

  // Update the player hand initialization effect
  useEffect(() => {
    // Always get a fresh hand when initializing or when game state changes
    const hand = getPlayerHand();
    console.log(
      `[GameBoard] Initializing player hand from gameState, has ${
        hand?.length || 0
      } cards (gameStatus: ${gameStatus})`
    );

    // Set the hand directly without checking handInitialized flag
    // This ensures we always have the correct hand after refresh or state change
    setPlayerHandCards(hand || []);

    // If we're in playing state, we need to ensure handInitialized is true
    // This prevents the hand from being reset during trick completions
    if (gameStatus === "playing") {
      if (!handInitialized) {
        console.log(
          "[GameBoard] Setting handInitialized to true for playing state"
        );
        setHandInitialized(true);
      }
    } else {
      // For other states, reset handInitialized flag to ensure we'll reload cards when state changes
      if (handInitialized) {
        console.log(
          "[GameBoard] Resetting handInitialized flag for non-playing state"
        );
        setHandInitialized(false);
      }
    }

    // Force a custom refresh event to ensure other components update
    if (gameStatus === "playing") {
      console.log("[GameBoard] Dispatching refresh event for playing state");
      // Use setTimeout to ensure this happens after state update
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("game:refreshState"));
      }, 100);
    }
  }, [gameState, gameStatus, initialCardsDeal, getPlayerHand]);

  // Fix the force refresh handler to actually update the state properly
  useEffect(() => {
    const handleRefreshState = (event: any) => {
      console.log("[GameBoard] Received force refresh event:", event.detail);

      // Force a re-evaluation of the player's hand
      const refreshedHand = getPlayerHand();
      console.log(
        `[GameBoard] Refreshed hand has ${refreshedHand.length} cards`
      );

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

  // Start the game with player 0 (user) when it enters playing state
  useEffect(() => {
    if (gameStatus === "playing") {
      setCurrentPlayerIndex(0); // Start with the user's turn
    }
  }, [gameStatus]);

  // Add a new debug function to help track team assignments
  const logTeamAssignments = useCallback(() => {
    console.log("[GameBoard] Current team assignments:", storedTeamAssignments);
    console.log("[GameBoard] Current players:", players);

    // Log each player's team assignment for debugging
    players.forEach((playerName, index) => {
      console.log(
        `[GameBoard] Player ${index} (${playerName}): Team ${
          storedTeamAssignments[playerName] || "unknown"
        }`
      );
    });
  }, [storedTeamAssignments, players]);

  // Replace the team assignment useEffect with one that respects stored assignments
  useEffect(() => {
    // Check if we already have team assignments in the store
    const hasExistingAssignments =
      Object.keys(storedTeamAssignments).length > 0;

    if (hasExistingAssignments) {
      // Use the stored team assignments
      console.log(
        "[GameBoard] Using stored team assignments:",
        storedTeamAssignments
      );

      // Check if all current players have team assignments
      const allPlayersHaveTeams = players.every(
        (playerName) => !!storedTeamAssignments[playerName]
      );

      if (!allPlayersHaveTeams) {
        console.log(
          "[GameBoard] Not all players have team assignments, updating..."
        );
        const updatedTeams = { ...storedTeamAssignments };

        players.forEach((playerName, index) => {
          if (!updatedTeams[playerName]) {
            // Assign new players based on their position
            updatedTeams[playerName] = index % 2 === 0 ? "royals" : "rebels";
            console.log(
              `[GameBoard] Assigned new player ${playerName} to team ${updatedTeams[playerName]}`
            );
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
      console.log("[GameBoard] Created new team assignments:", teams);
    }

    // Log the final team assignments for debugging
    logTeamAssignments();
  }, [players, storedTeamAssignments, setTeamAssignments, logTeamAssignments]);

  // When we have team assignments, update the local state
  useEffect(() => {
    if (Object.keys(storedTeamAssignments).length > 0) {
      console.log("[GameBoard] Updated local team assignments from store");
      setTeamAssignments(storedTeamAssignments);
    }
  }, [storedTeamAssignments, setTeamAssignments]);

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
      console.log(
        "[GameBoard] Skipping duplicate trick completion for:",
        trickId
      );
      return;
    }

    const currentCenterCards = [...centerCards];
    console.log(
      "[GameBoard] Determining trick winner for cards:",
      currentCenterCards
    );

    // Proper trick winning logic implementation
    // 1. Determine the lead suit (suit of the first card played)
    let leadSuit: string | null = null;
    if (centerCards.length > 0) {
      leadSuit = centerCards[0].suit;
    }

    console.log(`[GameBoard] Lead suit is ${leadSuit}`);

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
        console.log(
          `[GameBoard] Card ${i} (${currentCard.value} of ${currentCard.suit}) beats current winner with trump`
        );
      }
      // Case 2: Both cards are trump, compare ranks
      else if (
        currentCard.suit === trumpSuit &&
        winningCard.suit === trumpSuit
      ) {
        if (cardRanks[currentCard.value] > cardRanks[winningCard.value]) {
          winningCardIndex = i;
          winningCard = currentCard;
          console.log(
            `[GameBoard] Card ${i} (${currentCard.value} of ${currentCard.suit}) beats current winner with higher trump`
          );
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
          console.log(
            `[GameBoard] Card ${i} (${currentCard.value} of ${currentCard.suit}) beats current winner with higher lead suit card`
          );
        }
      }
      // All other cases: Current card cannot win (different suit, not trump)
    }

    const winningPlayerName = winningCard.playedBy;

    // Determine which team won (based on player name)
    const winningTeam = storedTeamAssignments[winningPlayerName] || "royals";

    console.log(
      `[GameBoard] Trick won by ${winningPlayerName} (${winningTeam}) with ${winningCard.value} of ${winningCard.suit}`
    );

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
      console.log(
        `[GameBoard] Game ended! ${
          newScores.royals >= 7 ? "Royals" : "Rebels"
        } win with ${
          newScores.royals >= 7 ? newScores.royals : newScores.rebels
        } tricks`
      );
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
        setCurrentPlayerIndex(0);

        // Reset card play loading states to allow new card plays
        setCardPlayLoading(false);
        setPlayingCardId(null);

        console.log("[GameBoard] Ready for next trick - play states reset");
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
      const timer = setTimeout(() => {
        handleTrickCompletion();
      }, 500); // Reduced from 1500ms to 500ms for faster game play

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
      console.log("[GameBoard] Playing card:", card);

      // Disable clicking if a card is already being played
      if (cardPlayLoading || playingCardId) {
        console.log(
          "[GameBoard] Card play in progress, ignoring new card play"
        );
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

      // Update the current player index optimistically
      setCurrentPlayerIndex(1); // Move to next player

      // Delay to show animation
      setTimeout(() => {
        // Call the onPlayCard callback to actually play the card
        if (onPlayCard) {
          console.log("[GameBoard] Sending card play to game store:", card);
          try {
            onPlayCard(card);
          } catch (error) {
            console.error("[GameBoard] Error playing card:", error);
            // Revert the optimistic updates
            setCenterCards((prev) =>
              prev.filter((c) => c.playedBy !== playerName)
            );
            setCurrentPlayerIndex(0);
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

  // Bot playing logic
  useEffect(() => {
    // Only run bot logic when game is in playing state and it's not the user's turn
    if (gameStatus !== "playing" || currentPlayerIndex === 0) {
      return;
    }

    // The bot currently playing is at index currentPlayerIndex
    const currentBotIndex = currentPlayerIndex;

    // Get the bot name from players array
    const botName = players[currentBotIndex] || `Player ${currentBotIndex + 1}`;

    console.log(`[GameBoard] Bot ${botName} is thinking...`);

    // Delay to simulate thinking time (1-3 seconds)
    const thinkingTime = 1000 + Math.random() * 2000;

    const botPlayTimeout = setTimeout(() => {
      // Generate a bot card play
      makeBotCardPlay(currentBotIndex, botName);
    }, thinkingTime);

    return () => {
      clearTimeout(botPlayTimeout);
    };
  }, [gameStatus, currentPlayerIndex, players]);

  // Function to handle bot card play
  const makeBotCardPlay = useCallback(
    (botIndex: number, botName: string) => {
      console.log(`[GameBoard] Bot ${botName} is playing a card`);

      // Get a valid suit to play if there's a leading card
      let leadSuit: string | null = null;
      if (centerCards.length > 0) {
        leadSuit = centerCards[0].suit;
      }

      // Available suits and ranks for bot to use
      const suits = ["hearts", "diamonds", "clubs", "spades"];
      const ranks = [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
        "A",
      ];

      // Create a random card for the bot to play
      // In a real game, this would use the bot's actual hand and follow game rules

      // Randomly choose a suit, but respect the lead suit if possible
      let selectedSuit = suits[Math.floor(Math.random() * suits.length)];

      // If there's a trump suit in play, sometimes play it
      if (trumpSuit && Math.random() > 0.7) {
        selectedSuit = trumpSuit;
      }
      // If there's a lead suit, follow it most of the time
      else if (leadSuit && Math.random() > 0.2) {
        selectedSuit = leadSuit;
      }

      // Choose a random rank
      const selectedRank = ranks[Math.floor(Math.random() * ranks.length)];

      // Create card ID
      const cardId = `${selectedSuit}-${selectedRank}`;

      // Create the bot's card
      const botCard = {
        id: cardId,
        suit: selectedSuit,
        rank: selectedRank,
      };

      // Create UI card for display
      const uiCard: CenterCard = {
        id: Math.floor(Math.random() * 1000), // Random ID for UI
        suit: selectedSuit,
        value: selectedRank,
        playedBy: botName,
      };

      // Add card to center
      setCenterCards((prev) => {
        // Check if this bot already has a card in the center
        if (prev.some((c) => c.playedBy === botName)) {
          return prev;
        }
        return [...prev, uiCard];
      });

      // Move to next player
      setCurrentPlayerIndex((prevIndex) => (prevIndex + 1) % 4);

      // Record the move
      recordMove({
        type: "playCard",
        player: botName,
        card: uiCard,
      });

      // Create a synthetic bot ID for tracking played cards
      const botPlayerId = `bot-${botIndex}-${botName}`;

      // Track this card as played by the bot
      useGameStore.getState().updatePlayedCards(botPlayerId, cardId);

      // Send message to server about the bot play if needed
      if (sendMessage) {
        try {
          sendMessage({
            type: "game:play-card",
            payload: {
              roomId,
              playerId: `bot-${botIndex}`,
              playerName: botName,
              card: botCard,
              gamePhase: gameStatus,
              isBot: true,
            },
          });
        } catch (error) {
          console.error(
            `[GameBoard] Error sending bot card play message:`,
            error
          );
        }
      }
    },
    [
      centerCards,
      currentPlayerIndex,
      gameStatus,
      recordMove,
      roomId,
      sendMessage,
      trumpSuit,
      setCenterCards,
      setCurrentPlayerIndex,
    ]
  );

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
    console.log(`[GameBoard] Using frenzy power: ${powerType}`, data);
    
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
      <div className="absolute inset-4 rounded-xl bg-gradient-to-br from-green-800/30 to-green-900/40 border-2 border-green-700/50 shadow-2xl" />

      {/* Main game area */}
      <div className="relative z-10 h-full p-6 flex flex-col">
        {/* Frenzy Mode Power Display - Keep this as it's unique to frenzy mode */}
        {gameMode === "frenzy" && trumpSuit && gameStatus === "playing" && (
          <div className="mb-4 flex justify-center">
            <div className="bg-card/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-500/30">
              <FrenzyPowers
                trumpSuit={trumpSuit}
                gameMode={gameMode}
                currentPlayer={currentPlayerIndex === 0 ? (user?.username || "You") : (players[currentPlayerIndex] || "Player")}
                isCurrentUserTurn={currentPlayerIndex === 0}
                onUsePower={handleUseFrenzyPower}
              />
            </div>
          </div>
        )}

        {/* Game Summary Screen - Show when game has ended */}
        {gameStatus === "ended" ? (
          <div className="bg-gradient-to-b from-primary/10 to-primary/20 rounded-lg border border-primary/30 shadow-lg p-8 flex flex-col items-center">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-medieval mb-2">Game Over!</h2>
              <div className="text-xl">
                {scores.royals >= 7 ? (
                  <span className="text-amber-500 font-bold flex items-center justify-center gap-2">
                    <span className="text-2xl">👑</span> Royals Win!{" "}
                    <span className="text-2xl">👑</span>
                  </span>
                ) : (
                  <span className="text-indigo-500 font-bold flex items-center justify-center gap-2">
                    <span className="text-2xl">⚔️</span> Rebels Win!{" "}
                    <span className="text-2xl">⚔️</span>
                  </span>
                )}
              </div>
            </div>

            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-primary/30 shadow-lg mb-8 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4 text-center">
                Final Score
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg ${
                    scores.royals >= 7
                      ? "bg-amber-900/40 border border-amber-500/50"
                      : "bg-card/50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">👑</span>
                    <span className="text-lg font-medium">Royals</span>
                  </div>
                  <div className="text-4xl font-bold text-center">
                    {scores.royals}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    scores.rebels >= 7
                      ? "bg-indigo-900/40 border border-indigo-500/50"
                      : "bg-card/50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">⚔️</span>
                    <span className="text-lg font-medium">Rebels</span>
                  </div>
                  <div className="text-4xl font-bold text-center">
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
            <div className="bg-card/80 backdrop-blur-sm p-6 rounded-lg border border-primary/30 shadow-lg mb-6 w-full max-w-2xl">
              <h3 className="text-xl font-semibold mb-4 text-center flex items-center justify-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Game Statistics
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setShowReplaySummary(true)}
                className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg shadow transition-colors flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View Replay
              </button>
              
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-3 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg shadow transition-colors"
              >
                New Game
              </button>
              
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg shadow transition-colors"
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
            <div className="relative flex-1 min-h-0 bg-gradient-to-b from-primary/5 to-primary/10 rounded-lg border border-primary/30 shadow-inner overflow-hidden">
              <div className="absolute inset-0 bg-card-pattern opacity-20" />

              {/* Top player */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="flex flex-col items-center mb-1">
                  <div className="flex items-center">
                    <div className="font-medieval text-primary">
                      {players.length > 2 ? players[2] || "Player 3" : "Player 3"}
                    </div>
                    {/* Team indicator - make more robust with optional chaining */}
                    <span
                      className={`ml-1 ${getTeamColorClasses(
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
                <div className="flex space-x-1">
                  {Array.from({
                    length:
                      gameStatus === "playing" ? 13 : initialCardsDeal ? 5 : 13,
                  }).map((_, i) => (
                    <div
                      key={`top-card-${i}`}
                      className="w-4 h-20 bg-card rounded-sm border border-primary/30 shadow-md"
                    />
                  ))}
                </div>
              </div>

              {/* Left player */}
              <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="flex flex-col items-center mb-1">
                  <div className="flex items-center">
                    <div className="font-medieval text-primary">
                      {players.length > 1 ? players[1] || "Player 2" : "Player 2"}
                    </div>
                    {/* Team indicator - make more robust */}
                    <span
                      className={`ml-1 ${getTeamColorClasses(
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
                <div className="flex flex-col space-y-1">
                  {Array.from({
                    length:
                      gameStatus === "playing" ? 13 : initialCardsDeal ? 5 : 13,
                  }).map((_, i) => (
                    <div
                      key={`left-card-${i}`}
                      className="w-20 h-4 bg-card rounded-sm border border-primary/30 shadow-md"
                    />
                  ))}
                </div>
              </div>

              {/* Right player */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="flex flex-col items-center mb-1">
                  <div className="flex items-center">
                    <div className="font-medieval text-primary">
                      {players.length > 3 ? players[3] || "Player 4" : "Player 4"}
                    </div>
                    {/* Team indicator - make more robust */}
                    <span
                      className={`ml-1 ${getTeamColorClasses(
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
                <div className="flex flex-col space-y-1">
                  {Array.from({
                    length:
                      gameStatus === "playing" ? 13 : initialCardsDeal ? 5 : 13,
                  }).map((_, i) => (
                    <div
                      key={`right-card-${i}`}
                      className="w-20 h-4 bg-card rounded-sm border border-primary/30 shadow-md"
                    />
                  ))}
                </div>
              </div>

              {/* Current trick - center cards */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 md:gap-8">
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
                        <div className="text-xs md:text-sm text-muted-foreground mb-1">
                          {card.playedBy}
                        </div>
                        {/* Team indicator with better undefined handling */}
                        <div
                          className={`text-xs ${getTeamColorClasses(
                            storedTeamAssignments[card.playedBy]
                          )} mb-1`}
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
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                {/* Game status message or turn indicator */}
                {gameStatus !== "playing" && (
                  <div className="mb-2 px-3 py-1 bg-card/80 backdrop-blur-sm rounded-lg border border-primary/30 shadow text-sm">
                    {gameStatus === "initial_deal" &&
                      "Waiting for initial deal to complete..."}
                    {gameStatus === "bidding" &&
                      "Trump selected. Waiting for final deal..."}
                    {gameStatus === "final_deal" && "Dealing remaining cards..."}
                  </div>
                )}
                {gameStatus === "playing" && currentPlayerIndex !== 0 && (
                  <div className="mb-2 px-3 py-1 bg-card/80 backdrop-blur-sm rounded-lg border border-primary/30 shadow text-sm">
                    Waiting for your turn...
                  </div>
                )}
                {gameStatus === "playing" && currentPlayerIndex === 0 && (
                  <div className="mb-2 px-4 py-2 bg-green-800/80 backdrop-blur-sm rounded-lg border border-green-500/50 shadow text-sm animate-pulse">
                    Your turn to play!
                  </div>
                )}

                {/* Player hand cards */}
                <div className="flex justify-center gap-1 md:gap-2 mb-2">
                  {playerHand.map((card: any) => (
                    <motion.div
                      key={`player-card-${card.id}`}
                      whileHover={{
                        y: gameStatus === "playing" ? -10 : 0,
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
                        gameStatus !== "playing"
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
                <div className="flex items-center justify-center mb-2">
                  <div className="font-medieval text-primary text-lg">
                    {user?.username || "You"}
                  </div>
                  {/* Current player team indicator - make more robust */}
                  {user?.username && (
                    <span
                      className={`ml-1 text-lg ${getTeamColorClasses(
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
