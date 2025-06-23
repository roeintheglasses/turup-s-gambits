import React from "react";
import { CardShuffleAnimation } from "@/components/card-shuffle-animation";
import { GameBoardSkeleton } from "@/components/game-board-skeleton";
import { VisualEffects } from "@/components/visual-effects";
import { GameBackground } from "../game-background";

interface InitialDealStateProps {
  showShuffleAnimation: boolean;
  handleShuffleComplete: () => void;
}

export const InitialDealState: React.FC<InitialDealStateProps> = ({
  showShuffleAnimation,
  handleShuffleComplete,
}) => (
  <div className="h-full flex items-center justify-center p-2 md:p-4">
    <VisualEffects enableGrain />
    <GameBackground />

    <div className="w-full px-2 md:px-4">
      {showShuffleAnimation && (
        <CardShuffleAnimation onComplete={handleShuffleComplete} />
      )}
      <GameBoardSkeleton />
    </div>
  </div>
); 