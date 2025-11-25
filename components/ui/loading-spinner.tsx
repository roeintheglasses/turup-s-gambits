"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "primary" | "secondary" | "muted" | "white";
}

export function LoadingSpinner({
  size = "md",
  className,
  variant = "primary",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3 border-[1.5px]",
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-[3px]",
    xl: "h-16 w-16 border-4",
  };

  const variantClasses = {
    primary: "border-primary/30 border-t-primary",
    secondary: "border-secondary/30 border-t-secondary",
    muted: "border-muted-foreground/30 border-t-muted-foreground",
    white: "border-white/30 border-t-white",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      aria-label="Loading"
    />
  );
}

export function PulsingDots({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn("rounded-full bg-primary", sizeClasses[size])}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export function CardSpinner({ className }: { className?: string }) {
  const suits = ["♠", "♥", "♣", "♦"];
  const colors = {
    "♠": "text-foreground",
    "♥": "text-red-500",
    "♣": "text-foreground",
    "♦": "text-red-500",
  };

  return (
    <div className={cn("relative w-12 h-12", className)}>
      {suits.map((suit, i) => (
        <motion.div
          key={suit}
          className={cn(
            "absolute inset-0 flex items-center justify-center text-lg font-bold",
            colors[suit as keyof typeof colors]
          )}
          animate={{
            rotate: [i * 90, i * 90 + 360],
            scale: [1, 0.8, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {suit}
        </motion.div>
      ))}
    </div>
  );
}
