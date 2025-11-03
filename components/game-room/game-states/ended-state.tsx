import React from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Swords, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisualEffects } from "@/components/visual-effects";
import { GameBackground } from "../game-background";

interface EndedStateProps {
  winner: string; // "royals" or "rebels"
  isKot: boolean;
  royalsTricks: number;
  rebelsTricks: number;
  players: any[];
  currentPlayer: any;
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
    <div className="h-full flex flex-col items-center justify-center p-4 md:p-8">
      <VisualEffects enableGrain />
      <GameBackground />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Winner Announcement */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <Trophy
              size={80}
              className={`${
                playerWon ? "text-yellow-400" : "text-gray-400"
              } drop-shadow-lg`}
            />
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-medieval mb-4">
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
          className="bg-card/90 backdrop-blur-sm border border-primary/30 rounded-lg p-6 mb-6"
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
          className="bg-card/90 backdrop-blur-sm border border-primary/30 rounded-lg p-6 mb-6"
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

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex gap-4"
        >
          <Button
            onClick={onPlayAgain}
            className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            <RotateCcw size={20} />
            Play Again
          </Button>

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
