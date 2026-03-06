import { useState, useEffect, useCallback, useRef } from "react";
import { colyseusClient, type GameRoom } from "@/lib/colyseus/ColyseusClient";
import type { GameState, Player, Card } from "../server/schema/GameState";
import { useUIStore } from "@/stores/uiStore";

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
  isReconnecting: boolean;
  error: string | null;
  connectionStatus: "disconnected" | "connecting" | "connected" | "reconnecting";
  joinRoom: (roomId?: string) => Promise<GameRoom>;
  leaveRoom: () => Promise<void>;
  startGame: () => void;
  addBots: () => void;
  voteTrump: (suit: string) => void;
  playCard: (cardId: string) => void;
  markReady: () => void;
  requestRematch: () => void;
  stateVersion: number;
}

export function useColyseus(options: UseColyseusOptions): UseColyseusReturn {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  const { userId, userName, roomId, autoConnect = false } = options;

  // Derive connection status
  const connectionStatus = isReconnecting
    ? "reconnecting"
    : isConnected
    ? "connected"
    : error
    ? "disconnected"
    : "connecting";

  const joinRoom = useCallback(
    async (specificRoomId?: string) => {
      try {
        setError(null);
        const targetRoomId = specificRoomId || roomId;

        const newRoom = await colyseusClient.joinOrCreateRoom(userId, userName, {
          roomId: targetRoomId,
        });

        setRoom(newRoom);
        setIsConnected(true);

        // Listen to state changes
        newRoom.onStateChange((state) => {
          setGameState(state);
          // Increment version to force re-render
          setStateVersion(v => v + 1);
        });

        // Listen to messages from server
        newRoom.onMessage("*", (type, message) => {
          const { showToast } = useUIStore.getState();

          switch (type) {
            case "player_reconnected":
              showToast(`${message.name} reconnected`, "info");
              break;

            case "player_disconnected":
              showToast(`${message.playerName} disconnected`, "warning");
              break;

            case "host_changed":
              showToast(`${message.newHostName} is now the host`, "info");
              break;

            case "trump_vote_timeout":
              showToast(`${message.playerName} auto-voted (timeout)`, "warning");
              break;

            case "turn_timeout":
              showToast(`${message.playerName} ran out of time`, "warning");
              break;

            case "game_ended":
              if (message.reason === "all_players_left") {
                showToast("Game ended - all players left", "info");
              }
              break;

            case "rematch_vote":
              showToast(`${message.playerName} wants a rematch (${message.votesCount}/${message.totalPlayers})`, "info");
              break;

            case "rematch_starting":
              showToast("Rematch starting!", "success");
              break;

            default:
              // Other messages handled by state sync
              break;
          }
        });

        // Handle errors
        newRoom.onError((code, message) => {
          // Don't kick user out for gameplay errors (like "not your turn")
          // Only set error state for critical connection issues
          if (code === 1006 || code === 1000) {
            // Connection closed - this is critical
            console.error("❌ Room error:", code, message);
            setError(`Connection error: ${message}`);
          } else {
            // Gameplay error - show user-friendly message via toast
            console.warn("⚠️ Gameplay error (non-critical):", message);

            // Reset UI loading states so user can try again
            const { showToast, setCardPlayLoading, setPlayingCardId } = useUIStore.getState();
            setCardPlayLoading(false);
            setPlayingCardId(null);

            // Show toast to user with friendly error message
            showToast(message || "Invalid move. Please try again.", "error");
          }
        });

        // Handle disconnection
        newRoom.onLeave((code) => {
          console.log("🔌 Disconnected from room, code:", code);
          setIsConnected(false);
          setRoom(null);

          // Try to reconnect if it wasn't intentional (code 1000 is normal close)
          if (code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
            setIsReconnecting(true);
            reconnectAttempts.current++;

            const { showToast } = useUIStore.getState();
            showToast(`Connection lost. Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`, "warning");

            // Attempt to reconnect after a delay
            setTimeout(async () => {
              try {
                const reconnectData = colyseusClient.getStoredReconnectionData();
                if (reconnectData && reconnectData.userId === userId) {
                  let reconnectedRoom: GameRoom;

                  // Use proper Colyseus reconnect if we have a sessionId
                  if (reconnectData.sessionId) {
                    try {
                      reconnectedRoom = await colyseusClient.reconnect(
                        reconnectData.roomId,
                        reconnectData.sessionId
                      );
                    } catch (reconnectErr) {
                      console.warn("Colyseus reconnect failed, falling back to joinRoom:", reconnectErr);
                      // Fall back to joining as a new connection
                      reconnectedRoom = await joinRoom(reconnectData.roomId);
                    }
                  } else {
                    // No sessionId stored, fall back to joinRoom
                    reconnectedRoom = await joinRoom(reconnectData.roomId);
                  }

                  setRoom(reconnectedRoom);
                  setIsConnected(true);
                  reconnectAttempts.current = 0;
                  setIsReconnecting(false);
                  showToast("Reconnected successfully!", "success");
                }
              } catch (err) {
                console.error("Reconnection failed:", err);
                if (reconnectAttempts.current >= maxReconnectAttempts) {
                  setIsReconnecting(false);
                  setError("Failed to reconnect. Please refresh the page.");
                }
              }
            }, 2000 * reconnectAttempts.current); // Exponential backoff
          }
        });

        // Reset reconnect attempts on successful connection
        reconnectAttempts.current = 0;
        setIsReconnecting(false);

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

  const playCard = useCallback((cardId: string) => {
    colyseusClient.playCard(cardId);
  }, []);

  const markReady = useCallback(() => {
    colyseusClient.markReady();
  }, []);

  const requestRematch = useCallback(() => {
    colyseusClient.requestRematch();
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
      // Pass clearReconnect: false so reconnection data is preserved for page navigations
      const currentRoom = colyseusClient.getCurrentRoom();
      if (currentRoom) {
        colyseusClient.leaveRoom(false);
      }
    };
  }, []); // Empty deps - only runs on mount/unmount

  return {
    room,
    gameState,
    isConnected,
    isReconnecting,
    error,
    connectionStatus,
    joinRoom,
    leaveRoom,
    startGame,
    addBots,
    voteTrump,
    playCard,
    markReady,
    requestRematch,
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
  }, [gameState, stateVersion]); // React to state version changes

  return players;
}

// Helper hook to get current player's hand
export function usePlayerHand(gameState: GameState | null, sessionId: string | undefined): Card[] {
  const player = useCurrentPlayer(gameState, sessionId);
  return player?.hand ? Array.from(player.hand) : [];
}
