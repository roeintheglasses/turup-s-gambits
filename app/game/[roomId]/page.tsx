"use client";

import React, { useState, useEffect, Suspense, useMemo, use } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { detectBotsByName } from "./bot-voting-helper";
import { GameBoard } from "@/components/game-board";
import { TrumpSelectionPopup } from "@/components/trump-selection-popup";
import { VisualEffects } from "@/components/visual-effects";
import { CardShuffleAnimation } from "@/components/card-shuffle-animation";
import { useReplay } from "@/hooks/use-replay";
import { LoginModal } from "@/components/login-modal";
import { ProtectedRoute } from "@/components/protected-route";
import { GameControls } from "@/components/game-controls";
import { GameInfo } from "@/components/game-info";
import { motion, AnimatePresence } from "framer-motion";
import { WaitingRoomSkeleton } from "@/components/waiting-room-skeleton";
import { GameInfoSkeleton } from "@/components/game-info-skeleton";
import { GameControlsSkeleton } from "@/components/game-controls-skeleton";
import { GameBoardSkeleton } from "@/components/game-board-skeleton";
import { StatusUpdateLoader } from "@/components/status-update-loader";
import { GameLoader, PhaseTransitionLoader } from "@/components/game-loader";
import { WaitingRoom } from "@/components/waiting-room";
// import { isPlayerHost } from "@/utils/game-helpers";

// Import Zustand stores
import { useGameStore, type GameStoreState } from "@/stores";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { fetchRoomStateFromSupabase } from "@/stores/gameStore/persistence";

// Import our new Supabase Realtime trump voting hook
import { useSupabaseTrumpVoting } from "@/hooks/use-supabase-trump-voting";

// Import useShallow for stable selectors
import { useShallow } from "zustand/react/shallow";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export enum GameStates {
  WAITING = "waiting",
  INITIAL_DEAL = "initial_deal",
  BIDDING = "bidding",
  FINAL_DEAL = "final_deal",
  PLAYING = "playing",
  ENDED = "ended",
}

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

// Types for component props
interface GameBackgroundProps {}

interface WaitingRoomSectionProps {
  roomId: string;
  players: any[];
  currentRoom: any;
  isCurrentUserHost: boolean;
  isAddingBots: boolean;
  isStartingGame: boolean;
  handleAddBots: () => void;
  handleStartGame: () => void;
}

interface GameBoardWrapperProps {
  roomId: string;
  mode: string;
  players: any[];
  currentRoom: any;
  gameStatus: string;
  initialCardsDeal: boolean;
  recordMove: any;
  handlePlayCard: (card: any) => void;
  handleBid: (bid: number) => void;
  isGameBoardReady: boolean;
}

interface FinalDealSectionProps {
  roomId: string;
  mode: string;
  players: any[];
  currentRoom: any;
  gameStatus: string;
  showShuffleAnimation: boolean;
  setShowShuffleAnimation: (show: boolean) => void;
  recordMove: any;
  handlePlayCard: (card: any) => void;
  handleBid: (bid: number) => void;
  isGameBoardReady: boolean;
}

interface GameSidebarProps {
  isLoading: boolean;
  roomId: string;
}

interface GameOverlaysProps {
  statusMessage: string | null;
  isPhaseTransitioning: boolean;
  phaseTransitionMessage: string;
}

