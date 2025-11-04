"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Crown, Check, Clock, Users } from "lucide-react";
import { Suit } from "@/app/types/game";
import { useUIStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores";

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
      return "text-gray-800";
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
  onForceBotVotes?: () => void;
  gameMode?: "classic" | "frenzy";
}

interface PlayerHandProps {
  playerHand: TrumpSelectionPopupProps["playerHand"];
  selectedSuit: string | null;
  setSelectedSuit: (suit: string) => void;
  handAnalysis: Record<string, number>;
  userVote: Suit | null;
  isHandLoading: boolean;
}

interface SuitSelectionProps {
  selectedSuit: string | null;
  setSelectedSuit: (suit: string) => void;
  userVote: Suit | null;
  trumpVotes: Record<string, number>;
  suitCounts: Record<string, number>;
  isCurrentUserHost: boolean;
  onForceBotVotes?: () => void;
  totalVotes: number;
  gameMode?: "classic" | "frenzy";
}

interface VotingResultsProps {
  trumpVotes: Record<string, number>;
}

interface ActionAreaProps {
  votingComplete: boolean;
  userVote: Suit | null;
  selectedSuit: string | null;
  isHandLoading: boolean;
  isClosing: boolean;
  trumpVotes: Record<string, number>;
  handleVote: () => void;
  handleClose: () => void;
}

// Add debug flag at the top of the file
const DEBUG = true;

