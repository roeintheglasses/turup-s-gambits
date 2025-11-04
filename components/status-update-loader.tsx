"use client";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";

interface StatusUpdateLoaderProps {
  message: string;
}

export function StatusUpdateLoader({ message }: StatusUpdateLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-card/90 backdrop-blur-md border border-primary/30 rounded-lg px-3 sm:px-6 py-2 sm:py-3 shadow-lg flex items-center gap-2 sm:gap-3 z-50 max-w-[90vw] sm:max-w-none"
    >
      <div className="relative">
        <LoadingSpinner size="sm" />
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/50"
          animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>
      <span className="text-sm font-medieval">{message}</span>
    </motion.div>
  );
}
