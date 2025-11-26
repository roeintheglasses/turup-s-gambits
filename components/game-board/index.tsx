"use client";

/**
 * Game Board - Main Container Component
 *
 * This is the refactored, modular game board with improved UX.
 * Key improvements:
 * - Better visual hierarchy
 * - Clearer turn indicators
 * - Improved center trick area with directional cards
 * - Better mobile responsiveness
 * - Accessible color coding
 */

export { GameInfoWidget } from "./game-info-widget";
export { PlayerIndicator } from "./player-indicator";
export { CenterTrickArea } from "./center-trick-area";
export { PlayerHand } from "./player-hand";
export { TableSurface } from "./table-surface";
export { OpponentArea } from "./opponent-area";
export { TurnTimer } from "./turn-timer";
export { ConnectionIndicator, ConnectionBars } from "./connection-indicator";
