"use client";

import { useEffect, useRef, useCallback } from "react";
import { playSoundEffect } from "@/hooks/use-sound-effects";
import { useSettingsStore } from "@/stores/settingsStore";

interface UseTurnNotificationOptions {
  isMyTurn: boolean;
  isPlaying: boolean;
  playerName?: string;
}

/**
 * Hook to notify the user when it's their turn via sound and browser notification
 * Only activates when the tab is not focused
 */
export function useTurnNotification({
  isMyTurn,
  isPlaying,
  playerName = "Player",
}: UseTurnNotificationOptions) {
  const wasMyTurnRef = useRef(false);
  const isTabFocusedRef = useRef(true);
  const notificationPermissionRef = useRef<NotificationPermission>("default");
  const { soundEffectsEnabled } = useSettingsStore();

  // Track tab focus state
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabFocusedRef.current = !document.hidden;
    };

    const handleFocus = () => {
      isTabFocusedRef.current = true;
    };

    const handleBlur = () => {
      isTabFocusedRef.current = false;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    // Set initial state
    isTabFocusedRef.current = !document.hidden;

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      notificationPermissionRef.current = Notification.permission;

      if (Notification.permission === "default") {
        // Request permission when user interacts
        const requestPermission = async () => {
          try {
            const permission = await Notification.requestPermission();
            notificationPermissionRef.current = permission;
          } catch (e) {
            console.warn("Notification permission request failed:", e);
          }
        };

        // Request on first click
        document.addEventListener("click", requestPermission, { once: true });
        return () => {
          document.removeEventListener("click", requestPermission);
        };
      }
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    try {
      const notification = new Notification("Turup's Gambit", {
        body: "It's your turn to play!",
        icon: "/icons/icon-192x192.png",
        tag: "turn-notification",
        requireInteraction: false,
      });

      // Auto-close after 4 seconds
      setTimeout(() => {
        notification.close();
      }, 4000);

      // Focus tab when notification is clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn("Failed to show notification:", e);
    }
  }, []);

  // Monitor turn changes
  useEffect(() => {
    if (!isPlaying) {
      wasMyTurnRef.current = false;
      return;
    }

    // Detect when it becomes my turn (transition from not my turn to my turn)
    if (isMyTurn && !wasMyTurnRef.current) {
      // Only notify if tab is not focused
      if (!isTabFocusedRef.current) {
        // Play sound
        if (soundEffectsEnabled) {
          playSoundEffect("turnNotify", 0.6);
          // Play a second beep for emphasis
          setTimeout(() => {
            playSoundEffect("turnNotify", 0.4);
          }, 200);
        }

        // Show browser notification
        showBrowserNotification();

        // Also update document title as a visual cue
        const originalTitle = document.title;
        document.title = "Your Turn! - Turup's Gambit";

        // Reset title when tab is focused
        const resetTitle = () => {
          document.title = originalTitle;
          window.removeEventListener("focus", resetTitle);
        };
        window.addEventListener("focus", resetTitle);
      }
    }

    wasMyTurnRef.current = isMyTurn;
  }, [isMyTurn, isPlaying, soundEffectsEnabled, showBrowserNotification]);
}
