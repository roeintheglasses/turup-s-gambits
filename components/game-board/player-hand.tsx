"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface HandCard {
  id: number | string;
  suit: string;
  value: string;
  apiId?: string;
}

interface PlayerHandProps {
  cards: HandCard[];
  isMyTurn: boolean;
  gameStatus: string;
  selectedCard: number | string | null;
  playingCardId: number | string | null;
  onCardClick: (cardId: number | string) => void;
  leadingSuit?: string | null;
}

/**
 * Player Hand - Arc/fan layout for the current player's cards
 * Features:
 * - Fan layout for natural feel (on larger screens)
 * - Clear playable/non-playable card states
 * - Hover effects with lift
 * - Loading state for card being played
 * - Responsive: linear on mobile, arc on desktop
 */
export function PlayerHand({
  cards,
  isMyTurn,
  gameStatus,
  selectedCard,
  playingCardId,
  onCardClick,
  leadingSuit,
}: PlayerHandProps) {
  const [hoveredCard, setHoveredCard] = useState<number | string | null>(null);

  const isPlaying = gameStatus === "playing";
  const canPlay = isPlaying && isMyTurn;

  // Check if a card can be played (follows suit rule)
  const canPlayCard = useCallback((card: HandCard): boolean => {
    if (!canPlay) return false;
    if (!leadingSuit) return true; // First card of trick, any card is valid

    // Check if player has any cards of the leading suit
    const hasLeadingSuit = cards.some(c => c.suit === leadingSuit);
    if (!hasLeadingSuit) return true; // Can play any card if no cards of leading suit

    // Must play a card of the leading suit
    return card.suit === leadingSuit;
  }, [canPlay, leadingSuit, cards]);

  // Calculate arc positioning for each card
  const getCardTransform = (index: number, total: number, isHovered: boolean) => {
    if (total <= 1) return { rotate: 0, x: 0, y: 0 };

    // For mobile (< 7 cards visible at once), use linear layout
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    if (isMobile || total <= 5) {
      // Linear layout with slight overlap
      return { rotate: 0, x: 0, y: isHovered ? -12 : 0 };
    }

    // Arc layout for desktop with many cards
    const centerIndex = (total - 1) / 2;
    const offset = index - centerIndex;
    const maxRotation = 15; // Max rotation in degrees
    const rotationStep = maxRotation / Math.max(centerIndex, 1);
    const rotate = offset * rotationStep;

    // Y offset to create arc curve
    const yOffset = Math.abs(offset) * 3;

    return {
      rotate,
      x: 0,
      y: isHovered ? -20 : yOffset,
    };
  };

  return (
    <div className="relative w-full flex justify-center items-end pb-2">
      {/* Turn indicator message */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg border text-sm font-medieval whitespace-nowrap ${
              isMyTurn
                ? "bg-green-600/90 border-green-400 text-white animate-pulse"
                : "bg-card/80 border-border text-muted-foreground"
            }`}
          >
            {isMyTurn ? "🎴 Your turn to play!" : "Waiting for your turn..."}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards container */}
      <div
        className="flex justify-center items-end"
        style={{
          gap: cards.length > 8 ? "-8px" : cards.length > 5 ? "2px" : "4px",
        }}
      >
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            const isPlayable = canPlayCard(card);
            const isSelected = selectedCard === card.id;
            const isBeingPlayed = playingCardId === card.id;
            const isHovered = hoveredCard === card.id;
            const transform = getCardTransform(index, cards.length, isHovered && canPlay);

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: isSelected ? -16 : transform.y,
                  scale: isBeingPlayed ? 0.9 : 1,
                  rotate: transform.rotate,
                  filter: !isPlaying || !isMyTurn ? "brightness(0.7)" :
                          !isPlayable && canPlay ? "brightness(0.5) saturate(0.5)" : "brightness(1)",
                }}
                exit={{ opacity: 0, y: -100, scale: 0.5 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                whileHover={canPlay && isPlayable ? {
                  y: -16,
                  scale: 1.05,
                  zIndex: 50,
                  transition: { duration: 0.15 },
                } : undefined}
                onHoverStart={() => setHoveredCard(card.id)}
                onHoverEnd={() => setHoveredCard(null)}
                onClick={() => {
                  if (canPlay && isPlayable && !isBeingPlayed) {
                    onCardClick(card.id);
                  }
                }}
                className={`relative ${
                  canPlay && isPlayable && !isBeingPlayed
                    ? "cursor-pointer"
                    : "cursor-not-allowed"
                }`}
                style={{ zIndex: isHovered ? 50 : index }}
              >
                {/* Playable card indicator glow */}
                {canPlay && isPlayable && !isBeingPlayed && (
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 0px rgba(34, 197, 94, 0)",
                        "0 0 15px rgba(34, 197, 94, 0.5)",
                        "0 0 0px rgba(34, 197, 94, 0)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-lg pointer-events-none"
                  />
                )}

                {/* The card */}
                <Card
                  suit={card.suit}
                  value={card.value}
                  onClick={() => {}}
                  disabled={!canPlay || !isPlayable || isBeingPlayed}
                  is3D={true}
                />

                {/* Loading spinner for card being played */}
                {isBeingPlayed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                    <LoadingSpinner size="sm" />
                  </div>
                )}

                {/* Non-playable indicator (must follow suit) */}
                {canPlay && !isPlayable && leadingSuit && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/70 text-white text-[10px] px-1 py-0.5 rounded">
                      Must follow suit
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty hand indicator */}
      {cards.length === 0 && (
        <div className="text-muted-foreground text-sm font-medieval py-8">
          No cards in hand
        </div>
      )}
    </div>
  );
}
