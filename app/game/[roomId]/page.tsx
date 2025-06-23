"use client";

import React, { Suspense, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { LoginModal } from "@/components/login-modal";
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
} from "@/components/game-room";

// Custom hooks
import { useGameRoom } from "@/hooks/use-game-room";
import { useGameRoomInitializer } from "@/hooks/use-game-room-initializer";
import { useGameStore } from "@/stores";

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

function GameRoomContentInner() {
  const { mode } = useParams();
  const { roomId } = useGameStore();
  
  const gameRoom = useGameRoom(roomId || "");
  
  // Destructure all needed values from the hook
  const {
    user,
    currentRoom,
    players,
    isLoading,
    gameStatus,
    router,
    // Waiting room props
    isCurrentUserHost,
    isAddingBots,
    isStartingGame,
    handleAddBots,
    handleStartGame,
    handleForceHostStatus,
    // Game board props
    isGameBoardReady,
    initialCardsDeal,
    recordMove,
    handlePlayCard,
    handleBid,
    // Bidding props
    playerHand,
    handleTrumpVote,
    userVote,
    trumpVotes,
    votingComplete,
    showTrumpPopup,
    forceBotVotes,
    statusMessage,
    isPhaseTransitioning,
    phaseTransitionMessage,
    // Animation props
    showShuffleAnimation,
    handleShuffleComplete,
    handleFinalShuffleDrawComplete,
    // UI state
    showLoginModal,
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
        <LoginModal isOpen={showLoginModal} onClose={() => router.push("/")} />
      </div>
    );
  }

  // Show loading state
  if (isLoading || !currentRoom) {
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
          roomId={roomId || ""}
          players={players}
          currentRoom={currentRoom}
          isCurrentUserHost={isCurrentUserHost}
          isAddingBots={isAddingBots}
          isStartingGame={isStartingGame}
          handleAddBots={handleAddBots}
          handleStartGame={handleStartGame}
          handleForceHostStatus={handleForceHostStatus}
        />
      );

    case "initial_deal":
      return (
        <InitialDealState
          showShuffleAnimation={showShuffleAnimation}
          handleShuffleComplete={handleShuffleComplete}
        />
      );

    case "bidding":
      return (
        <BiddingState
          mode={(mode as string) || "classic"}
          playerHand={playerHand}
          handleTrumpVote={handleTrumpVote}
          userVote={userVote}
          trumpVotes={trumpVotes}
          votingComplete={votingComplete}
          showTrumpPopup={showTrumpPopup}
          forceBotVotes={forceBotVotes}
          isCurrentUserHost={isCurrentUserHost}
          statusMessage={statusMessage}
          isPhaseTransitioning={isPhaseTransitioning}
          phaseTransitionMessage={phaseTransitionMessage}
        />
      );

    case "final_deal":
      return (
        <FinalDealState
          showShuffleAnimation={showShuffleAnimation}
          handleFinalShuffleDrawComplete={handleFinalShuffleDrawComplete}
        />
      );

    case "playing":
    case "finished":
    case "ended":
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
              roomId={roomId || ""}
              mode={(mode as string) || "classic"}
              players={players}
              gameStatus={gameStatus}
              initialCardsDeal={initialCardsDeal}
              recordMove={recordMove}
              handlePlayCard={handlePlayCard}
              handleBid={handleBid}
              isGameBoardReady={isGameBoardReady}
            />
          </div>
        </div>
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

// Wrapper component with Suspense
function GameRoomContent() {
  return (
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
      <GameRoomContentInner />
    </Suspense>
  );
}

// Room initializer wrapper component
function GameRoomInitializer({
  roomId,
  children,
}: {
  roomId: string;
  children: React.ReactNode;
}) {
  useGameRoomInitializer(roomId);
  return <>{children}</>;
}

// Main page component
export default function GameRoomPage({ params }: GameRoomPageProps) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;

  return (
    <ProtectedRoute>
      <GameRoomInitializer roomId={roomId}>
        <GameRoomContent />
      </GameRoomInitializer>
    </ProtectedRoute>
  );
}
