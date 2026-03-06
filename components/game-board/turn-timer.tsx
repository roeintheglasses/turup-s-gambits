"use client";

import { useEffect, useState, memo } from "react";
import { GAME_CONFIG } from "@/lib/constants";

interface TurnTimerProps {
  turnStartedAt: number;
  isActive: boolean;
  /** "sm" for opponent areas, "md" for the current player area */
  size?: "sm" | "md";
}

/**
 * Radial Turn Timer Component
 *
 * A compact circular countdown indicator shown next to the active player.
 * - SVG ring that depletes as time runs out
 * - Color transitions: green -> yellow -> red
 * - Pulsing glow when under 10 seconds
 * - Two sizes: "sm" for opponents, "md" for the current player
 */
export const TurnTimer = memo(function TurnTimer({
  turnStartedAt,
  isActive,
  size = "sm",
}: TurnTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_CONFIG.TURN_TIMEOUT_MS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (!isActive || !turnStartedAt || turnStartedAt === 0) {
      setTimeRemaining(GAME_CONFIG.TURN_TIMEOUT_MS);
      return;
    }

    const update = () => {
      const elapsed = Date.now() - turnStartedAt;
      setTimeRemaining(Math.max(0, GAME_CONFIG.TURN_TIMEOUT_MS - elapsed));
    };

    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [turnStartedAt, isActive]);

  if (!mounted || !isActive) return null;

  const seconds = Math.ceil(timeRemaining / 1000);
  const progress = timeRemaining / GAME_CONFIG.TURN_TIMEOUT_MS;

  // Color thresholds
  const isLow = progress <= 1 / 3; // ~10s
  const isCritical = progress <= 1 / 6; // ~5s

  // Stroke and text colors
  const strokeColor = isCritical
    ? "stroke-red-500"
    : isLow
      ? "stroke-yellow-500"
      : "stroke-green-500";

  const textColor = isCritical
    ? "text-red-500"
    : isLow
      ? "text-yellow-500"
      : "text-green-500";

  const glowColor = isCritical
    ? "shadow-[0_0_10px_rgba(239,68,68,0.6)]"
    : isLow
      ? "shadow-[0_0_8px_rgba(234,179,8,0.5)]"
      : "";

  // SVG dimensions based on size
  const svgSize = size === "md" ? 40 : 28;
  const strokeWidth = size === "md" ? 3.5 : 2.5;
  const radius = (svgSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const fontSize = size === "md" ? "text-xs" : "text-[9px]";

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full ${glowColor} ${
        isLow ? "animate-[pulse_1s_ease-in-out_infinite]" : ""
      }`}
    >
      <svg
        width={svgSize}
        height={svgSize}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10"
        />
        {/* Progress arc */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={`${strokeColor} transition-colors duration-300`}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: dashOffset,
            transition: "stroke-dashoffset 100ms linear",
          }}
        />
      </svg>

      {/* Seconds display in center */}
      <span
        className={`absolute font-bold tabular-nums ${fontSize} ${textColor} transition-colors duration-300`}
      >
        {seconds}
      </span>
    </div>
  );
});
