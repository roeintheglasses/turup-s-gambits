import React, { useMemo, memo } from "react";
import { GameBoard } from "@/components/game-board";
import { GameBottomBar } from "./game-bottom-bar";
import type { ConnectionQuality } from "@/hooks/use-connection-quality";

interface GameBoardWrapperProps {
  roomId: string;
  mode: string;
  players: any[];
  gameStatus: string;
  currentTrick: { cards: any[]; playedBy: string[] };
  handlePlayCard: (card: any) => void;
  // Bottom bar props
  scores?: { royals: number; rebels: number };
  trumpSuit?: string | null;
  currentTurn?: string;
  turnStartedAt?: number;
  isCurrentUserHost?: boolean;
  // Player hand from Colyseus
  playerHand?: any[];
  // Current player ID (session ID from Colyseus room)
  currentPlayerId?: string;
  // Connection quality
  connectionQuality?: ConnectionQuality;
  latency?: number | null;
  // Leading suit for current trick
  leadingSuit?: string | null;
}

// Memoized component for the main game board
const GameBoardContent = memo(
  ({
    roomId,
    mode,
    players,
    gameStatus,
    currentTrick,
    handlePlayCard,
    playerHand,
    currentTurn,
    turnStartedAt,
    currentPlayerId,
    connectionQuality,
    latency,
  }: {
    roomId: string;
    mode: string;
    players: any[];
    gameStatus: string;
    currentTrick: { cards: any[]; playedBy: string[] };
    handlePlayCard: (card: any) => void;
    playerHand?: any[];
    currentTurn?: string;
    turnStartedAt?: number;
    currentPlayerId?: string;
    connectionQuality?: ConnectionQuality;
    latency?: number | null;
  }) => {
    // Memoized player names to prevent unnecessary re-renders
    const playerNames = useMemo(
      () => players.map((p) => p.name || p.id),
      [players],
    );

    // Minimal game state for compatibility
    // Pass both names array and original players array with IDs for proper mapping
    const gameState = {
      players: players, // Original array with {id, name} objects for ID lookups
      playerNames: playerNames, // Array of just names for display
      gameStatus: gameStatus,
    };

    return (
      <GameBoard
        roomId={roomId}
        gameMode={mode as "classic" | "frenzy"}
        players={playerNames}
        gameState={gameState}
        onUpdateGameState={() =>
          console.log("Game state updates handled by Colyseus")
        }
        onRecordMove={() => {}}
        gameStatus={gameStatus}
        initialCardsDeal={
          gameStatus === "initial_deal" ||
          gameStatus === "trump_selection" ||
          gameStatus === "bidding"
        }
        currentTrick={currentTrick}
        onPlayCard={handlePlayCard}
        sendMessage={async () => false}
        playerHand={playerHand}
        currentTurn={currentTurn}
        turnStartedAt={turnStartedAt}
        currentPlayerId={currentPlayerId}
        connectionQuality={connectionQuality}
        latency={latency}
      />
    );
  },
);

GameBoardContent.displayName = "GameBoardContent";

// Memoized bottom bar component
const MemoizedGameBottomBar = memo(
  ({
    roomId,
    players,
    gameStatus,
    scores,
    trumpSuit,
    currentTurn,
    isCurrentUserHost,
    turnStartedAt,
    connectionQuality,
    latency,
    leadingSuit,
  }: {
    roomId: string;
    players?: any[];
    gameStatus?: string;
    scores?: { royals: number; rebels: number };
    trumpSuit?: string | null;
    currentTurn?: string;
    isCurrentUserHost?: boolean;
    turnStartedAt?: number;
    connectionQuality?: ConnectionQuality;
    latency?: number | null;
    leadingSuit?: string | null;
  }) => (
    <GameBottomBar
      roomId={roomId}
      players={players}
      gameStatus={gameStatus}
      scores={scores}
      trumpSuit={trumpSuit}
      currentTurn={currentTurn}
      isCurrentUserHost={isCurrentUserHost}
      turnStartedAt={turnStartedAt}
      connectionQuality={connectionQuality}
      latency={latency}
      leadingSuit={leadingSuit}
    />
  ),
);

MemoizedGameBottomBar.displayName = "MemoizedGameBottomBar";

export const GameBoardWrapper: React.FC<GameBoardWrapperProps> = memo(
  ({
    roomId,
    mode,
    players,
    gameStatus,
    currentTrick,
    handlePlayCard,
    scores,
    trumpSuit,
    currentTurn,
    turnStartedAt,
    isCurrentUserHost,
    playerHand,
    currentPlayerId,
    connectionQuality,
    latency,
    leadingSuit,
  }) => {
    // Compute leading suit from current trick if not provided
    const computedLeadingSuit = useMemo(() => {
      if (leadingSuit !== undefined) return leadingSuit;
      if (currentTrick.cards.length > 0) {
        return currentTrick.cards[0]?.suit || null;
      }
      return null;
    }, [leadingSuit, currentTrick.cards]);

    return (
      <div className="h-full flex flex-col">
        {/* Main Game Board - Takes most of the space */}
        <div className="flex-1 flex items-center justify-center p-4 min-h-0">
          <GameBoardContent
            roomId={roomId}
            mode={mode}
            players={players}
            gameStatus={gameStatus}
            currentTrick={currentTrick}
            handlePlayCard={handlePlayCard}
            playerHand={playerHand}
            currentTurn={currentTurn}
            turnStartedAt={turnStartedAt}
            currentPlayerId={currentPlayerId}
            connectionQuality={connectionQuality}
            latency={latency}
          />
        </div>

        {/* Game Bottom Bar - Always visible */}
        <MemoizedGameBottomBar
          roomId={roomId}
          players={players}
          gameStatus={gameStatus}
          scores={scores}
          trumpSuit={trumpSuit}
          currentTurn={currentTurn}
          isCurrentUserHost={isCurrentUserHost}
          turnStartedAt={turnStartedAt}
          connectionQuality={connectionQuality}
          latency={latency}
          leadingSuit={computedLeadingSuit}
        />
      </div>
    );
  },
);

GameBoardWrapper.displayName = "GameBoardWrapper";
