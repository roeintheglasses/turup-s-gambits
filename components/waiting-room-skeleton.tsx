"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PlayerSkeleton } from "@/components/player-skeleton";
import { motion } from "framer-motion";

export function WaitingRoomSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto p-6 border-2 border-primary/30 rounded-lg bg-card/90 backdrop-blur-sm text-center"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Skeleton className="h-8 w-48 mx-auto mb-4" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Skeleton className="h-5 w-64 mx-auto mb-4" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <Skeleton className="h-10 w-40 mx-auto" />
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {[0, 1, 2, 3].map((index) => (
          <PlayerSkeleton key={index} index={index} delay={0.5 + index * 0.1} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-4"
      >
        <Skeleton className="h-5 w-32 mx-auto" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-4"
      >
        <Skeleton className="h-5 w-32 mx-auto" />
      </motion.div>
    </motion.div>
  );
}
