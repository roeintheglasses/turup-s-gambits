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

export default function GamePage() {
  const [roomId, setRoomId] = useState("");
  const [gameMode, setGameMode] = useState<"classic" | "frenzy">("classic");
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

  function handleCreateGame() {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setIsCreatingGame(true);
    // Simulate API call to create game
    setTimeout(() => {
      const newRoomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      setIsCreatingGame(false);
      router.push(`/game/${newRoomId}?mode=${gameMode}`);
    }, 1500);
  }

  function handleJoinGame() {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (!roomId) return;

    setIsJoiningGame(true);
    // Simulate API call to join game
    setTimeout(() => {
      setIsJoiningGame(false);
      router.push(`/game/${roomId}`);
    }, 1500);
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
