import React, { useMemo, memo } from "react";
import { GameBoard } from "@/components/game-board";
import { GameSidebar } from "./game-sidebar";

interface GameBoardWrapperProps {
  roomId: string;
  mode: string;
  players: any[];
  gameStatus: string;
  currentTrick: { cards: any[]; playedBy: string[] };
  handlePlayCard: (card: any) => void;
  handleBid: (bid: number) => void;
  // Sidebar props
  scores?: { royals: number; rebels: number };
  trumpSuit?: string | null;
  currentTurn?: string;
  isCurrentUserHost?: boolean;
  // Player hand from Colyseus
  playerHand?: any[];
  // Current player ID (session ID from Colyseus room)
  currentPlayerId?: string;
}

// Memoized component for the main game board
const GameBoardContent = memo(({
  roomId,
  mode,
  players,
  gameStatus,
  currentTrick,
  handlePlayCard,
  handleBid,
  playerHand,
  currentTurn,
  currentPlayerId,
}: {
  roomId: string;
  mode: string;
  players: any[];
  gameStatus: string;
  currentTrick: { cards: any[]; playedBy: string[] };
  handlePlayCard: (card: any) => void;
  handleBid: (bid: number) => void;
  playerHand?: any[];
  currentTurn?: string;
  currentPlayerId?: string;
}) => {
  // Memoized player names to prevent unnecessary re-renders
  const playerNames = useMemo(() =>
    players.map((p) => p.name || p.id),
    [players]
  );

  // Minimal game state for compatibility
  const gameState = {
    players: playerNames,
    gameStatus: gameStatus,
  };

  return (
    <GameBoard
      roomId={roomId}
      gameMode={mode as "classic" | "frenzy"}
      players={playerNames}
      gameState={gameState}
      onUpdateGameState={() => console.log("Game state updates handled by Colyseus")}
      onRecordMove={() => {}}
      gameStatus={gameStatus}
      initialCardsDeal={gameStatus === "initial_deal" || gameStatus === "trump_selection" || gameStatus === "bidding"}
      currentTrick={currentTrick}
      onPlayCard={handlePlayCard}
      onBid={handleBid}
      sendMessage={async () => false}
      playerHand={playerHand}
      currentTurn={currentTurn}
      currentPlayerId={currentPlayerId}
    />
  );
});

GameBoardContent.displayName = "GameBoardContent";

// Memoized sidebar component
const MemoizedGameSidebar = memo(({
  roomId,
  players,
  gameStatus,
  scores,
  trumpSuit,
  currentTurn,
  isCurrentUserHost
}: {
  roomId: string;
  players?: any[];
  gameStatus?: string;
  scores?: { royals: number; rebels: number };
  trumpSuit?: string | null;
  currentTurn?: string;
  isCurrentUserHost?: boolean;
}) => (
  <GameSidebar
    roomId={roomId}
    players={players}
    gameStatus={gameStatus}
    scores={scores}
    trumpSuit={trumpSuit}
    currentTurn={currentTurn}
    isCurrentUserHost={isCurrentUserHost}
  />
));

MemoizedGameSidebar.displayName = "MemoizedGameSidebar";

export const GameBoardWrapper: React.FC<GameBoardWrapperProps> = memo(({
  roomId,
  mode,
  players,
  gameStatus,
  currentTrick,
  handlePlayCard,
  handleBid,
  scores,
  trumpSuit,
  currentTurn,
  isCurrentUserHost,
  playerHand,
  currentPlayerId,
}) => {
  return (
    <div className="h-full flex">
      {/* Main Game Board - Takes most of the space */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <GameBoardContent
          roomId={roomId}
          mode={mode}
          players={players}
          gameStatus={gameStatus}
          currentTrick={currentTrick}
          handlePlayCard={handlePlayCard}
          handleBid={handleBid}
          playerHand={playerHand}
          currentTurn={currentTurn}
          currentPlayerId={currentPlayerId}
        />
      </div>

      {/* Game Sidebar - Only on medium+ screens */}
      <div className="hidden md:flex md:flex-col md:w-64 lg:w-80 xl:w-96 h-full">
        <MemoizedGameSidebar
          roomId={roomId}
          players={players}
          gameStatus={gameStatus}
          scores={scores}
          trumpSuit={trumpSuit}
          currentTurn={currentTurn}
          isCurrentUserHost={isCurrentUserHost}
        />
      </div>
    </div>
  );
});

GameBoardWrapper.displayName = "GameBoardWrapper"; 