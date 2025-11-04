"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function GameBoardSkeleton() {
  return (
    <div className="relative h-full min-h-[500px] md:min-h-[600px] lg:min-h-[700px] border-2 border-primary/30 rounded-lg bg-card/80 backdrop-blur-sm p-3 md:p-6">
      {/* Center area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 rounded-full border-2 border-primary/20 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" variant="primary" />
            <Skeleton className="h-5 w-32" />
          </div>
        </motion.div>
      </div>

      {/* Top player */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="absolute top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
      >
        <Skeleton className="h-10 w-10 rounded-full mb-2" />
        <Skeleton className="h-4 w-20" />
        <div className="mt-4 flex space-x-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-8 sm:h-14 sm:w-10 md:h-16 md:w-12 rounded-md" />
          ))}
        </div>
      </motion.div>

      {/* Left player */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute left-6 top-1/2 transform -translate-y-1/2 flex flex-col items-center"
      >
        <Skeleton className="h-10 w-10 rounded-full mb-2" />
        <Skeleton className="h-4 w-20" />
        <div className="mt-4 flex flex-col space-y-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-12 sm:h-11 sm:w-14 md:h-12 md:w-16 rounded-md" />
          ))}
        </div>
      </motion.div>

      {/* Right player */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute right-6 top-1/2 transform -translate-y-1/2 flex flex-col items-center"
      >
        <Skeleton className="h-10 w-10 rounded-full mb-2" />
        <Skeleton className="h-4 w-20" />
        <div className="mt-4 flex flex-col space-y-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-12 sm:h-11 sm:w-14 md:h-12 md:w-16 rounded-md" />
          ))}
        </div>
      </motion.div>

      {/* Bottom player (user) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
      >
        <div className="mt-4 flex space-x-2">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-10 sm:h-20 sm:w-12 md:h-24 md:w-16 rounded-md" />
          ))}
        </div>
        <div className="mt-4 flex items-center space-x-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </motion.div>
    </div>
  );
}
