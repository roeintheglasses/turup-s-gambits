"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { VisualEffects } from "@/components/visual-effects";
import { GameBackground } from "@/components/game-room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Test Game Lobby - For local development and testing
 * Bypasses authentication by using test users
 *
 * ONLY AVAILABLE IN DEVELOPMENT MODE
 */
export default function TestGameLobbyPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [testUserId, setTestUserId] = useState("");

  useEffect(() => {
    // Redirect to main game in production
    if (process.env.NODE_ENV === "production") {
      router.push("/game");
      return;
    }

    // Generate a random test user ID
    const randomId = `test-user-${Math.random().toString(36).substring(2, 9)}`;
    setTestUserId(randomId);
  }, [router]);

  const createRoom = () => {
    // Generate a random room ID
    const newRoomId = `test-room-${Math.random().toString(36).substring(2, 9)}`;
    router.push(`/test-game/${newRoomId}`);
  };

  const joinRoom = () => {
    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }
    router.push(`/test-game/${roomId}`);
  };

  const joinWithCustomUser = () => {
    if (!roomId.trim()) {
      alert("Please enter a room ID");
      return;
    }
    const customUserId = prompt("Enter custom user ID:", testUserId);
    if (customUserId) {
      router.push(`/test-game/${roomId}?userId=${customUserId}`);
    }
  };

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <VisualEffects enableGrain />
      <GameBackground />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Warning Banner */}
        <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 rounded-t-lg px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧪</span>
            <div>
              <h2 className="font-bold text-lg">Test Mode - Development Only</h2>
              <p className="text-sm text-yellow-200/80">
                This page bypasses authentication for testing. Not available in production.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-b-lg p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-center mb-2">
            Test Game Lobby
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Current Test User ID: <code className="bg-muted px-2 py-1 rounded text-xs">{testUserId}</code>
          </p>

          {/* Create Room */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Create New Room</h2>
            <Button
              onClick={createRoom}
              size="lg"
              className="w-full"
            >
              Create Test Room
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Creates a new room with a random ID
            </p>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          {/* Join Room */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Join Existing Room</h2>
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    joinRoom();
                  }
                }}
                className="w-full"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={joinRoom}
                  variant="default"
                  size="lg"
                  className="w-full"
                >
                  Join Room
                </Button>
                <Button
                  onClick={joinWithCustomUser}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Join with Custom User ID
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use "Join with Custom User ID" to test multiplayer from multiple browser tabs
              </p>
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2 text-sm">Quick Testing Guide:</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>1. Click "Create Test Room" to start a new game</li>
              <li>2. Copy the room ID from the URL</li>
              <li>3. Open new tabs and join with different user IDs to test multiplayer</li>
              <li>4. Add bots to fill remaining player slots</li>
            </ul>
          </div>

          {/* Back to Main Game */}
          <div className="mt-6 text-center">
            <Button
              onClick={() => router.push("/game")}
              variant="ghost"
              size="sm"
            >
              Back to Main Game
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
