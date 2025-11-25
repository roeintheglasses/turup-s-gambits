"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Info, Menu, Music, Gamepad2, User, Home, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { MusicControls } from "@/components/music-controls";
import { AuthButton } from "@/components/auth-button";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/game", label: "Play", icon: Gamepad2 },
  { href: "/about", label: "About", icon: Info },
];

export function Navbar() {
  const [showMusicControls, setShowMusicControls] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = useCallback(
    (path: string) => {
      router.push(path);
      setMobileOpen(false);
    },
    [router]
  );

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="fixed top-0 left-0 right-0 z-50 border-b-2 border-[hsl(var(--warm-brown))] bg-[hsl(var(--dark-panel))]/95 backdrop-blur-md shadow-lg"
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <Image
                    src="/assets/logo.png"
                    alt="Turup's Gambit Logo"
                    width={44}
                    height={44}
                    className="transition-transform group-hover:scale-105"
                  />
                </div>
                <span className="text-lg sm:text-xl font-cinzel font-bold text-[hsl(var(--amber-primary))] hidden sm:block">
                  Turup's Gambit
                </span>
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center gap-2 px-4 h-9 transition-all ${
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                    }`}
                    onClick={() => handleNavigation(item.href)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mx-2 h-6 w-px bg-border"
              />

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-2 px-4 h-9 transition-all ${
                    showMusicControls
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                  }`}
                  onClick={() => setShowMusicControls(!showMusicControls)}
                >
                  <Music className="w-4 h-4" />
                  <span className="font-medium">Music</span>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="ml-2"
              >
                <AuthButton />
              </motion.div>
            </nav>

            {/* Mobile Navigation Toggle */}
            <div className="flex items-center gap-2 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 ${showMusicControls ? "text-primary" : ""}`}
                onClick={() => setShowMusicControls(!showMusicControls)}
              >
                <Music className="w-5 h-5" />
              </Button>

              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-72 bg-[hsl(var(--dark-panel))]/98 backdrop-blur-md border-l-2 border-[hsl(var(--warm-brown))] p-0"
                >
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

                  {/* Mobile Menu Header */}
                  <div className="p-6 border-b border-border/50">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/assets/logo.png"
                        alt="Logo"
                        width={40}
                        height={40}
                      />
                      <div>
                        <p className="font-cinzel font-bold text-primary">Turup's Gambit</p>
                        <p className="text-xs text-muted-foreground">Medieval Card Game</p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Navigation Items */}
                  <nav className="p-4 space-y-1">
                    {navItems.map((item) => (
                      <SheetClose key={item.href} asChild>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start gap-3 h-12 text-base ${
                            isActive(item.href)
                              ? "bg-primary/10 text-primary"
                              : "text-foreground/80 hover:text-primary hover:bg-primary/5"
                          }`}
                          onClick={() => handleNavigation(item.href)}
                        >
                          <item.icon className="w-5 h-5" />
                          {item.label}
                        </Button>
                      </SheetClose>
                    ))}
                  </nav>

                  {/* Mobile Auth Section */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border/50 bg-card/50">
                    <AuthButton />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Music Controls Popup */}
      <AnimatePresence>
        {showMusicControls && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 right-4 z-50 p-4 rounded-xl bg-[hsl(var(--dark-panel))]/95 backdrop-blur-md border-2 border-[hsl(var(--warm-brown))] shadow-xl"
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-cinzel font-bold text-primary flex items-center gap-2">
                <Music className="w-4 h-4" />
                Music Controls
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowMusicControls(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <MusicControls />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop for music controls */}
      <AnimatePresence>
        {showMusicControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={() => setShowMusicControls(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
