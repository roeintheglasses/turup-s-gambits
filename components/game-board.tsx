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
import { useReplay } from "@/hooks/use-replay";
import { ReplaySummary } from "./replay-summary";
import { BarChart3, Eye, Crown, Swords } from "lucide-react";
import { TrumpSelectionPopup } from "@/components/trump-selection-popup";
import { FrenzyPowers } from "@/components/frenzy-powers";

// Phase 1: Redesigned components
import { GameInfoWidget } from "@/components/game-board/game-info-widget";
import { CenterTrickArea } from "@/components/game-board/center-trick-area";
import { OpponentArea } from "@/components/game-board/opponent-area";
import { PlayerHand } from "@/components/game-board/player-hand";
import { TableSurface } from "@/components/game-board/table-surface";

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
  sendMessage: (message: any) => Promise<boolean>;
  playerHand?: any[];
  currentTurn?: string;
  currentPlayerId?: string;
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
  currentPlayerId,
}: GameBoardProps) {
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

  const isMyTurn =
    currentTurn && currentPlayerId && currentTurn === currentPlayerId;

  const [centerCards, setCenterCards] = useState<CenterCard[]>([]);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [lastTrickResult, setLastTrickResult] = useState<TrickResult | null>(
    null,
  );
  const [showTrickWinnerMessage, setShowTrickWinnerMessage] = useState(false);
  const [playerHandCards, setPlayerHandCards] = useState<any[]>([]);
  const [handInitialized, setHandInitialized] = useState(false);
  const [processedTrickIds, setProcessedTrickIds] = useState<Set<string>>(
    new Set(),
  );

  const playerHand = playerHandCards;

  const playerHandRef = useRef<any[]>([]);
  const centerCardsRef = useRef<any[]>([]);
  const gameStatusRef = useRef<string>("");

  const getPlayerHand = useCallback(() => {
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
      return cards;
    }

    if (gameState && user) {
      const player = gameState.players?.find(
        (p: PlayerInterface) => p.id === user.id,
      );
      if (player && player.hand && player.hand.length > 0) {
        const cards = player.hand.map((card: any, index: number) => ({
          id: index,
          suit: card.suit,
          value: card.rank || card.value,
          apiId: `${card.suit}-${card.rank || card.value}`,
        }));
        if (gameStatus === "playing") {
          return cards;
        }
        return initialCardsDeal ? cards.slice(0, 5) : cards;
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
    return gameStatus === "playing"
      ? mockHand
      : initialCardsDeal
        ? mockHand.slice(0, 5)
        : mockHand;
  }, [gameState, user, gameStatus, initialCardsDeal, colyseusPlayerHand]);

  const isPlayingCardRef = useRef(false);

  const handleCardClick = useCallback(
    (cardId: number | string) => {
      const { showToast } = useUIStore.getState();

      if (isPlayingCardRef.current) return;
      if (gameStatus !== "playing") {
        showToast(
          `Cannot play card yet. Current phase: ${gameStatus}`,
          "warning",
        );
        return;
      }
      if (!isMyTurn) {
        showToast("Not your turn to play", "warning");
        return;
      }
      if (cardPlayLoading) return;

      isPlayingCardRef.current = true;
      setSelectedCard(
        typeof cardId === "string" ? parseInt(cardId) || 0 : cardId,
      );
      setPlayingCardId(
        typeof cardId === "string" ? parseInt(cardId) || 0 : cardId,
      );
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
        id:
          typeof cardId === "string"
            ? parseInt(cardId.split("-")[1]) || 0
            : cardId,
        suit: card.suit,
        value: card.value,
        playedBy: playerName,
      };

      setCenterCards((prev) => {
        if (prev.some((c) => c.playedBy === playerName)) return prev;
        return [...prev, uiCard];
      });

      setPlayerHandCards((prevHand) => prevHand.filter((c) => c.id !== cardId));

      try {
        onPlayCard(apiCard);
        setTimeout(() => {
          isPlayingCardRef.current = false;
        }, 500);
      } catch (error) {
        console.error("[GameBoard] Error playing card:", error);
        setCenterCards((prev) => prev.filter((c) => c.playedBy !== playerName));
        setPlayerHandCards((prevHand) => [...prevHand, card]);
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
    ],
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

  useEffect(() => {
    const hand = getPlayerHand();
    setPlayerHandCards(hand || []);
    if (gameStatus === "playing" && !handInitialized) {
      setHandInitialized(true);
    } else if (gameStatus !== "playing" && handInitialized) {
      setHandInitialized(false);
    }
  }, [gameState, gameStatus, initialCardsDeal, getPlayerHand]);

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
        (playerName) => !!storedTeamAssignments[playerName],
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
            if (typeof p === 'object' && p !== null) {
              return p.id === playerId;
            }
            return false;
          });
          if (player && typeof player === 'object') {
            playerName = player.name || player.id || playerName;
          }
        }

        // Method 2: If still not found, check if players prop has objects (via gameState.players fallback)
        if (playerName.startsWith('Player ') && gameState?.players && Array.isArray(gameState.players)) {
          const playerFromState = gameState.players.find((p: any) =>
            typeof p === 'object' && p !== null && p.id === playerId
          );
          if (playerFromState && typeof playerFromState === 'object') {
            const pName = (playerFromState as any).name || (playerFromState as any).id;
            if (pName) {
              playerName = pName;
            }
          }
        }

        // Method 3: If players prop is strings and we still don't have a name,
        // use the card's playedBy position to map to player position
        // Note: This assumes cards are played in order by position, which may not be true
        if (playerName.startsWith('Player ') && Array.isArray(players) && players.length > 0) {
          // Get the player who played this card by finding them in the full players list
          // and using their position to determine table position
          if (typeof players[0] === 'string') {
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
      },
    );
    setCenterCards(convertedCards);
  }, [currentTrick, players, gameState]);

  // Calculate leading suit and winning card
  const getLeadingSuit = useCallback((): string | null => {
    if (centerCards.length === 0) return null;
    return centerCards[0].suit;
  }, [centerCards]);

  const calculateWinningCardIndex = useCallback((): number | null => {
    if (centerCards.length === 0) return null;
    const leadingSuit = centerCards[0].suit;
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
      } else if (card.suit === leadingSuit && winningCard.suit !== trumpSuit) {
        if (
          winningCard.suit !== leadingSuit ||
          cardValues[card.value] > cardValues[winningCard.value]
        ) {
          winningIndex = i;
          winningCard = card;
        }
      }
    }
    return winningIndex;
  }, [centerCards, trumpSuit]);

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

  useEffect(() => {
    if (cardPlayLoading) {
      setCardPlayLoading(false);
      setPlayingCardId(null);
    }
  }, [isMyTurn]);

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
      if (sendMessage) {
        sendMessage({
          type: "game:emote",
          payload: { roomId, playerId: user.id, emoji },
        });
      }
      setTimeout(
        () => setEmotes((prev) => prev.filter((e) => e.id !== newEmote.id)),
        3000,
      );
    },
    [user, roomId, sendMessage],
  );

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
    [user, roomId, sendMessage],
  );

  // Get player positions with names for center trick area
  // Rotate based on current player's position so they always appear at bottom
  const playerPositions = useMemo(() => {
    // Build sorted players array by position
    const sortedPlayers: Array<{ id: string; name: string; position: number }> = [];

    if (gameState?.players && Array.isArray(gameState.players)) {
      // gameState.players is an array of Player objects sorted by position
      gameState.players.forEach((p: any) => {
        if (typeof p === 'object' && p !== null) {
          sortedPlayers.push({
            id: p.id || '',
            name: p.name || p.id || `Player ${sortedPlayers.length + 1}`,
            position: typeof p.position === 'number' ? p.position : sortedPlayers.length,
          });
        }
      });
    }

    // Sort by position to ensure correct order
    sortedPlayers.sort((a, b) => a.position - b.position);

    // Find current player's position
    let currentPlayerPosition = 0;
    if (currentPlayerId) {
      const currentPlayerIndex = sortedPlayers.findIndex(p => p.id === currentPlayerId);
      if (currentPlayerIndex >= 0) {
        currentPlayerPosition = sortedPlayers[currentPlayerIndex].position;
      }
    }

    // Rotate the array so current player is at position 0 (bottom)
    // Table positions: bottom (current), left (+1), top (+2), right (+3)
    const getRotatedPlayer = (offset: number) => {
      const targetPosition = (currentPlayerPosition + offset) % 4;
      const player = sortedPlayers.find(p => p.position === targetPosition);
      return player?.name || `Player ${targetPosition + 1}`;
    };

    const positions = {
      bottom: getRotatedPlayer(0), // Current player
      left: getRotatedPlayer(1),   // Next player clockwise
      top: getRotatedPlayer(2),    // Opposite player
      right: getRotatedPlayer(3),  // Previous player clockwise
    };

    return positions;
  }, [gameState, currentPlayerId]);

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
                className={`p-4 rounded-lg ${scores.royals >= 7 ? "bg-amber-900/40 border border-amber-500/50" : "bg-card/50"}`}
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
                className={`p-4 rounded-lg ${scores.rebels >= 7 ? "bg-blue-900/40 border border-blue-500/50" : "bg-card/50"}`}
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
      <div className="h-full w-full p-2 sm:p-3 md:p-4">
        <TableSurface>
          <div className="relative w-full h-full flex flex-col">
            {/* Top opponent */}
            <div className="flex justify-center pt-4 sm:pt-6">
              {players.length > 2 && (
                <OpponentArea
                  name={playerPositions.top}
                  position="top"
                  team={storedTeamAssignments[playerPositions.top] || "rebels"}
                  isCurrentTurn={
                    currentTurn !== currentPlayerId && centerCards.length === 2
                  }
                  isConnected={true}
                  cardCount={
                    gameStatus === "playing"
                      ? Math.max(
                          0,
                          13 - Math.floor((scores.royals + scores.rebels) / 4),
                        )
                      : 5
                  }
                />
              )}
            </div>

            {/* Middle row: Left opponent, Center area, Right opponent */}
            <div className="flex-1 flex items-center justify-between px-2 sm:px-4 md:px-6">
              {/* Left opponent */}
              <div className="flex-shrink-0">
                {players.length > 1 && (
                  <OpponentArea
                    name={playerPositions.left}
                    position="left"
                    team={
                      storedTeamAssignments[playerPositions.left] || "royals"
                    }
                    isCurrentTurn={
                      currentTurn !== currentPlayerId &&
                      centerCards.length === 1
                    }
                    isConnected={true}
                    cardCount={
                      gameStatus === "playing"
                        ? Math.max(
                            0,
                            13 -
                              Math.floor((scores.royals + scores.rebels) / 4),
                          )
                        : 5
                    }
                  />
                )}
              </div>

              {/* Center trick area */}
              <div className="flex-1 max-w-md mx-2 sm:mx-4 h-full min-h-[300px] relative">
                <CenterTrickArea
                  cards={centerCards}
                  trumpSuit={trumpSuit}
                  leadingSuit={getLeadingSuit()}
                  winningCardIndex={calculateWinningCardIndex()}
                  playerPositions={playerPositions}
                  teamAssignments={storedTeamAssignments}
                />

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

                {/* Emotes */}
                <AnimatePresence>
                  {emotes.map((emote) => (
                    <motion.div
                      key={emote.id}
                      initial={{ opacity: 0, y: 20, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.5 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-sm p-3 rounded-full shadow-lg z-40"
                    >
                      <span className="text-4xl">{emote.emoji}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Right opponent */}
              <div className="flex-shrink-0">
                {players.length > 3 && (
                  <OpponentArea
                    name={playerPositions.right}
                    position="right"
                    team={
                      storedTeamAssignments[playerPositions.right] || "rebels"
                    }
                    isCurrentTurn={
                      currentTurn !== currentPlayerId &&
                      centerCards.length === 3
                    }
                    isConnected={true}
                    cardCount={
                      gameStatus === "playing"
                        ? Math.max(
                            0,
                            13 -
                              Math.floor((scores.royals + scores.rebels) / 4),
                          )
                        : 5
                    }
                  />
                )}
              </div>
            </div>

            {/* Bottom: Current player */}
            <div className="pb-4 sm:pb-6 px-2 sm:px-4">
              {/* Player info badge */}
              <div className="flex justify-center mb-2">
                <div
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border-2 transition-all ${
                    storedTeamAssignments[user?.username || ""] === "royals"
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-blue-500/50 bg-blue-500/10"
                  } ${isMyTurn ? "shadow-[0_0_20px_rgba(34,197,94,0.4)] border-green-500" : ""}`}
                >
                  {storedTeamAssignments[user?.username || ""] === "royals" ? (
                    <Crown className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Swords className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="text-sm font-medieval text-white">
                    {user?.username || "You"}
                  </span>
                  <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30">
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
                leadingSuit={getLeadingSuit()}
              />

              {/* Emote controls */}
              <div className="flex justify-center mt-2">
                <InGameEmotes onEmote={handleEmote} />
              </div>
            </div>
          </div>
        </TableSurface>
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
