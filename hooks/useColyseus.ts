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

  // Refs for cleanup tracking
  const listenerCleanupRef = useRef<(() => void)[]>([]);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isJoiningRef = useRef(false);

  const { userId, userName, roomId, autoConnect = false } = options;

  // Derive connection status
  const connectionStatus = isReconnecting
    ? "reconnecting"
    : isConnected
    ? "connected"
    : error
    ? "disconnected"
    : "connecting";

  /**
   * Remove all previously registered listeners from whatever room they were on.
   */
  const cleanupListeners = useCallback(() => {
    for (const unsub of listenerCleanupRef.current) {
      try {
        unsub();
      } catch {
        // Room may already be disposed; ignore
      }
    }
    listenerCleanupRef.current = [];
  }, []);

  /**
   * Register onStateChange, onMessage, onError and onLeave on the given room.
   * Cleans up any previous listeners first so we never accumulate duplicates.
   */
  const setupRoomListeners = useCallback(
    (targetRoom: GameRoom) => {
      // Always tear down old listeners before adding new ones
      cleanupListeners();

      const unsubs: (() => void)[] = [];

      // --- State changes ---
      const unsubState = targetRoom.onStateChange((state) => {
        setGameState(state);
        setStateVersion((v) => v + 1);
      });
      unsubs.push(unsubState as unknown as () => void);

      // --- Server messages ---
      const unsubMessage = targetRoom.onMessage("*", (type, message) => {
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
            showToast(
              `${message.playerName} wants a rematch (${message.votesCount}/${message.totalPlayers})`,
              "info"
            );
            break;

          case "rematch_starting":
            showToast("Rematch starting!", "success");
            break;

          default:
            break;
        }
      });
      unsubs.push(unsubMessage as unknown as () => void);

      // --- Errors ---
      const unsubError = targetRoom.onError((code, message) => {
        if (code === 1006 || code === 1000) {
          console.error("Room error:", code, message);
          setError(`Connection error: ${message}`);
        } else {
          console.warn("Gameplay error (non-critical):", message);

          const { showToast, setCardPlayLoading, setPlayingCardId } =
            useUIStore.getState();
          setCardPlayLoading(false);
          setPlayingCardId(null);
          showToast(message || "Invalid move. Please try again.", "error");
        }
      });
      unsubs.push(unsubError as unknown as () => void);

      // --- Disconnection / reconnect ---
      const unsubLeave = targetRoom.onLeave((code) => {
        console.log("Disconnected from room, code:", code);
        setIsConnected(false);
        setRoom(null);

        if (code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          setIsReconnecting(true);
          reconnectAttempts.current++;

          const { showToast } = useUIStore.getState();
          showToast(
            `Connection lost. Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`,
            "warning"
          );

          // Clear any previous reconnect timer
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = setTimeout(async () => {
            reconnectTimeoutRef.current = null;
            try {
              const reconnectData = colyseusClient.getStoredReconnectionData();
              if (reconnectData && reconnectData.userId === userId) {
                let reconnectedRoom: GameRoom;

                if (reconnectData.sessionId) {
                  try {
                    reconnectedRoom = await colyseusClient.reconnect(
                      reconnectData.roomId,
                      reconnectData.sessionId
                    );
                  } catch (reconnectErr) {
                    console.warn(
                      "Colyseus reconnect failed, falling back to joinOrCreateRoom:",
                      reconnectErr
                    );
                    reconnectedRoom = await colyseusClient.joinOrCreateRoom(
                      userId,
                      userName,
                      { roomId: reconnectData.roomId }
                    );
                  }
                } else {
                  reconnectedRoom = await colyseusClient.joinOrCreateRoom(
                    userId,
                    userName,
                    { roomId: reconnectData.roomId }
                  );
                }

                // Register listeners on the reconnected room
                setupRoomListeners(reconnectedRoom);

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
          }, 2000 * reconnectAttempts.current);
        }
      });
      unsubs.push(unsubLeave as unknown as () => void);

      listenerCleanupRef.current = unsubs;
    },
    [cleanupListeners, userId, userName]
  );

  const joinRoom = useCallback(
    async (specificRoomId?: string) => {
      // Prevent double-joins (React Strict Mode, rapid clicks, etc.)
      if (isJoiningRef.current) {
        throw new Error("Join already in progress");
      }
      isJoiningRef.current = true;

      try {
        setError(null);
        const targetRoomId = specificRoomId || roomId;

        const newRoom = await colyseusClient.joinOrCreateRoom(userId, userName, {
          roomId: targetRoomId,
        });

        // Set up all listeners on the new room (cleans up old ones first)
        setupRoomListeners(newRoom);

        setRoom(newRoom);
        setIsConnected(true);

        // Reset reconnect attempts on successful connection
        reconnectAttempts.current = 0;
        setIsReconnecting(false);

        return newRoom;
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to join room";
        setError(errorMessage);
        console.error("Error joining room:", err);
        throw err;
      } finally {
        isJoiningRef.current = false;
      }
    },
    [userId, userName, roomId, setupRoomListeners]
  );

  const leaveRoom = useCallback(async () => {
    cleanupListeners();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    await colyseusClient.leaveRoom();
    setRoom(null);
    setGameState(null);
    setIsConnected(false);
  }, [cleanupListeners]);

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
      joinRoom().catch((err) => {
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
      // Clean up listeners
      cleanupListeners();

      // Clear any pending reconnect timer
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Only cleanup if there's an active room
      // Pass clearReconnect: false so reconnection data is preserved for page navigations
      const currentRoom = colyseusClient.getCurrentRoom();
      if (currentRoom) {
        colyseusClient.leaveRoom(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
