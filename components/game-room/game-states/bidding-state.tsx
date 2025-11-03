import React from "react";
import { TrumpSelectionPopup } from "@/components/trump-selection-popup";
import { GameBoardSkeleton } from "@/components/game-board-skeleton";
import { VisualEffects } from "@/components/visual-effects";
import { GameBackground } from "../game-background";
import { GameOverlays } from "../game-overlays";

type Suit = "hearts" | "diamonds" | "clubs" | "spades";
type TrumpVotes = Record<string, number>;

interface BiddingStateProps {
  mode: string;
  playerHand: any[];
  handleTrumpVote: (suit: string) => void;
  userVote: Suit | null;
  trumpVotes: TrumpVotes;
  votingComplete: boolean;
  showTrumpPopup: boolean;
  isCurrentUserHost: boolean;
  statusMessage: string | null;
}

export const BiddingState: React.FC<BiddingStateProps> = ({
  mode,
  playerHand,
  handleTrumpVote,
  userVote,
  trumpVotes,
  votingComplete,
  showTrumpPopup,
  isCurrentUserHost,
  statusMessage,
}) => (
  <div className="h-full flex items-center justify-center p-2 md:p-4">
    <VisualEffects enableGrain />
    <GameBackground />

    <div className="w-full px-2 md:px-4">
      <TrumpSelectionPopup
        onVote={handleTrumpVote}
        userVote={userVote}
        trumpVotes={trumpVotes}
        votingComplete={votingComplete}
        playerHand={playerHand}
        isOpen={showTrumpPopup}
        onForceBotVotes={() => console.log("Force bot votes not implemented")}
        isCurrentUserHost={isCurrentUserHost}
        gameMode={mode as "classic" | "frenzy"}
      />
      <GameBoardSkeleton />
      <GameOverlays
        statusMessage={statusMessage}
        isPhaseTransitioning={false}
        phaseTransitionMessage=""
      />
    </div>
  </div>
); 