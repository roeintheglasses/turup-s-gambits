"use client";

import { LoadingSpinner, PulsingDots } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface StatusUpdateLoaderProps {
  message: string;
  variant?: "default" | "success" | "error";
}

export function StatusUpdateLoader({
  message,
  variant = "default",
}: StatusUpdateLoaderProps) {
  const variantStyles = {
    default: {
      bg: "bg-card/95",
      border: "border-primary/30",
      icon: <LoadingSpinner size="sm" />,
    },
    success: {
      bg: "bg-green-950/90",
      border: "border-green-500/30",
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    },
    error: {
      bg: "bg-red-950/90",
      border: "border-red-500/30",
      icon: <AlertCircle className="w-4 h-4 text-red-500" />,
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 ${styles.bg} backdrop-blur-md border ${styles.border} rounded-xl px-4 sm:px-6 py-3 shadow-xl flex items-center gap-3 z-50 max-w-[90vw] sm:max-w-md`}
    >
      <div className="relative flex-shrink-0">
        {styles.icon}
        {variant === "default" && (
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/40"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

export function ToastLoader({
  message,
  position = "bottom",
}: {
  message: string;
  position?: "top" | "bottom";
}) {
  const positionClasses = {
    top: "top-20 left-1/2 -translate-x-1/2",
    bottom: "bottom-6 left-1/2 -translate-x-1/2",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: position === "top" ? -20 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: position === "top" ? -10 : 10 }}
      className={`fixed ${positionClasses[position]} bg-card/95 backdrop-blur-md border border-primary/30 rounded-xl px-5 py-3 shadow-xl flex items-center gap-3 z-50`}
    >
      <PulsingDots size="sm" />
      <span className="text-sm font-medieval text-primary">{message}</span>
    </motion.div>
  );
}

export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <LoadingSpinner size="xs" variant="muted" />
      {message && <span className="text-xs">{message}</span>}
    </div>
  );
}

export function FullPageLoader({
  message = "Loading...",
  showCards = false,
}: {
  message?: string;
  showCards?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-6">
        {showCards ? (
          <div className="relative">
            {["♠", "♥", "♣", "♦"].map((suit, i) => (
              <motion.div
                key={suit}
                className={`absolute w-12 h-16 rounded-lg bg-card border-2 border-primary/30 shadow-lg flex items-center justify-center text-2xl ${
                  suit === "♥" || suit === "♦" ? "text-red-500" : "text-foreground"
                }`}
                style={{ originX: 0.5, originY: 2 }}
                animate={{
                  rotate: [i * 90, i * 90 + 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                {suit}
              </motion.div>
            ))}
          </div>
        ) : (
          <LoadingSpinner size="xl" />
        )}
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-lg font-medieval text-primary"
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );
}
