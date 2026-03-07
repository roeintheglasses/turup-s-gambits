"use client";

import React, { Suspense, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { GameLoader } from "@/components/game-loader";
import { VisualEffects } from "@/components/visual-effects";
import { LeaveGameDialog } from "@/components/leave-game-dialog";

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
import { useLeaveGameGuard } from "@/hooks/use-leave-game-guard";

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
    isReconnecting,
    connectionStatus,
    connectionQuality,
    latency,
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
    turnStartedAt,
    statusMessage,
    // End-game data
    winner,
    isKot,
    royalsTricks,
    rebelsTricks,
    // Rematch
    rematchVotes,
    handleRequestRematch,
  } = gameRoom;

  // Leave game guard - active when game is in progress (not waiting or ended)
  const isGameInProgress = gameStatus !== "waiting" && gameStatus !== "ended" && isConnected;
  const {
    showConfirmDialog,
    confirmLeave,
    cancelLeave,
  } = useLeaveGameGuard({
    isActive: isGameInProgress,
    onConfirmLeave: () => {
      // Clean up will happen automatically
    },
  });

  // Show login modal if user is not authenticated
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-2 md:p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <GameLoader message="Authenticating..." />
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

  // Show reconnecting state
  if (isReconnecting) {
    return (
      <div className="h-full flex items-center justify-center p-2 md:p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <div className="w-full px-2 md:px-4 max-w-md mx-auto">
          <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-6 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-500">Reconnecting...</h2>
            <p className="mt-2 text-muted-foreground">
              Please wait while we reconnect you to the game
            </p>
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

  // Helper to render with leave game dialog
  const renderWithDialog = (content: React.ReactNode) => (
    <>
      {content}
      <LeaveGameDialog
        isOpen={showConfirmDialog}
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />
    </>
  );

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
      return renderWithDialog(
        <InitialDealState
          showShuffleAnimation={false}
          handleShuffleComplete={() => {}}
        />
      );

    case "trump_selection":
      return renderWithDialog(
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
      return renderWithDialog(
        <FinalDealState
          showShuffleAnimation={false}
          handleFinalShuffleDrawComplete={() => {}}
        />
      );

    case "playing":
      return renderWithDialog(
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
              turnStartedAt={turnStartedAt}
              currentPlayerId={currentPlayerId}
              isCurrentUserHost={isCurrentUserHost}
              playerHand={playerHand}
              connectionQuality={connectionQuality}
              latency={latency}
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
          rematchVotes={rematchVotes}
          onRequestRematch={handleRequestRematch}
          onPlayAgain={() => router.push("/game")}
          onBackToLobby={() => router.push("/game")}
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
            <GameLoader message="Loading game room..." />
          </div>
        }
      >
        <GameRoomContentInner roomId={roomId} />
      </Suspense>
    </ProtectedRoute>
  );
}
