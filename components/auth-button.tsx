"use client";

import { useEffect } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { syncCurrentUser } from "@/app/actions/sync-user";
import { useAuthStore } from "@/stores/authStore";

export function AuthButton() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { setUser, clearUser, setLoading } = useAuthStore();

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

  // Debug logging
  console.log("[AuthButton] User:", user);
  console.log("[AuthButton] isSignedIn:", isSignedIn);
  console.log("[AuthButton] isLoaded:", isLoaded);

  if (!isLoaded) {
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
