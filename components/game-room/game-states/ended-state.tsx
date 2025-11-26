import React from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Swords, RotateCcw, Home, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisualEffects } from "@/components/visual-effects";
import { GameBackground } from "../game-background";

interface RematchVotes {
  count: number;
  total: number;
  hasVoted: boolean;
}

interface EndedStateProps {
  winner: string; // "royals" or "rebels"
  isKot: boolean;
  royalsTricks: number;
  rebelsTricks: number;
  players: any[];
  currentPlayer: any;
  rematchVotes?: RematchVotes;
  onRequestRematch?: () => void;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const EndedState: React.FC<EndedStateProps> = ({
  winner,
  isKot,
  royalsTricks,
  rebelsTricks,
  players,
  currentPlayer,
  rematchVotes,
  onRequestRematch,
  onPlayAgain,
  onBackToLobby,
}) => {
  const isPlayerWinner = () => {
    if (!currentPlayer) return false;
    const playerTeam = currentPlayer.team === 0 ? "royals" : "rebels";
    return playerTeam === winner;
  };

  const playerWon = isPlayerWinner();

  return (
    <div className="h-full flex flex-col items-center justify-center p-3 sm:p-4 md:p-8">
      <VisualEffects enableGrain />
      <GameBackground />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Winner Announcement */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="text-center mb-4 sm:mb-6 md:mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <Trophy
              className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 ${
                playerWon ? "text-yellow-400" : "text-gray-400"
              } drop-shadow-lg`}
            />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medieval mb-4">
            {playerWon ? (
              <span className="text-yellow-400">Victory!</span>
            ) : (
              <span className="text-gray-400">Defeat</span>
            )}
          </h1>

          <p className="text-xl md:text-2xl font-medieval text-muted-foreground">
            {winner === "royals" ? (
              <span className="flex items-center justify-center gap-2">
                <Crown size={24} className="text-yellow-500" />
                Royals Win!
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Swords size={24} className="text-gray-600" />
                Rebels Win!
              </span>
            )}
          </p>

          {isKot && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-red-500 font-medieval mt-2"
            >
              🔥 KOT! Complete Domination!
            </motion.p>
          )}
        </motion.div>

        {/* Score Card */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card/90 backdrop-blur-sm border border-primary/30 rounded-lg p-4 md:p-6 mb-4 md:mb-6"
        >
          <h2 className="text-2xl font-medieval text-center mb-6 flex items-center justify-center gap-2">
            <Trophy size={20} />
            Final Score
          </h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Royals */}
            <div
              className={`text-center p-4 rounded-lg border-2 ${
                winner === "royals"
                  ? "border-yellow-500 bg-yellow-500/10"
                  : "border-gray-600 bg-gray-600/10"
              }`}
            >
              <Crown
                size={32}
                className={`mx-auto mb-2 ${
                  winner === "royals" ? "text-yellow-500" : "text-gray-500"
                }`}
              />
              <p className="font-medieval text-lg mb-1">Royals</p>
              <p className="text-4xl font-bold">{royalsTricks}</p>
              <p className="text-sm text-muted-foreground">tricks won</p>
            </div>

            {/* Rebels */}
            <div
              className={`text-center p-4 rounded-lg border-2 ${
                winner === "rebels"
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-600 bg-gray-600/10"
              }`}
            >
              <Swords
                size={32}
                className={`mx-auto mb-2 ${
                  winner === "rebels" ? "text-blue-500" : "text-gray-500"
                }`}
              />
              <p className="font-medieval text-lg mb-1">Rebels</p>
              <p className="text-4xl font-bold">{rebelsTricks}</p>
              <p className="text-sm text-muted-foreground">tricks won</p>
            </div>
          </div>
        </motion.div>

        {/* Players List */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-card/90 backdrop-blur-sm border border-primary/30 rounded-lg p-4 md:p-6 mb-4 md:mb-6"
        >
          <h3 className="text-xl font-medieval mb-4">Players</h3>
          <div className="grid grid-cols-2 gap-3">
            {players.map((player, idx) => {
              const team = player.team === 0 ? "royals" : "rebels";
              return (
                <div
                  key={player.id || idx}
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    team === "royals"
                      ? "bg-yellow-500/10 border border-yellow-500/30"
                      : "bg-blue-500/10 border border-blue-500/30"
                  }`}
                >
                  {team === "royals" ? (
                    <Crown size={16} className="text-yellow-500" />
                  ) : (
                    <Swords size={16} className="text-blue-500" />
                  )}
                  <span className="font-medieval text-sm">
                    {player.name || player.id}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Rematch Voting Status */}
        {rematchVotes && rematchVotes.count > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-sm">
              <Users size={16} className="text-primary" />
              <span className="font-medieval">
                {rematchVotes.count}/{rematchVotes.total} players want a rematch
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(rematchVotes.count / rematchVotes.total) * 100}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex gap-4"
        >
          {/* Rematch Button (if rematch system available) */}
          {onRequestRematch && rematchVotes ? (
            <Button
              onClick={onRequestRematch}
              disabled={rematchVotes.hasVoted}
              className={`flex-1 gap-2 ${
                rematchVotes.hasVoted
                  ? "bg-green-600 hover:bg-green-600 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
              size="lg"
            >
              {rematchVotes.hasVoted ? (
                <>
                  <Check size={20} />
                  Voted for Rematch
                </>
              ) : (
                <>
                  <RotateCcw size={20} />
                  Request Rematch
                </>
              )}
            </Button>
          ) : (
            /* Fallback Play Again button */
            <Button
              onClick={onPlayAgain}
              className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <RotateCcw size={20} />
              Play Again
            </Button>
          )}

          <Button
            onClick={onBackToLobby}
            variant="outline"
            className="flex-1 gap-2"
            size="lg"
          >
            <Home size={20} />
            Back to Lobby
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
