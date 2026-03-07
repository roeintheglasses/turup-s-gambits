"use client";

import React, { Suspense, use, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameLoader } from "@/components/game-loader";
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
import { useTestGameRoom } from "@/hooks/use-test-game-room";

interface TestGameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

function TestGameRoomContentInner({ roomId }: { roomId: string }) {
  const { mode } = useParams();
  const [testUserId, setTestUserId] = useState("");

  // Generate a test user ID on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get("userId");

    if (userIdParam) {
      setTestUserId(userIdParam);
    } else {
      // Generate a random test user ID
      const randomId = `test-user-${Math.random().toString(36).substring(2, 9)}`;
      setTestUserId(randomId);
    }
  }, []);

  const gameRoom = useTestGameRoom(roomId, testUserId);

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

  // Wait for test user ID to be generated
  if (!testUserId) {
    return (
      <div className="h-full flex items-center justify-center p-2 md:p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <GameLoader message="Preparing test session..." />
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
              onClick={() => router.push("/test-game")}
              className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 rounded"
            >
              Back to Test Lobby
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
        <GameLoader message="Connecting to game server..." />
      </div>
    );
  }

  // Render different states based on game status
  switch (gameStatus) {
    case "waiting":
      return (
        <>
          {/* Development warning banner */}
          <div className="bg-yellow-500/20 border-b border-yellow-500 text-yellow-200 px-4 py-2 text-center text-sm">
            🧪 TEST MODE - Auth bypassed | User ID: {testUserId}
          </div>
          <WaitingRoomState
            roomId={roomId}
            players={players}
            isCurrentUserHost={isCurrentUserHost}
            isAddingBots={isAddingBots}
            isStartingGame={isStartingGame}
            handleAddBots={handleAddBots}
            handleStartGame={handleStartGame}
          />
        </>
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

          {/* Development warning banner */}
          <div className="bg-yellow-500/20 border-b border-yellow-500 text-yellow-200 px-4 py-2 text-center text-sm">
            🧪 TEST MODE - Auth bypassed | User ID: {testUserId}
          </div>

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
          onPlayAgain={() => router.push("/test-game")}
          onBackToLobby={() => router.push("/test-game")}
        />
      );

    default:
      return (
        <div className="h-full flex items-center justify-center p-2 md:p-4">
          <VisualEffects enableGrain />
          <GameBackground />
          <GameLoader message="Loading game..." />
        </div>
      );
  }
}

// Main page component
export default function TestGameRoomPage({ params }: TestGameRoomPageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;

  // Only allow in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      window.location.href = "/game";
    }
  }, []);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <VisualEffects enableGrain />
          <GameBackground />
          <GameLoader message="Loading game room..." />
        </div>
      }
    >
      <TestGameRoomContentInner roomId={roomId} />
    </Suspense>
  );
}
