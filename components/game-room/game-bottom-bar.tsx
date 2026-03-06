"use client";

import React, { useState, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share,
  Crown,
  LogOut,
  Trophy,
  Swords,
  Copy,
  Check,
  Timer,
  ChevronUp,
  ChevronDown,
  Users,
  Play,
  Sparkles,
  Wifi,
  WifiLow,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import type { ConnectionQuality } from "@/hooks/use-connection-quality";

interface GameBottomBarProps {
  roomId: string;
  players?: any[];
  gameStatus?: string;
  trumpSuit?: string | null;
  scores?: { royals: number; rebels: number };
  currentTurn?: string;
  currentPlayerId?: string;
  isCurrentUserHost?: boolean;
  turnStartedAt?: number;
  connectionQuality?: ConnectionQuality;
  latency?: number | null;
  leadingSuit?: string | null;
}

// Trump suit display - compact
const TrumpBadge = memo(({ trumpSuit }: { trumpSuit: string | null }) => {
  if (!trumpSuit) return null;

  const suitConfig: Record<string, { symbol: string; color: string; bg: string }> = {
    hearts: { symbol: "♥", color: "text-red-500", bg: "bg-red-500/20" },
    diamonds: { symbol: "♦", color: "text-red-500", bg: "bg-red-500/20" },
    clubs: { symbol: "♣", color: "text-foreground", bg: "bg-foreground/20" },
    spades: { symbol: "♠", color: "text-foreground", bg: "bg-foreground/20" },
  };

  const config = suitConfig[trumpSuit] || { symbol: trumpSuit, color: "text-muted-foreground", bg: "bg-muted" };

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg ${config.bg} border border-primary/20`}>
      <motion.span
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={`text-lg sm:text-xl ${config.color}`}
      >
        {config.symbol}
      </motion.span>
      <div className="hidden sm:block">
        <p className="text-[10px] text-muted-foreground leading-none">Trump</p>
        <p className="text-xs font-semibold capitalize">{trumpSuit}</p>
      </div>
    </div>
  );
});

TrumpBadge.displayName = "TrumpBadge";

// Leading suit display - compact
const LeadBadge = memo(({ leadingSuit, trumpSuit }: { leadingSuit: string | null; trumpSuit: string | null }) => {
  if (!leadingSuit) return null;

  const suitConfig: Record<string, { symbol: string; color: string; bg: string }> = {
    hearts: { symbol: "♥", color: "text-red-500", bg: "bg-red-500/20" },
    diamonds: { symbol: "♦", color: "text-red-500", bg: "bg-red-500/20" },
    clubs: { symbol: "♣", color: "text-foreground", bg: "bg-foreground/20" },
    spades: { symbol: "♠", color: "text-foreground", bg: "bg-foreground/20" },
  };

  const config = suitConfig[leadingSuit] || { symbol: leadingSuit, color: "text-muted-foreground", bg: "bg-muted" };
  const isTrump = trumpSuit && leadingSuit === trumpSuit;

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg ${config.bg} border border-primary/20`}>
      <span className={`text-base sm:text-lg ${config.color}`}>
        {config.symbol}
      </span>
      <span className="text-[10px] sm:text-xs text-muted-foreground">Lead</span>
      {isTrump && (
        <span className="text-[8px] sm:text-[10px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded border border-amber-500/30">
          Trump!
        </span>
      )}
    </div>
  );
});

LeadBadge.displayName = "LeadBadge";

// Compact score display
const ScoreBadge = memo(({ scores }: { scores: { royals: number; rebels: number } }) => {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      {/* Royals */}
      <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30">
        <Crown size={12} className="text-amber-500 sm:hidden" />
        <Crown size={14} className="text-amber-500 hidden sm:block" />
        <span className="text-xs sm:text-sm font-bold text-amber-500">{scores.royals}</span>
      </div>

      <span className="text-muted-foreground text-[10px] sm:text-xs px-0.5 sm:px-1">vs</span>

      {/* Rebels */}
      <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
        <Swords size={12} className="text-blue-500 sm:hidden" />
        <Swords size={14} className="text-blue-500 hidden sm:block" />
        <span className="text-xs sm:text-sm font-bold text-blue-500">{scores.rebels}</span>
      </div>
    </div>
  );
});

