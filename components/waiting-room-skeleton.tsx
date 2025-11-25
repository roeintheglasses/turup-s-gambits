"use client";

import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

function PlayerSlotSkeleton({ delay, team }: { delay: number; team: "royals" | "rebels" }) {
  const teamColors = {
    royals: "border-amber-600/20 bg-amber-950/20",
    rebels: "border-blue-600/20 bg-blue-950/20"
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={`flex items-center gap-3 p-3 rounded-lg border ${teamColors[team]}`}
    >
      <SkeletonAvatar size="md" />
      <div className="flex-1 space-y-2">
        <Skeleton shimmer className="h-4 w-24" />
        <Skeleton shimmer className="h-3 w-16" />
      </div>
      <Skeleton className="w-2 h-2 rounded-full" />
    </motion.div>
  );
}

export function WaitingRoomSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header Card */}
      <div className="bg-card/90 backdrop-blur-md border-2 border-primary/30 rounded-xl p-6 mb-4">
        <div className="text-center mb-4">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex justify-center mb-3"
          >
            <Skeleton shimmer className="h-8 w-40 rounded-full" />
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-2"
          >
            <Skeleton shimmer className="h-8 w-36" />
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="flex justify-center"
          >
            <Skeleton shimmer className="h-4 w-56" />
          </motion.div>
        </div>

        {/* Room Code */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4"
        >
          <div className="bg-muted/50 rounded-lg px-6 py-3 border border-border">
            <Skeleton shimmer className="h-3 w-16 mx-auto mb-2" />
            <Skeleton shimmer className="h-8 w-28" />
          </div>
          <div className="flex gap-2">
            <Skeleton shimmer className="h-9 w-24 rounded-lg" />
            <Skeleton shimmer className="h-9 w-24 rounded-lg" />
          </div>
        </motion.div>

        {/* Player Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center justify-center gap-2"
        >
          <div className="flex -space-x-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <Skeleton className="w-8 h-8 rounded-full border-2 border-card" />
              </motion.div>
            ))}
          </div>
          <Skeleton shimmer className="h-4 w-20" />
        </motion.div>
      </div>

      {/* Teams Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Royals Team */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-amber-950/40 backdrop-blur-sm border-2 border-amber-600/40 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-8 h-8 rounded-full bg-amber-600/20" />
            <div>
              <Skeleton shimmer className="h-5 w-16 mb-1" />
              <Skeleton shimmer className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <PlayerSlotSkeleton delay={0.6} team="royals" />
            <PlayerSlotSkeleton delay={0.7} team="royals" />
          </div>
        </motion.div>

        {/* Rebels Team */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-950/40 backdrop-blur-sm border-2 border-blue-600/40 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-8 h-8 rounded-full bg-blue-600/20" />
            <div>
              <Skeleton shimmer className="h-5 w-16 mb-1" />
              <Skeleton shimmer className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <PlayerSlotSkeleton delay={0.6} team="rebels" />
            <PlayerSlotSkeleton delay={0.7} team="rebels" />
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-card/90 backdrop-blur-md border-2 border-primary/30 rounded-xl p-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton shimmer className="flex-1 h-12 rounded-lg" />
        </div>
        <div className="flex justify-center mt-3">
          <Skeleton shimmer className="h-3 w-64" />
        </div>
      </motion.div>
    </motion.div>
  );
}
