import React, { useState, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Share, Users, Crown, LogOut, Play, Trophy, Spade } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";

interface GameSidebarProps {
  roomId: string;
}

// Memoized sub-components for better performance
const TrumpDisplay = memo(({ trumpSuit }: { trumpSuit: string | null }) => {
  if (!trumpSuit) return null;

  const getSuitColor = (suit: string) => {
    switch (suit) {
      case "hearts":
      case "diamonds":
        return "text-red-500";
      case "clubs":
      case "spades":
        return "text-slate-900 dark:text-slate-100";
      default:
        return "text-muted-foreground";
    }
  };

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "hearts": return "♥";
      case "diamonds": return "♦";
      case "clubs": return "♣";
      case "spades": return "♠";
      default: return suit;
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 bg-card/50 p-3 rounded-lg">
      <span className={`text-3xl ${getSuitColor(trumpSuit)}`}>
        {getSuitSymbol(trumpSuit)}
      </span>
      <div>
        <p className="font-medieval text-base capitalize">{trumpSuit}</p>
        <p className="text-xs text-muted-foreground">Trump Suit</p>
      </div>
    </div>
  );
});

TrumpDisplay.displayName = "TrumpDisplay";

const ScoreDisplay = memo(({ scores }: { scores: { royals: number; rebels: number } }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Crown size={16} className="text-yellow-500" />
        <span className="font-medieval text-sm">Royals</span>
      </div>
      <span className="font-bold text-lg">{scores.royals}</span>
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Spade size={16} className="text-slate-600" />
        <span className="font-medieval text-sm">Rebels</span>
      </div>
      <span className="font-bold text-lg">{scores.rebels}</span>
    </div>
  </div>
));

ScoreDisplay.displayName = "ScoreDisplay";

