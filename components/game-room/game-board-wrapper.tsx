import React, { useCallback, useMemo, memo } from "react";
import { GameBoard } from "@/components/game-board";
import { GameBoardSkeleton } from "@/components/game-board-skeleton";
import { GameSidebar } from "./game-sidebar";
import { useGameStore } from "@/stores";
import { useShallow } from "zustand/react/shallow";

interface GameBoardWrapperProps {
  roomId: string;
  mode: string;
  players: any[];
  gameStatus: string;
  initialCardsDeal: boolean;
  recordMove: any;
  handlePlayCard: (card: any) => void;
  handleBid: (bid: number) => void;
  isGameBoardReady: boolean;
}

// Memoized component for the main game board
const GameBoardContent = memo(({
  roomId,
  mode,
  players,
  gameStatus,
  initialCardsDeal,
  recordMove,
  handlePlayCard,
  handleBid,
  gameState,
  updateGameState,
  sendMessage,
}: {
  roomId: string;
  mode: string;
  players: any[];
  gameStatus: string;
  initialCardsDeal: boolean;
  recordMove: any;
  handlePlayCard: (card: any) => void;
  handleBid: (bid: number) => void;
  gameState: any;
  updateGameState: (newState: any) => void;
  sendMessage: (message: any) => Promise<boolean>;
}) => {
  // Memoized player names to prevent unnecessary re-renders
  const playerNames = useMemo(() => 
    players.map((p) => p.name), 
    [players]
  );

  return (
    <GameBoard
      roomId={roomId}
      gameMode={mode as "classic" | "frenzy"}
      players={playerNames}
      gameState={gameState}
      onUpdateGameState={updateGameState}
      onRecordMove={recordMove}
      gameStatus={gameStatus}
      initialCardsDeal={initialCardsDeal}
      onPlayCard={handlePlayCard}
      onBid={handleBid}
      sendMessage={sendMessage}
    />
  );
});

GameBoardContent.displayName = "GameBoardContent";

// Memoized sidebar component
const MemoizedGameSidebar = memo(({ roomId }: { roomId: string }) => (
  <GameSidebar roomId={roomId} />
));

MemoizedGameSidebar.displayName = "MemoizedGameSidebar";

export const GameBoardWrapper: React.FC<GameBoardWrapperProps> = memo(({
  roomId,
  mode,
  players,
  gameStatus,
  initialCardsDeal,
  recordMove,
  handlePlayCard,
  handleBid,
  isGameBoardReady,
}) => {
  // Use shallow selector to get only needed state
  const gameState = useGameStore(
    useShallow((state) => state.currentRoom?.gameState)
  );

  // Memoize the stable callback functions
  const updateGameState = useCallback((newState: any) => {
    useGameStore.getState().updateGameState(newState);
  }, []);

  const sendMessage = useCallback((message: any) => {
    return useGameStore.getState().sendMessage(message);
  }, []);

  // Early return for loading state
  if (!isGameBoardReady) {
    return <GameBoardSkeleton />;
  }

  return (
    <div className="h-full flex">
      {/* Main Game Board - Takes most of the space */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <GameBoardContent
          roomId={roomId}
          mode={mode}
          players={players}
          gameStatus={gameStatus}
          initialCardsDeal={initialCardsDeal}
          recordMove={recordMove}
          handlePlayCard={handlePlayCard}
          handleBid={handleBid}
          gameState={gameState}
          updateGameState={updateGameState}
          sendMessage={sendMessage}
        />
      </div>
      
      {/* Game Sidebar - Only on medium+ screens */}
      <div className="hidden md:flex md:flex-col md:w-80 lg:w-96 h-full">
        <MemoizedGameSidebar roomId={roomId} />
      </div>
    </div>
  );
});

GameBoardWrapper.displayName = "GameBoardWrapper"; 