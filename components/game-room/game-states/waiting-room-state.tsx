import React from "react";
import { WaitingRoom } from "@/components/waiting-room";
import { VisualEffects } from "@/components/visual-effects";
import { GameBackground } from "../game-background";

interface WaitingRoomStateProps {
  roomId: string;
  players: any[];
  currentRoom: any;
  isCurrentUserHost: boolean;
  isAddingBots: boolean;
  isStartingGame: boolean;
  handleAddBots: () => void;
  handleStartGame: () => void;
  handleForceHostStatus?: () => void;
}

export const WaitingRoomState: React.FC<WaitingRoomStateProps> = ({
  roomId,
  players,
  currentRoom,
  isCurrentUserHost,
  isAddingBots,
  isStartingGame,
  handleAddBots,
  handleStartGame,
  handleForceHostStatus,
}) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-2 md:p-4">
      <VisualEffects enableGrain />
      <GameBackground />

      <div className="w-full px-2 md:px-4">
        <WaitingRoom
          roomId={roomId}
          players={players.map((p) => p.name)}
          currentRoom={currentRoom}
          isCurrentUserHost={isCurrentUserHost}
          allPlayersJoined={players.length === 4}
          isAddingBots={isAddingBots}
          isStartingGame={isStartingGame}
          onAddBots={handleAddBots}
          onStartGame={handleStartGame}
          onForceHostStatus={handleForceHostStatus}
        />
      </div>
    </div>
  );
}; 