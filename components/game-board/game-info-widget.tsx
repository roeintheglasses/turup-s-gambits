"use client";

import { motion } from "framer-motion";
import { Crown, Swords } from "lucide-react";

interface GameInfoWidgetProps {
  trumpSuit: string | null;
  royalsScore: number;
  rebelsScore: number;
  royalsTricks?: number;
  rebelsTricks?: number;
  currentRound?: number;
  totalRounds?: number;
}

const getSuitSymbol = (suit: string): string => {
  switch (suit?.toLowerCase()) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
    default:
      return "";
  }
};

const getSuitColor = (suit: string): string => {
  switch (suit?.toLowerCase()) {
    case "hearts":
    case "diamonds":
      return "text-red-500";
    case "clubs":
    case "spades":
      return "text-slate-100";
    default:
      return "";
  }
};

const getSuitBg = (suit: string): string => {
  switch (suit?.toLowerCase()) {
    case "hearts":
    case "diamonds":
      return "bg-red-500/10 border-red-500/30";
    case "clubs":
    case "spades":
      return "bg-slate-500/10 border-slate-500/30";
    default:
      return "bg-muted/20 border-border/30";
  }
};

/**
 * Compact game info widget - Always visible on screen
 * Shows trump suit and scores at a glance
 * Positioned in top-left corner, mobile-optimized
 */
export function GameInfoWidget({
  trumpSuit,
  royalsScore,
  rebelsScore,
  royalsTricks = 0,
  rebelsTricks = 0,
}: GameInfoWidgetProps) {
  const targetScore = 7;
  const royalsProgress = (royalsScore / targetScore) * 100;
  const rebelsProgress = (rebelsScore / targetScore) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-20 left-4 z-40 sm:top-24"
    >
      <div className="bg-[hsl(var(--dark-panel))]/95 backdrop-blur-md border-2 border-[hsl(var(--warm-brown))] rounded-xl shadow-2xl overflow-hidden w-[140px] sm:w-[160px]">
        {/* Trump Suit Display */}
        {trumpSuit && (
          <div className={`px-3 py-2 border-b ${getSuitBg(trumpSuit)}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">
                Trump
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xl sm:text-2xl ${getSuitColor(trumpSuit)}`}
                >
                  {getSuitSymbol(trumpSuit)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scores Section */}
        <div className="p-2 sm:p-3 space-y-2">
          {/* Royals Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
                <span className="text-xs sm:text-sm text-white font-medium">
                  Royals
                </span>
              </div>
              <span className="text-base sm:text-lg font-bold text-amber-400">
                {royalsScore}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(royalsProgress, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10" />

          {/* Rebels Score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
                <span className="text-xs sm:text-sm text-white font-medium">
                  Rebels
                </span>
              </div>
              <span className="text-base sm:text-lg font-bold text-blue-400">
                {rebelsScore}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(rebelsProgress, 100)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Win target indicator */}
        <div className="px-2 py-1.5 bg-black/20 border-t border-white/5 text-center">
          <span className="text-[10px] text-white/50">
            First to {targetScore} wins
          </span>
        </div>
      </div>
    </motion.div>
  );
}