const GameInfoStatusDisplay = memo(({ 
  roomId, 
  user, 
  isCurrentUserHost, 
  playersCount,
  gameStatus,
  currentPlayer,
  players,
  userId
}: {
  roomId: string;
  user: any;
  isCurrentUserHost: boolean;
  playersCount: number;
  gameStatus: string;
  currentPlayer: string;
  players: any[];
  userId?: string;
}) => {
  const formatGameStatus = (status: string) => {
    switch (status) {
      case "waiting": return "Waiting for Players";
      case "initial_deal": return "Dealing Cards";
      case "bidding": return "Trump Voting";
      case "final_deal": return "Final Deal";
      case "playing": return "Playing";
      case "finished":
      case "ended": return "Game Ended";
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
    }
  };

  const getCurrentTurnPlayerName = () => {
    if (!currentPlayer) return "Waiting...";
    const player = players.find(p => p.id === currentPlayer);
    if (player?.id === userId) return "Your Turn";
    return player?.name || "Unknown Player";
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm p-3 md:p-4 rounded-lg border border-primary/30">
      <h3 className="text-base md:text-lg font-medieval text-primary mb-3 md:mb-4 flex items-center gap-2">
        <Users size={18} />
        Game Information
      </h3>
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Game Info */}
        <div className="space-y-3">
          <div>
            <p className="text-xs md:text-sm text-muted-foreground">Room ID</p>
            <p className="font-medieval text-sm md:text-base truncate">{roomId}</p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-muted-foreground">Player</p>
            <p className="font-medieval text-sm md:text-base flex items-center gap-2">
              {user?.name || "Guest"}
              {isCurrentUserHost && (
                <Crown size={14} className="text-yellow-500" />
              )}
            </p>
          </div>
          <div>
            <p className="text-xs md:text-sm text-muted-foreground">Players</p>
            <p className="font-medieval text-sm md:text-base">{playersCount}/4</p>
          </div>
        </div>

        {/* Right Column - Game Status */}
        <div className="space-y-3">
          <div>
            <p className="text-xs md:text-sm text-muted-foreground">Phase</p>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${
                gameStatus === "playing" ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-pulse"
              }`}></span>
              <p className="font-medieval text-sm md:text-base">{formatGameStatus(gameStatus)}</p>
            </div>
          </div>
          {(gameStatus === "playing" || gameStatus === "bidding") && (
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Current Turn</p>
              <p className="font-medieval text-sm md:text-base">{getCurrentTurnPlayerName()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

GameInfoStatusDisplay.displayName = "GameInfoStatusDisplay";

const ActionButtons = memo(({ 
  roomId, 
  isSharing, 
  isCreatingNewGame, 
  isEndingGame,
  isCurrentUserHost,
  onShareGame,
  onNewGame,
  onEndGame
}: {
  roomId: string;
  isSharing: boolean;
  isCreatingNewGame: boolean;
  isEndingGame: boolean;
  isCurrentUserHost: boolean;
  onShareGame: () => void;
  onNewGame: () => void;
  onEndGame: () => void;
}) => (
  <div className="space-y-3">
    <Button
      onClick={onShareGame}
      variant="outline"
      className="w-full justify-start gap-2"
      disabled={isSharing}
    >
      {isSharing ? (
        <LoadingSpinner size="sm" />
      ) : (
        <Share size={16} />
      )}
      {isSharing ? "Copied!" : "Share Game"}
    </Button>

    <Button
      onClick={onNewGame}
      variant="outline"
      className="w-full justify-start gap-2"
      disabled={isCreatingNewGame}
    >
      {isCreatingNewGame ? (
        <LoadingSpinner size="sm" />
      ) : (
        <Play size={16} />
      )}
      {isCreatingNewGame ? "Creating..." : "New Game"}
    </Button>

    {isCurrentUserHost && (
      <Button
        onClick={onEndGame}
        variant="destructive"
        className="w-full justify-start gap-2"
        disabled={isEndingGame}
      >
        {isEndingGame ? (
          <LoadingSpinner size="sm" />
        ) : (
          <LogOut size={16} />
        )}
        {isEndingGame ? "Ending..." : "End Game"}
      </Button>
    )}
  </div>
));

ActionButtons.displayName = "ActionButtons";

export const GameSidebar: React.FC<GameSidebarProps> = memo(({ roomId }) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    players, 
    leaveRoom, 
    gameStatus, 
    trumpSuit, 
    scores, 
    currentPlayer 
  } = useGameStore();

  const [isSharing, setIsSharing] = useState(false);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);

  // Memoized computed values
  const isCurrentUserHost = useMemo(() => 
    players.find((p) => p.id === user?.id)?.isHost || false,
    [players, user?.id]
  );

  const shouldShowProgressSection = useMemo(() => 
    trumpSuit || gameStatus === "playing" || gameStatus === "finished" || gameStatus === "ended",
    [trumpSuit, gameStatus]
  );

  const shouldShowScores = useMemo(() => 
    gameStatus === "playing" || gameStatus === "finished" || gameStatus === "ended",
    [gameStatus]
  );

  // Event handlers
  const handleShareGame = () => {
    setIsSharing(true);
    const url = `${window.location.origin}/game/${roomId}`;
    navigator.clipboard.writeText(url);
    setTimeout(() => setIsSharing(false), 1500);
  };

  const handleNewGame = () => {
    setIsCreatingNewGame(true);
    router.push("/game");
  };

  const handleEndGame = async () => {
    if (!isCurrentUserHost) return;
    
    setIsEndingGame(true);
    try {
      await leaveRoom();
      router.push("/game");
    } catch (error) {
      console.error("Error ending game:", error);
    } finally {
      setIsEndingGame(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 bg-card/50 backdrop-blur-sm border-l border-primary/30">
      {/* Game Info & Status Section */}
      <GameInfoStatusDisplay
        roomId={roomId}
        user={user}
        isCurrentUserHost={isCurrentUserHost}
        playersCount={players.length}
        gameStatus={gameStatus}
        currentPlayer={currentPlayer}
        players={players}
        userId={user?.id}
      />

      {/* Trump & Scores Section */}
      {shouldShowProgressSection && (
        <div className="bg-card/80 backdrop-blur-sm p-3 md:p-4 rounded-lg border border-primary/30">
          <h3 className="text-base md:text-lg font-medieval text-primary mb-3 md:mb-4 flex items-center gap-2">
            <Trophy size={18} />
            Game Progress
          </h3>
          
          <div className="space-y-4">
            <TrumpDisplay trumpSuit={trumpSuit} />
            {shouldShowScores && <ScoreDisplay scores={scores} />}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-card/80 backdrop-blur-sm p-3 md:p-4 rounded-lg border border-primary/30">
        <h3 className="text-base md:text-lg font-medieval text-primary mb-3 md:mb-4">
          Actions
        </h3>
        <ActionButtons
          roomId={roomId}
          isSharing={isSharing}
          isCreatingNewGame={isCreatingNewGame}
          isEndingGame={isEndingGame}
          isCurrentUserHost={isCurrentUserHost}
          onShareGame={handleShareGame}
          onNewGame={handleNewGame}
          onEndGame={handleEndGame}
        />
      </div>
    </div>
  );
});

GameSidebar.displayName = "GameSidebar"; 