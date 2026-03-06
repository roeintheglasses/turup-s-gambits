"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/card";
import { type Card as CardType, type Player, type Suit } from "@/app/types/game";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useReplay } from "@/hooks/use-replay";
import { ReplaySummary } from "./replay-summary";
import { BarChart3, Eye, Crown, Swords, History } from "lucide-react";
import { playSoundEffect } from "@/hooks/use-sound-effects";
import { TrumpSelectionPopup } from "@/components/trump-selection-popup";
import { FrenzyPowers } from "@/components/frenzy-powers";

// Phase 1: Redesigned components
import { GameInfoWidget } from "@/components/game-board/game-info-widget";
import { CenterTrickArea } from "@/components/game-board/center-trick-area";
import { OpponentArea } from "@/components/game-board/opponent-area";
import { PlayerHand } from "@/components/game-board/player-hand";
import { TableSurface } from "@/components/game-board/table-surface";
import type { ConnectionQuality } from "@/hooks/use-connection-quality";
import { useTurnNotification } from "@/hooks/use-turn-notification";
import { LastTrickReview } from "@/components/game-board/last-trick-review";

interface CenterCard {
  id: number | string;
  suit: string;
  value: string;
  playedBy: string;
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
  sendMessage: (message: any) => Promise<boolean>;
  playerHand?: any[];
  currentTurn?: string;
  turnStartedAt?: number;
  currentPlayerId?: string;
  connectionQuality?: ConnectionQuality;
  latency?: number | null;
  trumpSuit?: Suit | null;
  scores?: { royals: number; rebels: number };
}

