import React from "react";
import { Loader2 } from "lucide-react";

interface GameLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function GameLoader({ message = "Loading game...", fullScreen = false }: GameLoaderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center ${
        fullScreen ? "fixed inset-0 bg-background/90 z-50" : "w-full h-full min-h-[300px]"
      }`}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function PhaseTransitionLoader({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-lg p-4 sm:p-8 max-w-xs sm:max-w-md w-full mx-4">
        <div className="flex flex-col items-center justify-center space-y-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-xl font-medium text-center">{message}</p>
        </div>
      </div>
    </div>
  );
}
