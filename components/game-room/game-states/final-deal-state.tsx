import React from "react";
import { CardShuffleAnimation } from "@/components/card-shuffle-animation";
import { GameBoardSkeleton } from "@/components/game-board-skeleton";
import { VisualEffects } from "@/components/visual-effects";
import { GameBackground } from "../game-background";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface FinalDealStateProps {
  showShuffleAnimation: boolean;
  handleFinalShuffleDrawComplete: () => void;
}

export const FinalDealState: React.FC<FinalDealStateProps> = ({
  showShuffleAnimation,
  handleFinalShuffleDrawComplete,
}) => (
  <div className="h-full flex items-center justify-center p-2 md:p-4">
    <VisualEffects enableGrain />
    <GameBackground />
    
    <div className="w-full px-2 md:px-4">
      <div className="absolute inset-0 bg-background/30 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-card/90 p-3 sm:p-4 rounded-lg shadow-lg flex flex-col items-center">
          <LoadingSpinner size="lg" />
          <div className="mt-2 text-foreground">
            Dealing remaining 8 cards...
          </div>
        </div>
      </div>
      
      {showShuffleAnimation && (
        <CardShuffleAnimation onComplete={handleFinalShuffleDrawComplete} />
      )}
      <GameBoardSkeleton />
    </div>
  </div>
); 