"use client";
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Crown, Check, Users } from "lucide-react";
import type { Player } from "@/server/schema/GameState";

interface BiddingPanelProps {
  isOpen: boolean;
  players: Player[];
  currentTurn: string;
  currentPlayerId: string;
  highestBid: number;
  highestBidder: string;
  onBid: (bid: number) => void;
}

export function BiddingPanel({
  isOpen,
  players,
  currentTurn,
  currentPlayerId,
  highestBid,
  highestBidder,
  onBid,
}: BiddingPanelProps) {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  // Check if it's the current player's turn
  const isMyTurn = currentTurn === currentPlayerId;

  // Get current player
  const currentPlayer = useMemo(() => {
    return players.find((p) => p.id === currentTurn);
  }, [players, currentTurn]);

  // Get highest bidder
  const highestBidderPlayer = useMemo(() => {
    return players.find((p) => p.id === highestBidder);
  }, [players, highestBidder]);

  // Check if all players have bid
  const allPlayersBid = useMemo(() => {
    return players.every((p) => p.bid > 0);
  }, [players]);

  // Generate valid bid options (must be higher than current highest, min 7, max 13)
  const validBids = useMemo(() => {
    const bids: number[] = [];
    const minBid = Math.max(7, highestBid + 1);
    for (let i = minBid; i <= 13; i++) {
      bids.push(i);
    }
    return bids;
  }, [highestBid]);

  // Handle bid selection
  const handleSelectBid = (bid: number) => {
    if (!isMyTurn) return;
    setSelectedBid(bid);
  };

  // Handle bid confirmation
  const handleConfirmBid = () => {
    if (!isMyTurn || selectedBid === null) return;
    onBid(selectedBid);
    setSelectedBid(null);
  };

  // Handle pass (bid 0 or minimum)
  const handlePass = () => {
    if (!isMyTurn) return;
    // Pass means bidding the minimum (7) or 0 to indicate passing
    onBid(7);
    setSelectedBid(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card/95 backdrop-blur-md w-full max-w-2xl p-6 rounded-lg border-2 border-primary/30 shadow-xl"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <h2 className="text-2xl font-medieval text-primary">
                Bidding Phase
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Bid on how many tricks your team will win (out of 13)
              </p>
            </div>
          </div>

          {/* Bidding Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Bidding Progress</span>
              <span>{players.filter(p => p.bid > 0).length} / {players.length} players</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-primary h-full rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${(players.filter(p => p.bid > 0).length / players.length) * 100}%`
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Current Status */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Current Turn:</p>
                <motion.div
                  animate={isMyTurn ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 1.5, repeat: isMyTurn ? Infinity : 0 }}
                >
                  <p className={`text-lg font-medieval ${isMyTurn ? 'text-primary' : 'text-foreground'}`}>
                    {currentPlayer?.name || "Unknown"}
                    {currentPlayer?.isHost && (
                      <Crown className="inline h-4 w-4 ml-1 text-primary" />
                    )}
                    {isMyTurn && <span className="ml-2 text-sm">(Your turn!)</span>}
                  </p>
                </motion.div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Highest Bid:</p>
                <p className="text-lg font-medieval text-foreground">
                  {highestBid === 0 ? "None yet" : highestBid}
                  {highestBidder && highestBid > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      by {highestBidderPlayer?.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Players Status */}
          <div className="mb-6">
            <h3 className="text-lg font-medieval text-foreground mb-3">
              Players
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg border transition-all duration-300 ${
                    player.id === currentTurn
                      ? "bg-primary/20 border-primary/50 shadow-lg"
                      : player.bid > 0
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-muted/30 border-border/50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medieval text-foreground">
                        {player.name}
                        {player.isHost && (
                          <Crown className="inline h-3 w-3 ml-1 text-primary" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Team {player.team === 0 ? "Royals" : "Rebels"}
                      </p>
                    </div>
                    <div className="text-right">
                      {player.bid > 0 ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center gap-1"
                        >
                          <span className="text-lg font-bold text-foreground">
                            {player.bid}
                          </span>
                          <Check className="h-4 w-4 text-green-500" />
                        </motion.div>
                      ) : player.id === currentTurn ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Waiting...
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bidding Interface */}
          {isMyTurn && !allPlayersBid && (
            <div className="mb-6">
              <h3 className="text-lg font-medieval text-foreground mb-3">
                Your Bid
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Select how many tricks you think your team can win. You must bid
                higher than {highestBid === 0 ? "6" : highestBid} (minimum is 7).
              </p>

              {validBids.length > 0 ? (
                <>
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {validBids.map((bid) => (
                      <button
                        key={bid}
                        onClick={() => handleSelectBid(bid)}
                        className={`
                          p-3 rounded-lg text-lg font-medieval transition-all duration-200
                          ${
                            selectedBid === bid
                              ? "bg-primary text-primary-foreground border-2 border-primary shadow-lg scale-105"
                              : "bg-muted hover:bg-muted/80 text-foreground border border-border/50"
                          }
                        `}
                      >
                        {bid}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleConfirmBid}
                      disabled={selectedBid === null}
                    >
                      Confirm Bid
                      {selectedBid !== null && ` (${selectedBid})`}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4 bg-muted/50 rounded-lg border border-border/50">
                  <p className="text-muted-foreground">
                    No valid bids available. The highest bid is already 13!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Waiting Message */}
          {!isMyTurn && !allPlayersBid && (
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-3">
                <LoadingSpinner size="lg" />
                <p className="text-muted-foreground">
                  Waiting for {currentPlayer?.name} to place their bid...
                </p>
              </div>
            </div>
          )}

          {/* All Players Bid Message */}
          {allPlayersBid && (
            <div className="text-center py-8">
              <div className="flex flex-col items-center gap-3">
                <Check className="h-12 w-12 text-green-500" />
                <p className="text-lg font-medieval text-foreground">
                  All players have placed their bids!
                </p>
                <p className="text-sm text-muted-foreground">
                  Highest bid: {highestBid} by {highestBidderPlayer?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Proceeding to final deal...
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
