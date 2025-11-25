"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Crown, Check, Clock } from "lucide-react";
import { Suit } from "@/app/types/game";
import { useUIStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores";
import { playSoundEffect } from "@/hooks/use-sound-effects";

// Constants
const SUITS = [
  { id: "hearts", name: "Hearts", symbol: "♥", color: "text-red-500" },
  { id: "diamonds", name: "Diamonds", symbol: "♦", color: "text-red-500" },
  {
    id: "clubs",
    name: "Clubs",
    symbol: "♣",
    color: "text-slate-900 dark:text-slate-100",
  },
  {
    id: "spades",
    name: "Spades",
    symbol: "♠",
    color: "text-slate-900 dark:text-slate-100",
  },
] as const;

// Helper functions
const getSuitSymbol = (suit: string): string => {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
    default:
      return suit;
  }
};

const getSuitColor = (suit: string): string => {
  switch (suit) {
    case "hearts":
    case "diamonds":
      return "text-red-500";
    case "clubs":
    case "spades":
      return "text-slate-900 dark:text-slate-100";
    default:
      return "";
  }
};

// Frenzy mode power descriptions
const FRENZY_POWERS = {
  hearts: {
    name: "Extra Points",
    description: "Gain bonus points for winning tricks with heart cards",
    type: "Passive",
    icon: "💝"
  },
  spades: {
    name: "Free Lead",
    description: "Lead with any card after winning a trick",
    type: "Passive",
    icon: "🗡️"
  },
  diamonds: {
    name: "Peek Card",
    description: "See one opponent's card (2 uses per game)",
    type: "Active",
    icon: "👁️"
  },
  clubs: {
    name: "Out of Turn",
    description: "Play one card out of turn (1 use per game)",
    type: "Active",
    icon: "⚡"
  }
} as const;

// Types
interface TrumpSelectionPopupProps {
  onVote: (suit: string) => void;
  userVote: Suit | null;
  trumpVotes: Record<string, number>;
  votingComplete: boolean;
  playerHand: Array<{
    id: number;
    suit: string;
    value: string;
  }>;
  isOpen: boolean;
  isCurrentUserHost: boolean;
  gameMode?: "classic" | "frenzy";
}

// Add debug flag at the top of the file
const DEBUG = true;

