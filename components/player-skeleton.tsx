"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

interface PlayerSkeletonProps {
  delay?: number;
  index?: number;
}

export function PlayerSkeleton({ delay = 0, index = 0 }: PlayerSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 + delay, duration: 0.3 }}
      className="h-24 sm:h-28 md:h-32 border-2 border-muted bg-muted/10 rounded-lg flex flex-col items-center justify-center p-2 gap-2"
    >
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-4 w-3/4" />
    </motion.div>
  );
}