ScoreBadge.displayName = "ScoreBadge";

// Current turn indicator - compact with mobile optimization
const TurnIndicator = memo(({
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
  const playerName = isYourTurn ? "You!" : player?.name?.split(" ")[0] || "...";
  const playerIndex = players.findIndex(p => p.id === currentPlayer);
  const isRoyals = playerIndex === 0 || playerIndex === 2;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border ${
        isYourTurn
          ? "bg-primary/20 border-primary animate-pulse"
          : isRoyals
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-blue-500/10 border-blue-500/30"
      }`}
    >
      <Timer size={14} className={`flex-shrink-0 ${isYourTurn ? "text-primary" : isRoyals ? "text-amber-500" : "text-blue-500"}`} />
      <span className={`text-xs sm:text-sm font-medium truncate max-w-[60px] sm:max-w-[100px] ${isYourTurn ? "text-primary" : ""}`}>
        {playerName}
      </span>
    </div>
  );
});

TurnIndicator.displayName = "TurnIndicator";

// Game status badge - compact
const StatusBadge = memo(({ status }: { status: string }) => {
  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    waiting: { label: "Waiting", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: <Users size={12} /> },
    initial_deal: { label: "Dealing", color: "bg-purple-500/20 text-purple-500 border-purple-500/30", icon: <Sparkles size={12} /> },
    trump_selection: { label: "Voting", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: <Crown size={12} /> },
    bidding: { label: "Bidding", color: "bg-orange-500/20 text-orange-500 border-orange-500/30", icon: <Trophy size={12} /> },
    final_deal: { label: "Dealing", color: "bg-purple-500/20 text-purple-500 border-purple-500/30", icon: <Sparkles size={12} /> },
    playing: { label: "Playing", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: <Play size={12} /> },
    finished: { label: "Finished", color: "bg-primary/20 text-primary border-primary/30", icon: <Trophy size={12} /> },
    ended: { label: "Ended", color: "bg-primary/20 text-primary border-primary/30", icon: <Trophy size={12} /> },
  };

  const config = statusConfig[status] || { label: status, color: "bg-muted text-muted-foreground", icon: null };

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${config.color}`}>
      {config.icon}
      <span className="hidden xs:inline sm:inline">{config.label}</span>
    </div>
  );
});

StatusBadge.displayName = "StatusBadge";

