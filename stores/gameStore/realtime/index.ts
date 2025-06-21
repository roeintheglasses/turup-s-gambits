import type { GameStoreState, SetStateFn } from "./types";
import { ConnectionManager, createSyncGameStateToDatabase } from "./connection";
import { supabase } from "@/lib/services/supabase";
import { logger, debounce } from "./utils";

// Main realtime functions factory
export const createRealtimeFunctions = (
  get: () => GameStoreState,
  set: SetStateFn
) => {
  // Create connection manager instance
  const connectionManager = new ConnectionManager(supabase);

  // Create the base sync function
  const baseSyncToDatabase = createSyncGameStateToDatabase(get);

  // Debounced database sync to prevent excessive calls
  const debouncedSyncToDatabase = debounce(
    () => baseSyncToDatabase(),
    300
  );

  // Enhanced sendMessage function
  const sendMessage = async (message: any): Promise<boolean> => {
    try {
      return await connectionManager.sendMessage(message, get, set);
    } catch (error) {
      logger.error("Error in sendMessage:", error);
      return false;
    }
  };

  // Enhanced subscribeToRealtime function
  const subscribeToRealtime = async (): Promise<void> => {
    const { roomId } = get();
    
    if (!roomId) {
      logger.error("Cannot subscribe: No active room ID");
      return;
    }

    try {
      await connectionManager.subscribeToRealtime(roomId, get, set);
    } catch (error) {
      logger.error("Error in subscribeToRealtime:", error);
      set({ isConnected: false });
    }
  };

  // Database sync function
  const syncGameStateToDatabase = async (): Promise<boolean> => {
    try {
      // Call the debounced function and return the original promise
      debouncedSyncToDatabase();
      return await baseSyncToDatabase();
    } catch (error) {
      logger.error("Error syncing to database:", error);
      return false;
    }
  };

  // Cleanup function
  const cleanup = (): void => {
    connectionManager.disconnect();
  };

  // Get connection status
  const getConnectionStatus = () => {
    return connectionManager.getConnectionStatus();
  };

  return {
    sendMessage,
    subscribeToRealtime,
    syncGameStateToDatabase,
    cleanup,
    getConnectionStatus,
  };
};

// Export types and utilities for external use
export type { GameStoreState, SetStateFn } from "./types";
export { logger } from "./utils";
export { CONNECTION, TIMING, GAME_STATUS_PRIORITY } from "./constants"; 