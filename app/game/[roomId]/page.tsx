"use client";

import React, { Suspense, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { WaitingRoomSkeleton } from "@/components/waiting-room-skeleton";
import { VisualEffects } from "@/components/visual-effects";

// Game room components
import {
  GameBackground,
  GameBoardWrapper,
  WaitingRoomState,
  InitialDealState,
  BiddingState,
  FinalDealState,
  EndedState,
} from "@/components/game-room";

// Custom hooks
import { useGameRoom } from "@/hooks/use-game-room";

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

function GameRoomContentInner({ roomId }: { roomId: string }) {
  const { mode } = useParams();

  const gameRoom = useGameRoom(roomId);

  // Destructure all needed values from the hook
  const {
    user,
    players,
    currentPlayer,
    currentPlayerId,
    isLoading,
    gameStatus,
    router,
    isConnected,
    error,
    // Waiting room props
    isCurrentUserHost,
    isAddingBots,
    isStartingGame,
    handleAddBots,
    handleStartGame,
    // Game board props
    handlePlayCard,
    currentTrick,
    // Trump voting props
    playerHand,
    handleTrumpVote,
    userVote,
    trumpVotes,
    votingComplete,
    showTrumpPopup,
    // Turn management
    currentTurn,
    statusMessage,
    // End-game data
    winner,
    isKot,
    royalsTricks,
    rebelsTricks,
  } = gameRoom;

  // Show login modal if user is not authenticated
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-2 md:p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <div className="w-full px-2 md:px-4">
          <WaitingRoomSkeleton />
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-2 md:p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <div className="w-full px-2 md:px-4">
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center">
            <h2 className="text-xl font-bold text-red-500">Connection Error</h2>
            <p className="mt-2">{error}</p>
            <button
              onClick={() => router.push("/game")}
              className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 rounded"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading || !isConnected) {
    return (
      <div className="h-full flex items-center justify-center p-2 md:p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <div className="w-full px-2 md:px-4">
          <WaitingRoomSkeleton />
        </div>
      </div>
    );
  }

  // Render different states based on game status
  switch (gameStatus) {
    case "waiting":
      return (
        <WaitingRoomState
          roomId={roomId}
          players={players}
          isCurrentUserHost={isCurrentUserHost}
          isAddingBots={isAddingBots}
          isStartingGame={isStartingGame}
          handleAddBots={handleAddBots}
          handleStartGame={handleStartGame}
        />
      );

    case "initial_deal":
      return (
        <InitialDealState
          showShuffleAnimation={false}
          handleShuffleComplete={() => {}}
        />
      );

    case "trump_selection":
      return (
        <BiddingState
          mode={(mode as string) || "classic"}
          playerHand={playerHand}
          handleTrumpVote={handleTrumpVote}
          userVote={userVote as any}
          trumpVotes={trumpVotes}
          votingComplete={votingComplete}
          showTrumpPopup={showTrumpPopup}
          isCurrentUserHost={isCurrentUserHost}
          statusMessage={statusMessage}
        />
      );

    case "final_deal":
      return (
        <FinalDealState
          showShuffleAnimation={false}
          handleFinalShuffleDrawComplete={() => {}}
        />
      );

    case "playing":
      return (
        <div className="h-full flex flex-col">
          <VisualEffects enableGrain />
          <GameBackground />

          {/* Game Header - Only on small screens */}
          <div className="md:hidden flex-shrink-0 p-2">
            <h1 className="text-xl font-bold text-center">{gameStatus}</h1>
          </div>

          {/* Main Game Area */}
          <div className="flex-1 min-h-0 p-2 md:p-4">
            <GameBoardWrapper
              roomId={roomId}
              mode={(mode as string) || "classic"}
              players={players}
              gameStatus={gameStatus}
              currentTrick={currentTrick}
              handlePlayCard={handlePlayCard}
              scores={gameRoom.scores}
              trumpSuit={gameRoom.trumpSuit}
              currentTurn={currentTurn}
              currentPlayerId={currentPlayerId}
              isCurrentUserHost={isCurrentUserHost}
              playerHand={playerHand}
            />
          </div>
        </div>
      );

    case "ended":
      return (
        <EndedState
          winner={winner}
          isKot={isKot}
          royalsTricks={royalsTricks}
          rebelsTricks={rebelsTricks}
          players={players}
          currentPlayer={currentPlayer}
          onPlayAgain={() => router.push("/game")}
          onBackToLobby={() => router.push("/game")}
        />
      );

    default:
      return (
        <div className="h-full flex items-center justify-center p-2 md:p-4">
          <VisualEffects enableGrain />
          <GameBackground />
          <div className="w-full px-2 md:px-4">
            <WaitingRoomSkeleton />
          </div>
        </div>
      );
  }
}

// Main page component
export default function GameRoomPage({ params }: GameRoomPageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;

  return (
    <ProtectedRoute>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center p-4">
            <VisualEffects enableGrain />
            <GameBackground />
            <div className="container mx-auto px-4 py-8">
              <WaitingRoomSkeleton />
            </div>
          </div>
        }
      >
        <GameRoomContentInner roomId={roomId} />
      </Suspense>
    </ProtectedRoute>
  );
}
