"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Heart } from "lucide-react";

// Routes where footer should be hidden
const HIDE_FOOTER_ROUTES = ["/game/", "/test-game/"];

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  // Hide footer on game routes
  if (HIDE_FOOTER_ROUTES.some(route => pathname?.startsWith(route))) {
    return null;
  }

  return (
    <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left side: Brand and links */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2">
            <Link href="/" className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-primary" />
              <span className="font-medieval text-sm text-primary">Turup's Gambit</span>
            </Link>
            <span className="hidden sm:inline text-muted-foreground text-xs">|</span>
            <div className="flex gap-3 text-xs">
              <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
              <Link href="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
            </div>
          </div>

          {/* Right side: Copyright */}
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span>&copy; {currentYear}</span>
            <span className="hidden sm:inline">Turup's Gambit</span>
            <span className="hidden sm:flex items-center gap-1">
              · Made with <Heart size={10} className="text-red-500 fill-red-500" />
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