// Background component
const GameBackground: React.FC<GameBackgroundProps> = () => (
  <div className="absolute inset-0 -z-10">
    <div
      className="absolute inset-0 opacity-40 dark:opacity-30"
      style={{
        backgroundImage: "url('/assets/game-table-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
  </div>
);

// Waiting Room Section
const WaitingRoomSection: React.FC<WaitingRoomSectionProps> = ({
  roomId,
  players,
  currentRoom,
  isCurrentUserHost,
  isAddingBots,
  isStartingGame,
  handleAddBots,
  handleStartGame,
}) => (
  <WaitingRoom
    roomId={roomId}
    players={players.map((p) => p.name)}
    currentRoom={currentRoom}
    isCurrentUserHost={isCurrentUserHost}
    allPlayersJoined={players.length === 4}
    isAddingBots={isAddingBots}
    isStartingGame={isStartingGame}
    onAddBots={handleAddBots}
    onStartGame={handleStartGame}
    onForceHostStatus={
      process.env.NODE_ENV === "development"
        ? () => console.log("Debug: Force host status")
        : undefined
    }
  />
);

// Game Board Component
const GameBoardWrapper: React.FC<GameBoardWrapperProps> = ({
  roomId,
  mode,
  players,
  currentRoom,
  gameStatus,
  initialCardsDeal,
  recordMove,
  handlePlayCard,
  handleBid,
  isGameBoardReady,
}) => {
  if (!isGameBoardReady) return <GameBoardSkeleton />;

  // Get the game state from the store once per render
  // Using useMemo to prevent unnecessary updates
  const gameState = React.useMemo(() => {
    return useGameStore.getState().currentRoom?.gameState;
  }, []);

  // Memoize the updateGameState and sendMessage functions to maintain stable references
  const updateGameState = React.useCallback((newState: any) => {
    useGameStore.getState().updateGameState(newState);
  }, []);

  const sendMessage = React.useCallback((message: any) => {
    return useGameStore.getState().sendMessage(message);
  }, []);

  return (
    <GameBoard
      roomId={roomId as string}
      gameMode={mode as "classic" | "frenzy"}
      players={players.map((p) => p.name)}
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
};

// Overlays Component
const GameOverlays: React.FC<GameOverlaysProps> = ({
  statusMessage,
  isPhaseTransitioning,
  phaseTransitionMessage,
}) => (
  <>
    <AnimatePresence>
      {statusMessage && <StatusUpdateLoader message={statusMessage} />}
    </AnimatePresence>

    {isPhaseTransitioning && (
      <PhaseTransitionLoader message={phaseTransitionMessage} />
    )}
  </>
);

// Main content component
function GameRoomContentInner() {
  const { mode } = useParams();
  const router = useRouter();
  const { recordMove } = useReplay();

  // Use smaller, more focused selectors with useShallow to prevent infinite loops
  const roomId = useGameStore((state) => state.roomId);
  const currentRoom = useGameStore((state) => state.currentRoom);
  const players = useGameStore((state) => state.players);
  const isLoading = useGameStore((state) => state.isLoading);
  const gameStatus = useGameStore((state) => state.gameStatus);
  const statusMessage = useGameStore((state) => state.statusMessage);
  const isAddingBots = useGameStore((state) => state.isAddingBots);
  const isGameBoardReady = useGameStore((state) => state.isGameBoardReady);
  const isPhaseTransitioning = useGameStore(
    (state) => state.isPhaseTransitioning
  );
  const showShuffleAnimation = useGameStore(
    (state) => state.showShuffleAnimation
  );
  const initialCardsDeal = useGameStore((state) => state.initialCardsDeal);
  const phaseTransitionMessage = useGameStore(
    (state) => state.phaseTransitionMessage
  );
  const sendMessage = useGameStore((state) => state.sendMessage);

  // Group actions together with useShallow to maintain reference stability
  const {
    startGame,
    playCard,
    placeBid,
    addBots,
    setShowShuffleAnimation,
    setIsGameBoardReady,
    setStatusMessage,
    setGameStatus,
    setCurrentPlayer,
    setIsPhaseTransitioning,
    setPhaseTransitionMessage,
    setInitialCardsDeal,
    setPlayers,
  } = useGameStore(
    useShallow((state: GameStoreState) => ({
      startGame: state.startGame,
      playCard: state.playCard,
      placeBid: state.placeBid,
      addBots: state.addBots,
      setShowShuffleAnimation: state.setShowShuffleAnimation,
      setIsGameBoardReady: state.setIsGameBoardReady,
      setStatusMessage: state.setStatusMessage,
      setGameStatus: state.setGameStatus,
      setCurrentPlayer: state.setCurrentPlayer,
      setIsPhaseTransitioning: state.setIsPhaseTransitioning,
      setPhaseTransitionMessage: state.setPhaseTransitionMessage,
      setInitialCardsDeal: state.setInitialCardsDeal,
      setPlayers: state.setPlayers,
    }))
  );

  // Auth state from Zustand store
  const { user } = useAuthStore();

  // UI state from Zustand store
  const {
    showLoginModal,
    showTrumpPopup,
    setShowLoginModal,
    setShowTrumpPopup,
  } = useUIStore();

  // Replace the mock trump votes state with our Supabase Realtime implementation
  const {
    trumpVotes,
    userVote,
    votingComplete,
    handleVote,
    handleForceBotVotes: forceBotVotes,
    loading: trumpVotingLoading,
  } = useSupabaseTrumpVoting(roomId as string);

  // Local component state
  const [isStartingGame, setIsStartingGame] = useState(false);

  // Effect to show trump selection popup when game state changes to bidding
  useEffect(() => {
    if (gameStatus === "bidding" && !userVote && !showTrumpPopup) {
      console.log(
        "[GameRoom] Game state changed to bidding, showing trump selection popup"
      );
      setShowTrumpPopup(true);
    }
  }, [gameStatus, userVote, showTrumpPopup, setShowTrumpPopup]);

  // Check if the current user is the host
  const isCurrentUserHost =
    currentRoom?.players?.some((p) => p.id === user?.id && p.isHost) || false;

  // Handle game start
  const handleStartGame = () => {
    if (isStartingGame || !isCurrentUserHost || players.length < 4) return;

    setIsStartingGame(true);
    setStatusMessage("Starting game...");

    // Start the game
    startGame();

    // Reset after a delay
    setTimeout(() => {
      setIsStartingGame(false);
      setStatusMessage(null);
    }, 2000);
  };

  // Handle adding bots
  const handleAddBots = () => {
    if (isAddingBots || !isCurrentUserHost) return;

    setStatusMessage("Adding bots...");
    addBots();
  };

  // Wrapper for trump vote function to match expected signature and handle UI state
  const handleTrumpVote = (suit: string) => {
    if (votingComplete) return;

    setStatusMessage(`Voting for ${suit}...`);

    // Call our Supabase voting handler (cast as Suit type)
    handleVote(suit as any);

    // Also update game state through Zustand
    // selectTrump(suit as any);

    setTimeout(() => {
      setStatusMessage(null);
    }, 1500);
  };

  // Handle card play - integrate with the store
  const handlePlayCard = (card: any) => {
    console.log("[GameRoomPage] Handling play card:", card);

    if (!card) {
      console.error("[GameRoomPage] Cannot play card: No card provided");
      return;
    }

    try {
      // Use the store's playCard action directly
      playCard(card);

      // Record the move for replay functionality
      recordMove({
        type: "playCard",
        player: user?.username || "Player",
        card: card,
      });
    } catch (error) {
      console.error("[GameRoomPage] Error playing card:", error);
      useUIStore
        .getState()
        .showToast("Error playing card. Please try again.", "error");
      // Reset loading state
      useUIStore.getState().setCardPlayLoading(false);
      useUIStore.getState().setPlayingCardId(null);
    }
  };

  // Handle placing a bid
  const handleBid = (bid: number) => {
    setStatusMessage(`Placing bid: ${bid}`);
    placeBid(bid);
    setTimeout(() => setStatusMessage(null), 1500);
  };

  // Get player hand for trump selection
  const playerHand = useMemo(() => {
    // Define a mock hand for testing - ONLY 5 CARDS for initial deal
    const mockHand = [
      { id: 1, suit: "hearts", value: "A" },
      { id: 2, suit: "spades", value: "K" },
      { id: 3, suit: "diamonds", value: "Q" },
      { id: 4, suit: "clubs", value: "J" },
      { id: 5, suit: "hearts", value: "10" },
    ];

    // For debugging during development, just use the mock hand to ensure we have cards
    return mockHand;
  }, [currentRoom?.players, user]);

  // Handle shuffle animation completion
  const handleShuffleComplete = () => {
    setShowShuffleAnimation(false);
    console.log("[GameRoom] Shuffle animation completed");
    setStatusMessage("Initial deal completed. Select trump suit.");

    // Update game state from initial_deal to bidding
    setGameStatus("bidding");

    // Show trump selection popup
    useUIStore.getState().setShowTrumpPopup(true);
  };

  const handleFinalShuffleDrawComplete = () => {
    console.log(
      "[GameRoom] Final shuffle draw complete, transitioning to playing phase"
    );

    // Set a temporary message
    setStatusMessage("All cards dealt! Starting game...");

    // Transition to playing phase after a delay (final cards are dealt)
    setIsPhaseTransitioning(true);
    setPhaseTransitionMessage("Game Starting...");

    // Explicitly turn off the initialCardsDeal flag
    setInitialCardsDeal(false);
    console.log("[GameRoom] Explicitly setting initialCardsDeal to false");

    // Set isGameBoardReady to false temporarily to force a reload
    setIsGameBoardReady(false);

    setTimeout(() => {
      // Clear the status message
      setStatusMessage(null);

      // Set the phase
      setGameStatus("playing");

      // Turn off transitions
      setIsPhaseTransitioning(false);
      setPhaseTransitionMessage("");

      // Re-enable game board with full set of cards
      setIsGameBoardReady(true);

      // Force a refresh of the game board to show all cards
      window.dispatchEvent(
        new CustomEvent("game:refreshState", {
          detail: {
            phase: "playing",
            initialCardsDeal: false,
          },
        })
      );

      console.log(
        "[GameRoom] Transitioned to playing phase, dispatched refresh event"
      );

      // Send a realtime message to update all clients
      sendMessage({
        type: "game:playing-started",
        payload: {
          roomId,
          gamePhase: "playing",
          initialCardsDeal: false,
        },
      });
    }, 2000);
  };

  // Reset game board ready state when game status changes to final_deal
  useEffect(() => {
    if (gameStatus === "final_deal") {
      // Reset game board ready state to ensure it's recreated with the proper state
      setIsGameBoardReady(false);
    }
  }, [gameStatus, setIsGameBoardReady]);

  // Effect to monitor initialCardsDeal changes
  useEffect(() => {
    console.log(
      `[GameRoom] initialCardsDeal changed to: ${initialCardsDeal}, current gameStatus: ${gameStatus}`
    );
  }, [initialCardsDeal, gameStatus]);

  // Add force refresh effect when transitioning to playing state
  useEffect(() => {
    if (gameStatus === "playing") {
      // Log the current game state for debugging
      console.log(
        "[GameRoom] Now in PLAYING state, forcing game state refresh"
      );

      // Force a refresh of the game state
      setIsGameBoardReady(true);
      setInitialCardsDeal(false);

      // Dispatch an event that the game board component can listen for
      window.dispatchEvent(
        new CustomEvent("game:refreshState", {
          detail: { gameStatus: "playing", initialCardsDeal: false },
        })
      );
    }
  }, [gameStatus, setIsGameBoardReady, setInitialCardsDeal]);

  // If user is not logged in, show login modal
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <div className="container mx-auto px-4 py-8">
          <WaitingRoomSkeleton />
        </div>
        <LoginModal isOpen={showLoginModal} onClose={() => router.push("/")} />
      </div>
    );
  }

  if (isLoading || !currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <div className="container mx-auto px-4 py-8">
          <WaitingRoomSkeleton />
        </div>
      </div>
    );
  }

  if (gameStatus === "waiting") {
    console.log("Waiting room status : ", currentRoom);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />

        <div className="container mx-auto px-4 py-8">
          <WaitingRoomSection
            roomId={roomId || ""}
            players={players}
            currentRoom={currentRoom}
            isCurrentUserHost={isCurrentUserHost}
            isAddingBots={isAddingBots}
            isStartingGame={isStartingGame}
            handleAddBots={handleAddBots}
            handleStartGame={handleStartGame}
          />
        </div>
      </div>
    );
  }

  if (gameStatus === "initial_deal") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />

        <div className="container mx-auto px-4 py-8">
          {showShuffleAnimation && (
            <CardShuffleAnimation onComplete={handleShuffleComplete} />
          )}
          <GameBoardSkeleton />;
        </div>
      </div>
    );
  }

  if (gameStatus === "bidding") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />

        <div className="container mx-auto px-4 py-8">
          <TrumpSelectionPopup
            onVote={handleTrumpVote}
            userVote={userVote}
            trumpVotes={trumpVotes}
            votingComplete={votingComplete}
            playerHand={playerHand}
            isOpen={showTrumpPopup}
            onForceBotVotes={forceBotVotes}
            isCurrentUserHost={isCurrentUserHost}
          />
          <GameBoardSkeleton />;
          <GameOverlays
            statusMessage={statusMessage}
            isPhaseTransitioning={isPhaseTransitioning}
            phaseTransitionMessage={phaseTransitionMessage}
          />
        </div>
      </div>
    );
  }

  if (gameStatus === "final_deal") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <div className="container mx-auto px-4 py-8">
          <div className="absolute inset-0 bg-background/30 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card/90 p-4 rounded-lg shadow-lg flex flex-col items-center">
              <LoadingSpinner size="lg" />
              <div className="mt-2 text-foreground">
                {gameStatus === "final_deal" && "Dealing remaining 8 cards..."}
              </div>
            </div>
          </div>
          {showShuffleAnimation && (
            <CardShuffleAnimation onComplete={handleFinalShuffleDrawComplete} />
          )}
          <GameBoardSkeleton />;
        </div>
      </div>
    );
  }

  // Render the main game content
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <VisualEffects enableGrain />
      <GameBackground />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">{gameStatus}</h1>

        {(gameStatus === "playing" || gameStatus === "finished") && (
          <GameBoardWrapper
            roomId={roomId || ""}
            mode={(mode as string) || "classic"}
            players={players}
            currentRoom={currentRoom}
            gameStatus={gameStatus}
            initialCardsDeal={initialCardsDeal}
            recordMove={recordMove}
            handlePlayCard={handlePlayCard}
            handleBid={handleBid}
            isGameBoardReady={isGameBoardReady}
          />
        )}
      </div>
    </div>
  );
}

