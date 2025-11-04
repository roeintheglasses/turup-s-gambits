"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/card";

interface CardShuffleAnimationProps {
  onComplete?: () => void;
}

export function CardShuffleAnimation({
  onComplete,
}: CardShuffleAnimationProps) {
  const [cards, setCards] = useState<
    Array<{
      id: number;
      suit: string;
      value: string;
      x: number;
      y: number;
      rotation: number;
    }>
  >([]);

  useEffect(() => {
    // Generate random cards for the animation
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const values = [
      "A",
      "K",
      "Q",
      "J",
      "10",
      "9",
      "8",
      "7",
      "6",
      "5",
      "4",
      "3",
      "2",
    ];

    const generatedCards = [];

    for (let i = 0; i < 20; i++) {
      generatedCards.push({
        id: i,
        suit: suits[Math.floor(Math.random() * suits.length)],
        value: values[Math.floor(Math.random() * values.length)],
        x: Math.random() * 100 - 50, // Random position between -50% and 50%
        y: Math.random() * 100 - 50, // Random position between -50% and 50%
        rotation: Math.random() * 360, // Random rotation
      });
    }

    setCards(generatedCards);

    const timer = setTimeout(() => {
      onComplete && onComplete();
    }, 2500); // Slightly less than the animation duration

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-sm sm:max-w-lg md:max-w-2xl max-h-sm sm:max-h-lg md:max-h-2xl px-4">
        <AnimatePresence>
          {cards.map((card) => (
            <motion.div
              key={card.id}
              className="absolute top-1/2 left-1/2"
              initial={{
                x: 0,
                y: 0,
                rotate: 0,
                scale: 0.5,
                opacity: 0,
              }}
              animate={{
                x: `${card.x}%`,
                y: `${card.y}%`,
                rotate: card.rotation,
                scale: 1,
                opacity: 1,
                transition: {
                  duration: 0.5,
                  delay: card.id * 0.05,
                },
              }}
              exit={{
                opacity: 0,
                transition: { duration: 0.2 },
              }}
            >
              <Card
                suit={card.suit}
                value={card.value}
                onClick={() => {}}
                is3D={true}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
