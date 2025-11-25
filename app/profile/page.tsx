"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VisualEffects } from "@/components/visual-effects";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Trophy,
  Target,
  Flame,
  Crown,
  Swords,
  Medal,
  Star,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Edit,
  X,
  Check,
  User,
  Mail,
  Shield,
  Zap,
} from "lucide-react";

export default function ProfilePage() {
  const { user: clerkUser } = useUser();

  const authUser = clerkUser ? {
    id: clerkUser.id,
    username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress.split('@')[0] || '',
    name: clerkUser.firstName || clerkUser.username || '',
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    avatar: clerkUser.imageUrl,
    image: clerkUser.imageUrl,
  } : null;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: authUser?.username || authUser?.name || "",
    email: authUser?.email || "",
  });

  // Mock game stats
  const gameStats = {
    gamesPlayed: 124,
    wins: 78,
    losses: 46,
    winRate: 62.9,
    highestScore: 156,
    currentStreak: 3,
    rank: "Knight Commander",
    tricksWon: 847,
    kotsAchieved: 5,
  };

  // Mock game history
  const gameHistory = [
    { id: 1, date: "2024-03-15", result: "win", tricks: 8, mode: "classic", team: "royals" },
    { id: 2, date: "2024-03-14", result: "loss", tricks: 5, mode: "classic", team: "rebels" },
    { id: 3, date: "2024-03-12", result: "win", tricks: 13, mode: "classic", team: "royals", isKot: true },
    { id: 4, date: "2024-03-10", result: "win", tricks: 9, mode: "classic", team: "rebels" },
    { id: 5, date: "2024-03-08", result: "loss", tricks: 6, mode: "classic", team: "royals" },
  ];

  // Mock achievements
  const achievements = [
    { id: 1, name: "First Victory", description: "Win your first game", icon: Trophy, unlocked: true },
    { id: 2, name: "Master Strategist", description: "Win 50 games", icon: Target, unlocked: true },
    { id: 3, name: "Perfect Game", description: "Win all 13 tricks (Kot)", icon: Crown, unlocked: true },
    { id: 4, name: "Hot Streak", description: "Win 5 games in a row", icon: Flame, unlocked: false },
    { id: 5, name: "Trump Master", description: "Win 100 tricks with trump", icon: Swords, unlocked: false },
    { id: 6, name: "Veteran", description: "Play 500 games", icon: Medal, unlocked: false },
  ];

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-background to-background/80" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="w-full max-w-md border-2 border-primary/30">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-medieval text-2xl">Access Denied</CardTitle>
              <CardDescription>
                Please log in to view your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full medieval-button">
                <Link href="/login">Login to Continue</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

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
          className="mb-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/90 backdrop-blur-md border-2 border-primary/30 rounded-2xl p-6 md:p-8 mb-6"
          >
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="w-28 h-28 md:w-32 md:h-32 border-4 border-primary shadow-xl">
                  <AvatarImage
                    src={authUser.avatar || authUser.image}
                    alt={authUser.username || authUser.name || "User"}
                  />
                  <AvatarFallback className="text-4xl font-medieval bg-primary/20">
                    {(authUser.username || authUser.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                  {gameStats.rank}
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                  <h1 className="text-3xl md:text-4xl font-medieval text-primary">
                    {authUser.name || authUser.username}
                  </h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="self-center md:self-auto"
                  >
                    {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-muted-foreground mb-4 flex items-center justify-center md:justify-start gap-2">
                  <Mail className="w-4 h-4" />
                  {authUser.email}
                </p>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Games", value: gameStats.gamesPlayed, icon: Swords },
                    { label: "Wins", value: gameStats.wins, icon: Trophy },
                    { label: "Win Rate", value: `${gameStats.winRate}%`, icon: TrendingUp },
                    { label: "Streak", value: gameStats.currentStreak, icon: Flame },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className="bg-muted/30 rounded-lg p-3 text-center"
                    >
                      <stat.icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Form */}
            {isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 pt-6 border-t border-border"
              >
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Username
                    </label>
                    <Input
                      id="username"
                      name="username"
                      className="medieval-input"
                      value={formData.username}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      className="medieval-input"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsEditing(false)} className="medieval-button">
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Tabs Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="stats" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-card/90 border-2 border-primary/20">
                <TabsTrigger value="stats" className="font-medieval gap-2 data-[state=active]:bg-primary/20">
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Statistics</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="font-medieval gap-2 data-[state=active]:bg-primary/20">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
                <TabsTrigger value="achievements" className="font-medieval gap-2 data-[state=active]:bg-primary/20">
                  <Medal className="w-4 h-4" />
                  <span className="hidden sm:inline">Achievements</span>
                </TabsTrigger>
              </TabsList>

              {/* Statistics Tab */}
              <TabsContent value="stats">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Total Games", value: gameStats.gamesPlayed, icon: Swords, color: "text-primary" },
                    { label: "Victories", value: gameStats.wins, icon: Trophy, color: "text-green-500" },
                    { label: "Defeats", value: gameStats.losses, icon: Target, color: "text-red-500" },
                    { label: "Win Rate", value: `${gameStats.winRate}%`, icon: TrendingUp, color: "text-blue-500" },
                    { label: "Tricks Won", value: gameStats.tricksWon, icon: Star, color: "text-yellow-500" },
                    { label: "Kots Achieved", value: gameStats.kotsAchieved, icon: Crown, color: "text-amber-500" },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="border-2 border-primary/20 bg-card/90 hover:border-primary/40 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                              <p className="text-3xl font-bold">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-lg bg-muted/50 ${stat.color}`}>
                              <stat.icon className="w-6 h-6" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history">
                <Card className="border-2 border-primary/20 bg-card/90">
                  <CardHeader>
                    <CardTitle className="font-medieval flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Recent Games
                    </CardTitle>
                    <CardDescription>Your last 5 games</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {gameHistory.map((game, index) => (
                        <motion.div
                          key={game.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex items-center gap-4 p-4 rounded-lg border ${
                            game.result === "win"
                              ? "bg-green-500/5 border-green-500/20"
                              : "bg-red-500/5 border-red-500/20"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            game.result === "win" ? "bg-green-500/20" : "bg-red-500/20"
                          }`}>
                            {game.result === "win" ? (
                              <Trophy className="w-6 h-6 text-green-500" />
                            ) : (
                              <X className="w-6 h-6 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium ${
                                game.result === "win" ? "text-green-500" : "text-red-500"
                              }`}>
                                {game.result === "win" ? "Victory" : "Defeat"}
                              </span>
                              {game.isKot && (
                                <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">
                                  KOT!
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {game.team === "royals" ? (
                                  <Crown className="w-3 h-3 text-amber-500" />
                                ) : (
                                  <Swords className="w-3 h-3 text-blue-500" />
                                )}
                                {game.team === "royals" ? "Royals" : "Rebels"}
                              </span>
                              <span>{game.tricks} tricks</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">{game.date}</p>
                            <p className="text-xs text-muted-foreground capitalize">{game.mode}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value="achievements">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`border-2 transition-all ${
                        achievement.unlocked
                          ? "border-primary/40 bg-card/90"
                          : "border-muted/30 bg-muted/10 opacity-60"
                      }`}>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${
                              achievement.unlocked
                                ? "bg-primary/20 text-primary"
                                : "bg-muted/30 text-muted-foreground"
                            }`}>
                              <achievement.icon className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medieval font-semibold">
                                  {achievement.name}
                                </h3>
                                {achievement.unlocked && (
                                  <Check className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {achievement.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
