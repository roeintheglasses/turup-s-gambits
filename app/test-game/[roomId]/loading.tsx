import { WaitingRoomSkeleton } from "@/components/waiting-room-skeleton";
import { VisualEffects } from "@/components/visual-effects";
import { GameBackground } from "@/components/game-room";

export default function TestGameLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <VisualEffects enableGrain />
      <GameBackground />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-500/20 border-b border-yellow-500 text-yellow-200 px-4 py-2 text-center text-sm mb-4 rounded-t-lg">
          🧪 TEST MODE - Loading...
        </div>
        <WaitingRoomSkeleton />
      </div>
    </div>
  );
}
