"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface GameLoaderProps {
  message?: string;
  fullScreen?: boolean;
  showCards?: boolean;
}

const loadingMessages = [
  "Shuffling the deck...",
  "Gathering the players...",
  "Preparing the table...",
  "Setting up the game...",
];

const cardSuits = ["♠", "♥", "♣", "♦"];
const cardColors = {
  "♠": "text-foreground",
  "♥": "text-red-500",
  "♣": "text-foreground",
  "♦": "text-red-500",
};

function FloatingCard({ suit, delay, index }: { suit: string; delay: number; index: number }) {
  const startPositions = [
    { x: -60, rotate: -15 },
    { x: -20, rotate: -5 },
    { x: 20, rotate: 5 },
    { x: 60, rotate: 15 },
  ];

  return (
    <motion.div
      initial={{
        y: 50,
        opacity: 0,
        x: startPositions[index].x,
        rotate: startPositions[index].rotate
      }}
      animate={{
        y: [50, -10, 50],
        opacity: [0, 1, 0],
        x: startPositions[index].x,
        rotate: [startPositions[index].rotate, startPositions[index].rotate + 5, startPositions[index].rotate]
      }}
      transition={{
        duration: 2,
        delay: delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={`absolute w-12 h-16 sm:w-14 sm:h-20 rounded-lg bg-card border-2 border-primary/30 shadow-lg flex items-center justify-center text-2xl sm:text-3xl ${cardColors[suit as keyof typeof cardColors]}`}
    >
      {suit}
    </motion.div>
  );
}

function CardStack() {
  return (
    <div className="relative w-32 h-24 sm:w-40 sm:h-28">
      {cardSuits.map((suit, index) => (
        <FloatingCard
          key={suit}
          suit={suit}
          delay={index * 0.3}
          index={index}
        />
      ))}
    </div>
  );
}

function SpinningCards() {
  return (
    <div className="relative w-24 h-24 sm:w-32 sm:h-32">
      {cardSuits.map((suit, index) => (
        <motion.div
          key={suit}
          className={`absolute inset-0 w-10 h-14 sm:w-12 sm:h-16 rounded-lg bg-card border-2 border-primary/30 shadow-md flex items-center justify-center text-xl sm:text-2xl ${cardColors[suit as keyof typeof cardColors]}`}
          style={{ originX: 0.5, originY: 1.5 }}
          animate={{
            rotate: [index * 90, index * 90 + 360],
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
  );
}

export function GameLoader({
  message,
  fullScreen = false,
  showCards = true
}: GameLoaderProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const displayMessage = message || loadingMessages[currentMessageIndex];

  useEffect(() => {
    if (!message) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [message]);

  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen
          ? "fixed inset-0 bg-background/95 backdrop-blur-sm z-50"
          : "w-full h-full min-h-[300px]"
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-8">
        {/* Card Animation */}
        {showCards ? (
          <CardStack />
        ) : (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-12 w-12 text-primary" />
          </motion.div>
        )}

        {/* Loading Message */}
        <AnimatePresence mode="wait">
          <motion.p
            key={displayMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-lg sm:text-xl font-medieval text-primary"
          >
            {displayMessage}
          </motion.p>
        </AnimatePresence>

        {/* Loading Dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PhaseTransitionLoader({
  message,
  phase
}: {
  message: string;
  phase?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card/95 rounded-2xl border-2 border-primary/30 shadow-2xl p-8 sm:p-12 max-w-sm sm:max-w-md w-full mx-4 text-center"
      >
        {/* Decorative top border */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-card border-2 border-primary/50 flex items-center justify-center">
              <span className="text-2xl">
                {phase === "trump_selection" ? "♔" :
                 phase === "playing" ? "⚔" :
                 phase === "ended" ? "🏆" : "⏳"}
              </span>
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-6 pt-4">
          {/* Spinning Cards */}
          <SpinningCards />

          {/* Message */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl sm:text-2xl font-medieval text-primary"
          >
            {message}
          </motion.h2>

          {/* Progress bar */}
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function MiniLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-4 w-4" />
      </motion.div>
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

export function CardDealLoader({ message = "Dealing cards..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-20 w-40">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-0 w-12 h-16 rounded-lg bg-gradient-to-br from-primary/80 to-primary border border-primary/50 shadow-lg"
            initial={{ x: "-50%", y: 0, rotate: 0 }}
            animate={{
              x: `${(i - 2) * 40 - 50}%`,
              y: [0, -20, 0],
              rotate: (i - 2) * 8,
            }}
            transition={{
              duration: 0.5,
              delay: i * 0.15,
              repeat: Infinity,
              repeatDelay: 1.5,
            }}
          >
            <div className="absolute inset-1 rounded bg-card/10" />
          </motion.div>
        ))}
      </div>
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-sm font-medieval text-primary"
      >
        {message}
      </motion.p>
    </div>
  );
}
