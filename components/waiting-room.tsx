"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Share, Copy, Check, Users, Crown, Swords, Bot, User, Loader2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { GameRoom } from "@/app/types/game";
import { useState } from "react";

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
  onForceHostStatus?: () => void;
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
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlayerDetails = (playerName: string) => {
    if (!currentRoom || !currentRoom.players || !playerName) return null;
    return currentRoom.players.find((p) => p.name === playerName);
  };

  const safePlayersArray = Array.isArray(players) ? players : [];
  const playerCount = safePlayersArray.length;

  // Team assignments: 0, 2 = Royals (team 0), 1, 3 = Rebels (team 1)
  const royalsPlayers = [safePlayersArray[0], safePlayersArray[2]].filter(Boolean);
  const rebelsPlayers = [safePlayersArray[1], safePlayersArray[3]].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header Card */}
      <div className="bg-card/90 backdrop-blur-md border-2 border-primary/30 rounded-xl p-6 mb-4">
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/30 mb-3"
          >
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Waiting for Players</span>
          </motion.div>

          <h2 className="text-2xl sm:text-3xl font-medieval text-primary mb-2">
            Game Room
          </h2>
          <p className="text-sm text-muted-foreground">
            Share the room code with friends to start the game
          </p>
        </div>

        {/* Room Code Display */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg px-6 py-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1 text-center">Room Code</p>
            <p className="text-2xl sm:text-3xl font-mono font-bold tracking-[0.3em] text-foreground">
              {roomId}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleCopyCode}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleCopyLink}
            >
              <Share className="h-4 w-4" />
              Share Link
            </Button>
          </div>
        </div>

        {/* Player Count */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex -space-x-2">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`w-8 h-8 rounded-full border-2 border-card flex items-center justify-center ${
                  i < playerCount
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < playerCount ? (
                  <User className="w-4 h-4" />
                ) : (
                  <span className="text-xs">?</span>
                )}
              </motion.div>
            ))}
          </div>
          <span className="text-sm font-medium">
            {playerCount}/4 players
          </span>
        </div>
      </div>

      {/* Teams Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Royals Team */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-amber-950/40 backdrop-blur-sm border-2 border-amber-600/40 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-600/20 flex items-center justify-center">
              <Crown className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="font-medieval text-amber-500 text-lg">Royals</h3>
              <p className="text-xs text-amber-500/60">Positions 1 & 3</p>
            </div>
          </div>

          <div className="space-y-2">
            {[0, 2].map((position, idx) => {
              const playerName = safePlayersArray[position];
              const playerDetails = getPlayerDetails(playerName);
              const isEmpty = !playerName;

              return (
                <motion.div
                  key={position}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isEmpty
                      ? "bg-muted/20 border border-dashed border-muted-foreground/30"
                      : "bg-amber-600/10 border border-amber-600/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isEmpty ? "bg-muted/30" : "bg-amber-600/20"
                  }`}>
                    {isEmpty ? (
                      <User className="w-5 h-5 text-muted-foreground/50" />
                    ) : playerDetails?.isBot ? (
                      <Bot className="w-5 h-5 text-amber-500" />
                    ) : (
                      <User className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      isEmpty ? "text-muted-foreground/50" : "text-foreground"
                    }`}>
                      {isEmpty ? "Waiting..." : playerName}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      {playerDetails?.isHost && (
                        <span className="text-amber-500">Host</span>
                      )}
                      {playerDetails?.isBot && (
                        <span className="text-muted-foreground">Bot</span>
                      )}
                      {!isEmpty && !playerDetails?.isHost && !playerDetails?.isBot && (
                        <span className="text-muted-foreground">Player</span>
                      )}
                    </div>
                  </div>
                  {!isEmpty && (
                    playerDetails?.isBot ? (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    ) : (playerDetails?.isConnected ?? playerDetails?.is_connected) !== false ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />
                    )
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Rebels Team */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-950/40 backdrop-blur-sm border-2 border-blue-600/40 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Swords className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medieval text-blue-500 text-lg">Rebels</h3>
              <p className="text-xs text-blue-500/60">Positions 2 & 4</p>
            </div>
          </div>

          <div className="space-y-2">
            {[1, 3].map((position, idx) => {
              const playerName = safePlayersArray[position];
              const playerDetails = getPlayerDetails(playerName);
              const isEmpty = !playerName;

              return (
                <motion.div
                  key={position}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isEmpty
                      ? "bg-muted/20 border border-dashed border-muted-foreground/30"
                      : "bg-blue-600/10 border border-blue-600/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isEmpty ? "bg-muted/30" : "bg-blue-600/20"
                  }`}>
                    {isEmpty ? (
                      <User className="w-5 h-5 text-muted-foreground/50" />
                    ) : playerDetails?.isBot ? (
                      <Bot className="w-5 h-5 text-blue-500" />
                    ) : (
                      <User className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      isEmpty ? "text-muted-foreground/50" : "text-foreground"
                    }`}>
                      {isEmpty ? "Waiting..." : playerName}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      {playerDetails?.isHost && (
                        <span className="text-blue-500">Host</span>
                      )}
                      {playerDetails?.isBot && (
                        <span className="text-muted-foreground">Bot</span>
                      )}
                      {!isEmpty && !playerDetails?.isHost && !playerDetails?.isBot && (
                        <span className="text-muted-foreground">Player</span>
                      )}
                    </div>
                  </div>
                  {!isEmpty && (
                    playerDetails?.isBot ? (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    ) : (playerDetails?.isConnected ?? playerDetails?.is_connected) !== false ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />
                    )
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card/90 backdrop-blur-md border-2 border-primary/30 rounded-xl p-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Fill with Bots button */}
          {isCurrentUserHost && !allPlayersJoined && playerCount < 4 && (
            <Button
              className="flex-1 h-12 medieval-button bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              onClick={onAddBots}
              disabled={isAddingBots}
            >
              {isAddingBots ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding Bots...
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Fill with Bots
                </>
              )}
            </Button>
          )}

          {/* Start Game button */}
          {allPlayersJoined && isCurrentUserHost && (
            <Button
              className="flex-1 h-12 medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={onStartGame}
              disabled={isStartingGame}
            >
              {isStartingGame ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Game...
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4 mr-2" />
                  Start Game
                </>
              )}
            </Button>
          )}

          {/* Waiting message for non-hosts */}
          {allPlayersJoined && !isCurrentUserHost && (
            <div className="flex-1 h-12 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for host to start...</span>
            </div>
          )}

          {/* Waiting for players message */}
          {!allPlayersJoined && !isCurrentUserHost && (
            <div className="flex-1 h-12 flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>Waiting for more players to join...</span>
            </div>
          )}
        </div>

        {/* Tip */}
        <p className="text-xs text-center text-muted-foreground mt-3">
          {isCurrentUserHost
            ? "As the host, you can add bots to fill empty slots or start the game when ready."
            : "The host will start the game when all players are ready."}
        </p>
      </motion.div>
    </motion.div>
  );
}
