"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";
import { GAME_CONFIG } from "@/lib/constants";

interface TurnTimerProps {
  turnStartedAt: number;
  isMyTurn: boolean;
  currentPlayerName: string;
  isVisible?: boolean;
}

/**
 * Turn Timer Component
 * Shows a visual countdown for the current player's turn
 * Features:
 * - Circular progress indicator
 * - Color changes as time runs low
 * - Pulse animation when time is critical
 * - Different styling for current player vs opponent
 */
export function TurnTimer({
  turnStartedAt,
  isMyTurn,
  currentPlayerName,
  isVisible = true,
}: TurnTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_CONFIG.TURN_TIMEOUT_MS);
  const [mounted, setMounted] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    setMounted(true);

    if (!turnStartedAt || turnStartedAt === 0) {
      setTimeRemaining(GAME_CONFIG.TURN_TIMEOUT_MS);
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - turnStartedAt;
      const remaining = Math.max(0, GAME_CONFIG.TURN_TIMEOUT_MS - elapsed);
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Update every 100ms for smooth countdown
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [turnStartedAt]);

  // Don't render on server or when not visible
  if (!mounted || !isVisible) return null;

  const seconds = Math.ceil(timeRemaining / 1000);
  const progress = timeRemaining / GAME_CONFIG.TURN_TIMEOUT_MS;

  // Determine color based on time remaining
  const getTimerColor = () => {
    if (progress > 0.5) return "text-green-500";
    if (progress > 0.25) return "text-yellow-500";
    return "text-red-500";
  };

  const getProgressColor = () => {
    if (progress > 0.5) return "stroke-green-500";
    if (progress > 0.25) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  const getBgColor = () => {
    if (progress > 0.5) return "bg-green-500/10 border-green-500/30";
    if (progress > 0.25) return "bg-yellow-500/10 border-yellow-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  const isCritical = progress <= 0.25;
  const isWarning = progress <= 0.5 && progress > 0.25;

  // SVG circle parameters
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getBgColor()} backdrop-blur-sm`}
    >
      {/* Circular progress */}
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={getProgressColor()}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset,
            }}
            animate={isCritical ? { opacity: [1, 0.5, 1] } : {}}
            transition={isCritical ? { duration: 0.5, repeat: Infinity } : {}}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${getTimerColor()}`}>
            {seconds}
          </span>
        </div>
      </div>

      {/* Timer info */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          {isCritical ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3, repeat: Infinity }}
            >
              <AlertTriangle className={`w-3 h-3 ${getTimerColor()}`} />
            </motion.div>
          ) : (
            <Clock className={`w-3 h-3 ${getTimerColor()}`} />
          )}
          <span className="text-xs text-muted-foreground">
            {isMyTurn ? "Your turn" : `${currentPlayerName}'s turn`}
          </span>
        </div>
        {isCritical && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-red-500 font-medium"
          >
            {isMyTurn ? "Hurry up!" : "Running out of time!"}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
