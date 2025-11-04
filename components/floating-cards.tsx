"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

// Card suits and values for the floating cards
const suits = ["hearts", "diamonds", "clubs", "spades"]
const values = ["A", "K", "Q", "J", "10"]

interface FloatingCard {
  id: number
  suit: string
  value: string
  x: number
  y: number
  rotation: number
  scale: number
  delay: number
  duration: number
}

export function FloatingCards() {
  const [cards, setCards] = useState<FloatingCard[]>([])
  const [mounted, setMounted] = useState(false)

  // Generate random cards when component mounts
  useEffect(() => {
    setMounted(true)

    const generatedCards: FloatingCard[] = []

    // Generate 12 random cards
    for (let i = 0; i < 12; i++) {
      const randomSuit = suits[Math.floor(Math.random() * suits.length)]
      const randomValue = values[Math.floor(Math.random() * values.length)]

      generatedCards.push({
        id: i,
        suit: randomSuit,
        value: randomValue,
        x: Math.random() * 100, // Random position (0-100%)
        y: Math.random() * 100,
        rotation: Math.random() * 360 - 180, // Random rotation (-180 to 180 degrees)
        scale: 1.0 + Math.random() * 0.8, // Even larger size (1.0 to 1.8)
        delay: Math.random() * 10, // Random delay (0-10s)
        duration: 15 + Math.random() * 20, // Random duration (15-35s)
      })
    }

    setCards(generatedCards)

    return () => {
      setCards([])
    }
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <AnimatePresence>
        {cards.map((card) => (
          <motion.div
            key={card.id}
            className="absolute w-16 h-24 sm:w-20 sm:h-32 md:w-24 md:h-36" // Responsive card sizes
            initial={{
              x: `${card.x}vw`,
              y: `${card.y}vh`,
              rotate: card.rotation,
              scale: 0,
              opacity: 0,
            }}
            animate={{
              x: [`${card.x}vw`, `${(card.x + 20) % 100}vw`, `${(card.x + 40) % 100}vw`],
              y: [`${card.y}vh`, `${(card.y + 30) % 100}vh`, `${(card.y + 10) % 100}vh`],
              rotate: [card.rotation, card.rotation + 180, card.rotation + 360],
              scale: card.scale,
              opacity: [0, 0.8, 0], // Increased opacity
            }}
            transition={{
              duration: card.duration,
              delay: card.delay,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "loop",
              ease: "linear",
              times: [0, 0.5, 1],
            }}
          >
            <FloatingCard suit={card.suit} value={card.value} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

interface FloatingCardProps {
  suit: string
  value: string
}

function FloatingCard({ suit, value }: FloatingCardProps) {
  const getSuitSymbol = (suit: string) => {
    switch (suit.toLowerCase()) {
      case "hearts":
        return "♥"
      case "diamonds":
        return "♦"
      case "clubs":
        return "♣"
      case "spades":
        return "♠"
      default:
        return ""
    }
  }

  const getSuitColor = (suit: string) => {
    switch (suit.toLowerCase()) {
      case "hearts":
      case "diamonds":
        return "text-red-600 dark:text-red-500" // Increased contrast
      case "clubs":
      case "spades":
        return "text-slate-900 dark:text-white" // Increased contrast
      default:
        return ""
    }
  }

  const symbol = getSuitSymbol(suit)
  const color = getSuitColor(suit)

  return (
    <div className="fantasy-card w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-900/80 to-black shadow-xl">
      <div className="absolute top-1 left-1 flex flex-col items-center">
        <span className="text-sm font-bold">{value}</span>
        <span className={`text-sm ${color}`}>{symbol}</span>
      </div>

      <span className={`text-3xl ${color}`}>{symbol}</span>

      <div className="absolute bottom-1 right-1 flex flex-col items-center rotate-180">
        <span className="text-sm font-bold">{value}</span>
        <span className={`text-sm ${color}`}>{symbol}</span>
      </div>
    </div>
  )
}

