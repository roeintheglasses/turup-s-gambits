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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameModeSelector } from "@/components/game-mode-selector";
import { VisualEffects } from "@/components/visual-effects";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Plus,
  Users,
  ArrowLeft,
  Loader2,
  Crown,
  Swords,
  Hash
} from "lucide-react";

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
    leaveRoom();
    localStorage.removeItem("game-storage");
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('game-') || key.startsWith('room-') || key.startsWith('player-')) {
        localStorage.removeItem(key);
      }
    });
  }, [leaveRoom]);

  async function handleCreateGame() {
    if (!isSignedIn) {
      router.push("/");
      return;
    }

    setIsCreatingGame(true);

    try {
      const newRoomId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

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
    router.push(`/game/${roomId}`);
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-35 dark:opacity-25"
            style={{
              backgroundImage: "url('/assets/tavern-background.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/80" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <VisualEffects enableGrain />

      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-35 dark:opacity-25"
          style={{
            backgroundImage: "url('/assets/tavern-background.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/80" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-card/60 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/20 mb-4"
            >
              <Swords className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Game Hall</span>
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-medieval text-primary mb-2">
              Ready for Battle?
            </h1>
            <p className="text-muted-foreground">
              Create a new game or join an existing one
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-2 border-primary/30 shadow-2xl bg-card/95 backdrop-blur-md">
            <CardContent className="p-0">
              <Tabs defaultValue="create" className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none rounded-t-lg h-14 bg-muted/50">
                  <TabsTrigger
                    value="create"
                    className="font-medieval text-base data-[state=active]:bg-card data-[state=active]:shadow-none rounded-none rounded-tl-lg h-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Game
                  </TabsTrigger>
                  <TabsTrigger
                    value="join"
                    className="font-medieval text-base data-[state=active]:bg-card data-[state=active]:shadow-none rounded-none rounded-tr-lg h-full gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Join Game
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="create" className="p-6 space-y-6 mt-0">
                  {/* Game Mode Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Crown className="w-4 h-4 text-primary" />
                      Select Game Mode
                    </label>
                    <GameModeSelector
                      selectedMode={gameMode}
                      onSelectMode={(mode) =>
                        setGameMode(mode as "classic" | "frenzy")
                      }
                    />
                  </div>

                  {/* Create Button */}
                  <Button
                    className="w-full medieval-button h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={handleCreateGame}
                    disabled={isCreatingGame || gameMode === "frenzy"}
                  >
                    {isCreatingGame ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Game...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Game
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="join" className="p-6 space-y-6 mt-0">
                  {/* Room Code Input */}
                  <div className="space-y-3">
                    <label htmlFor="room-id" className="text-sm font-medium flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      Room Code
                    </label>
                    <div className="relative">
                      <Input
                        id="room-id"
                        className="medieval-input h-12 text-center text-lg font-mono tracking-widest uppercase"
                        placeholder="XXXXXX"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                        maxLength={6}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Enter the 6-character code shared by the host
                    </p>
                  </div>

                  {/* Join Info */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <h4 className="font-medium text-sm">How to Join</h4>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Get the room code from the game host</li>
                      <li>Enter the 6-character code above</li>
                      <li>Click "Join Game" to enter the room</li>
                    </ol>
                  </div>

                  {/* Join Button */}
                  <Button
                    className="w-full medieval-button h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={handleJoinGame}
                    disabled={isJoiningGame || !roomId || roomId.length < 6}
                  >
                    {isJoiningGame ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Joining Game...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        Join Game
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center mt-6"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Home
            </Link>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
