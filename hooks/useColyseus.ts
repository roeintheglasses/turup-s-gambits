import { useState, useEffect, useCallback } from "react";
import { colyseusClient, type GameRoom } from "@/lib/colyseus/ColyseusClient";
import type { GameState, Player, Card } from "../server/schema/GameState";

interface UseColyseusOptions {
  userId: string;
  userName: string;
  roomId?: string;
  autoConnect?: boolean;
}

interface UseColyseusReturn {
  room: GameRoom | null;
  gameState: GameState | null;
  isConnected: boolean;
  error: string | null;
  joinRoom: (roomId?: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  startGame: () => void;
  addBots: () => void;
  voteTrump: (suit: string) => void;
  placeBid: (bid: number) => void;
  playCard: (cardId: string) => void;
  markReady: () => void;
  stateVersion: number;
}

export function useColyseus(options: UseColyseusOptions): UseColyseusReturn {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState(0);

  const { userId, userName, roomId, autoConnect = false } = options;

  const joinRoom = useCallback(
    async (specificRoomId?: string) => {
      try {
        setError(null);
        const targetRoomId = specificRoomId || roomId;

        const newRoom = await colyseusClient.joinOrCreateRoom(userId, userName, {
          roomId: targetRoomId,
        });

        // Debug: Log room info
        console.log("🎮 Room object:", newRoom);
        console.log("🎮 Room ID:", newRoom.id);
        console.log("🎮 Room name:", newRoom.name);
        console.log("🎮 Session ID:", newRoom.sessionId);

        setRoom(newRoom);
        setIsConnected(true);

        // Listen to state changes
        newRoom.onStateChange((state) => {
          console.log("🔄 State changed, players:", state.players?.size);
          setGameState(state);
          // Increment version to force re-render
          setStateVersion(v => v + 1);
        });

        // Listen to messages from server
        newRoom.onMessage("*", (type, message) => {
          console.log("📨 Message:", type, message);
        });

        // Handle errors
        newRoom.onError((code, message) => {
          console.error("❌ Room error:", code, message);
          setError(`Room error: ${message}`);
        });

        // Handle disconnection
        newRoom.onLeave((code) => {
          console.log("👋 Left room with code:", code);
          setIsConnected(false);
          setRoom(null);
        });

        return newRoom;
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to join room";
        setError(errorMessage);
        console.error("❌ Error joining room:", err);
        throw err;
      }
    },
    [userId, userName, roomId]
  );

  const leaveRoom = useCallback(async () => {
    await colyseusClient.leaveRoom();
    setRoom(null);
    setGameState(null);
    setIsConnected(false);
  }, []);

  const startGame = useCallback(() => {
    colyseusClient.startGame();
  }, []);

  const addBots = useCallback(() => {
    colyseusClient.addBots();
  }, []);

  const voteTrump = useCallback((suit: string) => {
    colyseusClient.voteTrump(suit);
  }, []);

  const placeBid = useCallback((bid: number) => {
    colyseusClient.placeBid(bid);
  }, []);

  const playCard = useCallback((cardId: string) => {
    colyseusClient.playCard(cardId);
  }, []);

  const markReady = useCallback(() => {
    colyseusClient.markReady();
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    let mounted = true;

    if (autoConnect && userId && userName && !room) {
      joinRoom().catch(err => {
        if (mounted) {
          console.error("Failed to auto-connect:", err);
        }
      });
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect, userId, userName]); // Removed room and joinRoom from deps

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      // Only cleanup if there's an active room
      const currentRoom = colyseusClient.getCurrentRoom();
      if (currentRoom) {
        colyseusClient.leaveRoom();
      }
    };
  }, []); // Empty deps - only runs on mount/unmount

  return {
    room,
    gameState,
    isConnected,
    error,
    joinRoom,
    leaveRoom,
    startGame,
    addBots,
    voteTrump,
    placeBid,
    playCard,
    markReady,
    stateVersion, // Export this so components can use it as dependency
  };
}

// Helper hook to get current player from game state
export function useCurrentPlayer(gameState: GameState | null, sessionId: string | undefined): Player | null {
  if (!gameState || !sessionId) return null;

  return gameState.players.get(sessionId) || null;
}

// Helper hook to get all players as array (reactive)
export function usePlayers(gameState: GameState | null, stateVersion?: number): Player[] {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!gameState?.players) {
      setPlayers([]);
      return;
    }

    // Convert MapSchema to array and sort
    const playersArray = Array.from(gameState.players.values()).sort(
      (a, b) => a.position - b.position
    );
    setPlayers(playersArray);
    console.log("👥 Players updated:", playersArray.length, playersArray.map(p => p.name));
  }, [gameState, stateVersion]); // React to state version changes

  return players;
}

// Helper hook to get current player's hand
export function usePlayerHand(gameState: GameState | null, sessionId: string | undefined): Card[] {
  const player = useCurrentPlayer(gameState, sessionId);
  return player?.hand ? Array.from(player.hand) : [];
}