type HandCard = {
  id: number | string;
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
  turnStartedAt,
  currentPlayerId,
  connectionQuality,
  latency,
  trumpSuit: trumpSuitProp,
  scores: scoresProp,
}: GameBoardProps) {
  const trumpSuit = trumpSuitProp ?? null;
  const scores = scoresProp ?? { royals: 0, rebels: 0 };
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

  const isMyTurn =
    currentTurn && currentPlayerId && currentTurn === currentPlayerId;

  // Turn notification for unfocused tab
  useTurnNotification({
    isMyTurn: !!isMyTurn,
    isPlaying: gameStatus === "playing",
    playerName: user?.username,
  });

  const [centerCards, setCenterCards] = useState<CenterCard[]>([]);
  const [lastTrickResult, setLastTrickResult] = useState<TrickResult | null>(
    null
  );
  const [showTrickWinnerMessage, setShowTrickWinnerMessage] = useState(false);
  const [playerHandCards, setPlayerHandCards] = useState<any[]>([]);
  const [handInitialized, setHandInitialized] = useState(false);
  const [processedTrickIds, setProcessedTrickIds] = useState<Set<string>>(
    new Set()
  );

  const playerHand = playerHandCards;

  const playerHandRef = useRef<any[]>([]);
  const centerCardsRef = useRef<any[]>([]);
  const gameStatusRef = useRef<string>("");
  // Track the last known server hand so we can restore on rejected plays
  const lastServerHandRef = useRef<any[]>([]);
  const pendingPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const getPlayerHand = useCallback(() => {
    // Sort order: group by suit, then rank within each suit
    const suitOrder: Record<string, number> = {
      spades: 0,
      hearts: 1,
      diamonds: 2,
      clubs: 3,
    };
    const rankOrder: Record<string, number> = {
      "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
      "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
    };
    const sortHand = (cards: any[]) =>
      [...cards].sort((a, b) => {
        const suitDiff = (suitOrder[a.suit] ?? 99) - (suitOrder[b.suit] ?? 99);
        if (suitDiff !== 0) return suitDiff;
        return (rankOrder[a.value] ?? 0) - (rankOrder[b.value] ?? 0);
      });

    if (colyseusPlayerHand !== undefined) {
      if (colyseusPlayerHand.length === 0) {
        return [];
      }
      const cards = colyseusPlayerHand.map((card: any, index: number) => ({
        id: card.id,
        suit: card.suit,
        value: card.rank || card.value,
        apiId: card.id,
      }));
      return sortHand(cards);
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
          apiId: `${card.suit}-${card.rank || card.value}`,
        }));
        if (gameStatus === "playing") {
          return sortHand(cards);
        }
        const sliced = initialCardsDeal ? cards.slice(0, 5) : cards;
        return sortHand(sliced);
      }
    }

    // Fallback mock data
    const mockHand = [
      { id: 1, suit: "hearts", value: "A", apiId: "hearts-A" },
      { id: 2, suit: "spades", value: "K", apiId: "spades-K" },
      { id: 3, suit: "diamonds", value: "Q", apiId: "diamonds-Q" },
      { id: 4, suit: "clubs", value: "J", apiId: "clubs-J" },
      { id: 5, suit: "hearts", value: "10", apiId: "hearts-10" },
    ];
    const fallback = gameStatus === "playing"
      ? mockHand
      : initialCardsDeal
      ? mockHand.slice(0, 5)
      : mockHand;
    return sortHand(fallback);
  }, [gameState, user, gameStatus, initialCardsDeal, colyseusPlayerHand]);

  const isPlayingCardRef = useRef(false);

  const handleCardClick = useCallback(
    (cardId: number | string) => {
      const { showToast } = useUIStore.getState();

      if (isPlayingCardRef.current) return;
      if (gameStatus !== "playing") {
        showToast(
          `Cannot play card yet. Current phase: ${gameStatus}`,
          "warning"
        );
        return;
      }
      if (!isMyTurn) {
        showToast("Not your turn to play", "warning");
        return;
      }
      if (cardPlayLoading) return;

      isPlayingCardRef.current = true;
      setSelectedCard(cardId);
      setPlayingCardId(cardId);
      setCardPlayLoading(true);

      const card = playerHand.find((c: any) => c.id === cardId);
      if (!card) {
        console.error("[GameBoard] Card not found:", cardId);
        isPlayingCardRef.current = false;
        setCardPlayLoading(false);
        setPlayingCardId(null);
        return;
      }

      const apiCard = {
        id: card.apiId || `${card.suit}-${card.value}`,
        suit: card.suit as any,
        rank: card.value as any,
      };

      const playerName = user?.username || "You";
      const uiCard: CenterCard = {
        id: cardId,
        suit: card.suit,
        value: card.value,
        playedBy: playerName,
      };

      setCenterCards((prev) => {
        if (prev.some((c) => c.playedBy === playerName)) return prev;
        return [...prev, uiCard];
      });

      // Optimistic removal: remove card from hand immediately for snappy UX.
      // If the server rejects the play, the next server state sync will
      // restore the card since the server still has it in the player's hand.
      setPlayerHandCards((prevHand) => prevHand.filter((c) => c.id !== cardId));

      // Safety net: if no server state update arrives within 3 seconds,
      // restore hand from the last known server state to prevent permanent loss.
      if (pendingPlayTimerRef.current) {
        clearTimeout(pendingPlayTimerRef.current);
      }
      pendingPlayTimerRef.current = setTimeout(() => {
        pendingPlayTimerRef.current = null;
        // Restore from last known server hand if the card was rejected
        if (lastServerHandRef.current.length > 0) {
          setPlayerHandCards(lastServerHandRef.current);
        }
        isPlayingCardRef.current = false;
        setCardPlayLoading(false);
        setPlayingCardId(null);
      }, 3000);

      try {
        onPlayCard(apiCard);
        setTimeout(() => {
          isPlayingCardRef.current = false;
        }, 500);
      } catch (error) {
        console.error("[GameBoard] Error playing card:", error);
        if (pendingPlayTimerRef.current) {
          clearTimeout(pendingPlayTimerRef.current);
          pendingPlayTimerRef.current = null;
        }
        setCenterCards((prev) => prev.filter((c) => c.playedBy !== playerName));
        setPlayerHandCards(lastServerHandRef.current);
        isPlayingCardRef.current = false;
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
    ]
  );

  useEffect(() => {
    playerHandRef.current = playerHand;
  }, [playerHand]);

  useEffect(() => {
    centerCardsRef.current = centerCards;
  }, [centerCards]);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  const recordMove = (move: any) => {
    onRecordMove(move);
  };

  // Always trust the server's authoritative hand state.
  // This ensures rejected card plays are automatically restored since the
  // server still has the card in the player's hand after rejection.
  useEffect(() => {
    const hand = getPlayerHand();
    const serverHand = hand || [];

    // Store the latest server hand for fallback recovery
    lastServerHandRef.current = serverHand;

    // Server sent a state update, so clear any pending play timeout.
    // The server hand is authoritative -- if it still contains a card we
    // optimistically removed, this naturally restores it.
    if (pendingPlayTimerRef.current) {
      clearTimeout(pendingPlayTimerRef.current);
      pendingPlayTimerRef.current = null;
    }

    setPlayerHandCards(serverHand);

    if (gameStatus === "playing" && !handInitialized) {
      setHandInitialized(true);
    } else if (gameStatus !== "playing" && handInitialized) {
      setHandInitialized(false);
    }
  }, [gameState, gameStatus, initialCardsDeal, getPlayerHand, colyseusPlayerHand]);

  useEffect(() => {
    const handleRefreshState = () => {
      const refreshedHand = getPlayerHand();
      setPlayerHandCards(refreshedHand);
      if (gameStatus === "playing" && !handInitialized) {
        setHandInitialized(true);
      }
    };
    window.addEventListener("game:refreshState", handleRefreshState);
    return () =>
      window.removeEventListener("game:refreshState", handleRefreshState);
  }, [getPlayerHand, gameStatus, handInitialized]);

  useEffect(() => {
    const hasExistingAssignments =
      Object.keys(storedTeamAssignments).length > 0;
    if (hasExistingAssignments) {
      const allPlayersHaveTeams = players.every(
        (playerName) => !!storedTeamAssignments[playerName]
      );
      if (!allPlayersHaveTeams) {
        const updatedTeams = { ...storedTeamAssignments };
        players.forEach((playerName, index) => {
          if (!updatedTeams[playerName]) {
            updatedTeams[playerName] = index % 2 === 0 ? "royals" : "rebels";
          }
        });
        setTeamAssignments(updatedTeams);
      }
    } else {
      const teams: Record<string, "royals" | "rebels"> = {};
      players.forEach((playerName, index) => {
        teams[playerName] = index % 2 === 0 ? "royals" : "rebels";
      });
      setTeamAssignments(teams);
    }
  }, [players, storedTeamAssignments, setTeamAssignments]);

  useEffect(() => {
    if (Object.keys(storedTeamAssignments).length > 0) {
      setTeamAssignments(storedTeamAssignments);
    }
  }, [storedTeamAssignments, setTeamAssignments]);

  // Sync center cards with Colyseus current trick
  useEffect(() => {
    if (!currentTrick || typeof currentTrick !== "object") return;
    const { cards, playedBy } = currentTrick;
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      setCenterCards([]);
      return;
    }

    const convertedCards: CenterCard[] = cards.map(
      (card: any, index: number) => {
        const playerId = playedBy?.[index];
        let playerName = `Player ${index + 1}`;

        // Method 1: Try to find player by ID in gameState.players (array of Player objects)
        if (gameState?.players && Array.isArray(gameState.players)) {
          const player = gameState.players.find((p: any) => {
            if (typeof p === "object" && p !== null) {
              return p.id === playerId;
            }
            return false;
          });
          if (player && typeof player === "object") {
            playerName = player.name || player.id || playerName;
          }
        }

        // Method 2: If still not found, check if players prop has objects (via gameState.players fallback)
        if (
          playerName.startsWith("Player ") &&
          gameState?.players &&
          Array.isArray(gameState.players)
        ) {
          const playerFromState = gameState.players.find(
            (p: any) => typeof p === "object" && p !== null && p.id === playerId
          );
          if (playerFromState && typeof playerFromState === "object") {
            const pName =
              (playerFromState as any).name || (playerFromState as any).id;
            if (pName) {
              playerName = pName;
            }
          }
        }

        // Method 3: If players prop is strings and we still don't have a name,
        // use the card's playedBy position to map to player position
        // Note: This assumes cards are played in order by position, which may not be true
        if (
          playerName.startsWith("Player ") &&
          Array.isArray(players) &&
          players.length > 0
        ) {
          // Get the player who played this card by finding them in the full players list
          // and using their position to determine table position
          if (typeof players[0] === "string") {
            // players is an array of names, can't map by ID
            // Just use the index as fallback (not accurate but better than "Player X")
            if (players[index]) {
              playerName = players[index];
            }
          }
        }

        return {
          id: index,
          suit: card.suit || "hearts",
          value: card.value || "A",
          playedBy: playerName,
        };
      }
    );
    setCenterCards(convertedCards);
  }, [currentTrick, players, gameState]);

  // Memoize leading suit - only recalculate when centerCards changes
  const leadingSuit = useMemo((): string | null => {
    if (centerCards.length === 0) return null;
    return centerCards[0].suit;
  }, [centerCards]);

  // Memoize winning card index - only recalculate when centerCards or trumpSuit changes
  const winningCardIndex = useMemo((): number | null => {
    if (centerCards.length === 0) return null;
    const leadSuit = centerCards[0].suit;
    let winningIndex = 0;
    let winningCard = centerCards[0];
    const cardValues: Record<string, number> = {
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
    for (let i = 1; i < centerCards.length; i++) {
      const card = centerCards[i];
      if (trumpSuit && card.suit === trumpSuit) {
        if (winningCard.suit !== trumpSuit) {
          winningIndex = i;
          winningCard = card;
        } else if (cardValues[card.value] > cardValues[winningCard.value]) {
          winningIndex = i;
          winningCard = card;
        }
      } else if (card.suit === leadSuit && winningCard.suit !== trumpSuit) {
        if (
          winningCard.suit !== leadSuit ||
          cardValues[card.value] > cardValues[winningCard.value]
        ) {
          winningIndex = i;
          winningCard = card;
        }
      }
    }
    return winningIndex;
  }, [centerCards, trumpSuit]);

  // Keep callback version for handleTrickCompletion compatibility
  const getLeadingSuit = useCallback(
    (): string | null => leadingSuit,
    [leadingSuit]
  );
  const calculateWinningCardIndex = useCallback(
    (): number | null => winningCardIndex,
    [winningCardIndex]
  );

  const handleTrickCompletion = useCallback(() => {
    if (centerCards.length !== 4) return;

    const trickId = centerCards
      .map((card) => `${card.suit}-${card.value}-${card.playedBy}`)
      .sort()
      .join("|");
    if (processedTrickIds.has(trickId)) return;

    const currentCenterCards = [...centerCards];
    let leadSuit: string | null = centerCards[0]?.suit || null;
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

    let winningCardIndex = 0;
    let winningCard = currentCenterCards[0];

    for (let i = 1; i < currentCenterCards.length; i++) {
      const currentCard = currentCenterCards[i];
      if (currentCard.suit === trumpSuit && winningCard.suit !== trumpSuit) {
        winningCardIndex = i;
        winningCard = currentCard;
      } else if (
        currentCard.suit === trumpSuit &&
        winningCard.suit === trumpSuit
      ) {
        if (cardRanks[currentCard.value] > cardRanks[winningCard.value]) {
          winningCardIndex = i;
          winningCard = currentCard;
        }
      } else if (
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
    }

    const winningPlayerName = winningCard.playedBy;
    const winningTeam = storedTeamAssignments[winningPlayerName] || "royals";

    const trickResult: TrickResult = {
      winningPlayer: winningPlayerName,
      winningTeam: winningTeam,
      cards: currentCenterCards,
      timestamp: Date.now(),
    };

    setLastTrickResult(trickResult);
    setShowTrickWinnerMessage(true);

    // Play trick win sound
    playSoundEffect("trickWin", 0.5);

    recordMove({
      type: "trickComplete",
      winner: winningPlayerName,
      team: winningTeam,
      cards: currentCenterCards,
    });

    const newScores = {
      ...scores,
      [winningTeam]: (scores[winningTeam] || 0) + 1,
    };
    setProcessedTrickIds((prev) => new Set(prev).add(trickId));

    const gameEnded = newScores.royals >= 7 || newScores.rebels >= 7;
    if (gameEnded) {
      // Play game end sound based on whether current player's team won
      const currentUserTeam = storedTeamAssignments[user?.username || ""];
      const winningTeam = newScores.royals >= 7 ? "royals" : "rebels";
      setTimeout(() => {
        if (currentUserTeam === winningTeam) {
          playSoundEffect("gameWin", 0.6);
        } else {
          playSoundEffect("gameLose", 0.5);
        }
      }, 600);

      onUpdateGameState({
        scores: newScores,
        gameStatus: "ended",
        updateField: "game_end",
      });
    } else {
      onUpdateGameState({ scores: newScores, updateField: "scores" });
    }

    setTimeout(() => {
      setShowTrickWinnerMessage(false);
      if (!gameEnded) {
        setCenterCards([]);
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

  useEffect(() => {
    if (centerCards.length === 4) {
      const timer = setTimeout(() => handleTrickCompletion(), 2000);
      return () => clearTimeout(timer);
    }
  }, [centerCards.length, handleTrickCompletion]);

  // Play turn notification sound when it becomes the player's turn
  const prevIsMyTurnRef = useRef(false);
  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current && gameStatus === "playing") {
      playSoundEffect("turnNotify", 0.4);
    }
    prevIsMyTurnRef.current = !!isMyTurn;
  }, [isMyTurn, gameStatus]);

  useEffect(() => {
    if (cardPlayLoading) {
      setCardPlayLoading(false);
      setPlayingCardId(null);
    }
  }, [isMyTurn]);

  const [showLastTrickReview, setShowLastTrickReview] = useState(false);
  const [showReplaySummary, setShowReplaySummary] = useState(false);
  const [gameStartTime] = useState(Date.now());
  const { getReplayData } = useReplay();

  const generateGameStats = useMemo(() => {
    if (gameStatus !== "ended") return undefined;
    const winningTeam = scores.royals >= 7 ? "royals" : "rebels";
    return {
      gameId: roomId,
      players: players,
      winner: winningTeam === "royals" ? "Royals" : "Rebels",
      gameMode: gameMode as "classic" | "frenzy",
      trumpSuit: (trumpSuit || "hearts") as string,
      finalScores: scores,
      duration: Math.floor((Date.now() - gameStartTime) / 1000),
      totalTricks: scores.royals + scores.rebels,
    };
  }, [gameStatus, scores, roomId, players, gameMode, trumpSuit, gameStartTime]);

  const handleUseFrenzyPower = useCallback(
    (powerType: string, data?: any) => {
      if (!user?.id) return;
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
    },
    [user, roomId, sendMessage]
  );

  // Get player positions with names and connection status for center trick area
  // Rotate based on current player's position so they always appear at bottom
  const playerPositions = useMemo(() => {
    // Build sorted players array by position
    const sortedPlayers: Array<{
      id: string;
      name: string;
      position: number;
      isConnected: boolean;
      isBot: boolean;
      handSize: number;
    }> = [];

    if (gameState?.players && Array.isArray(gameState.players)) {
      // gameState.players is an array of Player objects sorted by position
      gameState.players.forEach((p: any) => {
        if (typeof p === "object" && p !== null) {
          sortedPlayers.push({
            id: p.id || "",
            name: p.name || p.id || `Player ${sortedPlayers.length + 1}`,
            position:
              typeof p.position === "number"
                ? p.position
                : sortedPlayers.length,
            isConnected: p.isConnected !== false, // Default to true if not specified
            isBot: p.isBot === true,
            handSize: p.hand?.length ?? 0,
          });
        }
      });
    }

    // Sort by position to ensure correct order
    sortedPlayers.sort((a, b) => a.position - b.position);

    // Find current player's position
    let currentPlayerPosition = 0;
    if (currentPlayerId) {
      const currentPlayerIndex = sortedPlayers.findIndex(
        (p) => p.id === currentPlayerId
      );
      if (currentPlayerIndex >= 0) {
        currentPlayerPosition = sortedPlayers[currentPlayerIndex].position;
      }
    }

    // Rotate the array so current player is at position 0 (bottom)
    // Table positions: bottom (current), left (+1), top (+2), right (+3)
    const getRotatedPlayer = (offset: number) => {
      const targetPosition = (currentPlayerPosition + offset) % 4;
      const player = sortedPlayers.find((p) => p.position === targetPosition);
      return {
        id: player?.id || "",
        name: player?.name || `Player ${targetPosition + 1}`,
        isConnected: player?.isConnected ?? true,
        isBot: player?.isBot ?? false,
        handSize: player?.handSize ?? 0,
      };
    };

    const positions = {
      bottom: getRotatedPlayer(0), // Current player
      left: getRotatedPlayer(1), // Next player clockwise
      top: getRotatedPlayer(2), // Opposite player
      right: getRotatedPlayer(3), // Previous player clockwise
    };

    return positions;
  }, [gameState, currentPlayerId]);

  // Build lastTrick data from gameState for the review overlay
  const lastTrickData = useMemo(() => {
    if (!gameState?.lastTrick) return null;
    const lt = gameState.lastTrick;
    if (!lt.cards || lt.cards.length === 0) return null;
    return {
      cards: Array.isArray(lt.cards)
        ? lt.cards.map((c: any) => ({ suit: c.suit, value: c.value, id: c.id }))
        : Array.from(lt.cards).map((c: any) => ({ suit: c.suit, value: c.value, id: c.id })),
      playedBy: Array.isArray(lt.playedBy)
        ? [...lt.playedBy]
        : Array.from(lt.playedBy) as string[],
      winnerId: lt.winnerId || "",
      winningTeam: typeof lt.winningTeam === "number" ? lt.winningTeam : -1,
      ledSuit: lt.ledSuit || "",
      trickNumber: lt.trickNumber || 0,
    };
  }, [gameState?.lastTrick, gameState]);

  // Map session IDs to player names for the review overlay
  const playerNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (gameState?.players && Array.isArray(gameState.players)) {
      gameState.players.forEach((p: any) => {
        if (typeof p === "object" && p !== null && p.id) {
          map[p.id] = p.name || p.id;
        }
      });
    }
    return map;
  }, [gameState]);

  // Render game ended screen
  if (gameStatus === "ended") {
    return (
      <div className="relative h-full w-full p-4 overflow-auto">
        <div className="max-w-2xl mx-auto bg-gradient-to-b from-primary/10 to-primary/20 rounded-xl border border-primary/30 shadow-lg p-6 md:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-medieval mb-2">
              Game Over!
            </h2>
            <div className="text-lg sm:text-xl">
              {scores.royals >= 7 ? (
                <span className="text-amber-500 font-bold flex items-center justify-center gap-2">
                  <Crown className="w-6 h-6" /> Royals Win!{" "}
                  <Crown className="w-6 h-6" />
                </span>
              ) : (
                <span className="text-blue-500 font-bold flex items-center justify-center gap-2">
                  <Swords className="w-6 h-6" /> Rebels Win!{" "}
                  <Swords className="w-6 h-6" />
                </span>
              )}
            </div>
          </div>

          <div className="bg-card/80 backdrop-blur-sm p-5 rounded-lg border border-primary/30 shadow-lg mb-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
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
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="font-medium">Royals</span>
                </div>
                <div className="text-3xl font-bold text-center">
                  {scores.royals}
                </div>
              </div>
              <div
                className={`p-4 rounded-lg ${
                  scores.rebels >= 7
                    ? "bg-blue-900/40 border border-blue-500/50"
                    : "bg-card/50"
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Swords className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Rebels</span>
                </div>
                <div className="text-3xl font-bold text-center">
                  {scores.rebels}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowReplaySummary(true)}
              className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg shadow transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" /> View Replay
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-5 py-2.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg shadow transition-colors"
            >
              New Game
            </button>
          </div>
        </div>
        <ReplaySummary
          isOpen={showReplaySummary}
          onClose={() => setShowReplaySummary(false)}
          gameData={generateGameStats}
        />
      </div>
    );
  }

  // Main game board render
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Persistent Game Info Widget */}
      {trumpSuit && gameStatus === "playing" && (
        <GameInfoWidget
          trumpSuit={trumpSuit}
          royalsScore={scores.royals}
          rebelsScore={scores.rebels}
        />
      )}

      {/* Frenzy Mode Powers */}
      {gameMode === "frenzy" && trumpSuit && gameStatus === "playing" && (
        <div className="fixed top-20 right-4 z-40">
          <div className="bg-card/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-purple-500/30">
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

      {/* Game Table */}
      <div className="h-full w-full p-2 sm:p-3 md:p-2">
        <TableSurface>
          <div className="relative w-full h-full flex flex-col">
            {/* Top opponent */}
            <div className="flex justify-center pt-4 sm:pt-6">
              {players.length > 2 && (
                <OpponentArea
                  name={playerPositions.top.name}
                  position="top"
                  team={
                    storedTeamAssignments[playerPositions.top.name] || "rebels"
                  }
                  isCurrentTurn={
                    currentTurn === playerPositions.top.id
                  }
                  isConnected={
                    playerPositions.top.isBot || playerPositions.top.isConnected
                  }
                  cardCount={playerPositions.top.handSize}
                />
              )}
            </div>

            {/* Middle row: Left opponent, Center area, Right opponent */}
            <div className="flex-1 flex items-center justify-between px-2 sm:px-4 md:px-6">
              {/* Left opponent */}
              <div className="flex-shrink-0">
                {players.length > 1 && (
                  <OpponentArea
                    name={playerPositions.left.name}
                    position="left"
                    team={
                      storedTeamAssignments[playerPositions.left.name] ||
                      "royals"
                    }
                    isCurrentTurn={
                      currentTurn === playerPositions.left.id
                    }
                    isConnected={
                      playerPositions.left.isBot ||
                      playerPositions.left.isConnected
                    }
                    cardCount={playerPositions.left.handSize}
                  />
                )}
              </div>

              {/* Center trick area */}
              <div className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-4 h-full min-h-[200px] sm:min-h-[300px] relative">
                <CenterTrickArea
                  cards={centerCards}
                  trumpSuit={trumpSuit}
                  leadingSuit={leadingSuit}
                  winningCardIndex={winningCardIndex}
                  playerPositions={{
                    top: playerPositions.top.name,
                    bottom: playerPositions.bottom.name,
                    left: playerPositions.left.name,
                    right: playerPositions.right.name,
                  }}
                  teamAssignments={storedTeamAssignments}
                />

                {/* Last Trick Review Button */}
                {gameStatus === "playing" && lastTrickData && centerCards.length === 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setShowLastTrickReview(true)}
                    className="absolute top-1 left-1 sm:top-2 sm:left-2 z-30 flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-900/80 border border-amber-500/30 hover:border-amber-500/50 text-amber-400/80 hover:text-amber-400 transition-all shadow-lg"
                    title="Review last trick"
                  >
                    <History className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="text-[9px] sm:text-[11px] font-medieval">Last Trick</span>
                  </motion.button>
                )}

                {/* Trick Winner Message */}
                <AnimatePresence>
                  {showTrickWinnerMessage && lastTrickResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 ${
                        lastTrickResult.winningTeam === "royals"
                          ? "bg-amber-900/95 border-amber-500"
                          : "bg-blue-900/95 border-blue-500"
                      } backdrop-blur-sm px-6 py-3 rounded-xl border-2 shadow-2xl`}
                    >
                      <div className="text-center">
                        <div className="text-xl font-bold mb-1 flex items-center justify-center gap-2">
                          {lastTrickResult.winningTeam === "royals" ? (
                            <>
                              <Crown className="w-5 h-5 text-amber-400" />{" "}
                              Royals Win!{" "}
                              <Crown className="w-5 h-5 text-amber-400" />
                            </>
                          ) : (
                            <>
                              <Swords className="w-5 h-5 text-blue-400" />{" "}
                              Rebels Win!{" "}
                              <Swords className="w-5 h-5 text-blue-400" />
                            </>
                          )}
                        </div>
                        <div className="text-sm text-white/80">
                          {lastTrickResult.winningPlayer} won the trick
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right opponent */}
              <div className="flex-shrink-0">
                {players.length > 3 && (
                  <OpponentArea
                    name={playerPositions.right.name}
                    position="right"
                    team={
                      storedTeamAssignments[playerPositions.right.name] ||
                      "rebels"
                    }
                    isCurrentTurn={
                      currentTurn === playerPositions.right.id
                    }
                    isConnected={
                      playerPositions.right.isBot ||
                      playerPositions.right.isConnected
                    }
                    cardCount={playerPositions.right.handSize}
                  />
                )}
              </div>
            </div>

            {/* Bottom: Current player */}
            <div className="pb-2 sm:pb-6 px-1 sm:px-4">
              {/* Player info badge */}
              <div className="flex justify-center mb-1 sm:mb-2">
                <div
                  className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg border-2 transition-all ${
                    storedTeamAssignments[user?.username || ""] === "royals"
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-blue-500/50 bg-blue-500/10"
                  } ${
                    isMyTurn
                      ? "shadow-[0_0_20px_rgba(34,197,94,0.4)] border-green-500"
                      : ""
                  }`}
                >
                  {storedTeamAssignments[user?.username || ""] === "royals" ? (
                    <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400" />
                  ) : (
                    <Swords className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                  )}
                  <span className="text-xs sm:text-sm font-medieval text-white truncate max-w-[80px] sm:max-w-none">
                    {user?.username || "You"}
                  </span>
                  <span className="text-[10px] sm:text-xs bg-green-500/20 text-green-400 px-1 sm:px-1.5 py-0.5 rounded border border-green-500/30">
                    You
                  </span>
                </div>
              </div>

              {/* Player hand */}
              <PlayerHand
                cards={playerHand}
                isMyTurn={!!isMyTurn}
                gameStatus={gameStatus}
                selectedCard={selectedCard}
                playingCardId={playingCardId}
                onCardClick={handleCardClick}
                leadingSuit={leadingSuit}
              />
            </div>
          </div>
        </TableSurface>
      </div>

      {/* Last Trick Review Overlay */}
      <LastTrickReview
        isOpen={showLastTrickReview}
        onClose={() => setShowLastTrickReview(false)}
        lastTrick={lastTrickData}
        playerNames={playerNamesMap}
        teamAssignments={storedTeamAssignments}
        trumpSuit={trumpSuit}
      />

      {/* Replay Summary Modal */}
      <ReplaySummary
        isOpen={showReplaySummary}
        onClose={() => setShowReplaySummary(false)}
        gameData={generateGameStats}
      />
    </div>
  );
}