// Components
const PlayerHand: React.FC<PlayerHandProps> = React.memo(
  ({
    playerHand,
    selectedSuit,
    setSelectedSuit,
    handAnalysis,
    userVote,
    isHandLoading,
  }) => {
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

    return (
      <div className="mb-3 sm:mb-4 md:mb-6">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="text-sm sm:text-base md:text-lg font-medieval text-foreground">
            Your Initial 5 Cards:
          </h3>
          <div className="bg-primary/20 text-primary-foreground text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
            First 5 of 13 cards
          </div>
        </div>
        <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3 md:mb-4">
          {isHandLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <LoadingSpinner size="lg" variant="primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Dealing initial 5 cards...
              </p>
            </div>
          ) : (
            effectivePlayerHand.map((card) => (
              <motion.div
                key={card.id}
                className="transition-all duration-200"
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
                animate={{
                  y: card.suit === selectedSuit ? -10 : 0,
                  transition: { duration: 0.3 },
                }}
              >
                <Card
                  suit={card.suit}
                  value={card.value}
                  onClick={() => !userVote && setSelectedSuit(card.suit)}
                  is3D={true}
                  disabled={!!userVote}
                />
              </motion.div>
            ))
          )}
        </div>
        <div className="flex justify-center gap-6 text-sm bg-muted/50 py-2 px-4 rounded-lg border border-border/50">
          {SUITS.map((suit) => (
            <div
              key={suit.id}
              className={`flex items-center gap-1 ${
                handAnalysis[suit.id] > 0 ? "font-medium" : "opacity-50"
              }`}
            >
              <span className={`text-lg ${suit.color}`}>{suit.symbol}</span>
              <span className="text-foreground">{handAnalysis[suit.id]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

PlayerHand.displayName = "PlayerHand";

const SuitSelection: React.FC<SuitSelectionProps> = React.memo(
  ({
    selectedSuit,
    setSelectedSuit,
    userVote,
    trumpVotes,
    suitCounts,
    isCurrentUserHost,
    onForceBotVotes,
    totalVotes,
    gameMode = "classic",
  }) => {
    return (
      <>
        <p className="text-center mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm text-muted-foreground">
          {gameMode === "frenzy"
            ? "Select a trump suit and gain its special power!"
            : "Select a trump suit based on your hand. Your hand contains:"
          }
        </p>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
          {(["hearts", "diamonds", "clubs", "spades"] as Suit[]).map((suit) => (
            <button
              key={suit}
              onClick={() => !userVote && setSelectedSuit(suit)}
              disabled={!!userVote}
              className={`
              p-2 sm:p-3 md:p-4 rounded-md md:rounded-lg flex flex-col items-center justify-center
              transition-all duration-300 relative
              ${
                selectedSuit === suit && !userVote
                  ? "bg-primary/20 border md:border-2 border-primary/50 shadow-lg"
                  : userVote === suit
                  ? "bg-primary/30 border md:border-2 border-primary/40 shadow-lg"
                  : "bg-card hover:bg-muted/50 border border-border/50"
              }
              ${userVote && userVote !== suit ? "opacity-50" : ""}
            `}
            >
              <span className={`text-2xl sm:text-3xl md:text-4xl mb-1 sm:mb-2 ${getSuitColor(suit)}`}>
                {getSuitSymbol(suit)}
              </span>
              <span className="text-xs sm:text-sm md:text-base font-medieval capitalize text-foreground">
                {suit}
              </span>
              
              {/* Frenzy Mode Power Preview */}
              {gameMode === "frenzy" && (
                <div className="mt-2 text-center">
                  <div className="text-lg mb-1">{FRENZY_POWERS[suit].icon}</div>
                  <div className="text-xs font-semibold text-primary">
                    {FRENZY_POWERS[suit].name}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    {FRENZY_POWERS[suit].description}
                  </div>
                  <div className="text-xs mt-1 px-2 py-1 rounded-full bg-primary/20 text-primary">
                    {FRENZY_POWERS[suit].type}
                  </div>
                </div>
              )}
              
              {/* Classic Mode Card Count and Votes */}
              {gameMode === "classic" && (
                <div className="flex justify-between w-full mt-2 px-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-sm">{suitCounts[suit] || 0}</span>
                    <span className="text-xs">cards</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-sm font-bold">
                      {trumpVotes[suit] || 0}
                    </span>
                    <span className="text-xs">votes</span>
                  </div>
                </div>
              )}
              
              {/* Frenzy Mode Votes */}
              {gameMode === "frenzy" && (
                <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                  <span className="text-sm font-bold">
                    {trumpVotes[suit] || 0}
                  </span>
                  <span className="text-xs">votes</span>
                </div>
              )}
              
              {userVote === suit && (
                <div className="absolute top-2 right-2">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 text-center">
          {userVote ? (
            <p className="text-foreground flex items-center justify-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              You voted for{" "}
              <span className={`${getSuitColor(userVote)} font-bold mx-1`}>
                {getSuitSymbol(userVote)}
              </span>
              <span className="capitalize">{userVote}</span>
            </p>
          ) : (
            <p className="text-muted-foreground">Please select a trump suit</p>
          )}

          <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Waiting for all players to vote... ({totalVotes} of 4 votes)
            </span>
          </div>

          {isCurrentUserHost && onForceBotVotes && (
            <Button
              onClick={onForceBotVotes}
              className="mt-4 medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Users className="h-4 w-4 mr-2" />
              Force Bots to Vote
            </Button>
          )}
        </div>
      </>
    );
  }
);

SuitSelection.displayName = "SuitSelection";

const VotingResults: React.FC<VotingResultsProps> = React.memo(
  ({ trumpVotes }) => {
    return (
      <div className="text-center mb-6">
        <p className="mb-3 text-muted-foreground">Voting complete! Results:</p>
        <div className="grid grid-cols-2 gap-3">
          {(["hearts", "diamonds", "clubs", "spades"] as Suit[]).map((suit) => {
            const isWinner =
              Math.max(...Object.values(trumpVotes)) === trumpVotes[suit];
            return (
              <div
                key={suit}
                className={`p-3 border rounded-lg flex justify-between items-center ${
                  isWinner
                    ? "bg-primary/20 border-primary/50"
                    : "bg-muted/30 border-border/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-2xl ${getSuitColor(suit)}`}>
                    {getSuitSymbol(suit)}
                  </span>
                  <span className="font-medieval capitalize text-foreground">
                    {suit}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-lg text-foreground">
                    {trumpVotes[suit] || 0}
                  </span>
                  {isWinner && <Crown className="h-4 w-4 text-primary" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

VotingResults.displayName = "VotingResults";

const ActionArea: React.FC<ActionAreaProps> = React.memo(
  ({
    votingComplete,
    userVote,
    selectedSuit,
    isHandLoading,
    isClosing,
    trumpVotes,
    handleVote,
    handleClose,
  }) => {
    const [countdown, setCountdown] = useState(3);

    // Reset countdown when voting completes
    useEffect(() => {
      if (votingComplete) {
        setCountdown(3);
      }
    }, [votingComplete]);

    // Countdown effect when voting completes
    useEffect(() => {
      if (votingComplete && countdown > 0 && !isClosing) {
        const timer = setTimeout(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }, [votingComplete, countdown, isClosing]);

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

    return (
      <div className="flex justify-between items-center border-t border-border pt-4">
        {votingComplete ? (
          <div className="w-full text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {!getWinningSuit && (
                <div className="flex items-center justify-center gap-3">
                  <LoadingSpinner size="md" variant="primary" />
                  Tallying votes...
                </div>
              )}
              {getWinningSuit && (
                <span className="font-medium">
                  {getWinningSuit === "hearts" && "♥"}
                  {getWinningSuit === "diamonds" && "♦"}
                  {getWinningSuit === "clubs" && "♣"}
                  {getWinningSuit === "spades" && "♠"}
                  <span className="capitalize"> {getWinningSuit}</span> wins!
                </span>
              )}
            </p>

            <Button
              variant="default"
              size="sm"
              className="mt-4 medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleClose}
            >
              Continue to Next Phase{" "}
              {countdown > 0 && !isClosing ? `(${countdown})` : ""}
            </Button>
            {countdown > 0 && !isClosing && (
              <p className="text-xs text-muted-foreground mt-2">
                Automatically continuing in {countdown} second
                {countdown !== 1 ? "s" : ""}...
              </p>
            )}
          </div>
        ) : userVote ? (
          <div className="w-full text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <LoadingSpinner size="sm" />
                <span>Waiting for other players to vote...</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              After trump selection, the dealer will deal 8 more cards to
              complete your hand of 13 cards.
            </p>
            <Button
              className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleVote}
              disabled={!selectedSuit || isHandLoading}
            >
              Confirm Selection
            </Button>
          </>
        )}
      </div>
    );
  }
);

ActionArea.displayName = "ActionArea";

export function TrumpSelectionPopup({
  onVote,
  userVote,
  trumpVotes,
  votingComplete,
  playerHand,
  isOpen,
  isCurrentUserHost,
  onForceBotVotes,
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
  const [showConfirmation, setShowConfirmation] = useState(false);
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

  if (!effectiveIsOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-3 md:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card/95 backdrop-blur-md w-full max-w-md md:max-w-2xl p-3 sm:p-4 md:p-6 rounded-lg border md:border-2 border-primary/30 shadow-xl max-h-[95vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-6">
            <div className="flex flex-col">
              <h2 className="text-lg sm:text-xl md:text-2xl font-medieval text-primary">
                {votingComplete
                  ? "Trump Selection Complete"
                  : userVote
                  ? "Waiting for Other Players"
                  : gameMode === "frenzy" 
                    ? "Choose Trump Suit & Power"
                    : "Select Trump Suit"}
              </h2>
              {gameMode === "frenzy" && (
                <div className="mt-2">
                  <span className="px-3 py-1 bg-purple-600/20 text-purple-300 text-xs font-bold rounded-full border border-purple-500/30">
                    FRENZY MODE
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Player's hand display */}
          <PlayerHand
            playerHand={playerHand}
            selectedSuit={selectedSuit}
            setSelectedSuit={setSelectedSuit}
            handAnalysis={handAnalysis}
            userVote={userVote}
            isHandLoading={isHandLoading}
          />

          {/* Trump selection */}
          <div className="mb-3 sm:mb-4 md:mb-6">
            <h3 className="text-sm sm:text-base md:text-lg font-medieval text-foreground mb-2 sm:mb-3">
              {votingComplete
                ? "Voting Results"
                : userVote
                ? "Your Vote"
                : gameMode === "frenzy"
                  ? "Choose Your Power"
                  : "Choose Trump Suit"}
            </h3>

            {votingComplete ? (
              <VotingResults trumpVotes={trumpVotes} />
            ) : (
              <SuitSelection
                selectedSuit={selectedSuit}
                setSelectedSuit={setSelectedSuit}
                userVote={userVote}
                trumpVotes={trumpVotes}
                suitCounts={suitCounts}
                isCurrentUserHost={isCurrentUserHost}
                onForceBotVotes={onForceBotVotes}
                totalVotes={totalVotes}
                gameMode={gameMode}
              />
            )}
          </div>

          {/* Action area */}
          <ActionArea
            votingComplete={votingComplete}
            userVote={userVote}
            selectedSuit={selectedSuit}
            isHandLoading={isHandLoading}
            isClosing={isClosing}
            trumpVotes={trumpVotes}
            handleVote={handleVote}
            handleClose={handleClose}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
