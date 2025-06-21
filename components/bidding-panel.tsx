"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Crown, Check, Clock, Users, Target, Trophy } from "lucide-react";
import { Suit } from "@/app/types/game";
import { useUIStore } from "@/stores/uiStore";
import { useGameStore } from "@/stores";

// Types
interface BiddingPanelProps {
  onBid: (bid: number) => void;
  userBid: number | null;
  playerBids: Record<string, number>;
  biddingComplete: boolean;
  trumpSuit: Suit;
  playerHand: Array<{
    id: number;
    suit: string;
    value: string;
  }>;
  isOpen: boolean;
  isCurrentUserHost: boolean;
  currentBidder?: string;
  minimumBid?: number;
}

interface BidButtonProps {
  bid: number;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  isMinimumBid: boolean;
  isHighBid: boolean;
}

interface PlayerBidsDisplayProps {
  playerBids: Record<string, number>;
  currentBidder?: string;
}

interface BidAnalysisProps {
  playerHand: Array<{
    id: number;
    suit: string;
    value: string;
  }>;
  trumpSuit: Suit;
}

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
      return "text-foreground";
  }
};

// Components
const BidButton: React.FC<BidButtonProps> = React.memo(({
  bid,
  isSelected,
  isDisabled,
  onClick,
  isMinimumBid,
  isHighBid,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-300
        flex flex-col items-center justify-center min-h-[80px]
        ${
          isSelected
            ? "bg-primary/20 border-primary/50 shadow-lg scale-105"
            : isDisabled
            ? "bg-muted/30 border-border/30 opacity-50 cursor-not-allowed"
            : "bg-card hover:bg-muted/50 border-border/50 hover:border-primary/30 hover:scale-102"
        }
        ${isHighBid ? "ring-2 ring-amber-400/50" : ""}
      `}
    >
      <span className="text-2xl font-bold text-foreground">{bid}</span>
      <span className="text-xs text-muted-foreground">tricks</span>
      
      {isMinimumBid && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
          Min
        </div>
      )}
      
      {isHighBid && (
        <div className="absolute -top-2 -left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
          High
        </div>
      )}
      
      {isSelected && (
        <div className="absolute top-1 right-1">
          <Check className="h-4 w-4 text-primary" />
        </div>
      )}
    </button>
  );
});

BidButton.displayName = "BidButton";

const PlayerBidsDisplay: React.FC<PlayerBidsDisplayProps> = React.memo(({
  playerBids,
  currentBidder,
}) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medieval text-foreground mb-3">
        Current Bids
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(playerBids).map(([playerId, bid]) => (
          <div
            key={playerId}
            className={`
              p-3 border rounded-lg flex justify-between items-center
              ${
                currentBidder === playerId
                  ? "bg-primary/20 border-primary/50"
                  : "bg-muted/30 border-border/50"
              }
            `}
          >
            <span className="font-medium text-foreground">
              {playerId}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-foreground">{bid}</span>
              <span className="text-sm text-muted-foreground">tricks</span>
              {currentBidder === playerId && (
                <Crown className="h-4 w-4 text-primary" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

PlayerBidsDisplay.displayName = "PlayerBidsDisplay";

const BidAnalysis: React.FC<BidAnalysisProps> = React.memo(({
  playerHand,
  trumpSuit,
}) => {
  const handAnalysis = useMemo(() => {
    const suitCounts = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
    const highCards = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
    
    playerHand.forEach((card) => {
      if (card.suit in suitCounts) {
        suitCounts[card.suit as keyof typeof suitCounts]++;
        
        // Count high cards (A, K, Q, J)
        if (['A', 'K', 'Q', 'J'].includes(card.value)) {
          highCards[card.suit as keyof typeof highCards]++;
        }
      }
    });

    const trumpCount = suitCounts[trumpSuit];
    const trumpHighCards = highCards[trumpSuit];
    
    // Calculate recommended bid based on trump cards and high cards
    let recommendedBid = 7; // Minimum bid
    
    // Add points for trump cards
    recommendedBid += Math.floor(trumpCount / 2);
    
    // Add points for high trump cards
    recommendedBid += trumpHighCards;
    
    // Add points for high cards in other suits
    Object.entries(highCards).forEach(([suit, count]) => {
      if (suit !== trumpSuit) {
        recommendedBid += Math.floor(count / 2);
      }
    });
    
    // Cap at 13
    recommendedBid = Math.min(recommendedBid, 13);
    
    return {
      suitCounts,
      highCards,
      trumpCount,
      trumpHighCards,
      recommendedBid,
    };
  }, [playerHand, trumpSuit]);

  return (
    <div className="mb-6 bg-muted/20 p-4 rounded-lg border border-border/30">
      <h3 className="text-lg font-medieval text-foreground mb-3 flex items-center gap-2">
        <Target className="h-5 w-5" />
        Hand Analysis
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Trump suit:</span>
          <div className="flex items-center gap-2">
            <span className={`text-lg ${getSuitColor(trumpSuit)}`}>
              {getSuitSymbol(trumpSuit)}
            </span>
            <span className="font-medium capitalize">{trumpSuit}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Trump cards:</span>
          <span className="font-bold text-primary">
            {handAnalysis.trumpCount} / 13 cards
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">High trump cards:</span>
          <span className="font-bold text-green-600">
            {handAnalysis.trumpHighCards}
          </span>
        </div>
        
        <div className="border-t border-border/30 pt-3 mt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Recommended bid:</span>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="font-bold text-amber-600">
                {handAnalysis.recommendedBid} tricks
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

BidAnalysis.displayName = "BidAnalysis";

export function BiddingPanel({
  onBid,
  userBid,
  playerBids,
  biddingComplete,
  trumpSuit,
  playerHand,
  isOpen,
  isCurrentUserHost,
  currentBidder,
  minimumBid = 7,
}: BiddingPanelProps) {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Reset selected bid when popup opens or when user bid changes
  useEffect(() => {
    if (isOpen) {
      setSelectedBid(userBid || null);
      setIsClosing(false);
    }
  }, [isOpen, userBid]);

  // Close the popup when bidding is complete
  useEffect(() => {
    if (biddingComplete && isOpen) {
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [biddingComplete, isOpen]);

  // Countdown effect when bidding completes
  useEffect(() => {
    if (biddingComplete && countdown > 0 && !isClosing) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [biddingComplete, countdown, isClosing]);

  const highestBid = useMemo(() => {
    return Math.max(...Object.values(playerBids), minimumBid - 1);
  }, [playerBids, minimumBid]);

  const winningBidder = useMemo(() => {
    return Object.entries(playerBids).find(([_, bid]) => bid === highestBid)?.[0];
  }, [playerBids, highestBid]);

  const handleBid = () => {
    if (!selectedBid || userBid) {
      console.warn("[Bidding Panel] Cannot bid: No bid selected or already bid");
      return;
    }

    console.log(`[Bidding Panel] Placing bid: ${selectedBid}`);
    onBid(selectedBid);

    const { showToast } = useUIStore.getState();
    showToast(`You bid ${selectedBid} tricks`, "success");
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      useUIStore.getState().setShowBiddingPanel?.(false);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card/95 backdrop-blur-md w-full max-w-2xl p-6 rounded-lg border-2 border-primary/30 shadow-xl"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-medieval text-primary flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              {biddingComplete
                ? "Bidding Complete"
                : userBid
                ? "Waiting for Other Players"
                : "Place Your Bid"}
            </h2>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Trump:</span>
              <span className={`text-lg ${getSuitColor(trumpSuit)}`}>
                {getSuitSymbol(trumpSuit)}
              </span>
              <span className="capitalize font-medium">{trumpSuit}</span>
            </div>
          </div>

          {/* Hand Analysis */}
          <BidAnalysis playerHand={playerHand} trumpSuit={trumpSuit} />

          {/* Player Bids Display */}
          {Object.keys(playerBids).length > 0 && (
            <PlayerBidsDisplay 
              playerBids={playerBids} 
              currentBidder={currentBidder} 
            />
          )}

          {/* Bidding Interface */}
          {!biddingComplete && !userBid && (
            <div className="mb-6">
              <h3 className="text-lg font-medieval text-foreground mb-3">
                Select Your Bid (7-13 tricks)
              </h3>
              
              <div className="grid grid-cols-4 gap-3 mb-4">
                {Array.from({ length: 7 }, (_, i) => {
                  const bid = i + 7;
                  const isDisabled = bid <= highestBid;
                  const isSelected = selectedBid === bid;
                  const isMinimumBid = bid === minimumBid;
                  const isHighBid = bid === 13;
                  
                  return (
                    <BidButton
                      key={bid}
                      bid={bid}
                      isSelected={isSelected}
                      isDisabled={isDisabled}
                      onClick={() => !isDisabled && setSelectedBid(bid)}
                      isMinimumBid={isMinimumBid}
                      isHighBid={isHighBid}
                    />
                  );
                })}
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                You must bid higher than the current highest bid of {highestBid} tricks
              </p>
            </div>
          )}

          {/* Results Display */}
          {biddingComplete && (
            <div className="text-center mb-6">
              <div className="bg-primary/20 p-4 rounded-lg border border-primary/30">
                <p className="text-lg font-medium text-foreground mb-2">
                  Winning Bid: {highestBid} tricks
                </p>
                <p className="text-muted-foreground">
                  Won by: {winningBidder}
                </p>
              </div>
            </div>
          )}

          {/* Action Area */}
          <div className="flex justify-between items-center border-t border-border pt-4">
            {biddingComplete ? (
              <div className="w-full text-center">
                <Button
                  variant="default"
                  size="sm"
                  className="mt-4 medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleClose}
                >
                  Continue to Final Deal{" "}
                  {countdown > 0 && !isClosing ? `(${countdown})` : ""}
                </Button>
                {countdown > 0 && !isClosing && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Automatically continuing in {countdown} second
                    {countdown !== 1 ? "s" : ""}...
                  </p>
                )}
              </div>
            ) : userBid ? (
              <div className="w-full text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <LoadingSpinner size="sm" />
                    <span>Waiting for other players to bid...</span>
                  </div>
                  <p className="text-sm text-foreground">
                    You bid: <span className="font-bold text-primary">{userBid} tricks</span>
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Bid on how many tricks your team will win out of 13 total tricks.
                </p>
                <Button
                  className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleBid}
                  disabled={!selectedBid}
                >
                  Place Bid
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
} 