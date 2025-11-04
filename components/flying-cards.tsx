"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"

// Card suits and values for the flying cards
const suits = ["hearts", "diamonds", "clubs", "spades"]
const values = ["A", "K", "Q", "J", "10"]

interface FlyingCardProps {
  suit: string
  value: string
  delay: number
  duration: number
  path: "left-to-right" | "right-to-left" | "top-to-bottom" | "diagonal"
}

export function FlyingCards() {
  const [cards, setCards] = useState<FlyingCardProps[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const paths: ("left-to-right" | "right-to-left" | "top-to-bottom" | "diagonal")[] = [
      "left-to-right",
      "right-to-left",
      "top-to-bottom",
      "diagonal",
    ]

    const generatedCards: FlyingCardProps[] = []

    // Generate 8 random cards with different flight paths
    for (let i = 0; i < 8; i++) {
      const randomSuit = suits[Math.floor(Math.random() * suits.length)]
      const randomValue = values[Math.floor(Math.random() * values.length)]
      const randomPath = paths[Math.floor(Math.random() * paths.length)]

      generatedCards.push({
        suit: randomSuit,
        value: randomValue,
        delay: Math.random() * 15, // Random delay (0-15s)
        duration: 10 + Math.random() * 15, // Random duration (10-25s)
        path: randomPath,
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
      {cards.map((card, index) => (
        <CardAnimation key={index} card={card} index={index} />
      ))}
    </div>
  )
}

function CardAnimation({ card, index }: { card: FlyingCardProps; index: number }) {
  // Define different animation paths
  const getAnimationProps = () => {
    switch (card.path) {
      case "left-to-right":
        return {
          initial: { x: "-100vw", y: `${20 + Math.random() * 60}vh`, rotate: -30 },
          animate: { x: "100vw", y: [`${20 + Math.random() * 60}vh`, `${30 + Math.random() * 40}vh`], rotate: 30 },
        }
      case "right-to-left":
        return {
          initial: { x: "100vw", y: `${20 + Math.random() * 60}vh`, rotate: 30 },
          animate: { x: "-100vw", y: [`${20 + Math.random() * 60}vh`, `${30 + Math.random() * 40}vh`], rotate: -30 },
        }
      case "top-to-bottom":
        return {
          initial: { x: `${20 + Math.random() * 60}vw`, y: "-100vh", rotate: -15 },
          animate: { x: [`${20 + Math.random() * 60}vw`, `${30 + Math.random() * 40}vw`], y: "100vh", rotate: 15 },
        }
      case "diagonal":
        return {
          initial: { x: "-100vw", y: "-100vh", rotate: -45 },
          animate: { x: "100vw", y: "100vh", rotate: 45 },
        }
      default:
        return {
          initial: { x: "-100vw", y: `${20 + Math.random() * 60}vh`, rotate: -30 },
          animate: { x: "100vw", y: [`${20 + Math.random() * 60}vh`, `${30 + Math.random() * 40}vh`], rotate: 30 },
        }
    }
  }

  const animationProps = getAnimationProps()

  return (
    <motion.div
      className="absolute w-12 h-20 sm:w-16 sm:h-28 md:w-20 md:h-32"
      initial={animationProps.initial}
      animate={animationProps.animate}
      transition={{
        duration: card.duration,
        delay: card.delay,
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: Math.random() * 5,
        ease: "linear",
      }}
    >
      <FlyingCard suit={card.suit} value={card.value} />
    </motion.div>
  )
}

// Update the flying card component to use the new gradient
function FlyingCard({ suit, value }: { suit: string; value: string }) {
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
        return "text-red-600 dark:text-red-500"
      case "clubs":
      case "spades":
        return "text-slate-900 dark:text-white"
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

