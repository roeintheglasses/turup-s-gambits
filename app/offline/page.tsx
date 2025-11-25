"use client";

import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OfflinePage() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Offline Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center border-2 border-amber-500/30">
            <WifiOff className="w-12 h-12 text-amber-500" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-cinzel font-bold text-amber-500">
            You&apos;re Offline
          </h1>
          <p className="text-muted-foreground">
            It seems like you&apos;ve lost your connection to the realm.
            Check your internet connection and try again.
          </p>
        </div>

        {/* Message */}
        <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-amber-500/20 p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Turup&apos;s Gambit</strong> requires
            an internet connection to play multiplayer games with friends.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleRefresh}
            className="gap-2"
            variant="default"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            asChild
            variant="outline"
            className="gap-2"
          >
            <Link href="/">
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Tips */}
        <div className="mt-8 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Connection Tips
          </p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Check your Wi-Fi or mobile data</li>
            <li>Try moving to a better signal area</li>
            <li>Disable and re-enable airplane mode</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
