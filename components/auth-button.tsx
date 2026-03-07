"use client";

import { useEffect, useState } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { syncCurrentUser } from "@/app/actions/sync-user";
import { useAuthStore } from "@/stores/authStore";

const LOADING_TIMEOUT_MS = 1500;

export function AuthButton() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { setUser, clearUser, setLoading } = useAuthStore();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Timeout so the loading state doesn't persist indefinitely.
  // After LOADING_TIMEOUT_MS, fall through to showing the Login button.
  useEffect(() => {
    if (isLoaded) return;

    const timer = setTimeout(() => {
      setLoadingTimedOut(true);
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Sync user to database and authStore when signed in
  useEffect(() => {
    setLoading(!isLoaded);

    if (isSignedIn && user) {
      // Sync to authStore
      setUser({
        id: user.id,
        username: user.username || user.emailAddresses[0]?.emailAddress.split('@')[0] || 'user',
        name: user.firstName || user.username || undefined,
        email: user.emailAddresses[0]?.emailAddress,
        avatar: user.imageUrl,
        imageUrl: user.imageUrl,
      });

      // Sync to database
      syncCurrentUser().catch((error) => {
        console.error("[AuthButton] Failed to sync user:", error);
      });
    } else if (isLoaded && !isSignedIn) {
      clearUser();
    }
  }, [isSignedIn, user, isLoaded, setUser, clearUser, setLoading]);

  // Show loading only briefly while Clerk initializes.
  // If it takes too long, fall through to showing the Login button.
  if (!isLoaded && !loadingTimedOut) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="flex items-center gap-2"
        >
          <span>Loading...</span>
        </Button>
      </motion.div>
    );
  }

  if (isSignedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center"
      >
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
              userButtonPopoverCard: "bg-card/95 backdrop-blur-md border-primary/20",
              userButtonPopoverActionButton: "hover:bg-primary/10",
            },
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <SignInButton
        mode="modal"
        forceRedirectUrl="/"
      >
        <Button
          variant="default"
          size="sm"
          className="flex items-center gap-2 medieval-button bg-primary text-primary-foreground"
        >
          <LogIn size={18} />
          <span>Login</span>
        </Button>
      </SignInButton>
    </motion.div>
  );
}
