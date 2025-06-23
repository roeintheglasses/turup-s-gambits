import { useEffect, useRef, useCallback, useMemo } from "react";
import { useGameStore } from "@/stores";
import { useAuthStore } from "@/stores/authStore";
import { fetchRoomStateFromSupabase } from "@/stores/gameStore/persistence";

interface GameRoomInitializerReturn {
  hasJoined: boolean;
  hasRestoredState: boolean;
  initializationError: Error | null;
}

export function useGameRoomInitializer(roomId: string): GameRoomInitializerReturn {
  const {
    setRoomId,
    joinRoom,
    currentRoom,
    setGameStatus,
    setTrumpSuit,
    updateScores,
    setInitialCardsDeal,
    setTeamAssignments,
    setPlayers,
  } = useGameStore();
  
  const { user } = useAuthStore();
  
  // Use refs to track initialization state
  const hasJoinedRef = useRef(false);
  const hasRestoredStateRef = useRef(false);
  const initializationErrorRef = useRef<Error | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Memoized dependencies to prevent unnecessary effect re-runs
  const storeActions = useMemo(() => ({
    setRoomId,
    setGameStatus,
    setTrumpSuit,
    updateScores,
    setInitialCardsDeal,
    setTeamAssignments,
    setPlayers,
  }), [setRoomId, setGameStatus, setTrumpSuit, updateScores, setInitialCardsDeal, setTeamAssignments, setPlayers]);

  // Restore room state from Supabase
  const restoreRoomState = useCallback(async (roomId: string) => {
    try {
      const roomState = await fetchRoomStateFromSupabase(roomId);
      
      if (!roomState) return false;

      console.log("[GameRoomInitializer] Restoring room state:", roomState);

      // Restore game status and other critical data
      if (roomState.gameStatus && roomState.gameStatus !== "waiting") {
        console.log(`[GameRoomInitializer] Restoring game status to ${roomState.gameStatus}`);
        storeActions.setGameStatus(roomState.gameStatus as any);

        // Restore players
        if (roomState.players?.length > 0) {
          console.log("[GameRoomInitializer] Restoring player data:", roomState.players);
          storeActions.setPlayers(roomState.players);
        }

        // Restore game state
        if (roomState.roomState?.gameState?.trumpSuit) {
          storeActions.setTrumpSuit(roomState.roomState.gameState.trumpSuit);
        }

        if (roomState.roomState?.gameState?.scores) {
          storeActions.updateScores(roomState.roomState.gameState.scores);
        }

        // Restore team assignments
        if (roomState.teamAssignments && Object.keys(roomState.teamAssignments).length > 0) {
          console.log("[GameRoomInitializer] Restoring team assignments:", roomState.teamAssignments);
          storeActions.setTeamAssignments(roomState.teamAssignments);
        }

        // Set initial cards deal based on game phase
        const shouldHaveInitialCards = 
          roomState.gameStatus === "initial_deal" || roomState.gameStatus === "bidding";
        storeActions.setInitialCardsDeal(shouldHaveInitialCards);

        hasRestoredStateRef.current = true;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("[GameRoomInitializer] Error restoring room state:", error);
      initializationErrorRef.current = error as Error;
      return false;
    }
  }, [storeActions]);

  // Join room function with retry logic
  const joinGameRoom = useCallback(async (roomId: string, username: string) => {
    try {
      if (currentRoom) {
        console.log("[GameRoomInitializer] Already in room, skipping join");
        return true;
      }

      console.log(`[GameRoomInitializer] Joining room as ${username} (attempt ${retryCountRef.current + 1})`);
      await joinRoom(roomId, username);
      hasJoinedRef.current = true;
      retryCountRef.current = 0; // Reset retry count on success
      return true;
    } catch (error) {
      console.error("[GameRoomInitializer] Error joining room:", error);
      
      // If room not found and we haven't exceeded retry count, try again after a delay
      if (retryCountRef.current < maxRetries && 
          (error as Error).message.includes("Room not found")) {
        retryCountRef.current++;
        console.log(`[GameRoomInitializer] Room not found, retrying in 1 second... (${retryCountRef.current}/${maxRetries})`);
        
        // Wait and retry
        setTimeout(() => {
          joinGameRoom(roomId, username);
        }, 1000);
        
        return false; // Don't set error yet, we're retrying
      }
      
      initializationErrorRef.current = error as Error;
      return false;
    }
  }, [currentRoom, joinRoom, maxRetries]);

  // Main initialization effect
  useEffect(() => {
    const initializeRoom = async () => {
      if (!roomId || !user || hasJoinedRef.current) return;

      console.log("[GameRoomInitializer] Initializing room", roomId);
      
      // Clear any previous errors
      initializationErrorRef.current = null;
      
      // Set room ID first
      setRoomId(roomId);

      try {
        // Attempt to restore state first
        await restoreRoomState(roomId);
        
        // Then join the room
        await joinGameRoom(roomId, user.username);
      } catch (error) {
        console.error("[GameRoomInitializer] Error during initialization:", error);
        initializationErrorRef.current = error as Error;
      }
    };

    initializeRoom();
  }, [roomId, user, setRoomId, restoreRoomState, joinGameRoom]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      hasJoinedRef.current = false;
      hasRestoredStateRef.current = false;
      initializationErrorRef.current = null;
      retryCountRef.current = 0;
    };
  }, []);

  return {
    hasJoined: hasJoinedRef.current,
    hasRestoredState: hasRestoredStateRef.current,
    initializationError: initializationErrorRef.current,
  };
} 