"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { VisualEffects } from "@/components/visual-effects";
import { Home, Gamepad2, Compass } from "lucide-react";

const floatingCards = [
  { suit: "♥", color: "text-red-500", delay: 0 },
  { suit: "♦", color: "text-red-500", delay: 0.5 },
  { suit: "♠", color: "text-foreground", delay: 1 },
  { suit: "♣", color: "text-foreground", delay: 1.5 },
];

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      <VisualEffects enableGrain />

      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Floating card decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl opacity-10"
            initial={{
              x: Math.random() * 100 + "%",
              y: "110%",
              rotate: Math.random() * 360,
            }}
            animate={{
              y: "-10%",
              rotate: Math.random() * 360 + 360,
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              delay: i * 2,
              ease: "linear",
            }}
          >
            {["♠", "♥", "♦", "♣"][i % 4]}
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl mx-auto relative z-10"
      >
        {/* 404 Number */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative mb-6"
        >
          <h1 className="text-8xl md:text-9xl font-medieval text-primary/20">
            404
          </h1>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Compass className="w-16 h-16 md:w-20 md:h-20 text-primary" />
          </motion.div>
        </motion.div>

        {/* Message Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="bg-card/80 backdrop-blur-sm border-2 border-primary/20 rounded-xl p-6 md:p-8 shadow-xl">
            <h2 className="text-2xl md:text-3xl font-medieval text-primary mb-4">
              Lost in the Kingdom
            </h2>
            <p className="text-muted-foreground mb-3">
              Alas, brave adventurer! The path you seek has vanished into the
              mists of Avalon.
            </p>
            <p className="text-muted-foreground">
              Perhaps a mischievous sprite has led you astray. Fear not, for the
              way back to the royal court is clear.
            </p>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              <Home size={18} />
              Return Home
            </Button>
          </Link>
          <Link href="/game">
            <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
              <Gamepad2 size={18} />
              Play a Game
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom floating cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex gap-3 items-center">
          {floatingCards.map((card, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: card.delay,
                ease: "easeInOut",
              }}
              className="w-12 h-16 md:w-14 md:h-20 rounded-lg bg-card border-2 border-primary/20 shadow-lg flex items-center justify-center"
            >
              <span className={`text-2xl md:text-3xl ${card.color}`}>
                {card.suit}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
