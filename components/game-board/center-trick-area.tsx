"use client";

import { memo, useMemo, useCallback, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/card";
import { Trophy, Crown, Swords } from "lucide-react";
import { playSoundEffect } from "@/hooks/use-sound-effects";

interface CenterCard {
  id: number | string;
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
  isCollecting?: boolean;
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
export const CenterTrickArea = memo(function CenterTrickArea({
  cards,
  trumpSuit,
  leadingSuit,
  winningCardIndex,
  playerPositions,
  teamAssignments = {},
  isCollecting = false,
}: CenterTrickAreaProps) {
  // Memoize mobile check - only re-evaluate on mount/resize
  const [isMobile, setIsMobile] = useState(false);
  const prevCardCountRef = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Play sound when a card is added
  useEffect(() => {
    if (cards.length > prevCardCountRef.current && cards.length > 0) {
      playSoundEffect("cardPlay", 0.4);
    }
    prevCardCountRef.current = cards.length;
  }, [cards.length]);

  // Memoize normalized player positions
  const normalizedPositions = useMemo(() => ({
    top: playerPositions.top?.trim().toLowerCase(),
    bottom: playerPositions.bottom?.trim().toLowerCase(),
    left: playerPositions.left?.trim().toLowerCase(),
    right: playerPositions.right?.trim().toLowerCase(),
  }), [playerPositions]);

  // Get card position and animation based on who played it
  const getCardConfig = useCallback((playerName: string) => {
    const normalizedName = playerName?.trim().toLowerCase();

    if (normalizedName === normalizedPositions.bottom) {
      return {
        position: "bottom" as const,
        top: isMobile ? "55%" : "60%",
        left: "50%",
        initialY: isMobile ? 40 : 60,
      };
    } else if (normalizedName === normalizedPositions.top) {
      return {
        position: "top" as const,
        top: isMobile ? "15%" : "10%",
        left: "50%",
        initialY: isMobile ? -40 : -60,
      };
    } else if (normalizedName === normalizedPositions.left) {
      return {
        position: "left" as const,
        top: "35%",
        left: isMobile ? "20%" : "15%",
        initialX: isMobile ? -40 : -60,
      };
    } else if (normalizedName === normalizedPositions.right) {
      return {
        position: "right" as const,
        top: "35%",
        left: isMobile ? "80%" : "85%",
        initialX: isMobile ? 40 : 60,
      };
    }

    // Default: center (shouldn't happen normally)
    return {
      position: "center" as const,
      top: "35%",
      left: "50%",
      initialX: 0,
      initialY: 0,
    };
  }, [normalizedPositions, isMobile]);

  // Calculate exit animation direction based on winning player position
  // Two-phase animation: first gather to center, then fly to winner
  const getExitAnimation = useCallback((winnerName: string | undefined, cardIndex: number) => {
    if (!winnerName) {
      return { opacity: 0, scale: 0.5, transition: { duration: 0.3 } };
    }

    const normalizedWinner = winnerName.trim().toLowerCase();
    const exitDistance = isMobile ? 100 : 150;
    const exitScale = 0.2;
    const baseDelay = 0.05 * cardIndex; // Stagger the exit

    // Determine exit direction based on winner position
    let exitX = 0;
    let exitY = 0;
    let exitRotate = 0;

    if (normalizedWinner === normalizedPositions.bottom) {
      exitY = exitDistance;
      exitRotate = 15 + cardIndex * 5;
    } else if (normalizedWinner === normalizedPositions.top) {
      exitY = -exitDistance;
      exitRotate = -15 - cardIndex * 5;
    } else if (normalizedWinner === normalizedPositions.left) {
      exitX = -exitDistance;
      exitRotate = -20 - cardIndex * 5;
    } else if (normalizedWinner === normalizedPositions.right) {
      exitX = exitDistance;
      exitRotate = 20 + cardIndex * 5;
    }

    return {
      x: exitX,
      y: exitY,
      scale: exitScale,
      opacity: 0,
      rotate: exitRotate,
      transition: {
        duration: 0.5,
        delay: baseDelay,
        ease: [0.4, 0, 0.2, 1],
        opacity: { duration: 0.3, delay: baseDelay + 0.2 }
      },
    };
  }, [normalizedPositions, isMobile]);

  // Get the winner name for exit animations
  const winnerName = useMemo(() => {
    if (winningCardIndex !== null && cards[winningCardIndex]) {
      return cards[winningCardIndex].playedBy;
    }
    return undefined;
  }, [winningCardIndex, cards]);

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
      {/* Center decoration when no cards */}
      {cards.length === 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
          <span className="text-white/20 text-[10px] sm:text-xs font-medieval">Play area</span>
        </div>
      )}

      {/* Cards arranged in diamond pattern */}
      <AnimatePresence>
        {cards.map((card, index) => {
          const config = getCardConfig(card.playedBy);
          const isWinning = winningCardIndex === index;
          const team = teamAssignments[card.playedBy];

          // Calculate entry rotation based on direction
          const entryRotation = config.position === "left" ? -15 :
                               config.position === "right" ? 15 :
                               config.position === "top" ? -8 : 8;

          return (
            <motion.div
              key={`trick-card-${card.id}-${index}-${card.playedBy}`}
              initial={{
                x: (config.initialX || 0) * 1.5,
                y: (config.initialY || 0) * 1.5,
                opacity: 0,
                scale: 0.5,
                rotate: entryRotation,
              }}
              animate={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: isWinning ? 1.08 : 1,
                rotate: 0,
              }}
              exit={getExitAnimation(winnerName, index)}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 35,
                mass: 0.6,
              }}
              className="absolute -translate-x-1/2 will-change-transform"
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
                  {/* Glow effect - limited repeats for performance */}
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
                      repeat: 2,
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
                className={`absolute -bottom-5 sm:-bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap ${
                  team === "royals"
                    ? "bg-amber-900/80 border border-amber-500/50"
                    : team === "rebels"
                      ? "bg-blue-900/80 border border-blue-500/50"
                      : "bg-black/60 border border-white/20"
                }`}
              >
                {team === "royals" && <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />}
                {team === "rebels" && <Swords className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400" />}
                <span className="text-[8px] sm:text-[10px] font-medieval text-white truncate max-w-[50px] sm:max-w-none">
                  {card.playedBy}
                </span>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Trump suit reminder in corner */}
      {trumpSuit && (
        <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-white/50">
          <span className="hidden sm:inline">Trump:</span>
          <span className={`text-sm sm:text-base ${getSuitColor(trumpSuit)}`}>
            {getSuitSymbol(trumpSuit)}
          </span>
        </div>
      )}
    </div>
  );
});
