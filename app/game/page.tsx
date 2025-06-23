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
import { LoginModal } from "@/components/login-modal";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores";
import { SupabaseDatabase } from "@/lib/services/supabase-database";

export default function GamePage() {
  const [roomId, setRoomId] = useState("");
  const [gameMode, setGameMode] = useState<"classic" | "frenzy">("classic");
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();
  const { leaveRoom } = useGameStore();

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

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
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setIsCreatingGame(true);
    
    try {
      // Generate a unique room ID
      const newRoomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      console.log("Creating room with ID:", newRoomId, "for user:", user.id);

      // Actually create the room in the database
      const createdRoom = await SupabaseDatabase.createGameRoom(
        newRoomId,
        user.id,
        gameMode
      );

      if (createdRoom) {
        console.log("Room created successfully:", createdRoom);
        
        // Wait a bit to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify the room exists before redirecting
        const verifyRoom = await SupabaseDatabase.getGameRoom(newRoomId);
        if (verifyRoom) {
          console.log("Room verified, redirecting to:", newRoomId);
          router.push(`/game/${newRoomId}?mode=${gameMode}`);
        } else {
          console.error("Room creation verified but room not found on verification");
          throw new Error("Room not found after creation");
        }
      } else {
        throw new Error("Failed to create room - no room returned");
      }
    } catch (error) {
      console.error("Error creating game:", error);
      
      let errorMessage = "Failed to create game. Please try again.";
      if (error instanceof Error) {
        errorMessage = `Failed to create game: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsCreatingGame(false);
    }
  }

  function handleJoinGame() {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!roomId) return;

    setIsJoiningGame(true);
    // Navigate to room - the room initializer will handle validation
    setTimeout(() => {
      setIsJoiningGame(false);
      router.push(`/game/${roomId}`);
    }, 500);
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

        <LoginModal isOpen={showLoginModal} onClose={() => router.push("/")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-4">
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

      <Card className="w-full max-w-md border-2 border-primary/30 shadow-xl bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-medieval text-primary">
            Game Hall
          </CardTitle>
          <CardDescription>
            Create or join a game of Turup's Gambit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create" className="font-medieval">
                Create Game
              </TabsTrigger>
              <TabsTrigger value="join" className="font-medieval">
                Join Game
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <div>
                <h3 className="text-lg font-medieval mb-3">Select Game Mode</h3>
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

            <TabsContent value="join" className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="room-id" className="block text-sm font-medium">
                  Room Code
                </label>
                <Input
                  id="room-id"
                  className="medieval-input"
                  placeholder="Enter 6-character room code"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>

              <Button
                className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleJoinGame}
                disabled={isJoiningGame || !roomId}
              >
                {isJoiningGame ? "Finding the table..." : "Join Game"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Return to the Kingdom
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
