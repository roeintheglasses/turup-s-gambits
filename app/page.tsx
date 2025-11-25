"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VisualEffects } from "@/components/visual-effects";
import { motion } from "framer-motion";
import { FlyingCards } from "@/components/flying-cards";
import Image from "next/image";
import { Users, Swords, Crown, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <VisualEffects enableGrain enableCRT />
      <FlyingCards />

      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-50 dark:opacity-35"
          style={{
            backgroundImage: "url('/assets/fantasy-background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
      </div>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-8">
        <div className="z-10 text-center max-w-4xl mx-auto">
          {/* Logo and Title */}
          <motion.div
            className="flex flex-col items-center gap-2 mb-6"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="relative">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Image
                  src="/assets/logo.png"
                  alt="Turup's Gambit Logo"
                  width={180}
                  height={180}
                  className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                  priority
                />
              </motion.div>
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full -z-10" />
            </div>

            <motion.h1
              className="text-4xl sm:text-5xl md:text-7xl font-medieval text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Turup's Gambit
            </motion.h1>
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="text-lg sm:text-xl md:text-2xl mb-8 font-medieval text-foreground/80 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Enter the realm of strategy and cunning in this medieval fantasy card game
          </motion.p>

          {/* CTA Button */}
          <motion.div
            className="flex flex-col items-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Link href="/game" passHref>
              <Button className="medieval-button text-xl sm:text-2xl py-6 sm:py-8 px-10 sm:px-14 bg-primary hover:bg-primary/90 text-primary-foreground group relative overflow-hidden">
                <span className="relative z-10 flex items-center gap-3">
                  <Swords className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:rotate-12" />
                  Play Now
                  <Swords className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-rotate-12" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Free to play - No download required
            </p>
          </motion.div>

          {/* Floating Cards */}
          <motion.div
            className="flex justify-center gap-3 sm:gap-4 mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            {[
              { suit: "♥", color: "text-red-500", delay: 0 },
              { suit: "♦", color: "text-red-500", delay: 0.5 },
              { suit: "♠", color: "text-foreground", delay: 1 },
              { suit: "♣", color: "text-foreground", delay: 1.5 },
            ].map((card, index) => (
              <motion.div
                key={card.suit}
                className="w-12 h-16 sm:w-14 sm:h-20 md:w-16 md:h-24 relative"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 2 + index * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: card.delay,
                }}
              >
                <div className="fantasy-card-home w-full h-full rounded-lg bg-gradient-to-br from-white to-gray-100 dark:from-slate-200 dark:to-slate-300 shadow-lg border border-primary/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl sm:text-3xl md:text-4xl ${card.color}`}>
                      {card.suit}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Feature Cards */}
        <motion.div
          className="w-full max-w-4xl mx-auto px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: Users,
                title: "4 Players",
                description: "Team-based gameplay with Royals vs Rebels",
              },
              {
                icon: Crown,
                title: "Classic Mode",
                description: "Traditional Court Piece rules with trump cards",
              },
              {
                icon: Sparkles,
                title: "Real-time",
                description: "Play with friends or AI opponents instantly",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                className="bg-card/60 backdrop-blur-sm border border-primary/20 rounded-xl p-4 sm:p-5 text-center hover:border-primary/40 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.3 + index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <feature.icon className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 sm:mb-3 text-primary" />
                <h3 className="font-cinzel font-semibold text-sm sm:text-base mb-1 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </div>
  );
}
