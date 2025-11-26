"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface UseLeaveGameGuardOptions {
  /** Whether the guard is active (typically when game is in progress) */
  isActive: boolean;
  /** Callback when user confirms leaving */
  onConfirmLeave?: () => void;
  /** Message to show in browser's native dialog */
  browserMessage?: string;
}

interface UseLeaveGameGuardReturn {
  /** Show the confirmation dialog */
  showConfirmDialog: boolean;
  /** Request to leave (shows confirmation) */
  requestLeave: (destination?: string) => void;
  /** Confirm leaving */
  confirmLeave: () => void;
  /** Cancel leaving */
  cancelLeave: () => void;
  /** Pending destination after confirmation */
  pendingDestination: string | null;
}

/**
 * Hook to guard against accidentally leaving a game
 * Features:
 * - Shows confirmation dialog before leaving
 * - Handles browser back button and tab close
 * - Integrates with Next.js router
 */
export function useLeaveGameGuard({
  isActive,
  onConfirmLeave,
  browserMessage = "You are in the middle of a game. Are you sure you want to leave?",
}: UseLeaveGameGuardOptions): UseLeaveGameGuardReturn {
  const router = useRouter();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);

  // Handle browser beforeunload event (tab close, refresh)
  useEffect(() => {
    if (!isActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = browserMessage;
      return browserMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActive, browserMessage]);

  // Handle browser back button using popstate
  useEffect(() => {
    if (!isActive) return;

    // Push a dummy state so we can intercept the back button
    const currentPath = window.location.pathname;
    window.history.pushState({ guardActive: true }, "", currentPath);

    const handlePopState = (e: PopStateEvent) => {
      if (isActive) {
        // Re-push the state to stay on current page
        window.history.pushState({ guardActive: true }, "", currentPath);
        // Show confirmation dialog
        setShowConfirmDialog(true);
        setPendingDestination("back");
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isActive]);

  const requestLeave = useCallback((destination: string = "/game") => {
    if (!isActive) {
      // No guard active, just navigate
      router.push(destination);
      return;
    }

    setShowConfirmDialog(true);
    setPendingDestination(destination);
  }, [isActive, router]);

  const confirmLeave = useCallback(() => {
    setShowConfirmDialog(false);
    onConfirmLeave?.();

    if (pendingDestination === "back") {
      // Go back twice (once for our pushed state, once for actual back)
      window.history.go(-2);
    } else if (pendingDestination) {
      router.push(pendingDestination);
    }

    setPendingDestination(null);
  }, [pendingDestination, router, onConfirmLeave]);

  const cancelLeave = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingDestination(null);
  }, []);

  return {
    showConfirmDialog,
    requestLeave,
    confirmLeave,
    cancelLeave,
    pendingDestination,
  };
}
