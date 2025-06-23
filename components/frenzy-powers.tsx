"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Spade, 
  Diamond, 
  Club, 
  Zap, 
  Eye, 
  Shuffle, 
  Clock,
  Sparkles,
  Target
} from "lucide-react";
import { Suit } from "@/app/types/game";
import { useGameStore } from "@/stores";
import { useUIStore } from "@/stores/uiStore";

// Types
interface FrenzyPowersProps {
  trumpSuit: Suit;
  gameMode: "classic" | "frenzy";
  currentPlayer: string;
  isCurrentUserTurn: boolean;
  onUsePower: (powerType: string, data?: any) => void;
}

interface PowerDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  cooldown: number;
  usageLimit: number;
}

interface PowerState {
  isUsed: boolean;
  lastUsed: number;
  usageCount: number;
}

// Power definitions for each suit
const FRENZY_POWERS: Record<Suit, PowerDefinition> = {
  hearts: {
    id: "extra_points",
    name: "Extra Heart Points",
    description: "Gain extra points for winning tricks with heart cards",
    icon: Heart,
    color: "text-red-500",
    cooldown: 0, // Passive power
    usageLimit: -1, // Unlimited
  },
  spades: {
    id: "free_lead",
    name: "Free Lead",
    description: "Lead with any card after winning a trick",
    icon: Spade,
    color: "text-slate-900 dark:text-slate-100",
    cooldown: 0, // Passive power
    usageLimit: -1, // Unlimited
  },
  diamonds: {
    id: "peek_card",
    name: "Peek at Card",
    description: "See one opponent's card",
    icon: Eye,
    color: "text-red-500",
    cooldown: 30000, // 30 seconds
    usageLimit: 2, // Can use twice per game
  },
  clubs: {
    id: "out_of_turn",
    name: "Out of Turn Play",
    description: "Play one card out of turn",
    icon: Clock,
    color: "text-slate-900 dark:text-slate-100",
    cooldown: 45000, // 45 seconds
    usageLimit: 1, // Can use once per game
  },
};

