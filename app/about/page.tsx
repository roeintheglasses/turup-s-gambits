"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VisualEffects } from "@/components/visual-effects";
import { motion } from "framer-motion";
import {
  Crown,
  Swords,
  Users,
  Trophy,
  Target,
  Zap,
  ArrowLeft,
  BookOpen,
  Scroll,
  Shield,
  Sparkles,
} from "lucide-react";

const gameRules = [
  {
    step: 1,
    title: "Form Teams",
    description: "4 players split into 2 teams: Royals (positions 1 & 3) vs Rebels (positions 2 & 4)",
    icon: Users,
  },
  {
    step: 2,
    title: "Initial Deal",
    description: "Each player receives 5 cards. Look at your hand to decide the trump suit.",
    icon: Scroll,
  },
  {
    step: 3,
    title: "Vote for Trump",
    description: "All players vote for the trump suit. The suit with most votes becomes trump.",
    icon: Crown,
  },
  {
    step: 4,
    title: "Final Deal",
    description: "Remaining 8 cards are dealt to each player. You now have 13 cards total.",
    icon: Sparkles,
  },
  {
    step: 5,
    title: "Play Tricks",
    description: "Play 13 tricks. Must follow suit if possible. Trump beats all other suits.",
    icon: Swords,
  },
  {
    step: 6,
    title: "Win the Game",
    description: "First team to win 7 tricks wins. Win all 13 tricks for a 'Kot' (bonus victory)!",
    icon: Trophy,
  },
];

const features = [
  {
    title: "Real-time Multiplayer",
    description: "Play with friends or AI opponents in seamless real-time matches",
    icon: Zap,
  },
  {
    title: "Team Strategy",
    description: "Coordinate with your partner to outplay the opposing team",
    icon: Shield,
  },
  {
    title: "Classic Rules",
    description: "Traditional Court Piece (Hokm) rules with authentic gameplay",
    icon: BookOpen,
  },
  {
    title: "Track Progress",
    description: "View your stats, achievements, and game history",
    icon: Target,
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <VisualEffects enableGrain />

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      </div>

      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/30 mb-6">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Learn the Game</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-medieval text-primary mb-4">
            About Turup's Gambit
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto text-muted-foreground">
            A legendary card game from the ancient realms, reimagined for the digital age.
            Master the art of strategy and cunning!
          </p>
        </motion.div>

        {/* The Legend Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <Card className="border-2 border-primary/20 bg-card/90 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2">
                <div className="p-8 md:p-10">
                  <h2 className="text-2xl sm:text-3xl font-medieval text-primary mb-4 flex items-center gap-3">
                    <Scroll className="w-6 h-6" />
                    The Legend
                  </h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p>
                      Turup's Gambit, known in the ancient scrolls as "Hokm" or "Court Piece,"
                      originated in the mystical eastern kingdoms of Persia. Legend has it that
                      kings and queens would gather to test their wits and strategy through
                      this noble game of cards.
                    </p>
                    <p>
                      As the game traveled westward along the Silk Road, it evolved, taking on
                      new rules and traditions. Knights would play between battles, using the
                      game to sharpen their minds for the strategic challenges of warfare.
                    </p>
                    <p>
                      Now, in the digital age, we bring this ancient game to you, preserving
                      its rich history while enhancing it with the magic of modern technology.
                    </p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-10 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-4">
                    {["♠", "♥", "♣", "♦"].map((suit, i) => (
                      <motion.div
                        key={suit}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className={`w-20 h-28 rounded-lg bg-card border-2 border-primary/30 flex items-center justify-center text-4xl ${
                          suit === "♥" || suit === "♦" ? "text-red-500" : "text-foreground"
                        }`}
                      >
                        {suit}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How to Play Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-medieval text-primary mb-2">
              How to Play
            </h2>
            <p className="text-muted-foreground">
              Master the game in 6 simple steps
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameRules.map((rule, index) => (
              <motion.div
                key={rule.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Card className="h-full border-2 border-primary/20 bg-card/90 hover:border-primary/40 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <rule.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Step {rule.step}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-1">{rule.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-medieval text-primary mb-2">
              Game Features
            </h2>
            <p className="text-muted-foreground">
              Everything you need for an epic card game experience
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <Card className="h-full border-2 border-primary/20 bg-card/90 hover:border-primary/40 transition-colors text-center">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/10">
            <CardContent className="py-12 px-8">
              <h2 className="text-2xl sm:text-3xl font-medieval text-primary mb-4">
                Ready to Play?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Join thousands of players in the ultimate medieval card game experience.
                Create a room or join a friend!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/game">
                  <Button className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12">
                    <Swords className="w-5 h-5 mr-2" />
                    Play Now
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="h-12 px-8">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
