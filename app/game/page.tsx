"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameModeSelector } from "@/components/game-mode-selector";
import { VisualEffects } from "@/components/visual-effects";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores";
import { useAuth } from "@clerk/nextjs";

export default function GamePage() {
  const [roomId, setRoomId] = useState("");
  const [gameMode, setGameMode] = useState<"classic" | "frenzy">("classic");
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();
  const { leaveRoom } = useGameStore();

  const { isSignedIn } = useAuth();

  // Clean up game state when entering the lobby
  useEffect(() => {
    console.log("[GamePage] Cleaning up previous game state");
    
    // Clear game state in the store
    leaveRoom();
    
    // Clear localStorage game data
    localStorage.removeItem("game-storage");
    
    // Also clear any other game-related localStorage keys that might exist
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('game-') || key.startsWith('room-') || key.startsWith('player-')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log("[GamePage] Game state cleanup completed");
  }, []); // Run only once when component mounts

  async function handleCreateGame() {
    if (!isSignedIn) {
      router.push("/");
      return;
    }

    setIsCreatingGame(true);

    try {
      // Generate a unique room ID
      const newRoomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      console.log("Creating room with ID:", newRoomId, "for user:", user?.id);

      // Colyseus will handle room creation, just redirect
      router.push(`/game/${newRoomId}?mode=${gameMode}`);
    } catch (error) {
      console.error("Error creating game:", error);
      alert("Failed to create game. Please try again.");
    } finally {
      setIsCreatingGame(false);
    }
  }

  function handleJoinGame() {
    if (!isSignedIn) {
      router.push("/");
      return;
    }

    if (!roomId) return;

    setIsJoiningGame(true);
    // Navigate to room - Colyseus will handle room joining
    router.push(`/game/${roomId}`);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />

        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-40 dark:opacity-30" // Increased brightness
            style={{
              backgroundImage: "url('/assets/tavern-background.png')",
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-2 sm:p-4">
      <VisualEffects enableGrain />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-40 dark:opacity-30" // Increased brightness
          style={{
            backgroundImage: "url('/assets/tavern-background.png')",
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

      <Card className="w-full max-w-sm sm:max-w-md border border-primary/30 md:border-2 shadow-xl bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center p-4 sm:p-6">
          <CardTitle className="text-2xl sm:text-3xl font-medieval text-primary">
            Game Hall
          </CardTitle>
          <CardDescription>
            Create or join a game of Turup's Gambit
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
              <TabsTrigger value="create" className="font-medieval text-xs sm:text-sm">
                Create Game
              </TabsTrigger>
              <TabsTrigger value="join" className="font-medieval text-xs sm:text-sm">
                Join Game
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-medieval mb-2 sm:mb-3">Select Game Mode</h3>
                <GameModeSelector
                  selectedMode={gameMode}
                  onSelectMode={(mode) =>
                    setGameMode(mode as "classic" | "frenzy")
                  }
                />
              </div>

              <Button
                className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleCreateGame}
                disabled={isCreatingGame}
              >
                {isCreatingGame ? "Preparing the table..." : "Create New Game"}
              </Button>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label htmlFor="room-id" className="block text-xs sm:text-sm font-medium">
                  Room Code
                </label>
                <Input
                  id="room-id"
                  className="medieval-input text-sm sm:text-base"
                  placeholder="Enter 6-character room code"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>

              <Button
                className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base"
                onClick={handleJoinGame}
                disabled={isJoiningGame || !roomId}
              >
                {isJoiningGame ? "Finding the table..." : "Join Game"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center p-4 sm:p-6">
          <Link
            href="/"
            className="text-xs sm:text-sm text-muted-foreground hover:text-primary"
          >
            Return to the Kingdom
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
