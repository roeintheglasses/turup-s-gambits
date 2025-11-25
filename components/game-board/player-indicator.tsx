"use client";

import { motion } from "framer-motion";
import { Crown, Swords, Bot, Wifi, WifiOff, User } from "lucide-react";

interface PlayerIndicatorProps {
  name: string;
  position: "top" | "left" | "right" | "bottom";
  team: "royals" | "rebels";
  isCurrentTurn: boolean;
  isBot: boolean;
  isConnected: boolean;
  cardCount: number;
  isCurrentPlayer?: boolean;
}

/**
 * Improved Player Indicator - Phase 1
 * Features:
 * - Team affiliation with colored borders
 * - Turn indicator with glowing animation
 * - Card count badge
 * - Connection status
 * - Bot indicator
 */
export function PlayerIndicator({
  name,
  position,
  team,
  isCurrentTurn,
  isBot,
  isConnected,
  cardCount,
  isCurrentPlayer = false,
}: PlayerIndicatorProps) {
  const teamColor = team === "royals" ? "amber" : "blue";
  const teamIcon = team === "royals" ? Crown : Swords;
  const TeamIcon = teamIcon;

  // Position-specific styles
  const positionClasses = {
    top: "top-4 left-1/2 -translate-x-1/2",
    bottom: "bottom-4 left-1/2 -translate-x-1/2",
    left: "left-4 top-1/2 -translate-y-1/2",
    right: "right-4 top-1/2 -translate-y-1/2",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`absolute ${positionClasses[position]} z-30`}
    >
      <div
        className={`relative bg-[hsl(var(--dark-panel))]/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border-2 transition-all duration-300 ${
          isCurrentTurn
            ? team === "royals"
              ? "border-[hsl(var(--amber-primary))] shadow-[0_0_20px_rgba(251,191,36,0.5)]"
              : "border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.5)]"
            : team === "royals"
            ? "border-[hsl(var(--amber-primary))]/30"
            : "border-blue-400/30"
        } ${isCurrentPlayer ? "ring-2 ring-green-400 ring-offset-2 ring-offset-background" : ""}`}
      >
        {/* Turn glow animation */}
        {isCurrentTurn && (
          <motion.div
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute inset-0 rounded-lg pointer-events-none ${
              team === "royals"
                ? "bg-[hsl(var(--amber-primary))]/20"
                : "bg-blue-400/20"
            }`}
          />
        )}

        <div className="relative flex items-center gap-3">
          {/* Team icon */}
          <div
            className={`${
              team === "royals"
                ? "text-[hsl(var(--amber-primary))]"
                : "text-blue-400"
            }`}
          >
            <TeamIcon className="h-5 w-5" />
          </div>

          {/* Player info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medieval text-foreground font-semibold">
                {name}
              </span>
              {isCurrentPlayer && (
                <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full border border-green-500/30">
                  You
                </span>
              )}
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-2 mt-0.5">
              {/* Bot indicator */}
              {isBot && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Bot className="h-3 w-3" />
                  <span>Bot</span>
                </div>
              )}

              {/* Connection status */}
              {!isBot && (
                <div
                  className={`flex items-center gap-1 text-xs ${
                    isConnected ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isConnected ? (
                    <Wifi className="h-3 w-3" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                </div>
              )}

              {/* Card count badge */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{cardCount}</span>
                <span>cards</span>
              </div>
            </div>
          </div>
        </div>

        {/* Turn indicator pulse */}
        {isCurrentTurn && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-1 -right-1"
          >
            <div
              className={`w-3 h-3 rounded-full ${
                team === "royals" ? "bg-[hsl(var(--amber-primary))]" : "bg-blue-400"
              }`}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
