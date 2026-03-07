import { GameLoader } from "@/components/game-loader";
import { VisualEffects } from "@/components/visual-effects";
import { GameBackground } from "@/components/game-room";

export default function TestGameLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <VisualEffects enableGrain />
      <GameBackground />
      <GameLoader message="Loading test game..." />
    </div>
  );
}
