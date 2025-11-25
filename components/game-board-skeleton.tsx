"use client";

import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

function CardSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton
      shimmer
      className={`rounded-lg bg-primary/10 border border-primary/20 ${className}`}
    />
  );
}

function PlayerPositionSkeleton({
  position,
  delay,
  cardCount = 5,
  isVertical = false,
}: {
  position: "top" | "left" | "right" | "bottom";
  delay: number;
  cardCount?: number;
  isVertical?: boolean;
}) {
  const positionClasses = {
    top: "absolute top-4 left-1/2 transform -translate-x-1/2",
    left: "absolute left-4 top-1/2 transform -translate-y-1/2",
    right: "absolute right-4 top-1/2 transform -translate-y-1/2",
    bottom: "absolute bottom-4 left-1/2 transform -translate-x-1/2",
  };

  const animations = {
    top: { y: -20 },
    left: { x: -20 },
    right: { x: 20 },
    bottom: { y: 20 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...animations[position] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`flex flex-col items-center ${positionClasses[position]}`}
    >
      {position !== "bottom" && (
        <>
          <SkeletonAvatar size="md" className="mb-2" />
          <Skeleton shimmer className="h-4 w-20 mb-3" />
        </>
      )}

      {/* Cards */}
      <div className={`flex ${isVertical ? "flex-col space-y-1" : "space-x-1"}`}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.05 * i }}
          >
            <CardSkeleton
              className={
                isVertical
                  ? "h-8 w-12 sm:h-10 sm:w-14"
                  : "h-12 w-8 sm:h-14 sm:w-10 md:h-16 md:w-12"
              }
            />
          </motion.div>
        ))}
      </div>

      {position === "bottom" && (
        <div className="flex items-center gap-2 mt-3">
          <SkeletonAvatar size="md" />
          <Skeleton shimmer className="h-4 w-20" />
        </div>
      )}
    </motion.div>
  );
}

// Bottom bar skeleton matching the actual GameBottomBar layout
function BottomBarSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mx-4 mb-4 rounded-xl bg-card/95 backdrop-blur-md border-2 border-primary/20 shadow-lg overflow-hidden"
    >
      <div className="px-3 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Status & Turn */}
        <div className="flex items-center gap-2">
          {/* Status badge */}
          <Skeleton shimmer className="h-6 w-16 rounded-full" />
          {/* Turn indicator */}
          <Skeleton shimmer className="h-8 w-28 rounded-lg" />
        </div>

        {/* Center: Trump & Scores */}
        <div className="flex items-center gap-3">
          {/* Trump badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-primary/20">
            <Skeleton shimmer className="h-6 w-6 rounded" />
            <div className="hidden sm:block">
              <Skeleton shimmer className="h-2.5 w-10 mb-1" />
              <Skeleton shimmer className="h-3.5 w-14" />
            </div>
          </div>

          {/* Scores */}
          <div className="flex items-center gap-1">
            {/* Royals */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Skeleton shimmer className="h-4 w-4 rounded bg-amber-500/30" />
              <Skeleton shimmer className="h-5 w-4 bg-amber-500/30" />
            </div>
            <span className="text-muted-foreground/50 text-xs px-1">vs</span>
            {/* Rebels */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Skeleton shimmer className="h-4 w-4 rounded bg-blue-500/30" />
              <Skeleton shimmer className="h-5 w-4 bg-blue-500/30" />
            </div>
          </div>
        </div>

        {/* Right: Room Code & Expand */}
        <div className="flex items-center gap-2">
          {/* Room code */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border">
            <Skeleton shimmer className="h-4 w-16 font-mono" />
            <Skeleton shimmer className="h-6 w-6 rounded" />
          </div>
          {/* Expand button */}
          <Skeleton shimmer className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </motion.div>
  );
}

// Main game table skeleton
function GameTableSkeleton() {
  return (
    <div className="relative w-full max-w-4xl aspect-[4/3] border-2 border-primary/30 rounded-xl bg-card/80 backdrop-blur-sm overflow-hidden">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Center Play Area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="relative w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56">
          {/* Outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20"
          />

          {/* Inner circle */}
          <div className="absolute inset-4 rounded-full border border-primary/30 bg-card/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-primary/30 border-t-primary"
              />
              <Skeleton shimmer className="h-4 w-24" />
            </div>
          </div>

          {/* Card positions in center */}
          {[0, 1, 2, 3].map((i) => {
            const positions = [
              { top: "10%", left: "50%", transform: "translateX(-50%)" },
              { top: "50%", right: "10%", transform: "translateY(-50%)" },
              { bottom: "10%", left: "50%", transform: "translateX(-50%)" },
              { top: "50%", left: "10%", transform: "translateY(-50%)" },
            ];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="absolute w-7 h-10 md:w-8 md:h-12 rounded border border-dashed border-primary/30"
                style={positions[i]}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Player Positions */}
      <PlayerPositionSkeleton position="top" delay={0.3} cardCount={5} />
      <PlayerPositionSkeleton position="left" delay={0.4} cardCount={5} isVertical />
      <PlayerPositionSkeleton position="right" delay={0.5} cardCount={5} isVertical />
      <PlayerPositionSkeleton position="bottom" delay={0.6} cardCount={7} />
    </div>
  );
}

// Full page skeleton matching the actual game layout
export function GameBoardSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Main Game Table - Takes most of the space */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <GameTableSkeleton />
      </div>

      {/* Bottom Bar Skeleton */}
      <BottomBarSkeleton />
    </div>
  );
}

export function GameBoardMiniSkeleton() {
  return (
    <div className="relative h-64 border-2 border-primary/20 rounded-xl bg-card/50 p-4 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary"
        />
      </div>
    </div>
  );
}
