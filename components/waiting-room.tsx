import { motion } from "framer-motion";
import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { GameRoom } from "@/app/types/game"; // Assuming GameRoom type is defined here

interface WaitingRoomProps {
  roomId: string;
  players: string[];
  currentRoom: GameRoom | null;
  isCurrentUserHost: boolean;
  allPlayersJoined: boolean;
  isAddingBots: boolean;
  isStartingGame: boolean;
  onAddBots: () => void;
  onStartGame: () => void;
  onForceHostStatus?: () => void; // Optional debug prop
}

export function WaitingRoom({
  roomId,
  players,
  currentRoom,
  isCurrentUserHost,
  allPlayersJoined,
  isAddingBots,
  isStartingGame,
  onAddBots,
  onStartGame,
  onForceHostStatus,
}: WaitingRoomProps) {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    // Consider adding a toast notification here instead of alert
    // alert("Room link copied to clipboard!");
  };

  // Helper to find player details safely
  const getPlayerDetails = (playerName: string) => {
    console.log("getPlayerDetails currentRoom:", currentRoom);
    if (!currentRoom || !currentRoom.players || !playerName) return null;
    return currentRoom.players.find((p) => p.name === playerName);
  };

  // Safe access to players array
  const safePlayersArray = Array.isArray(players) ? players : [];
  const playerCount = safePlayersArray.length;

  // Debug logging
  console.log("[WaitingRoom] Debug:", {
    isCurrentUserHost,
    allPlayersJoined,
    playerCount,
    shouldShowAddBots: isCurrentUserHost && !allPlayersJoined && playerCount < 4,
    onAddBots: typeof onAddBots
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto p-3 sm:p-4 md:p-6 border border-primary/30 md:border-2 rounded-lg bg-card/90 backdrop-blur-sm text-center"
    >
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl sm:text-2xl font-medieval mb-3 sm:mb-4"
      >
        Waiting for Players
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-3 sm:mb-4 text-sm sm:text-base"
      >
        Share this room with friends to start the game
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center mb-3 sm:mb-4"
      >
        <Button
          variant="outline"
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10"
          onClick={handleCopyLink}
        >
          <Share className="h-3 w-3 sm:h-4 sm:w-4" />
          Copy Room Link
        </Button>
      </motion.div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
        {[0, 1, 2, 3].map((index) => {
          const playerName = safePlayersArray[index];
          const playerDetails = getPlayerDetails(playerName);
          const isEmptySlot = !playerName;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className={`h-24 sm:h-28 md:h-32 border border-primary/30 sm:border-2 rounded-md md:rounded-lg flex items-center justify-center overflow-hidden ${
                !isEmptySlot
                  ? "border-primary bg-primary/10"
                  : "border-muted bg-muted/10"
              }`}
            >
              {!isEmptySlot ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex flex-col items-center gap-0.5 sm:gap-1 w-full px-1"
                >
                  <span className="font-medieval text-xs sm:text-sm truncate w-full text-center">
                    {playerDetails?.name || playerName}
                  </span>
                  <div className="flex flex-col items-center">
                    {playerDetails?.isHost && (
                      <span className="text-[10px] sm:text-xs text-primary">Host</span>
                    )}
                    {playerDetails?.isBot && (
                      <span className="text-[10px] sm:text-xs text-secondary flex items-center gap-0.5 sm:gap-1">
                        <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-secondary animate-pulse"></span>
                        Bot
                      </span>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="text-muted-foreground text-xs sm:text-sm"
                >
                  Empty
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-3 sm:mt-4 flex flex-col gap-2"
      >
        <p className="text-xs sm:text-sm text-muted-foreground">
          {playerCount}/4 players joined
        </p>
        <div className="space-y-2">
          {/* Debug button - only visible in development */}
          {process.env.NODE_ENV === "development" && onForceHostStatus && (
            <Button
              className="w-full medieval-button bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center gap-1.5 sm:gap-2 mb-2 text-xs sm:text-sm h-8 sm:h-10"
              onClick={onForceHostStatus}
            >
              Debug: Force Host Status
            </Button>
          )}

          {/* Fill with Bots button */}
          {isCurrentUserHost && !allPlayersJoined && playerCount < 4 && (
            <Button
              className="w-full medieval-button bg-secondary hover:bg-secondary/90 text-secondary-foreground flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10"
              onClick={onAddBots}
              disabled={isAddingBots}
            >
              {isAddingBots ? (
                <>
                  <LoadingSpinner size="sm" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    Adding Bots...
                  </motion.span>
                </>
              ) : (
                "Fill with Bots"
              )}
            </Button>
          )}

          {/* Start Game button */}
          {allPlayersJoined && (
            <Button
              className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-10"
              onClick={onStartGame}
              disabled={isStartingGame}
            >
              {isStartingGame ? (
                <>
                  <LoadingSpinner size="sm" />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    Starting Game...
                  </motion.span>
                </>
              ) : (
                "Start Game"
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
