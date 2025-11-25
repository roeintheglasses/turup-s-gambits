"use client";

import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface PlayerSkeletonProps {
  delay?: number;
  index?: number;
  variant?: "default" | "compact" | "detailed";
}

export function PlayerSkeleton({
  delay = 0,
  index = 0,
  variant = "default",
}: PlayerSkeletonProps) {
  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 + delay, duration: 0.3 }}
        className="flex items-center gap-2 p-2 rounded-lg bg-muted/20"
      >
        <SkeletonAvatar size="sm" />
        <Skeleton shimmer className="h-4 w-16" />
      </motion.div>
    );
  }

  if (variant === "detailed") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 + delay, duration: 0.3 }}
        className="border-2 border-primary/20 bg-card/50 rounded-xl p-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <SkeletonAvatar size="lg" />
          <div className="flex-1 space-y-2">
            <Skeleton shimmer className="h-5 w-24" />
            <Skeleton shimmer className="h-3 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <Skeleton shimmer className="h-3 w-8 mx-auto mb-1" />
            <Skeleton shimmer className="h-5 w-6 mx-auto" />
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <Skeleton shimmer className="h-3 w-8 mx-auto mb-1" />
            <Skeleton shimmer className="h-5 w-6 mx-auto" />
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <Skeleton shimmer className="h-3 w-8 mx-auto mb-1" />
            <Skeleton shimmer className="h-5 w-6 mx-auto" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 + delay, duration: 0.3 }}
      className="h-24 sm:h-28 md:h-32 border-2 border-primary/20 bg-card/50 rounded-xl flex flex-col items-center justify-center p-3 gap-2"
    >
      <SkeletonAvatar size="md" />
      <Skeleton shimmer className="h-4 w-3/4" />
      <Skeleton shimmer className="h-3 w-1/2" />
    </motion.div>
  );
}
