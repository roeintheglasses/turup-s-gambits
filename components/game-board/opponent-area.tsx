"use client";

import { motion } from "framer-motion";
import { Crown, Swords, Wifi, WifiOff } from "lucide-react";

interface OpponentAreaProps {
  name: string;
  position: "top" | "left" | "right";
  team: "royals" | "rebels";
  isCurrentTurn: boolean;
  isConnected: boolean;
  cardCount: number;
}

/**
 * Opponent Area - Shows opponent player with card backs
 * Features:
 * - Stacked card backs showing card count
 * - Clear team indicator
 * - Turn indicator with glow effect
 * - Connection status
 */
export function OpponentArea({
  name,
  position,
  team,
  isCurrentTurn,
  isConnected,
  cardCount,
}: OpponentAreaProps) {
  const TeamIcon = team === "royals" ? Crown : Swords;
  const teamColor = team === "royals"
    ? "border-amber-500 text-amber-500"
    : "border-blue-500 text-blue-500";
  const teamBg = team === "royals"
    ? "bg-amber-500/10"
    : "bg-blue-500/10";
  const teamGlow = team === "royals"
    ? "shadow-[0_0_30px_rgba(245,158,11,0.4)]"
    : "shadow-[0_0_30px_rgba(59,130,246,0.4)]";

  // Position-specific styles for the card backs display
  const getCardBacksLayout = () => {
    if (position === "top") {
      return "flex-row gap-0.5";
    }
    if (position === "left" || position === "right") {
      return "flex-col gap-0.5";
    }
    return "flex-row gap-0.5";
  };

  // Render minimal card backs (max 5 shown, rest as counter)
  const visibleCards = Math.min(cardCount, 5);
  const hiddenCards = Math.max(0, cardCount - 5);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Card backs */}
      <div className={`flex ${getCardBacksLayout()} items-center justify-center`}>
        {Array.from({ length: visibleCards }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="w-6 h-8 sm:w-8 sm:h-11 md:w-10 md:h-14 rounded-md bg-gradient-to-br from-[#8B4513] via-[#A0522D] to-[#654321] border sm:border-2 border-[#5D3A1A] shadow-md"
            style={{
              marginLeft: position !== "left" && position !== "right" && i > 0 ? "-14px" : "0",
              marginTop: (position === "left" || position === "right") && i > 0 ? "-20px" : "0",
              zIndex: i,
            }}
          >
            {/* Card back design */}
            <div className="w-full h-full rounded-sm flex items-center justify-center overflow-hidden">
              <div
                className="w-[85%] h-[85%] rounded-sm border border-amber-700/50"
                style={{
                  background: `repeating-linear-gradient(
                    45deg,
                    #6B4423,
                    #6B4423 2px,
                    #7A5030 2px,
                    #7A5030 4px
                  )`
                }}
              />
            </div>
          </motion.div>
        ))}

        {/* Hidden cards counter */}
        {hiddenCards > 0 && (
          <div className="ml-0.5 sm:ml-1 bg-black/50 text-white text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded">
            +{hiddenCards}
          </div>
        )}
      </div>

      {/* Player info badge */}
      <div
        className={`relative flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border-2 transition-all duration-300 ${teamColor} ${teamBg} ${
          isCurrentTurn ? teamGlow : ""
        }`}
      >
        {/* Turn indicator pulse */}
        {isCurrentTurn && (
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
              team === "royals" ? "bg-amber-500" : "bg-blue-500"
            }`}
          />
        )}

        <TeamIcon className="w-3 h-3 sm:w-4 sm:h-4" />

        <div className="flex flex-col">
          <span className="text-[10px] sm:text-xs md:text-sm font-medieval text-white font-semibold leading-tight truncate max-w-[50px] sm:max-w-[80px] md:max-w-none">
            {name}
          </span>
          <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-white/70">
            <span>{cardCount}</span>
            <span className="hidden sm:inline">cards</span>
            {isConnected ? (
              <Wifi className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-400" />
            ) : (
              <WifiOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
