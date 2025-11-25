"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { VisualEffects } from "@/components/visual-effects";
import { Home, RefreshCw, AlertTriangle, Bug } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to console in development
    console.error("Application error:", error);
  }, [error]);

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

      {/* Broken card animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-6xl opacity-5"
            initial={{
              x: `${20 + i * 20}%`,
              y: "50%",
              rotate: 0,
            }}
            animate={{
              y: ["50%", "48%", "52%", "50%"],
              rotate: [0, -5, 5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          >
            {["♠", "♥", "♦", "♣"][i]}
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
        {/* Error Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <AlertTriangle className="w-12 h-12 md:w-16 md:h-16 text-red-500" />
            </motion.div>
          </div>
        </motion.div>

        {/* Message Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <div className="bg-card/80 backdrop-blur-sm border-2 border-red-500/20 rounded-xl p-6 md:p-8 shadow-xl">
            <h2 className="text-2xl md:text-3xl font-medieval text-red-500 mb-4">
              A Dark Curse Has Struck!
            </h2>
            <p className="text-muted-foreground mb-3">
              The kingdom's magic has gone awry. An unexpected error has disrupted
              your journey.
            </p>
            <p className="text-muted-foreground mb-4">
              Our court wizards have been notified and are working to lift this curse.
            </p>

            {/* Error details (collapsed) */}
            {error.digest && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Bug size={14} />
                  <span>Error ID: {error.digest}</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            size="lg"
            onClick={reset}
            className="w-full sm:w-auto gap-2 bg-red-500 hover:bg-red-600"
          >
            <RefreshCw size={18} />
            Try Again
          </Button>
          <Link href="/">
            <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
              <Home size={18} />
              Return Home
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Bottom decorative cards - broken/tilted */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex gap-2 items-end">
          {[
            { suit: "♥", rotate: -15, y: 0 },
            { suit: "♦", rotate: 8, y: -5 },
            { suit: "♠", rotate: -5, y: 3 },
            { suit: "♣", rotate: 12, y: -2 },
          ].map((card, i) => (
            <motion.div
              key={i}
              style={{ rotate: card.rotate, y: card.y }}
              className="w-10 h-14 md:w-12 md:h-16 rounded-lg bg-card border-2 border-red-500/20 shadow-lg flex items-center justify-center opacity-50"
            >
              <span className={`text-xl md:text-2xl ${i < 2 ? "text-red-500" : "text-foreground"}`}>
                {card.suit}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