// Latency indicator - compact
const LatencyBadge = memo(({
  quality,
  latency
}: {
  quality: ConnectionQuality;
  latency: number | null;
}) => {
  const qualityConfig: Record<ConnectionQuality, { icon: React.ReactNode; color: string; bg: string }> = {
    excellent: { icon: <Wifi size={12} />, color: "text-green-500", bg: "bg-green-500/20 border-green-500/30" },
    good: { icon: <Wifi size={12} />, color: "text-emerald-400", bg: "bg-emerald-400/20 border-emerald-400/30" },
    fair: { icon: <WifiLow size={12} />, color: "text-yellow-500", bg: "bg-yellow-500/20 border-yellow-500/30" },
    poor: { icon: <WifiLow size={12} />, color: "text-red-500", bg: "bg-red-500/20 border-red-500/30" },
    unknown: { icon: <WifiOff size={12} />, color: "text-gray-500", bg: "bg-gray-500/20 border-gray-500/30" },
  };

  const config = qualityConfig[quality];

  return (
    <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full border ${config.bg}`}>
      <span className={config.color}>{config.icon}</span>
      <span className={`text-[10px] sm:text-xs font-medium ${config.color}`}>
        {latency !== null ? `${latency}ms` : "--"}
      </span>
    </div>
  );
});

LatencyBadge.displayName = "LatencyBadge";

// Turn timer badge - compact countdown
const TurnTimerBadge = memo(({
  turnStartedAt,
  isMyTurn,
}: {
  turnStartedAt: number;
  isMyTurn: boolean;
}) => {
  const [timeLeft, setTimeLeft] = useState(30);

  React.useEffect(() => {
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [turnStartedAt]);

  const isLow = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  return (
    <div
      className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-full border ${
        isCritical
          ? "bg-red-500/20 border-red-500/30 animate-pulse"
          : isLow
            ? "bg-yellow-500/20 border-yellow-500/30"
            : isMyTurn
              ? "bg-green-500/20 border-green-500/30"
              : "bg-muted/50 border-border"
      }`}
    >
      <Timer size={12} className={
        isCritical ? "text-red-500" : isLow ? "text-yellow-500" : isMyTurn ? "text-green-500" : "text-muted-foreground"
      } />
      <span className={`text-[10px] sm:text-xs font-bold tabular-nums ${
        isCritical ? "text-red-500" : isLow ? "text-yellow-500" : isMyTurn ? "text-green-500" : "text-muted-foreground"
      }`}>
        {timeLeft}s
      </span>
    </div>
  );
});

TurnTimerBadge.displayName = "TurnTimerBadge";

