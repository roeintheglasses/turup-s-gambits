// Optimized and refactored realtime functionality
// This module now imports from organized sub-modules for better maintainability

import type { GameStoreState } from "./types";
import { createRealtimeFunctions as createOptimizedRealtimeFunctions } from "./realtime/index";

// Export the optimized realtime functions factory
export const createRealtimeFunctions = createOptimizedRealtimeFunctions;

// Re-export types and constants for backward compatibility
export type { GameStoreState } from "./realtime/types";
export { logger, CONNECTION, TIMING, GAME_STATUS_PRIORITY } from "./realtime/index";
