"use client";

import { memo, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { playSoundEffect } from "@/hooks/use-sound-effects";

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
 * Optimized for 60fps with memoization and limited animations
 */
export const PlayerHand = memo(function PlayerHand({
  cards,
  isMyTurn,
  gameStatus,
  selectedCard,
  playingCardId,
  onCardClick,
  leadingSuit,
}: PlayerHandProps) {
  // Memoize mobile check - only re-evaluate on mount/resize
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isPlaying = gameStatus === "playing";
  const canPlay = isPlaying && isMyTurn;
  const prevCardCountRef = useRef(0);
  const [isDealing, setIsDealing] = useState(false);

  // Track card dealing for animations and sounds
  useEffect(() => {
    const prevCount = prevCardCountRef.current;
    const newCount = cards.length;

    // Cards were added (dealing)
    if (newCount > prevCount && prevCount >= 0) {
      setIsDealing(true);
      // Play deal sound for each new card with slight delay
      const newCards = newCount - prevCount;
      for (let i = 0; i < newCards; i++) {
        setTimeout(() => {
          playSoundEffect("cardDeal", 0.3);
        }, i * 80);
      }
      // Reset dealing state after animation completes
      setTimeout(() => setIsDealing(false), newCards * 100 + 300);
    }

    prevCardCountRef.current = newCount;
  }, [cards.length]);

  // Memoize playable cards set for O(1) lookup
  const playableCardIds = useMemo(() => {
    if (!canPlay) return new Set<number | string>();
    if (!leadingSuit) {
      // All cards are playable
      return new Set(cards.map((c) => c.id));
    }
    // Check if player has leading suit
    const hasLeadingSuit = cards.some((c) => c.suit === leadingSuit);
    if (!hasLeadingSuit) {
      return new Set(cards.map((c) => c.id));
    }
    // Only leading suit cards are playable
    return new Set(
      cards.filter((c) => c.suit === leadingSuit).map((c) => c.id)
    );
  }, [canPlay, leadingSuit, cards]);

  // Memoize card transforms based on card count and mobile
  const cardTransforms = useMemo(() => {
    const total = cards.length;
    if (total <= 1) return cards.map(() => ({ rotate: 0, y: 0 }));

    if (isMobile || total <= 5) {
      return cards.map(() => ({ rotate: 0, y: 0 }));
    }

    const centerIndex = (total - 1) / 2;
    const maxRotation = 15;
    const rotationStep = maxRotation / Math.max(centerIndex, 1);

    return cards.map((_, index) => {
      const offset = index - centerIndex;
      return {
        rotate: offset * rotationStep,
        y: Math.abs(offset) * 3,
      };
    });
  }, [cards.length, isMobile, cards]);

  const handleCardClick = useCallback(
    (cardId: number | string) => {
      if (canPlay && playableCardIds.has(cardId) && playingCardId !== cardId) {
        onCardClick(cardId);
      }
    },
    [canPlay, playableCardIds, playingCardId, onCardClick]
  );

  // Memoize gap style
  const gapStyle = useMemo(
    () => ({
      gap: cards.length > 8 ? "-12px" : cards.length > 5 ? "-2px" : "2px",
    }),
    [cards.length]
  );

  return (
    <div className="relative w-full flex justify-center items-end pb-2" role="region" aria-label={`Your hand, ${cards.length} cards${canPlay ? ", your turn" : ""}`}>
      {/* Cards container */}
      <div className="flex justify-center items-end" role="list" aria-label="Cards in hand" style={gapStyle}>
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => {
            const isPlayable = playableCardIds.has(card.id);
            const isSelected = selectedCard === card.id;
            const isBeingPlayed = playingCardId === card.id;
            const transform = cardTransforms[index] || { rotate: 0, y: 0 };

            return (
              <motion.div
                key={card.id}
                role="listitem"
                layout
                initial={{
                  opacity: 0,
                  y: -150,
                  x: (index - cards.length / 2) * -20,
                  scale: 0.6,
                  rotateZ: -10 + Math.random() * 20,
                }}
                animate={{
                  opacity: 1,
                  y: isSelected ? -16 : transform.y,
                  x: 0,
                  scale: isBeingPlayed ? 0.9 : 1,
                  rotate: transform.rotate,
                  rotateZ: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -200,
                  x: 0,
                  scale: 0.6,
                  rotateX: 20,
                  rotateZ: 5,
                  transition: {
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1],
                    opacity: { duration: 0.3, delay: 0.1 },
                  },
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                  mass: 0.8,
                  delay: isDealing ? index * 0.06 : 0,
                }}
                whileHover={
                  canPlay && isPlayable
                    ? {
                        y: -16,
                        scale: 1.05,
                        zIndex: 50,
                        transition: { duration: 0.15 },
                      }
                    : undefined
                }
                onClick={() => handleCardClick(card.id)}
                className={`relative transition-[filter] duration-200 will-change-transform ${
                  canPlay && isPlayable && !isBeingPlayed
                    ? "cursor-pointer"
                    : "cursor-not-allowed"
                } ${
                  !isPlaying || !isMyTurn
                    ? "brightness-[0.7]"
                    : !isPlayable && canPlay
                    ? "brightness-50 saturate-50"
                    : ""
                }`}
                style={{ zIndex: index }}
              >
                {/* Playable card indicator - CSS glow instead of infinite animation */}
                {canPlay && isPlayable && !isBeingPlayed && (
                  <div className="absolute inset-0 rounded-lg pointer-events-none shadow-[0_0_12px_rgba(34,197,94,0.4)]" />
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
                    <div className="bg-black/70 text-white text-[8px] sm:text-[10px] px-0.5 sm:px-1 py-0.5 rounded text-center leading-tight">
                      <span className="hidden sm:inline">Must follow suit</span>
                      <span className="sm:hidden">Follow suit</span>
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
        <div className="text-muted-foreground text-sm italic font-medieval py-8 px-6 text-center rounded-lg border border-white/10 bg-white/5">
          No cards in hand
        </div>
      )}
    </div>
  );
});
