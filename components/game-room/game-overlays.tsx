import React from "react";
import { AnimatePresence } from "framer-motion";
import { StatusUpdateLoader } from "@/components/status-update-loader";
import { PhaseTransitionLoader } from "@/components/game-loader";

interface GameOverlaysProps {
  statusMessage: string | null;
  isPhaseTransitioning: boolean;
  phaseTransitionMessage: string;
}

export const GameOverlays: React.FC<GameOverlaysProps> = ({
  statusMessage,
  isPhaseTransitioning,
  phaseTransitionMessage,
}) => (
  <>
    <AnimatePresence>
      {statusMessage && <StatusUpdateLoader message={statusMessage} />}
    </AnimatePresence>

    {isPhaseTransitioning && (
      <PhaseTransitionLoader message={phaseTransitionMessage} />
    )}
  </>
); 