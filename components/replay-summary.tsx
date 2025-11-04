"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  Download, 
  Share2,
  Trophy,
  Target,
  Clock,
  Users,
  BarChart3,
  PlayCircle,
  Eye
} from "lucide-react";
import { useReplay } from "@/hooks/use-replay";
import { useGameStore } from "@/stores";
import { useUIStore } from "@/stores/uiStore";

// Types
interface ReplaySummaryProps {
  isOpen: boolean;
  onClose: () => void;
  gameData?: {
    gameId: string;
    players: string[];
    winner: string;
    gameMode: "classic" | "frenzy";
    trumpSuit: string;
    finalScores: { royals: number; rebels: number };
    duration: number;
    totalTricks: number;
  };
}

interface ReplayMove {
  id: string;
  type: "card_played" | "trick_won" | "trump_selected" | "bid_placed";
  player: string;
  timestamp: string;
  data: any;
}

interface PlayerStats {
  name: string;
  tricksWon: number;
  cardsPlayed: number;
  highestCard: string;
  trumpCardsPlayed: number;
  team: "royals" | "rebels";
}

// Replay controls component
const ReplayControls: React.FC<{
  isPlaying: boolean;
  currentMove: number;
  totalMoves: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}> = ({
  isPlaying,
  currentMove,
  totalMoves,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onReset,
  playbackSpeed,
  onSpeedChange,
}) => {
  return (
    <div className="bg-card/80 backdrop-blur-md p-4 rounded-lg border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            className="p-2"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onPrev}
            disabled={currentMove === 0}
            className="p-2"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            onClick={isPlaying ? onPause : onPlay}
            disabled={currentMove >= totalMoves}
            className="p-2"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={onNext}
            disabled={currentMove >= totalMoves}
            className="p-2"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="bg-background border border-border rounded px-2 py-1 text-sm"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative">
        <div className="w-full bg-muted/30 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-200"
            style={{ width: `${(currentMove / totalMoves) * 100}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
          <span>Move {currentMove}</span>
          <span>{totalMoves} total</span>
        </div>
      </div>
    </div>
  );
};

// Player statistics component
const PlayerStatistics: React.FC<{
  stats: PlayerStats[];
  winner: string;
}> = ({ stats, winner }) => {
  return (
    <div className="bg-card/80 backdrop-blur-md p-4 rounded-lg border border-border/50">
      <h3 className="font-medieval text-lg text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Player Statistics
      </h3>
      
      <div className="space-y-3">
        {stats.map((player, index) => (
          <div
            key={player.name}
            className={`
              p-3 rounded-lg border transition-all duration-200
              ${
                player.name === winner
                  ? "bg-primary/20 border-primary/50"
                  : "bg-muted/20 border-border/30"
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {player.name}
                </span>
                <span className={`
                  text-xs px-2 py-1 rounded-full
                  ${player.team === "royals" 
                    ? "bg-blue-500/20 text-blue-300" 
                    : "bg-red-500/20 text-red-300"
                  }
                `}>
                  {player.team}
                </span>
                {player.name === winner && (
                  <Trophy className="h-4 w-4 text-amber-500" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tricks Won:</span>
                <span className="font-medium">{player.tricksWon}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cards Played:</span>
                <span className="font-medium">{player.cardsPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trump Cards:</span>
                <span className="font-medium">{player.trumpCardsPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Highest Card:</span>
                <span className="font-medium">{player.highestCard}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Game summary component
const GameSummary: React.FC<{
  gameData: ReplaySummaryProps["gameData"];
}> = ({ gameData }) => {
  if (!gameData) return null;

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-card/80 backdrop-blur-md p-4 rounded-lg border border-border/50">
      <h3 className="font-medieval text-lg text-foreground mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5" />
        Game Summary
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Game Mode:</span>
            <span className="font-medium capitalize">{gameData.gameMode}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Trump Suit:</span>
            <div className="flex items-center gap-1">
              <span className="text-lg">
                {gameData.trumpSuit === "hearts" ? "♥" :
                 gameData.trumpSuit === "diamonds" ? "♦" :
                 gameData.trumpSuit === "clubs" ? "♣" : "♠"}
              </span>
              <span className="capitalize">{gameData.trumpSuit}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Duration:</span>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{formatDuration(gameData.duration)}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Winner:</span>
            <span className="font-medium text-primary">{gameData.winner}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Final Score:</span>
            <span className="font-medium">
              {gameData.finalScores.royals} - {gameData.finalScores.rebels}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total Tricks:</span>
            <span className="font-medium">{gameData.totalTricks}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Move timeline component
const MoveTimeline: React.FC<{
  moves: ReplayMove[];
  currentMove: number;
  onMoveSelect: (moveIndex: number) => void;
}> = ({ moves, currentMove, onMoveSelect }) => {
  return (
    <div className="bg-card/80 backdrop-blur-md p-4 rounded-lg border border-border/50">
      <h3 className="font-medieval text-lg text-foreground mb-4 flex items-center gap-2">
        <PlayCircle className="h-5 w-5" />
        Move Timeline
      </h3>

      <div className="max-h-32 sm:max-h-40 md:max-h-48 overflow-y-auto space-y-2">
        {moves.map((move, index) => (
          <button
            key={move.id}
            onClick={() => onMoveSelect(index)}
            className={`
              w-full text-left p-2 rounded border transition-all duration-200
              ${
                index === currentMove
                  ? "bg-primary/20 border-primary/50"
                  : index < currentMove
                  ? "bg-muted/20 border-border/30 opacity-60"
                  : "bg-card border-border/30 hover:bg-muted/10"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {move.type.replace("_", " ")}
              </span>
              <span className="text-xs text-muted-foreground">
                Move {index + 1}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {move.player} - {new Date(move.timestamp).toLocaleTimeString()}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export function ReplaySummary({
  isOpen,
  onClose,
  gameData,
}: ReplaySummaryProps) {
  const { getReplayData } = useReplay();
  const [currentMove, setCurrentMove] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Mock data for demonstration
  const mockMoves: ReplayMove[] = useMemo(() => [
    {
      id: "1",
      type: "trump_selected",
      player: "Player 1",
      timestamp: new Date().toISOString(),
      data: { suit: "hearts" },
    },
    {
      id: "2",
      type: "bid_placed",
      player: "Player 1",
      timestamp: new Date().toISOString(),
      data: { bid: 8 },
    },
    {
      id: "3",
      type: "card_played",
      player: "Player 1",
      timestamp: new Date().toISOString(),
      data: { card: { suit: "hearts", value: "A" } },
    },
    // Add more mock moves as needed
  ], []);

  const mockPlayerStats: PlayerStats[] = useMemo(() => [
    {
      name: "Player 1",
      tricksWon: 4,
      cardsPlayed: 13,
      highestCard: "A♥",
      trumpCardsPlayed: 3,
      team: "royals",
    },
    {
      name: "Player 2",
      tricksWon: 3,
      cardsPlayed: 13,
      highestCard: "K♠",
      trumpCardsPlayed: 2,
      team: "royals",
    },
    {
      name: "Player 3",
      tricksWon: 3,
      cardsPlayed: 13,
      highestCard: "Q♦",
      trumpCardsPlayed: 4,
      team: "rebels",
    },
    {
      name: "Player 4",
      tricksWon: 3,
      cardsPlayed: 13,
      highestCard: "J♣",
      trumpCardsPlayed: 1,
      team: "rebels",
    },
  ], []);

  const mockGameData = useMemo(() => gameData || {
    gameId: "game-123",
    players: ["Player 1", "Player 2", "Player 3", "Player 4"],
    winner: "Player 1",
    gameMode: "classic" as const,
    trumpSuit: "hearts",
    finalScores: { royals: 7, rebels: 6 },
    duration: 1245, // 20:45
    totalTricks: 13,
  }, [gameData]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || currentMove >= mockMoves.length) return;

    const timeout = setTimeout(() => {
      setCurrentMove((prev) => prev + 1);
    }, 1000 / playbackSpeed);

    return () => clearTimeout(timeout);
  }, [isPlaying, currentMove, mockMoves.length, playbackSpeed]);

  // Stop playing when reaching the end
  useEffect(() => {
    if (currentMove >= mockMoves.length) {
      setIsPlaying(false);
    }
  }, [currentMove, mockMoves.length]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleNext = () => setCurrentMove((prev) => Math.min(prev + 1, mockMoves.length));
  const handlePrev = () => setCurrentMove((prev) => Math.max(prev - 1, 0));
  const handleReset = () => {
    setCurrentMove(0);
    setIsPlaying(false);
  };

  const handleExport = () => {
    const replayData = {
      gameData: mockGameData,
      moves: mockMoves,
      playerStats: mockPlayerStats,
    };
    
    const dataStr = JSON.stringify(replayData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `turup-replay-${mockGameData.gameId}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    useUIStore.getState().showToast("Replay exported successfully!", "success");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Turup's Gambit Replay - ${mockGameData.winner} wins!`,
          text: `Check out this game replay! ${mockGameData.winner} won ${mockGameData.finalScores.royals}-${mockGameData.finalScores.rebels}`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying to clipboard
      await navigator.clipboard.writeText(window.location.href);
      useUIStore.getState().showToast("Link copied to clipboard!", "info");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-background/95 backdrop-blur-md w-full max-w-5xl max-h-[90vh] flex flex-col rounded-lg border-2 border-border shadow-xl"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-background/95 backdrop-blur-md p-3 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medieval text-foreground flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Game Replay
              </h2>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExport}
                  className="flex items-center gap-1 text-xs px-2 py-1"
                >
                  <Download className="h-3 w-3" />
                  Export
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShare}
                  className="flex items-center gap-1 text-xs px-2 py-1"
                >
                  <Share2 className="h-3 w-3" />
                  Share
                </Button>

                <Button size="sm" onClick={onClose} className="text-xs px-2 py-1">
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 p-3 space-y-3" style={{ scrollbarWidth: 'thin' }}>
            {/* Game Summary */}
            <GameSummary gameData={mockGameData} />
            
            {/* Replay Controls */}
            <ReplayControls
              isPlaying={isPlaying}
              currentMove={currentMove}
              totalMoves={mockMoves.length}
              onPlay={handlePlay}
              onPause={handlePause}
              onNext={handleNext}
              onPrev={handlePrev}
              onReset={handleReset}
              playbackSpeed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Player Statistics */}
              <PlayerStatistics
                stats={mockPlayerStats}
                winner={mockGameData.winner}
              />

              {/* Move Timeline */}
              <MoveTimeline
                moves={mockMoves}
                currentMove={currentMove}
                onMoveSelect={setCurrentMove}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 