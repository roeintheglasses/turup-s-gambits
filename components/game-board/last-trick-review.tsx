"use client";

import { memo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/card";
import { Trophy, X, Crown, Swords } from "lucide-react";

interface LastTrickCard {
  suit: string;
  value: string;
  id: string;
}

interface LastTrickData {
  cards: LastTrickCard[];
  playedBy: string[];
  winnerId: string;
  winningTeam: number; // 0 = Royals, 1 = Rebels
  ledSuit: string;
  trickNumber: number;
}

interface LastTrickReviewProps {
  isOpen: boolean;
  onClose: () => void;
  lastTrick: LastTrickData | null;
  playerNames: Record<string, string>; // sessionId -> name
  teamAssignments: Record<string, "royals" | "rebels">; // playerName -> team
  trumpSuit: string | null;
}

const cardValues: Record<string, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

/**
 * LastTrickReview - Overlay showing the previous trick's cards.
 * Highlights the winning card with a golden glow.
 * Dismisses on click outside or pressing Escape.
 */
export const LastTrickReview = memo(function LastTrickReview({
  isOpen,
  onClose,
  lastTrick,
  playerNames,
  teamAssignments,
  trumpSuit,
}: LastTrickReviewProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Determine winning card index
  const getWinningIndex = useCallback(() => {
    if (!lastTrick || lastTrick.cards.length === 0) return -1;

    const ledSuit = lastTrick.ledSuit;
    let winningIndex = 0;
    let winningCard = lastTrick.cards[0];

    for (let i = 1; i < lastTrick.cards.length; i++) {
      const card = lastTrick.cards[i];
      const cardVal = cardValues[card.value] || 0;
      const winVal = cardValues[winningCard.value] || 0;

      if (trumpSuit && card.suit === trumpSuit) {
        if (winningCard.suit !== trumpSuit) {
          winningIndex = i;
          winningCard = card;
        } else if (cardVal > winVal) {
          winningIndex = i;
          winningCard = card;
        }
      } else if (card.suit === ledSuit && winningCard.suit !== trumpSuit) {
        if (winningCard.suit !== ledSuit || cardVal > winVal) {
          winningIndex = i;
          winningCard = card;
        }
      }
    }

    return winningIndex;
  }, [lastTrick, trumpSuit]);

  if (!lastTrick) return null;

  const winningIndex = getWinningIndex();
  const winnerName = playerNames[lastTrick.winnerId] || lastTrick.winnerId;
  const winnerTeam = lastTrick.winningTeam === 0 ? "royals" : "rebels";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 bg-[hsl(var(--dark-panel))]/95 backdrop-blur-md border-2 border-amber-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 sm:top-3 sm:right-3 text-white/50 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-4 sm:mb-5">
              <h3 className="text-sm sm:text-base font-medieval text-amber-400/80 mb-1">
                Last Trick
              </h3>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${
                winnerTeam === "royals"
                  ? "bg-amber-900/50 border border-amber-500/40"
                  : "bg-blue-900/50 border border-blue-500/40"
              }`}>
                {winnerTeam === "royals" ? (
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Swords className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="text-xs sm:text-sm font-medium text-white">
                  {winnerName} won
                </span>
              </div>
            </div>

            {/* Cards display */}
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              {lastTrick.cards.map((card, index) => {
                const playerId = lastTrick.playedBy[index];
                const name = playerNames[playerId] || `Player ${index + 1}`;
                const team = teamAssignments[name];
                const isWinner = index === winningIndex;

                return (
                  <motion.div
                    key={`last-trick-card-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col items-center gap-1.5 sm:gap-2"
                  >
                    {/* Card with winner highlight */}
                    <div className="relative">
                      {isWinner && (
                        <motion.div
                          animate={{
                            boxShadow: [
                              "0 0 8px rgba(251, 191, 36, 0.4)",
                              "0 0 20px rgba(251, 191, 36, 0.7)",
                              "0 0 8px rgba(251, 191, 36, 0.4)",
                            ],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="absolute -inset-1 rounded-lg border-2 border-amber-400/60 pointer-events-none"
                        />
                      )}

                      {/* Trophy badge for winner */}
                      {isWinner && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", delay: 0.3 }}
                          className="absolute -top-2 -right-2 z-20 bg-amber-500 text-white rounded-full p-0.5 sm:p-1 border-2 border-white shadow-lg"
                        >
                          <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </motion.div>
                      )}

                      <Card
                        suit={card.suit}
                        value={card.value}
                        onClick={() => {}}
                        disabled
                        is3D={false}
                      />
                    </div>

                    {/* Player name tag */}
                    <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-md whitespace-nowrap ${
                      team === "royals"
                        ? "bg-amber-900/60 border border-amber-500/40"
                        : team === "rebels"
                          ? "bg-blue-900/60 border border-blue-500/40"
                          : "bg-black/40 border border-white/20"
                    }`}>
                      {team === "royals" && <Crown className="w-2.5 h-2.5 text-amber-400" />}
                      {team === "rebels" && <Swords className="w-2.5 h-2.5 text-blue-400" />}
                      <span className="text-[8px] sm:text-[10px] font-medieval text-white truncate max-w-[50px] sm:max-w-[70px]">
                        {name}
                      </span>
                    </div>

                    {/* Play order indicator */}
                    <span className="text-[8px] sm:text-[10px] text-white/40">
                      {index === 0 ? "Lead" : `#${index + 1}`}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Tap to dismiss hint */}
            <p className="text-center text-[10px] sm:text-xs text-white/30 mt-3 sm:mt-4">
              Tap anywhere to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
