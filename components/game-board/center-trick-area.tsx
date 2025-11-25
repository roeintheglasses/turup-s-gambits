"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/card";
import { Trophy, Crown, Swords } from "lucide-react";

interface CenterCard {
  id: number;
  suit: string;
  value: string;
  playedBy: string;
}

interface CenterTrickAreaProps {
  cards: CenterCard[];
  trumpSuit: string | null;
  leadingSuit: string | null;
  winningCardIndex: number | null;
  playerPositions: {
    top: string;
    left: string;
    right: string;
    bottom: string;
  };
  teamAssignments?: Record<string, "royals" | "rebels">;
}

/**
 * Improved Center Trick Area
 * Features:
 * - Diamond layout with cards positioned toward players
 * - Clear play order indicators
 * - Winning card highlight with trophy
 * - Leading suit indicator
 * - Smooth entry animations
 */
export function CenterTrickArea({
  cards,
  trumpSuit,
  leadingSuit,
  winningCardIndex,
  playerPositions,
  teamAssignments = {},
}: CenterTrickAreaProps) {
  // Get card position and animation based on who played it
  // Using fixed pixel offsets from center to avoid transform conflicts
  const getCardConfig = (playerName: string) => {
    // Normalize player name for comparison (trim whitespace, lowercase)
    const normalizedName = playerName?.trim().toLowerCase();
    const normalizedTop = playerPositions.top?.trim().toLowerCase();
    const normalizedBottom = playerPositions.bottom?.trim().toLowerCase();
    const normalizedLeft = playerPositions.left?.trim().toLowerCase();
    const normalizedRight = playerPositions.right?.trim().toLowerCase();

    if (normalizedName === normalizedBottom) {
      return {
        position: "bottom" as const,
        // Position below center
        top: "60%",
        left: "50%",
        initialY: 60,
      };
    } else if (normalizedName === normalizedTop) {
      return {
        position: "top" as const,
        // Position above center
        top: "10%",
        left: "50%",
        initialY: -60,
      };
    } else if (normalizedName === normalizedLeft) {
      return {
        position: "left" as const,
        // Position left of center
        top: "35%",
        left: "15%",
        initialX: -60,
      };
    } else if (normalizedName === normalizedRight) {
      return {
        position: "right" as const,
        // Position right of center
        top: "35%",
        left: "85%",
        initialX: 60,
      };
    }

    // Default: center (shouldn't happen normally)
    console.log(`[CenterTrickArea] Unknown player: "${playerName}" - positions:`, playerPositions);
    return {
      position: "center" as const,
      top: "35%",
      left: "50%",
      initialX: 0,
      initialY: 0,
    };
  };

  const getSuitSymbol = (suit: string): string => {
    switch (suit?.toLowerCase()) {
      case "hearts": return "♥";
      case "diamonds": return "♦";
      case "clubs": return "♣";
      case "spades": return "♠";
      default: return "";
    }
  };

  const getSuitColor = (suit: string): string => {
    switch (suit?.toLowerCase()) {
      case "hearts":
      case "diamonds":
        return "text-red-500";
      default:
        return "text-white";
    }
  };

  return (
    <div className="absolute inset-0">
      {/* Leading suit indicator */}
      <AnimatePresence>
        {leadingSuit && cards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 z-30"
          >
            <span className="text-xs text-white/70">Lead:</span>
            <span className={`text-lg ${getSuitColor(leadingSuit)}`}>
              {getSuitSymbol(leadingSuit)}
            </span>
            {trumpSuit && leadingSuit === trumpSuit && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
                Trump!
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center decoration when no cards */}
      {cards.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
          <span className="text-white/20 text-xs font-medieval">Play area</span>
        </div>
      )}

      {/* Cards arranged in diamond pattern */}
      <AnimatePresence>
        {cards.map((card, index) => {
          const config = getCardConfig(card.playedBy);
          const isWinning = winningCardIndex === index;
          const team = teamAssignments[card.playedBy];

          return (
            <motion.div
              key={`trick-card-${card.id}-${index}-${card.playedBy}`}
              initial={{
                x: config.initialX || 0,
                y: config.initialY || 0,
                opacity: 0,
                scale: 0.8
              }}
              animate={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: isWinning ? 1.1 : 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.5,
                transition: { duration: 0.2 },
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: index * 0.1,
              }}
              className="absolute -translate-x-1/2"
              style={{
                top: config.top,
                left: config.left,
                zIndex: 10 + index
              }}
            >
              {/* Play order badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                className="absolute -top-2 -left-2 z-20 bg-[hsl(var(--dark-panel))] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border border-white/30 shadow-lg"
              >
                {index + 1}
              </motion.div>

              {/* Winning card indicator */}
              {isWinning && (
                <>
                  {/* Glow effect */}
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 10px rgba(251, 191, 36, 0.3)",
                        "0 0 25px rgba(251, 191, 36, 0.6)",
                        "0 0 10px rgba(251, 191, 36, 0.3)",
                      ],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-lg pointer-events-none"
                  />

                  {/* Trophy badge */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.3 }}
                    className="absolute -top-2 -right-2 z-20 bg-amber-500 text-white rounded-full p-1 border-2 border-white shadow-lg"
                  >
                    <Trophy className="w-3 h-3" />
                  </motion.div>
                </>
              )}

              {/* The card with shadow */}
              <div className="relative">
                <div className="absolute inset-0 bg-black/30 rounded-lg blur-md translate-y-2" />
                <Card
                  suit={card.suit}
                  value={card.value}
                  onClick={() => {}}
                  disabled={true}
                  is3D={false}
                />
              </div>

              {/* Player name tag */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
                className={`absolute -bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-md whitespace-nowrap ${
                  team === "royals"
                    ? "bg-amber-900/80 border border-amber-500/50"
                    : team === "rebels"
                      ? "bg-blue-900/80 border border-blue-500/50"
                      : "bg-black/60 border border-white/20"
                }`}
              >
                {team === "royals" && <Crown className="w-3 h-3 text-amber-400" />}
                {team === "rebels" && <Swords className="w-3 h-3 text-blue-400" />}
                <span className="text-[10px] font-medieval text-white">
                  {card.playedBy}
                </span>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Trump suit reminder in corner */}
      {trumpSuit && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-white/50">
          <span>Trump:</span>
          <span className={`text-base ${getSuitColor(trumpSuit)}`}>
            {getSuitSymbol(trumpSuit)}
          </span>
        </div>
      )}
    </div>
  );
}
