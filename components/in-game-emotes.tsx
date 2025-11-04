"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile } from "lucide-react"

interface InGameEmotesProps {
  onEmote: (emoji: string) => void
}

const emojiOptions = [
  { emoji: "👍", label: "Thumbs Up" },
  { emoji: "👎", label: "Thumbs Down" },
  { emoji: "😄", label: "Smile" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😡", label: "Angry" },
  { emoji: "🎉", label: "Celebration" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "👏", label: "Clap" },
  { emoji: "🙏", label: "Please" },
  { emoji: "🎮", label: "Gaming" },
  { emoji: "🃏", label: "Joker" },
  { emoji: "♠️", label: "Spades" },
  { emoji: "♥️", label: "Hearts" },
  { emoji: "♦️", label: "Diamonds" },
  { emoji: "♣️", label: "Clubs" },
  { emoji: "🏆", label: "Trophy" },
]

export function InGameEmotes({ onEmote }: InGameEmotesProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleEmojiClick = (emoji: string) => {
    onEmote(emoji)
    setIsOpen(false)
  }

  return (
    <div className="absolute bottom-20 sm:bottom-24 left-2 sm:left-6 z-10">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm border-2 border-primary/30 shadow-lg"
          >
            <Smile className="h-5 w-5 text-primary" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 sm:w-64 p-2 bg-card/90 backdrop-blur-sm border-2 border-primary/30">
          <div className="grid grid-cols-4 gap-2">
            {emojiOptions.map((option) => (
              <Button
                key={option.emoji}
                variant="ghost"
                className="h-10 w-10 p-0 hover:bg-accent/20"
                onClick={() => handleEmojiClick(option.emoji)}
                title={option.label}
              >
                <span className="text-xl">{option.emoji}</span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