// Expanded details panel
const ExpandedPanel = memo(({
  players,
  currentTurn,
  userId,
  roomId,
  isSharing,
  isCopied,
  isCurrentUserHost,
  isEndingGame,
  onShareGame,
  onCopyRoomId,
  onEndGame,
}: {
  players: any[];
  currentTurn: string;
  userId?: string;
  roomId: string;
  isSharing: boolean;
  isCopied: boolean;
  isCurrentUserHost: boolean;
  isEndingGame: boolean;
  onShareGame: () => void;
  onCopyRoomId: () => void;
  onEndGame: () => void;
}) => {
  const royals = [players[0], players[2]].filter(Boolean);
  const rebels = [players[1], players[3]].filter(Boolean);

  const PlayerItem = ({ player, team }: { player: any; team: "royals" | "rebels" }) => {
    const isCurrentTurn = player?.id === currentTurn;
    const isYou = player?.id === userId;
    const teamColor = team === "royals" ? "amber" : "blue";

    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded ${isCurrentTurn ? `bg-${teamColor}-500/20` : ""}`}>
        <div className={`w-2 h-2 rounded-full ${isCurrentTurn ? "bg-green-500" : `bg-${teamColor}-500/50`}`} />
        <span className="text-sm">
          {player?.name || "Empty"}
          {isYou && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden border-t border-border/30"
    >
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4">
        {/* Teams - horizontal on mobile, vertical on desktop */}
        <div className="flex sm:flex-col gap-3 sm:space-y-3">
          <div className="flex-1 sm:flex-none">
            <div className="flex items-center gap-1.5 mb-1">
              <Crown size={12} className="text-amber-500" />
              <span className="text-xs font-medium text-amber-500">Royals</span>
            </div>
            {royals.map((p, i) => (
              <PlayerItem key={p?.id || i} player={p} team="royals" />
            ))}
          </div>
          <div className="flex-1 sm:flex-none">
            <div className="flex items-center gap-1.5 mb-1">
              <Swords size={12} className="text-blue-500" />
              <span className="text-xs font-medium text-blue-500">Rebels</span>
            </div>
            {rebels.map((p, i) => (
              <PlayerItem key={p?.id || i} player={p} team="rebels" />
            ))}
          </div>
        </div>

        {/* Room Info & Actions - combined row on mobile */}
        <div className="flex items-center justify-between sm:flex-col sm:justify-center col-span-1 sm:col-span-2">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Room Code</p>
              <div className="flex items-center gap-1 sm:gap-2">
                <code className="font-mono font-bold text-base sm:text-lg tracking-wider">{roomId}</code>
                <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7" onClick={onCopyRoomId}>
                  {isCopied ? <Check size={12} className="text-green-500 sm:hidden" /> : <Copy size={12} className="sm:hidden" />}
                  {isCopied ? <Check size={14} className="text-green-500 hidden sm:block" /> : <Copy size={14} className="hidden sm:block" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 sm:mt-3">
            <Button onClick={onShareGame} variant="outline" size="sm" disabled={isSharing} className="h-8 text-xs sm:text-sm">
              {isSharing ? <LoadingSpinner size="xs" className="mr-1.5" /> : <Share size={14} className="mr-1.5" />}
              Share
            </Button>
            {isCurrentUserHost && (
              <Button onClick={onEndGame} variant="destructive" size="sm" disabled={isEndingGame} className="h-8 text-xs sm:text-sm">
                {isEndingGame ? <LoadingSpinner size="xs" className="mr-1.5" /> : <LogOut size={14} className="mr-1.5" />}
                End Game
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

ExpandedPanel.displayName = "ExpandedPanel";

export const GameBottomBar: React.FC<GameBottomBarProps> = memo(({
  roomId,
  players: propPlayers,
  gameStatus: propGameStatus,
  trumpSuit: propTrumpSuit,
  scores: propScores,
  currentTurn: propCurrentTurn,
  currentPlayerId,
  isCurrentUserHost: propIsCurrentUserHost,
  turnStartedAt,
  connectionQuality,
  latency,
  leadingSuit,
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

  const isMyTurn = useMemo(() => {
    return currentPlayer !== "" && currentPlayer === currentPlayerId;
  }, [currentPlayer, currentPlayerId]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);

  const showScores = useMemo(
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
    <div className="mx-2 sm:mx-4 mb-2 sm:mb-4 rounded-xl bg-card/95 backdrop-blur-md border-2 border-primary/20 shadow-lg overflow-hidden">
      {/* Main Bar */}
      <div className="px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Status & Turn */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink">
          <StatusBadge status={gameStatus} />
          <TurnIndicator
            currentPlayer={currentPlayer}
            players={players}
            userId={user?.id}
            gameStatus={gameStatus}
          />
        </div>

        {/* Center: Trump, Lead & Scores */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <TrumpBadge trumpSuit={trumpSuit} />
          {gameStatus === "playing" && <LeadBadge leadingSuit={leadingSuit ?? null} trumpSuit={trumpSuit} />}
          {showScores && <ScoreBadge scores={scores} />}
        </div>

        {/* Right: Timer, Latency, Room Code & Expand */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Turn Timer */}
          {gameStatus === "playing" && turnStartedAt && (
            <TurnTimerBadge turnStartedAt={turnStartedAt} isMyTurn={isMyTurn} />
          )}

          {/* Latency */}
          {connectionQuality && (
            <LatencyBadge quality={connectionQuality} latency={latency ?? null} />
          )}

          {/* Room code - compact */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border">
            <code className="font-mono text-sm font-bold">{roomId}</code>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopyRoomId}>
              {isCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            </Button>
          </div>

          {/* Expand button */}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown size={14} className="sm:hidden" /> : <ChevronUp size={14} className="sm:hidden" />}
            {isExpanded ? <ChevronDown size={16} className="hidden sm:block" /> : <ChevronUp size={16} className="hidden sm:block" />}
          </Button>
        </div>
      </div>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <ExpandedPanel
            players={players}
            currentTurn={currentPlayer}
            userId={user?.id}
            roomId={roomId}
            isSharing={isSharing}
            isCopied={isCopied}
            isCurrentUserHost={isCurrentUserHost}
            isEndingGame={isEndingGame}
            onShareGame={handleShareGame}
            onCopyRoomId={handleCopyRoomId}
            onEndGame={handleEndGame}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

GameBottomBar.displayName = "GameBottomBar";