export function TrumpSelectionPopup({
  onVote,
  userVote,
  trumpVotes,
  votingComplete,
  playerHand,
  isOpen,
  isCurrentUserHost,
  gameMode = "classic",
}: TrumpSelectionPopupProps) {
  const { showTrumpPopup, setShowTrumpPopup } = useUIStore();
  const { setGameStatus, setShowShuffleAnimation } = useGameStore();

  const effectiveIsOpen = isOpen || showTrumpPopup;

  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [handAnalysis, setHandAnalysis] = useState<Record<string, number>>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  });
  const [isHandLoading, setIsHandLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Debug log state changes
  useEffect(() => {
    if (DEBUG) {
      console.log("[Trump Selection Popup] State:", {
        isOpen,
        votingComplete,
        userVote,
        trumpVotes,
        isClosing,
        totalVotes: Object.values(trumpVotes).reduce(
          (sum, count) => sum + count,
          0
        ),
      });
    }
  }, [isOpen, votingComplete, userVote, trumpVotes, isClosing]);

  // Reset selected suit when popup opens or when user vote changes
  useEffect(() => {
    if (effectiveIsOpen) {
      setSelectedSuit(userVote || null);
      setIsClosing(false);
    }
  }, [effectiveIsOpen, userVote]);

  // Mark cards as loading when first shown
  useEffect(() => {
    if (effectiveIsOpen && !userVote) {
      setIsHandLoading(true);
      const timer = setTimeout(() => {
        setIsHandLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [effectiveIsOpen, userVote]);

  // Close the popup when voting is complete
  useEffect(() => {
    if (votingComplete && effectiveIsOpen) {
      const timer = setTimeout(() => {
        handleClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [votingComplete, effectiveIsOpen]);

  // Analyze player hand when it changes
  useEffect(() => {
    if (playerHand.length > 0) {
      const suitCounts = {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0,
      };

      playerHand.forEach((card) => {
        if (card.suit in suitCounts) {
          suitCounts[card.suit as keyof typeof suitCounts]++;
        }
      });

      setHandAnalysis(suitCounts);
    }
  }, [playerHand]);

  // Count cards by suit in player's hand
  const suitCounts = useMemo(() => {
    return playerHand.reduce((counts, card) => {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }, [playerHand]);

  // Get total votes
  const totalVotes = useMemo(() => {
    return Object.values(trumpVotes).reduce((sum, count) => sum + count, 0);
  }, [trumpVotes]);

  // Handle voting for a trump suit
  const handleVote = () => {
    if (!selectedSuit || userVote) {
      console.warn(
        "[Trump Selection] Cannot vote: No suit selected or already voted"
      );
      return;
    }

    if (DEBUG) console.log(`[Trump Selection] Voting for ${selectedSuit}`);

    // Play button click sound
    playSoundEffect("buttonClick", 0.4);

    // Call the onVote callback with the selected suit
    onVote(selectedSuit);

    // Show a success message
    const { showToast } = useUIStore.getState();
    showToast(`You voted for ${selectedSuit} as trump`, "success");
  };

  // Update handleClose to set both the local state and the UI store state
  const handleClose = () => {
    setIsClosing(true);

    // Delay actual closing for animation
    setTimeout(() => {
      setShowTrumpPopup(false);

      // If voting is complete, transition to final_deal phase
      if (votingComplete) {
        // Set game state to final_deal
        setGameStatus("final_deal");

        // Trigger the shuffle animation for final deal
        setShowShuffleAnimation(true);

        // Log for debugging
        console.log("[Trump Selection] Transitioning to final_deal phase");
      }
    }, 300);
  };

  // Failsafe: Check if all votes are in but votingComplete hasn't been set properly
  useEffect(() => {
    // Only run this check if popup is open, we're not already closing, and voting isn't marked complete
    if (effectiveIsOpen && !isClosing && !votingComplete) {
      const totalVotes = Object.values(trumpVotes).reduce(
        (sum, count) => sum + count,
        0
      );
      // If we have exactly 4 votes (all players) or all players in the room have voted
      const expectedVotes = 4; // Assuming 4-player game

      if (totalVotes >= expectedVotes) {
        if (DEBUG)
          console.log(
            "[Trump Selection Popup] FAILSAFE: All votes are in but votingComplete is false. Force closing popup."
          );
        // Force close after a short delay
        const timer = setTimeout(() => {
          setIsClosing(true);
          setShowTrumpPopup(false);
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [
    effectiveIsOpen,
    isClosing,
    votingComplete,
    trumpVotes,
    setShowTrumpPopup,
  ]);

  // Get the winning suit with max votes
  const getWinningSuit = useMemo(() => {
    if (!votingComplete || !trumpVotes) return null;

    let maxVotes = 0;
    let winningSuit: string | null = null;

    Object.entries(trumpVotes).forEach(([suit, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winningSuit = suit;
      }
    });

    return winningSuit;
  }, [votingComplete, trumpVotes]);

  // Use effective player hand (fallback to mock data if needed)
  const effectivePlayerHand =
    playerHand.length > 0
      ? playerHand
      : [
          { id: 1, suit: "hearts", value: "A" },
          { id: 2, suit: "spades", value: "K" },
          { id: 3, suit: "diamonds", value: "Q" },
          { id: 4, suit: "clubs", value: "J" },
          { id: 5, suit: "hearts", value: "10" },
        ];

  // Create card count summary text
  const cardSummary = useMemo(() => {
    const parts: string[] = [];
    SUITS.forEach(suit => {
      const count = handAnalysis[suit.id];
      if (count > 0) {
        parts.push(`${count} ${suit.name}`);
      }
    });
    return parts.join(", ") || "No cards";
  }, [handAnalysis]);

  if (!effectiveIsOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-[hsl(var(--dark-panel))] backdrop-blur-md w-full max-w-xl p-4 rounded-xl border-4 border-[hsl(var(--warm-brown))] shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col relative"
        >
          {/* Inline Loading Overlay for Voting */}
          {userVote && !votingComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center"
            >
              <div className="bg-[hsl(var(--dark-panel))] p-6 rounded-lg border-2 border-[hsl(var(--warm-brown))] text-center">
                <LoadingSpinner size="lg" variant="primary" />
                <h3 className="text-lg font-medieval text-[hsl(var(--amber-primary))] mt-4 mb-2">
                  Vote Submitted!
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Waiting for other players to vote...
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{totalVotes} of 4 votes received</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-cinzel font-bold text-[hsl(var(--amber-primary))] text-shadow-medieval">
                {votingComplete
                  ? "Trump Selection Complete"
                  : gameMode === "frenzy"
                    ? "Choose Trump Suit & Power"
                    : "Select Trump Suit"}
              </h2>
              {gameMode === "frenzy" && (
                <span className="px-3 py-1 bg-[hsl(var(--amber-primary))]/20 text-[hsl(var(--amber-bright))] text-xs font-cinzel font-bold rounded-full border-2 border-[hsl(var(--amber-primary))]/40">
                  FRENZY MODE
                </span>
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 pr-2" style={{ scrollbarWidth: 'thin' }}>

            {/* HERO SECTION - The Hand */}
            <div className="mb-4">
              <div className="text-center mb-3">
                <h3 className="text-lg font-medieval text-[hsl(var(--amber-primary))] mb-1">
                  Your Initial 5 Cards
                </h3>
                <p className="text-sm text-muted-foreground">
                  First 5 of 13 cards
                </p>
              </div>

              {/* Fanned Cards Display - BIGGER CARDS */}
              <div className="relative h-56 mb-3 flex items-center justify-center w-full overflow-visible">
                {isHandLoading ? (
                  <div className="flex flex-col items-center justify-center">
                    <LoadingSpinner size="lg" variant="primary" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Dealing initial 5 cards...
                    </p>
                  </div>
                ) : (
                  <div className="relative" style={{ width: '100%', height: '220px' }}>
                    {effectivePlayerHand.map((card, index) => {
                      // Calculate rotation and position for fan effect
                      const totalCards = effectivePlayerHand.length;
                      const centerIndex = (totalCards - 1) / 2;
                      const rotationDegree = (index - centerIndex) * 10; // 10 degrees per card
                      const xOffset = (index - centerIndex) * 65; // 65px horizontal spacing for bigger cards
                      const yOffset = Math.abs(index - centerIndex) * 15; // More pronounced arc
                      const zIndex = card.suit === selectedSuit && !userVote ? 10 : index;

                      return (
                        <motion.div
                          key={card.id}
                          className="absolute cursor-pointer"
                          style={{
                            left: '50%',
                            top: '50%',
                            marginLeft: '-48px', // Half of larger card width (96px)
                            marginTop: '-70px', // Half of larger card height (140px)
                            zIndex: zIndex,
                          }}
                          initial={{
                            x: xOffset,
                            y: yOffset,
                            rotate: rotationDegree,
                          }}
                          animate={{
                            x: xOffset,
                            y: card.suit === selectedSuit && !userVote ? yOffset - 20 : yOffset,
                            rotate: rotationDegree,
                            scale: card.suit === selectedSuit && !userVote ? 1.05 : 1,
                          }}
                          whileHover={{
                            y: yOffset - 30,
                            rotate: 0,
                            scale: 1.1,
                            zIndex: 20,
                            transition: { duration: 0.2 },
                          }}
                          transition={{ duration: 0.3 }}
                          onClick={() => !userVote && setSelectedSuit(card.suit)}
                        >
                          {/* Larger Card - Custom size */}
                          <div className="w-24 h-36 relative">
                            <motion.button
                              className={`fantasy-card w-full h-full flex flex-col items-center justify-center ${
                                userVote ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                              } transition-all duration-200`}
                              disabled={!!userVote}
                              style={{ transformStyle: "preserve-3d" }}
                            >
                              <div className="absolute top-1 left-1 flex flex-col items-center" style={{ transform: "translateZ(5px)" }}>
                                <span className={`text-base font-cinzel font-bold ${getSuitColor(card.suit)}`}>{card.value}</span>
                                <span className={`text-base ${getSuitColor(card.suit)}`}>{getSuitSymbol(card.suit)}</span>
                              </div>

                              <span className={`text-4xl ${getSuitColor(card.suit)}`} style={{ transform: "translateZ(10px)" }}>
                                {getSuitSymbol(card.suit)}
                              </span>

                              <div
                                className="absolute bottom-1 right-1 flex flex-col items-center rotate-180"
                                style={{ transform: "translateZ(5px)" }}
                              >
                                <span className={`text-base font-cinzel font-bold ${getSuitColor(card.suit)}`}>{card.value}</span>
                                <span className={`text-base ${getSuitColor(card.suit)}`}>{getSuitSymbol(card.suit)}</span>
                              </div>
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card Count Summary */}
              <div className="text-center">
                <p className="text-base text-foreground font-medium">
                  {cardSummary}
                </p>
              </div>
            </div>

            {/* SELECTION INTERFACE */}
            {votingComplete ? (
              /* Voting Results */
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <h3 className="text-center text-lg font-medieval text-foreground mb-3">
                  Voting Results
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {(["hearts", "diamonds", "clubs", "spades"] as Suit[]).map((suit) => {
                    const isWinner =
                      Math.max(...Object.values(trumpVotes)) === trumpVotes[suit];
                    return (
                      <div
                        key={suit}
                        className={`p-2 border-2 rounded-lg flex flex-col items-center transition-all ${
                          isWinner
                            ? "bg-primary/20 border-primary/50 shadow-lg scale-105"
                            : "bg-muted/30 border-border/50"
                        }`}
                      >
                        <span className={`text-3xl mb-1 ${getSuitColor(suit)}`}>
                          {getSuitSymbol(suit)}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-base text-foreground">
                            {trumpVotes[suit] || 0}
                          </span>
                          {isWinner && <Crown className="h-3 w-3 text-primary" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Winner announcement */}
                {getWinningSuit && (
                  <div className="mt-3 text-center">
                    <p className="text-lg font-medium text-foreground">
                      <span className={`text-2xl ${getSuitColor(getWinningSuit)} mr-2`}>
                        {getSuitSymbol(getWinningSuit)}
                      </span>
                      <span className="capitalize">{getWinningSuit}</span>
                      <span className="text-primary ml-2">wins!</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Suit Selection Panel */
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <h3 className="text-center text-sm font-medieval text-foreground mb-3">
                  {gameMode === "frenzy"
                    ? "Choose Your Power"
                    : "Choose Trump Suit"}
                </h3>

                {/* Compact 4-button grid */}
                <div className="grid grid-cols-4 gap-2">
                  {(["hearts", "diamonds", "clubs", "spades"] as Suit[]).map((suit) => (
                    <button
                      key={suit}
                      onClick={() => !userVote && setSelectedSuit(suit)}
                      disabled={!!userVote}
                      className={`
                        relative p-3 rounded-lg flex flex-col items-center justify-center
                        transition-all duration-300 min-h-[100px]
                        ${
                          selectedSuit === suit && !userVote
                            ? "bg-[hsl(var(--amber-primary))]/20 border-2 border-[hsl(var(--amber-primary))] shadow-lg shadow-amber-500/20"
                            : userVote === suit
                            ? "bg-emerald-500/20 border-2 border-emerald-500 shadow-lg"
                            : "bg-card hover:bg-muted/50 border-2 border-border/50 hover:border-border"
                        }
                        ${userVote && userVote !== suit ? "opacity-40" : ""}
                        ${!userVote ? "cursor-pointer" : "cursor-not-allowed"}
                      `}
                    >
                      {/* Checkmark badge for selected/voted */}
                      {(selectedSuit === suit || userVote === suit) && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}

                      {/* Large suit icon */}
                      <span className={`text-4xl mb-2 ${getSuitColor(suit)}`}>
                        {getSuitSymbol(suit)}
                      </span>

                      {/* Suit name */}
                      <span className="text-xs font-medieval capitalize text-foreground mb-1">
                        {suit}
                      </span>

                      {/* Card count */}
                      <div className="text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{suitCounts[suit] || 0}</span> cards
                      </div>

                      {/* Frenzy power icon (if frenzy mode) */}
                      {gameMode === "frenzy" && (
                        <div className="text-lg mt-1">
                          {FRENZY_POWERS[suit].icon}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Status message - only show before voting */}
                {!userVote && (
                  <div className="text-center mt-2">
                    <p className="text-muted-foreground text-sm">
                      {gameMode === "frenzy"
                        ? "Select a trump suit to gain its special power!"
                        : "Select a trump suit based on your hand"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACTION AREA - Fixed at bottom */}
          <div className="flex-shrink-0 mt-3 pt-3 border-t border-border">
            {votingComplete ? (
              <Button
                variant="default"
                size="lg"
                className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                onClick={handleClose}
              >
                Continue to Next Phase
              </Button>
            ) : (
              <Button
                className={`w-full font-bold text-lg py-5 medieval-button transition-all duration-300 ${
                  selectedSuit
                    ? "bg-[hsl(var(--amber-primary))] hover:bg-[hsl(var(--amber-bright))] text-[hsl(var(--dark-bg))] shadow-lg shadow-amber-500/30"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
                size="lg"
                onClick={handleVote}
                disabled={!selectedSuit || isHandLoading || !!userVote}
              >
                {isHandLoading ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    Loading...
                  </span>
                ) : selectedSuit ? (
                  "CONFIRM SELECTION"
                ) : (
                  "Select a suit to continue"
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
