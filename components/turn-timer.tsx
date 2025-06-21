"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, AlertTriangle, Zap } from "lucide-react";
import { useGameStore } from "@/stores";
import { useUIStore } from "@/stores/uiStore";

// Types
interface TurnTimerProps {
  isActive: boolean;
  duration: number; // in seconds
  onTimeout: () => void;
  onTimeExtension?: () => void;
  gameMode: "classic" | "frenzy";
  currentPlayer: string;
  isCurrentUserTurn: boolean;
}

interface TimerState {
  timeRemaining: number;
  isWarning: boolean;
  isCritical: boolean;
  isExtended: boolean;
}

// Constants
const TIMER_CONFIG = {
  classic: {
    duration: 30, // 30 seconds for classic mode
    warningThreshold: 10, // Show warning at 10 seconds
    criticalThreshold: 5, // Show critical warning at 5 seconds
    extensionTime: 15, // Add 15 seconds when extended
    maxExtensions: 1, // Allow 1 extension per turn
  },
  frenzy: {
    duration: 15, // 15 seconds for frenzy mode
    warningThreshold: 5, // Show warning at 5 seconds
    criticalThreshold: 3, // Show critical warning at 3 seconds
    extensionTime: 10, // Add 10 seconds when extended
    maxExtensions: 0, // No extensions in frenzy mode
  },
};

// Timer display component
const TimerDisplay: React.FC<{
  timeRemaining: number;
  isWarning: boolean;
  isCritical: boolean;
  gameMode: "classic" | "frenzy";
}> = ({ timeRemaining, isWarning, isCritical, gameMode }) => {
  const formatTime = (seconds: number): string => {
    return seconds.toString().padStart(2, '0');
  };

  const getTimerColor = (): string => {
    if (isCritical) return "text-red-500";
    if (isWarning) return "text-amber-500";
    return "text-primary";
  };

  const getProgressColor = (): string => {
    if (isCritical) return "stroke-red-500";
    if (isWarning) return "stroke-amber-500";
    return "stroke-primary";
  };

  const config = TIMER_CONFIG[gameMode];
  const progress = (timeRemaining / config.duration) * 100;

  return (
    <motion.div
      className={`
        relative flex flex-col items-center justify-center p-3 rounded-lg
        bg-card/90 backdrop-blur-md border border-border/50 shadow-lg
        ${isCritical ? "animate-pulse border-red-500/50" : ""}
        ${isWarning && !isCritical ? "border-amber-500/50" : ""}
      `}
      animate={{
        scale: isCritical ? [1, 1.05, 1] : 1,
      }}
      transition={{
        duration: 0.5,
        repeat: isCritical ? Infinity : 0,
        repeatType: "reverse",
      }}
    >
      {/* Circular progress indicator */}
      <div className="relative">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            className={`transition-all duration-1000 ${getProgressColor()}`}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Timer text in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${getTimerColor()}`}>
            {formatTime(timeRemaining)}
          </span>
          <span className="text-xs text-muted-foreground">sec</span>
        </div>
      </div>

      {/* Mode indicator */}
      <div className="flex items-center gap-1 mt-2">
        {gameMode === "frenzy" && <Zap className="h-3 w-3 text-amber-500" />}
        <span className="text-xs text-muted-foreground capitalize">
          {gameMode} Mode
        </span>
      </div>
    </motion.div>
  );
};

// Warning notification component
const TimerWarning: React.FC<{
  show: boolean;
  isCritical: boolean;
  timeRemaining: number;
}> = ({ show, isCritical, timeRemaining }) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`
          fixed top-20 left-1/2 transform -translate-x-1/2 z-50
          p-4 rounded-lg border-2 shadow-lg backdrop-blur-md
          ${
            isCritical
              ? "bg-red-500/20 border-red-500/50 text-red-100"
              : "bg-amber-500/20 border-amber-500/50 text-amber-100"
          }
        `}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">
            {isCritical
              ? `Time almost up! ${timeRemaining}s remaining`
              : `Hurry up! ${timeRemaining}s remaining`}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export function TurnTimer({
  isActive,
  duration,
  onTimeout,
  onTimeExtension,
  gameMode,
  currentPlayer,
  isCurrentUserTurn,
}: TurnTimerProps) {
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: duration,
    isWarning: false,
    isCritical: false,
    isExtended: false,
  });
  const [extensionCount, setExtensionCount] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const config = TIMER_CONFIG[gameMode];

  // Reset timer when active state changes or new turn starts
  useEffect(() => {
    if (isActive) {
      setTimerState({
        timeRemaining: duration,
        isWarning: false,
        isCritical: false,
        isExtended: false,
      });
      setExtensionCount(0);
    }
  }, [isActive, duration, currentPlayer]);

  // Timer countdown logic
  useEffect(() => {
    if (!isActive) {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimerState((prev) => {
        const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
        
        // Check for timeout
        if (newTimeRemaining === 0) {
          clearInterval(interval);
          onTimeout();
          return prev;
        }

        // Update warning states
        const isWarning = newTimeRemaining <= config.warningThreshold;
        const isCritical = newTimeRemaining <= config.criticalThreshold;

        return {
          ...prev,
          timeRemaining: newTimeRemaining,
          isWarning,
          isCritical,
        };
      });
    }, 1000);

    setIntervalId(interval);

    return () => {
      clearInterval(interval);
    };
  }, [isActive, onTimeout, config.warningThreshold, config.criticalThreshold]);

  // Handle time extension
  const handleTimeExtension = useCallback(() => {
    if (
      extensionCount < config.maxExtensions &&
      onTimeExtension &&
      isCurrentUserTurn
    ) {
      setTimerState((prev) => ({
        ...prev,
        timeRemaining: prev.timeRemaining + config.extensionTime,
        isExtended: true,
      }));
      setExtensionCount((prev) => prev + 1);
      onTimeExtension();

      // Show notification
      useUIStore.getState().showToast(
        `Added ${config.extensionTime} seconds to your turn!`,
        "info"
      );
    }
  }, [
    extensionCount,
    config.maxExtensions,
    config.extensionTime,
    onTimeExtension,
    isCurrentUserTurn,
  ]);

  // Don't render if not active
  if (!isActive) return null;

  const canExtend =
    isCurrentUserTurn &&
    extensionCount < config.maxExtensions &&
    config.maxExtensions > 0 &&
    timerState.timeRemaining <= config.warningThreshold;

  return (
    <>
      {/* Main timer display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed top-4 right-4 z-40"
      >
        <TimerDisplay
          timeRemaining={timerState.timeRemaining}
          isWarning={timerState.isWarning}
          isCritical={timerState.isCritical}
          gameMode={gameMode}
        />

        {/* Extension button */}
        {canExtend && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleTimeExtension}
            className="
              mt-2 w-full px-3 py-1 bg-primary/20 hover:bg-primary/30
              border border-primary/50 rounded text-xs text-primary-foreground
              transition-all duration-200 hover:scale-105
            "
          >
            +{config.extensionTime}s ({config.maxExtensions - extensionCount} left)
          </motion.button>
        )}
      </motion.div>

      {/* Warning notifications */}
      <TimerWarning
        show={timerState.isWarning && isCurrentUserTurn}
        isCritical={timerState.isCritical}
        timeRemaining={timerState.timeRemaining}
      />

      {/* Sound effects for warnings */}
      {timerState.isCritical && isCurrentUserTurn && (
        <audio autoPlay>
          <source src="/sounds/timer-critical.mp3" type="audio/mpeg" />
        </audio>
      )}
    </>
  );
} 