// Wrapper component with Suspense
function GameRoomContent() {
  return (
    <Suspense
      fallback={
        <>
          <div className="min-h-screen flex items-center justify-center p-4">
            <VisualEffects enableGrain />
            <GameBackground />
            <div className="container mx-auto px-4 py-8">
              <WaitingRoomSkeleton />
            </div>
          </div>
        </>
      }
    >
      <GameRoomContentInner />
    </Suspense>
  );
}

function GameRoomInitializer({
  roomId,
  children,
}: {
  roomId: string;
  children: React.ReactNode;
}) {
  const {
    setRoomId,
    joinRoom,
    currentRoom,
    gameStatus,
    setGameStatus,
    setTrumpSuit,
    updateScores,
    setInitialCardsDeal,
    setTeamAssignments,
    setPlayers,
  } = useGameStore();
  const { user } = useAuthStore();
  const hasJoinedRef = React.useRef(false);
  const hasRestoredStateRef = React.useRef(false);

  // Initialize the game with the room ID
  useEffect(() => {
    if (roomId && user && !hasJoinedRef.current) {
      console.log("[GameRoomInitializer] Initializing room", roomId);
      setRoomId(roomId);

      const initRoom = async () => {
        // First attempt to fetch current room state from Supabase
        const roomState = await fetchRoomStateFromSupabase(roomId);

        if (roomState) {
          console.log("[GameRoomInitializer] Recovered room state:", roomState);

          // Restore game status and other critical data from saved state
          if (roomState.gameStatus && roomState.gameStatus !== "waiting") {
            console.log(
              `[GameRoomInitializer] Restoring game status to ${roomState.gameStatus}`
            );
            setGameStatus(roomState.gameStatus as any);

            // Restore players if available
            if (roomState.players && roomState.players.length > 0) {
              console.log(
                "[GameRoomInitializer] Restoring player data:",
                roomState.players
              );
              setPlayers(roomState.players);
            }

            // Restore other critical game state
            if (roomState.roomState?.gameState?.trumpSuit) {
              setTrumpSuit(roomState.roomState.gameState.trumpSuit);
            }

            if (roomState.roomState?.gameState?.scores) {
              updateScores(roomState.roomState.gameState.scores);
            }

            // Restore team assignments if available
            if (
              roomState.teamAssignments &&
              Object.keys(roomState.teamAssignments).length > 0
            ) {
              console.log(
                "[GameRoomInitializer] Restoring team assignments:",
                roomState.teamAssignments
              );
              setTeamAssignments(roomState.teamAssignments);
            }

            // Set initialCardsDeal based on game phase
            const shouldHaveInitialCards =
              roomState.gameStatus === "initial_deal" ||
              roomState.gameStatus === "bidding";
            setInitialCardsDeal(shouldHaveInitialCards);

            hasRestoredStateRef.current = true;
          }
        }

        // Only join if we haven't already joined
        if (!currentRoom) {
          console.log("[GameRoomInitializer] Joining room as", user.username);
          await joinRoom(roomId, user.username);
          hasJoinedRef.current = true;
        }
      };

      initRoom();
    }
  }, [
    roomId,
    user,
    currentRoom,
    setRoomId,
    joinRoom,
    setGameStatus,
    setTrumpSuit,
    updateScores,
    setInitialCardsDeal,
    setTeamAssignments,
    setPlayers,
  ]);

  // On component unmount, clean up
  useEffect(() => {
    return () => {
      hasJoinedRef.current = false;
      hasRestoredStateRef.current = false;
    };
  }, []);

  return <>{children}</>;
}

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