// Component for individual power display
const PowerCard: React.FC<{
  power: PowerDefinition;
  powerState: PowerState;
  isActive: boolean;
  isUsable: boolean;
  onUse: () => void;
}> = ({ power, powerState, isActive, isUsable, onUse }) => {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (powerState.lastUsed > 0 && power.cooldown > 0) {
      const remaining = Math.max(0, power.cooldown - (Date.now() - powerState.lastUsed));
      setCooldownRemaining(remaining);

      if (remaining > 0) {
        const interval = setInterval(() => {
          const newRemaining = Math.max(0, power.cooldown - (Date.now() - powerState.lastUsed));
          setCooldownRemaining(newRemaining);
          
          if (newRemaining <= 0) {
            clearInterval(interval);
          }
        }, 1000);

        return () => clearInterval(interval);
      }
    }
  }, [powerState.lastUsed, power.cooldown]);

  const isOnCooldown = cooldownRemaining > 0;
  const isAtUsageLimit = power.usageLimit > 0 && powerState.usageCount >= power.usageLimit;
  const canUse = isActive && isUsable && !isOnCooldown && !isAtUsageLimit;

  return (
    <motion.div
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-300
        ${
          isActive
            ? "bg-primary/20 border-primary/50 shadow-lg"
            : "bg-muted/30 border-border/30"
        }
        ${canUse ? "hover:scale-105 cursor-pointer" : ""}
        ${isOnCooldown || isAtUsageLimit ? "opacity-60" : ""}
      `}
      whileHover={canUse ? { scale: 1.05 } : {}}
      whileTap={canUse ? { scale: 0.95 } : {}}
    >
      <div className="flex flex-col items-center text-center">
        <power.icon className={`h-8 w-8 mb-2 ${power.color}`} />
        <h3 className="font-bold text-sm text-foreground mb-1">{power.name}</h3>
        <p className="text-xs text-muted-foreground mb-3">{power.description}</p>
        
        {/* Usage counter */}
        {power.usageLimit > 0 && (
          <div className="text-xs text-muted-foreground mb-2">
            Uses: {powerState.usageCount}/{power.usageLimit}
          </div>
        )}
        
        {/* Cooldown timer */}
        {isOnCooldown && (
          <div className="text-xs text-amber-600 mb-2">
            Cooldown: {Math.ceil(cooldownRemaining / 1000)}s
          </div>
        )}
        
        {/* Action button */}
        {power.cooldown > 0 && power.usageLimit !== 0 && (
          <Button
            size="sm"
            variant={canUse ? "default" : "outline"}
            disabled={!canUse}
            onClick={onUse}
            className="w-full"
          >
            {isAtUsageLimit ? "Used Up" : isOnCooldown ? "On Cooldown" : "Use Power"}
          </Button>
        )}
        
        {/* Passive indicator */}
        {power.cooldown === 0 && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Sparkles className="h-3 w-3" />
            Passive
          </div>
        )}
      </div>
      
      {/* Active power indicator */}
      {isActive && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
          Active
        </div>
      )}
    </motion.div>
  );
};

// Peek card modal component
const PeekCardModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  targetPlayer: string;
  revealedCard: any;
}> = ({ isOpen, onClose, targetPlayer, revealedCard }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card/95 backdrop-blur-md p-6 rounded-lg border-2 border-primary/30 shadow-xl"
        >
          <div className="text-center">
            <Eye className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-medieval text-foreground mb-4">
              Peek Power Used!
            </h2>
            <p className="text-muted-foreground mb-4">
              You revealed a card from {targetPlayer}'s hand:
            </p>
            
            {revealedCard && (
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <span className="text-2xl">
                    {revealedCard.rank} {revealedCard.suit === "hearts" ? "♥" : 
                     revealedCard.suit === "diamonds" ? "♦" :
                     revealedCard.suit === "clubs" ? "♣" : "♠"}
                  </span>
                </div>
              </div>
            )}
            
            <Button onClick={onClose} className="medieval-button">
              Continue
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export function FrenzyPowers({
  trumpSuit,
  gameMode,
  currentPlayer,
  isCurrentUserTurn,
  onUsePower,
}: FrenzyPowersProps) {
  const [selectedOpponent, setSelectedOpponent] = useState<string>("");
  const [showPeekModal, setShowPeekModal] = useState(false);
  const [revealedCard, setRevealedCard] = useState<any>(null);
  
  const { 
    frenzyPowers, 
    players, 
    userId, 
    sendMessage,
    roomId,
    specialEffects,
    revealedCards 
  } = useGameStore();
  const { showToast } = useUIStore();

  // Get current player's power states
  const userPowerStates = frenzyPowers?.[userId || ""] || {};
  
  // Get the power definition for current trump suit
  const currentPower = FRENZY_POWERS[trumpSuit];
  const powerState: PowerState = {
    isUsed: userPowerStates[currentPower?.id]?.used || false,
    lastUsed: userPowerStates[currentPower?.id]?.lastUsed || 0,
    usageCount: userPowerStates[currentPower?.id]?.usageCount || 0,
  };

  // Check if power is currently active
  const isActive = gameMode === "frenzy" && trumpSuit && !!currentPower;
  const isUsable = isCurrentUserTurn && !powerState.isUsed;

  const handleUsePower = async () => {
    if (!currentPower || !isUsable || !roomId || !userId) {
      showToast("Cannot use power right now", "error");
      return;
    }

    try {
      // Handle different power types
      let powerData: any = {};
      let requiresTarget = false;

      switch (currentPower.id) {
        case "peek_card":
          // For peek card, we need to select an opponent
          const opponents = players.filter(p => p.id !== userId && !p.isBot);
          if (opponents.length === 0) {
            showToast("No opponents available to peek at", "error");
            return;
          }
          
          // Show opponent selection or use first available
          const targetOpponent = opponents[0]; // Simplified - could show selection UI
          powerData.targetPlayerId = targetOpponent.id;
          powerData.targetPlayerName = targetOpponent.name;
          requiresTarget = true;
          break;
          
        case "out_of_turn":
          // For out of turn, just grant permission
          powerData.grantedTurns = 1;
          break;
          
        case "extra_points":
        case "free_lead":
          // These are passive powers, no additional data needed
          break;
      }

      // Send the frenzy power usage message
      const success = await sendMessage({
        type: "game:frenzy-power",
        payload: {
          powerType: currentPower.id,
          playerId: userId,
          playerName: players.find(p => p.id === userId)?.name || "Unknown",
          roomId,
          data: powerData,
          timestamp: Date.now(),
        },
      });

      if (success) {
        // Call the callback if provided
        onUsePower?.(currentPower.id, powerData);
        
        // Show success message
        showToast(`${currentPower.name} activated!`, "success");
        
        // Handle peek card modal
        if (currentPower.id === "peek_card" && requiresTarget) {
          // Simulate card reveal for demo (in real game, this would come from server)
          setTimeout(() => {
            setRevealedCard({
              suit: "hearts",
              rank: "K",
              player: powerData.targetPlayerName,
            });
            setShowPeekModal(true);
          }, 1000);
        }
      } else {
        showToast("Failed to use power. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error using frenzy power:", error);
      showToast("Error using power", "error");
    }
  };

  // Don't render if not in frenzy mode or no trump suit
  if (gameMode !== "frenzy" || !trumpSuit || !currentPower) {
    return null;
  }

  return (
    <>
      <div className="frenzy-powers-container p-4 bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-lg border border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Frenzy Power
          </h2>
          <div className="text-sm text-muted-foreground">
            Trump: {trumpSuit}
          </div>
        </div>

        <PowerCard
          power={currentPower}
          powerState={powerState}
          isActive={isActive}
          isUsable={isUsable}
          onUse={handleUsePower}
        />

        {/* Show active special effects */}
        {specialEffects && Object.entries(specialEffects).map(([effectId, effect]) => (
          <div key={effectId} className="mt-2 p-2 bg-green-500/20 rounded border border-green-500/30">
            <div className="text-xs text-green-400">
              Active Effect: {effect.type}
              {effect.targetPlayer && ` (Target: ${effect.targetPlayer})`}
            </div>
          </div>
        ))}

        {/* Show revealed cards */}
        {revealedCards && Object.entries(revealedCards).map(([cardId, cardInfo]) => (
          <div key={cardId} className="mt-2 p-2 bg-blue-500/20 rounded border border-blue-500/30">
            <div className="text-xs text-blue-400">
              Revealed: {cardInfo.card.rank} of {cardInfo.card.suit} (Player: {cardInfo.playerId})
            </div>
          </div>
        ))}
      </div>

      {/* Peek Card Modal */}
      <PeekCardModal
        isOpen={showPeekModal}
        onClose={() => setShowPeekModal(false)}
        targetPlayer={revealedCard?.player || ""}
        revealedCard={revealedCard}
      />
    </>
  );
} 