"use client";

import { memo, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X } from "lucide-react";
import { CARD_SUITS, CARD_VALUES, SUIT_CONFIG, type Suit } from "@/lib/constants";

interface PlayedCardsTrackerProps {
  /** Array of card IDs that have been played (e.g. "hearts-A", "spades-10") */
  playedCardIds: string[];
  /** The current trump suit */
  trumpSuit: string | null;
  /** Whether the panel is currently open */
  isOpen: boolean;
  /** Toggle panel open/closed */
  onToggle: () => void;
}

/** Display order for card values: high to low */
const DISPLAY_VALUES = [...CARD_VALUES].reverse(); // A, K, Q, J, 10, 9, ...

/**
 * Played Cards Tracker - A collapsible sidebar panel
 * Shows all 52 cards grouped by suit, with played cards dimmed.
 * Helps players track which cards have been played (public information).
 */
export const PlayedCardsTracker = memo(function PlayedCardsTracker({
  playedCardIds,
  trumpSuit,
  isOpen,
  onToggle,
}: PlayedCardsTrackerProps) {
  const playedSet = useMemo(() => new Set(playedCardIds), [playedCardIds]);

  const playedCountBySuit = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const suit of CARD_SUITS) {
      counts[suit] = 0;
    }
    for (const cardId of playedCardIds) {
      const suit = cardId.split("-")[0];
      if (counts[suit] !== undefined) {
        counts[suit]++;
      }
    }
    return counts;
  }, [playedCardIds]);

  return (
    <>
      {/* Toggle Button - positioned on the right edge of the board */}
      <button
        onClick={onToggle}
        className={`fixed top-20 right-4 z-50 sm:top-24 flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 transition-all duration-200 shadow-lg ${
          isOpen
            ? "bg-amber-900/90 border-amber-500/70 text-amber-200"
            : "bg-[hsl(var(--dark-panel))]/90 border-[hsl(var(--warm-brown))] text-white/80 hover:text-white hover:border-amber-500/50"
        } backdrop-blur-md`}
        title="Card Tracker"
      >
        <BookOpen className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">Cards</span>
        {playedCardIds.length > 0 && (
          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {playedCardIds.length}
          </span>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={onToggle}
            />

            {/* Sliding panel */}
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 z-50 h-full w-72 sm:w-80 md:w-72 md:top-20 md:h-auto md:max-h-[calc(100vh-6rem)] md:rounded-l-xl md:right-0 overflow-hidden"
            >
              <div className="h-full bg-[hsl(var(--dark-panel))]/95 backdrop-blur-md border-l-2 md:border-2 border-[hsl(var(--warm-brown))] md:rounded-l-xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-medieval text-white">
                      Card Tracker
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/50">
                      {playedCardIds.length}/52 played
                    </span>
                    <button
                      onClick={onToggle}
                      className="p-1 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card grid by suit */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {CARD_SUITS.map((suit) => {
                    const config = SUIT_CONFIG[suit as Suit];
                    const isTrump = suit === trumpSuit;
                    const suitPlayed = playedCountBySuit[suit] || 0;

                    return (
                      <div
                        key={suit}
                        className={`rounded-lg p-2.5 border transition-colors ${
                          isTrump
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        {/* Suit header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-lg ${
                                suit === "hearts" || suit === "diamonds"
                                  ? "text-red-500"
                                  : "text-slate-100"
                              }`}
                            >
                              {config.symbol}
                            </span>
                            <span className="text-xs text-white/70 font-medium">
                              {config.name}
                            </span>
                            {isTrump && (
                              <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40 font-medium uppercase tracking-wider">
                                Trump
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/40">
                            {suitPlayed}/13
                          </span>
                        </div>

                        {/* Card values grid */}
                        <div className="flex flex-wrap gap-1">
                          {DISPLAY_VALUES.map((value) => {
                            const cardId = `${suit}-${value}`;
                            const isPlayed = playedSet.has(cardId);

                            return (
                              <div
                                key={cardId}
                                className={`w-7 h-8 flex items-center justify-center rounded text-xs font-bold transition-all ${
                                  isPlayed
                                    ? "bg-white/5 text-white/20 line-through decoration-white/30"
                                    : isTrump
                                    ? "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                                    : suit === "hearts" || suit === "diamonds"
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : "bg-slate-500/10 text-slate-200 border border-slate-500/20"
                                }`}
                                title={
                                  isPlayed
                                    ? `${value} of ${config.name} (played)`
                                    : `${value} of ${config.name}`
                                }
                              >
                                {value}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer hint */}
                <div className="px-3 py-2 border-t border-white/5 text-center">
                  <span className="text-[10px] text-white/30">
                    All played cards are public information
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});
