"use client";

import React, { useState, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share,
  Users,
  Crown,
  LogOut,
  Play,
  Trophy,
  Swords,
  Copy,
  Check,
  Timer,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";

interface GameSidebarProps {
  roomId: string;
  players?: any[];
  gameStatus?: string;
  trumpSuit?: string | null;
  scores?: { royals: number; rebels: number };
  currentTurn?: string;
  isCurrentUserHost?: boolean;
}

// Trump suit display with animation
const TrumpDisplay = memo(({ trumpSuit }: { trumpSuit: string | null }) => {
  if (!trumpSuit) return null;

  const suitConfig: Record<string, { symbol: string; color: string; bgColor: string }> = {
    hearts: { symbol: "♥", color: "text-red-500", bgColor: "bg-red-500/10" },
    diamonds: { symbol: "♦", color: "text-red-500", bgColor: "bg-red-500/10" },
    clubs: { symbol: "♣", color: "text-foreground", bgColor: "bg-foreground/10" },
    spades: { symbol: "♠", color: "text-foreground", bgColor: "bg-foreground/10" },
  };

  const config = suitConfig[trumpSuit] || { symbol: trumpSuit, color: "text-muted-foreground", bgColor: "bg-muted" };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-3 p-3 rounded-xl ${config.bgColor} border border-primary/20`}
    >
      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className={`text-4xl ${config.color}`}
      >
        {config.symbol}
      </motion.div>
      <div>
        <p className="text-xs text-muted-foreground">Trump Suit</p>
        <p className="font-semibold capitalize">{trumpSuit}</p>
      </div>
    </motion.div>
  );
});

TrumpDisplay.displayName = "TrumpDisplay";

// Visual score display with progress bar
const ScoreDisplay = memo(({ scores }: { scores: { royals: number; rebels: number } }) => {
  const totalNeeded = 7;
  const royalsProgress = Math.min((scores.royals / totalNeeded) * 100, 100);
  const rebelsProgress = Math.min((scores.rebels / totalNeeded) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Royals Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Crown size={14} className="text-amber-500" />
            </div>
            <span className="font-medium text-sm">Royals</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-amber-500">{scores.royals}</span>
            <span className="text-xs text-muted-foreground">/ {totalNeeded}</span>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${royalsProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Rebels Score */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Swords size={14} className="text-blue-500" />
            </div>
            <span className="font-medium text-sm">Rebels</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-500">{scores.rebels}</span>
            <span className="text-xs text-muted-foreground">/ {totalNeeded}</span>
          </div>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${rebelsProgress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
});

ScoreDisplay.displayName = "ScoreDisplay";

// Current turn indicator
const CurrentTurnIndicator = memo(({
  currentPlayer,
  players,
  userId,
  gameStatus,
}: {
  currentPlayer: string;
  players: any[];
  userId?: string;
  gameStatus: string;
}) => {
  if (gameStatus !== "playing" && gameStatus !== "bidding" && gameStatus !== "trump_selection") {
    return null;
  }

  const player = players.find(p => p.id === currentPlayer);
  const isYourTurn = player?.id === userId;
  const playerName = isYourTurn ? "Your Turn!" : player?.name || "Waiting...";

  // Determine team color
  const playerIndex = players.findIndex(p => p.id === currentPlayer);
  const isRoyals = playerIndex === 0 || playerIndex === 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-xl border-2 ${
        isYourTurn
          ? "bg-primary/10 border-primary animate-pulse"
          : isRoyals
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-blue-500/10 border-blue-500/30"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isYourTurn ? "bg-primary/20" : isRoyals ? "bg-amber-500/20" : "bg-blue-500/20"
        }`}>
          <Timer size={20} className={isYourTurn ? "text-primary" : isRoyals ? "text-amber-500" : "text-blue-500"} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Current Turn</p>
          <p className={`font-semibold ${isYourTurn ? "text-primary" : ""}`}>
            {playerName}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

CurrentTurnIndicator.displayName = "CurrentTurnIndicator";

// Players list with teams
const PlayersList = memo(({
  players,
  currentTurn,
  userId,
  isExpanded,
  onToggle,
}: {
  players: any[];
  currentTurn: string;
  userId?: string;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  // Team assignments: 0, 2 = Royals, 1, 3 = Rebels
  const royals = [players[0], players[2]].filter(Boolean);
  const rebels = [players[1], players[3]].filter(Boolean);

  const PlayerItem = ({ player, team }: { player: any; team: "royals" | "rebels" }) => {
    const isCurrentTurn = player?.id === currentTurn;
    const isYou = player?.id === userId;
    const teamColor = team === "royals" ? "amber" : "blue";

    return (
      <div
        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
          isCurrentTurn ? `bg-${teamColor}-500/20 border border-${teamColor}-500/30` : "hover:bg-muted/50"
        }`}
      >
        <div className={`w-8 h-8 rounded-full bg-${teamColor}-500/20 flex items-center justify-center`}>
          {player?.isBot ? (
            <Bot size={14} className={`text-${teamColor}-500`} />
          ) : (
            <User size={14} className={`text-${teamColor}-500`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {player?.name || "Waiting..."}
            {isYou && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
          </p>
        </div>
        {isCurrentTurn && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-green-500"
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <span className="font-medium text-sm">Players ({players.length}/4)</span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-2">
              {/* Royals */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={12} className="text-amber-500" />
                  <span className="text-xs font-medium text-amber-500">Royals</span>
                </div>
                <div className="space-y-1">
                  {royals.map((player, i) => (
                    <PlayerItem key={player?.id || `royal-${i}`} player={player} team="royals" />
                  ))}
                  {royals.length < 2 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                        <User size={14} className="text-muted-foreground/50" />
                      </div>
                      <span className="text-sm text-muted-foreground">Waiting...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rebels */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Swords size={12} className="text-blue-500" />
                  <span className="text-xs font-medium text-blue-500">Rebels</span>
                </div>
                <div className="space-y-1">
                  {rebels.map((player, i) => (
                    <PlayerItem key={player?.id || `rebel-${i}`} player={player} team="rebels" />
                  ))}
                  {rebels.length < 2 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                        <User size={14} className="text-muted-foreground/50" />
                      </div>
                      <span className="text-sm text-muted-foreground">Waiting...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

PlayersList.displayName = "PlayersList";

// Game status badge
const GameStatusBadge = memo(({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    waiting: { label: "Waiting", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: <Users size={12} /> },
    initial_deal: { label: "Dealing", color: "bg-purple-500/20 text-purple-500 border-purple-500/30", icon: <Sparkles size={12} /> },
    trump_selection: { label: "Voting", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: <Crown size={12} /> },
    bidding: { label: "Bidding", color: "bg-orange-500/20 text-orange-500 border-orange-500/30", icon: <Trophy size={12} /> },
    final_deal: { label: "Final Deal", color: "bg-purple-500/20 text-purple-500 border-purple-500/30", icon: <Sparkles size={12} /> },
    playing: { label: "Playing", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: <Play size={12} /> },
    finished: { label: "Finished", color: "bg-primary/20 text-primary border-primary/30", icon: <Trophy size={12} /> },
    ended: { label: "Ended", color: "bg-primary/20 text-primary border-primary/30", icon: <Trophy size={12} /> },
  };

  const config = statusConfig[status] || { label: status, color: "bg-muted text-muted-foreground", icon: null };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${config.color}`}>
      {config.icon}
      {config.label}
      {status === "playing" && (
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1"
        />
      )}
    </div>
  );
});

GameStatusBadge.displayName = "GameStatusBadge";

// Action buttons
const ActionButtons = memo(({
  roomId,
  isSharing,
  isCopied,
  isCreatingNewGame,
  isEndingGame,
  isCurrentUserHost,
  onShareGame,
  onCopyRoomId,
  onNewGame,
  onEndGame,
}: {
  roomId: string;
  isSharing: boolean;
  isCopied: boolean;
  isCreatingNewGame: boolean;
  isEndingGame: boolean;
  isCurrentUserHost: boolean;
  onShareGame: () => void;
  onCopyRoomId: () => void;
  onNewGame: () => void;
  onEndGame: () => void;
}) => (
  <div className="space-y-2">
    {/* Room Code with Copy */}
    <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">Room Code</p>
        <p className="font-mono font-bold tracking-wider">{roomId}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={onCopyRoomId}
      >
        {isCopied ? (
          <Check size={16} className="text-green-500" />
        ) : (
          <Copy size={16} />
        )}
      </Button>
    </div>

    {/* Action Buttons */}
    <div className="grid grid-cols-2 gap-2">
      <Button
        onClick={onShareGame}
        variant="outline"
        size="sm"
        className="h-9"
        disabled={isSharing}
      >
        {isSharing ? (
          <LoadingSpinner size="xs" className="mr-2" />
        ) : (
          <Share size={14} className="mr-2" />
        )}
        Share
      </Button>

      <Button
        onClick={onNewGame}
        variant="outline"
        size="sm"
        className="h-9"
        disabled={isCreatingNewGame}
      >
        {isCreatingNewGame ? (
          <LoadingSpinner size="xs" className="mr-2" />
        ) : (
          <Play size={14} className="mr-2" />
        )}
        New
      </Button>
    </div>

    {isCurrentUserHost && (
      <Button
        onClick={onEndGame}
        variant="destructive"
        size="sm"
        className="w-full h-9"
        disabled={isEndingGame}
      >
        {isEndingGame ? (
          <LoadingSpinner size="xs" className="mr-2" />
        ) : (
          <LogOut size={14} className="mr-2" />
        )}
        End Game
      </Button>
    )}
  </div>
));

ActionButtons.displayName = "ActionButtons";

export const GameSidebar: React.FC<GameSidebarProps> = memo(({
  roomId,
  players: propPlayers,
  gameStatus: propGameStatus,
  trumpSuit: propTrumpSuit,
  scores: propScores,
  currentTurn: propCurrentTurn,
  isCurrentUserHost: propIsCurrentUserHost,
}) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { leaveRoom } = useGameStore();

  const players = propPlayers || [];
  const gameStatus = propGameStatus || "waiting";
  const trumpSuit = propTrumpSuit || null;
  const scores = propScores || { royals: 0, rebels: 0 };
  const currentPlayer = propCurrentTurn || "";
  const isCurrentUserHost = propIsCurrentUserHost !== undefined ? propIsCurrentUserHost : false;

  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [isPlayersExpanded, setIsPlayersExpanded] = useState(false);

  const shouldShowProgressSection = useMemo(
    () => trumpSuit || gameStatus === "playing" || gameStatus === "finished" || gameStatus === "ended",
    [trumpSuit, gameStatus]
  );

  const shouldShowScores = useMemo(
    () => gameStatus === "playing" || gameStatus === "finished" || gameStatus === "ended",
    [gameStatus]
  );

  const handleShareGame = () => {
    setIsSharing(true);
    const url = `${window.location.origin}/game/${roomId}`;
    navigator.clipboard.writeText(url);
    setTimeout(() => setIsSharing(false), 1500);
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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
    <div className="flex flex-col h-full bg-card/90 backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-border/30 bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medieval text-lg text-primary">Game Info</h2>
          <GameStatusBadge status={gameStatus} />
        </div>

        {/* Current Turn - Prominent Position */}
        <CurrentTurnIndicator
          currentPlayer={currentPlayer}
          players={players}
          userId={user?.id}
          gameStatus={gameStatus}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Trump & Scores Section */}
        {shouldShowProgressSection && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-card/50 border border-primary/20"
          >
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-primary" />
              <h3 className="font-medium">Game Progress</h3>
            </div>

            <div className="space-y-4">
              <TrumpDisplay trumpSuit={trumpSuit} />
              {shouldShowScores && <ScoreDisplay scores={scores} />}
            </div>
          </motion.div>
        )}

        {/* Players List */}
        <div className="p-4 rounded-xl bg-card/50 border border-primary/20">
          <PlayersList
            players={players}
            currentTurn={currentPlayer}
            userId={user?.id}
            isExpanded={isPlayersExpanded}
            onToggle={() => setIsPlayersExpanded(!isPlayersExpanded)}
          />
        </div>
      </div>

      {/* Actions - Fixed at Bottom */}
      <div className="p-4 border-t border-border/50 bg-card/90">
        <ActionButtons
          roomId={roomId}
          isSharing={isSharing}
          isCopied={isCopied}
          isCreatingNewGame={isCreatingNewGame}
          isEndingGame={isEndingGame}
          isCurrentUserHost={isCurrentUserHost}
          onShareGame={handleShareGame}
          onCopyRoomId={handleCopyRoomId}
          onNewGame={handleNewGame}
          onEndGame={handleEndGame}
        />
      </div>
    </div>
  );
});

GameSidebar.displayName = "GameSidebar";
