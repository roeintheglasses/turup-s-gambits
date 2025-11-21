"use client"

import { useState } from "react"
import { motion } from "framer-motion"

interface CardProps {
  suit: string
  value: string
  onClick: () => void
  disabled?: boolean
  is3D?: boolean
}

export function Card({ suit, value, onClick, disabled = false, is3D = false }: CardProps) {
  const [isHovered, setIsHovered] = useState(false)

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
        return "text-[#8B0000]" // Dark red for better contrast on parchment
      case "clubs":
      case "spades":
        return "text-[#1a1208]" // Very dark brown/black
      default:
        return ""
    }
  }

  const symbol = getSuitSymbol(suit)
  const color = getSuitColor(suit)

  if (is3D) {
    return (
      <motion.button
        className={`fantasy-card w-12 h-16 sm:w-14 sm:h-20 md:w-16 md:h-24 flex flex-col items-center justify-center ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"} transition-all duration-200`}
        onClick={onClick}
        disabled={disabled}
        initial={{ rotateY: 0 }}
        whileHover={{
          rotateY: 15,
          rotateX: -5,
          y: -10,
          boxShadow: "0 12px 20px rgba(0, 0, 0, 0.4)",
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 flex flex-col items-center" style={{ transform: "translateZ(5px)" }}>
          <span className={`text-xs sm:text-sm font-cinzel font-bold ${color}`}>{value}</span>
          <span className={`text-xs sm:text-sm ${color}`}>{symbol}</span>
        </div>

        <span className={`text-xl sm:text-2xl md:text-3xl ${color}`} style={{ transform: "translateZ(10px)" }}>
          {symbol}
        </span>

        <div
          className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 flex flex-col items-center rotate-180"
          style={{ transform: "translateZ(5px)" }}
        >
          <span className={`text-xs sm:text-sm font-cinzel font-bold ${color}`}>{value}</span>
          <span className={`text-xs sm:text-sm ${color}`}>{symbol}</span>
        </div>

        {isHovered && (
          <div
            className="absolute inset-0 bg-[hsl(var(--amber-primary))]/10 rounded-lg"
            style={{ transform: "translateZ(2px)" }}
          />
        )}
      </motion.button>
    )
  }

  return (
    <button
      className={`fantasy-card w-12 h-16 sm:w-14 sm:h-20 md:w-16 md:h-24 flex flex-col items-center justify-center ${disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:shadow-[0_8px_16px_rgba(0,0,0,0.4)] hover:-translate-y-1"} transition-all duration-200`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1 flex flex-col items-center">
        <span className={`text-xs sm:text-sm font-cinzel font-bold ${color}`}>{value}</span>
        <span className={`text-xs sm:text-sm ${color}`}>{symbol}</span>
      </div>

      <span className={`text-xl sm:text-2xl md:text-3xl ${color}`}>{symbol}</span>

      <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 flex flex-col items-center rotate-180">
        <span className={`text-xs sm:text-sm font-cinzel font-bold ${color}`}>{value}</span>
        <span className={`text-xs sm:text-sm ${color}`}>{symbol}</span>
      </div>
    </button>
  )
}

