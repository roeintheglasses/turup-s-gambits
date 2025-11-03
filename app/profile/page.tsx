"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VisualEffects } from "@/components/visual-effects";
import { useUser } from "@clerk/nextjs";

export default function ProfilePage() {
  const { user: clerkUser } = useUser();

  // Map Clerk user to our user format
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

  // Debug logging
  useEffect(() => {
    if (authUser) {
      console.log("Profile page user data:", authUser);
    }
  }, [authUser]);

  // Mock game stats (you can replace this with real data from your backend)
  const gameStats = {
    gamesPlayed: 124,
    wins: 78,
    losses: 46,
    winRate: "62.9%",
    highestScore: 156,
    rank: "Knight Commander",
  };

  // Mock game history (you can replace this with real data from your backend)
  const gameHistory = [
    { id: 1, date: "2023-03-15", result: "win", score: 156, mode: "classic" },
    { id: 2, date: "2023-03-14", result: "loss", score: 87, mode: "frenzy" },
    { id: 3, date: "2023-03-12", result: "win", score: 142, mode: "classic" },
    { id: 4, date: "2023-03-10", result: "win", score: 128, mode: "classic" },
    { id: 5, date: "2023-03-08", result: "loss", score: 92, mode: "frenzy" },
  ];

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-medieval">Access Denied</CardTitle>
            <CardDescription>
              Please log in to view your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full medieval-button">
              <Link href="/login">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <VisualEffects enableGrain />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            backgroundImage: "url('/assets/castle-hall.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-12">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-primary">
                <AvatarImage
                  src={
                    authUser.avatar ||
                    authUser.image ||
                    `/placeholder.svg?height=200&width=200&text=${(
                      authUser.username ||
                      authUser.name ||
                      "U"
                    ).charAt(0)}`
                  }
                  alt={authUser.username || authUser.name || "User"}
                />
                <AvatarFallback className="text-4xl font-medieval">
                  {(authUser.username || authUser.name || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full font-medieval">
                {gameStats.rank}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-medieval text-primary mb-2">
                {authUser.name || authUser.username}
              </h1>
              <p className="text-muted-foreground mb-4">{authUser.email}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-card/50 backdrop-blur-sm p-3 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground">Games</p>
                  <p className="text-2xl font-medieval">
                    {gameStats.gamesPlayed}
                  </p>
                </div>
                <div className="bg-card/50 backdrop-blur-sm p-3 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-medieval">{gameStats.winRate}</p>
                </div>
                <div className="bg-card/50 backdrop-blur-sm p-3 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground">High Score</p>
                  <p className="text-2xl font-medieval">
                    {gameStats.highestScore}
                  </p>
                </div>
              </div>

              <Button
                className="medieval-button"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </div>

          {isEditing ? (
            <Card className="border-2 border-primary/30 bg-card/90 backdrop-blur-sm mb-12">
              <CardHeader>
                <CardTitle className="font-medieval">Edit Profile</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="username"
                    className="block text-sm font-medium"
                  >
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
                  <label htmlFor="email" className="block text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    className="medieval-input"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setIsEditing(false)}
                >
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Tabs defaultValue="history" className="mb-12">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="history" className="font-medieval">
                  Game History
                </TabsTrigger>
                <TabsTrigger value="achievements" className="font-medieval">
                  Achievements
                </TabsTrigger>
              </TabsList>

              <TabsContent value="history">
                <Card className="border-2 border-primary/30 bg-card/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-medieval">
                      Recent Games
                    </CardTitle>
                    <CardDescription>Your last 5 games</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-3 px-4 font-medieval">
                              Date
                            </th>
                            <th className="text-left py-3 px-4 font-medieval">
                              Mode
                            </th>
                            <th className="text-left py-3 px-4 font-medieval">
                              Result
                            </th>
                            <th className="text-left py-3 px-4 font-medieval">
                              Score
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameHistory.map((game) => (
                            <tr
                              key={game.id}
                              className="border-b border-border/50"
                            >
                              <td className="py-3 px-4">{game.date}</td>
                              <td className="py-3 px-4 capitalize">
                                {game.mode}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-block px-2 py-1 rounded-full text-xs ${
                                    game.result === "win"
                                      ? "bg-green-500/20 text-green-500"
                                      : "bg-red-500/20 text-red-500"
                                  }`}
                                >
                                  {game.result === "win" ? "Victory" : "Defeat"}
                                </span>
                              </td>
                              <td className="py-3 px-4">{game.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements">
                <Card className="border-2 border-primary/30 bg-card/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="font-medieval">
                      Your Achievements
                    </CardTitle>
                    <CardDescription>
                      Badges and honors earned in battle
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="flex flex-col items-center text-center p-4 bg-card/50 rounded-lg border border-border/50">
                        <div className="w-16 h-16 mb-3 relative">
                          <Image
                            src="/assets/achievement-1.png"
                            alt="First Victory"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <h3 className="font-medieval text-secondary">
                          First Victory
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Win your first game
                        </p>
                      </div>

                      <div className="flex flex-col items-center text-center p-4 bg-card/50 rounded-lg border border-border/50">
                        <div className="w-16 h-16 mb-3 relative">
                          <Image
                            src="/assets/achievement-2.png"
                            alt="Master Strategist"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <h3 className="font-medieval text-secondary">
                          Master Strategist
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Win 50 games
                        </p>
                      </div>

                      <div className="flex flex-col items-center text-center p-4 bg-card/50 rounded-lg border border-border/50">
                        <div className="w-16 h-16 mb-3 relative">
                          <Image
                            src="/assets/achievement-3.png"
                            alt="Perfect Game"
                            fill
                            className="object-contain"
                          />
                        </div>
                        <h3 className="font-medieval text-secondary">
                          Perfect Game
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Win all tricks in a game
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
